export type ImagePurpose = 'avatar' | 'recipe-cover';

export interface ManagedImage {
  url: string;
  publicId: string | null;
}

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
