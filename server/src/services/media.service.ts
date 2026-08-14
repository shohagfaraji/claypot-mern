import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';
import { RecipeModel } from '../models/recipe.model.js';
import { UserModel } from '../models/user.model.js';
import type { DiscardImageInput, ImagePurpose } from '../schemas/media.schema.js';

const allowedFormats = 'avif,jpeg,jpg,png,webp';
const maximumDimension = 2400;

export interface ImageUploadSignature {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  assetFolder: string;
  publicId: string;
  allowedFormats: string;
  transformation: string;
}

function getCloudinaryCredentials() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;

  if (
    CLOUDINARY_CLOUD_NAME === undefined ||
    CLOUDINARY_API_KEY === undefined ||
    CLOUDINARY_API_SECRET === undefined
  ) {
    throw new AppError(
      503,
      'MEDIA_SERVICE_UNAVAILABLE',
      'Image uploads are temporarily unavailable.',
    );
  }

  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
  };
}

function getImageNamespace(userId: string, purpose: ImagePurpose) {
  const folderName = purpose === 'avatar' ? 'avatars' : 'recipes';
  return `claypot/${folderName}/${userId}`;
}

function configureCloudinary() {
  const credentials = getCloudinaryCredentials();
  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true,
  });
}

export function createImageUploadSignature(
  userId: string,
  purpose: ImagePurpose,
  now = new Date(),
): ImageUploadSignature {
  const credentials = getCloudinaryCredentials();
  const timestamp = Math.floor(now.getTime() / 1000);
  const assetFolder = getImageNamespace(userId, purpose);
  const publicId = `${assetFolder}/${randomUUID()}`;
  const transformation = `c_limit,w_${maximumDimension},h_${maximumDimension}`;
  const parameters = {
    allowed_formats: allowedFormats,
    asset_folder: assetFolder,
    public_id: publicId,
    timestamp,
    transformation,
  };
  const signature = cloudinary.utils.api_sign_request(parameters, credentials.apiSecret);

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(credentials.cloudName)}/image/upload`,
    cloudName: credentials.cloudName,
    apiKey: credentials.apiKey,
    signature,
    timestamp,
    assetFolder,
    publicId,
    allowedFormats,
    transformation,
  };
}

export async function deleteManagedImage(publicId: string): Promise<void> {
  configureCloudinary();
  await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: 'image',
    type: 'upload',
  });
}

export async function deleteManagedImageAfterPersistence(publicId: string): Promise<void> {
  try {
    await deleteManagedImage(publicId);
  } catch (error) {
    logger.warn({ err: error, publicId }, 'Cloudinary image cleanup failed');
  }
}

export async function discardUnusedImage(userId: string, input: DiscardImageInput): Promise<void> {
  const namespace = getImageNamespace(userId, input.purpose);

  if (!input.publicId.startsWith(`${namespace}/`)) {
    throw new AppError(404, 'MEDIA_ASSET_NOT_FOUND', 'Image asset was not found.');
  }

  const assetInUse =
    input.purpose === 'avatar'
      ? await UserModel.exists({ avatarPublicId: input.publicId })
      : await RecipeModel.exists({ imagePublicId: input.publicId });

  if (assetInUse !== null) {
    throw new AppError(409, 'MEDIA_ASSET_IN_USE', 'The image is currently in use.');
  }

  await deleteManagedImage(input.publicId);
}
