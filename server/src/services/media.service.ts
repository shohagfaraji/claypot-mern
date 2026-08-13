import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import type { ImagePurpose } from '../schemas/media.schema.js';

const allowedFormats = 'avif,jpeg,jpg,png,webp';
const maximumDimension = 2400;

export interface ImageUploadSignature {
  uploadUrl: string;
  cloudName: string;
  apiKey: string;
  signature: string;
  timestamp: number;
  folder: string;
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

export function createImageUploadSignature(
  userId: string,
  purpose: ImagePurpose,
  now = new Date(),
): ImageUploadSignature {
  const credentials = getCloudinaryCredentials();
  const timestamp = Math.floor(now.getTime() / 1000);
  const folderName = purpose === 'avatar' ? 'avatars' : 'recipes';
  const folder = `claypot/${folderName}/${userId}`;
  const publicId = randomUUID();
  const transformation = `c_limit,w_${maximumDimension},h_${maximumDimension}`;
  const parameters = {
    allowed_formats: allowedFormats,
    folder,
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
    folder,
    publicId,
    allowedFormats,
    transformation,
  };
}
