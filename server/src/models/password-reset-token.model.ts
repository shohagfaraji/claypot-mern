import { model, Schema, type Types } from 'mongoose';

export interface PasswordResetToken {
  user: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const passwordResetTokenSchema = new Schema<PasswordResetToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
      match: /^[a-f0-9]{64}$/,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date, default: null },
  },
  {
    collection: 'password_reset_tokens',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, returnedObject) => {
        const publicToken = returnedObject as Partial<typeof returnedObject>;
        delete publicToken.tokenHash;
        return publicToken;
      },
    },
  },
);

export const PasswordResetTokenModel = model<PasswordResetToken>(
  'PasswordResetToken',
  passwordResetTokenSchema,
);
