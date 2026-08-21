import { startSession, Types } from 'mongoose';
import { AppError } from '../errors/app-error.js';
import { verifyPassword } from '../lib/password.js';
import { hashRefreshToken } from '../lib/refresh-token.js';
import { EmailChangeTokenModel } from '../models/email-change-token.model.js';
import { EmailVerificationTokenModel } from '../models/email-verification-token.model.js';
import { PasswordResetTokenModel } from '../models/password-reset-token.model.js';
import { RecipeModel } from '../models/recipe.model.js';
import { RefreshSessionModel } from '../models/refresh-session.model.js';
import { ReviewModel } from '../models/review.model.js';
import { SavedRecipeModel } from '../models/saved-recipe.model.js';
import { UserModel } from '../models/user.model.js';
import type { DeleteAccountInput } from '../schemas/auth.schema.js';
import { deleteManagedImageAfterPersistence } from './media.service.js';

export async function deleteAccount(
  userId: string,
  currentRefreshToken: string,
  input: DeleteAccountInput,
): Promise<void> {
  const now = new Date();
  const userObjectId = new Types.ObjectId(userId);
  const currentTokenHash = hashRefreshToken(currentRefreshToken);
  const session = await startSession();
  const imagePublicIds = new Set<string>();
  let deleted = false;

  try {
    await session.withTransaction(async () => {
      const currentSession = await RefreshSessionModel.findOne(
        {
          user: userObjectId,
          tokenHash: currentTokenHash,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        null,
        { session },
      );

      if (currentSession === null) {
        throw new AppError(401, 'INVALID_SESSION', 'Refresh session is invalid or expired.');
      }

      const user = await UserModel.findById(userObjectId, null, { session }).select(
        '+passwordHash',
      );

      if (user === null) {
        throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
      }

      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
      }

      if (input.confirmation !== user.username) {
        throw new AppError(
          400,
          'ACCOUNT_DELETION_CONFIRMATION_MISMATCH',
          'Enter your username exactly to confirm account deletion.',
        );
      }

      if (user.role === 'admin') {
        const adminCount = await UserModel.countDocuments({ role: 'admin' }, { session });

        if (adminCount <= 1) {
          throw new AppError(
            409,
            'LAST_ADMIN_REQUIRED',
            'The platform must keep at least one administrator.',
          );
        }
      }

      const recipes = await RecipeModel.find({ author: userObjectId }, '_id imagePublicId', {
        session,
      });
      const recipeIds = recipes.map((recipe) => recipe._id);

      if (user.avatarPublicId) imagePublicIds.add(user.avatarPublicId);
      for (const recipe of recipes) {
        if (recipe.imagePublicId) imagePublicIds.add(recipe.imagePublicId);
      }

      await ReviewModel.deleteMany(
        { $or: [{ user: userObjectId }, { recipe: { $in: recipeIds } }] },
        { session },
      );
      await SavedRecipeModel.deleteMany(
        { $or: [{ user: userObjectId }, { recipe: { $in: recipeIds } }] },
        { session },
      );
      await RecipeModel.deleteMany({ author: userObjectId }, { session });
      await EmailVerificationTokenModel.deleteMany({ user: userObjectId }, { session });
      await PasswordResetTokenModel.deleteMany({ user: userObjectId }, { session });
      await EmailChangeTokenModel.deleteMany({ user: userObjectId }, { session });
      await RefreshSessionModel.deleteMany({ user: userObjectId }, { session });
      await UserModel.deleteOne({ _id: userObjectId }, { session });
      deleted = true;
    });
  } finally {
    await session.endSession();
  }

  if (!deleted) throw new Error('Account deletion did not complete.');

  await Promise.all(
    [...imagePublicIds].map((publicId) => deleteManagedImageAfterPersistence(publicId)),
  );
}
