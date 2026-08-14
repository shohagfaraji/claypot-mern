import type { ImagePurpose, ImageUploadSignature, ManagedImage } from '@/features/media/types';

interface UploadSignatureResponse {
  data: {
    upload: ImageUploadSignature;
  };
}

interface CloudinaryUploadResponse {
  public_id?: unknown;
  secure_url?: unknown;
  error?: {
    message?: unknown;
  };
}

export type AuthenticatedRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export async function getImageUploadSignature(
  request: AuthenticatedRequest,
  purpose: ImagePurpose,
) {
  const response = await request<UploadSignatureResponse>('/media/images/signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose }),
  });

  return response.data.upload;
}

export async function discardImage(
  request: AuthenticatedRequest,
  purpose: ImagePurpose,
  publicId: string,
) {
  await request<void>('/media/images', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, publicId }),
  });
}

export function uploadImageToCloudinary(
  file: File,
  upload: ImageUploadSignature,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
): Promise<ManagedImage> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.set('file', file);
    formData.set('api_key', upload.apiKey);
    formData.set('signature', upload.signature);
    formData.set('timestamp', String(upload.timestamp));
    formData.set('asset_folder', upload.assetFolder);
    formData.set('public_id', upload.publicId);
    formData.set('allowed_formats', upload.allowedFormats);
    formData.set('transformation', upload.transformation);

    xhr.open('POST', upload.uploadUrl);
    xhr.responseType = 'json';
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      const body = xhr.response as CloudinaryUploadResponse | null;

      if (
        xhr.status >= 200 &&
        xhr.status < 300 &&
        typeof body?.secure_url === 'string' &&
        body.public_id === upload.publicId
      ) {
        onProgress(100);
        resolve({ url: body.secure_url, publicId: body.public_id });
        return;
      }

      reject(
        new Error(
          typeof body?.error?.message === 'string'
            ? body.error.message
            : 'The image could not be uploaded.',
        ),
      );
    });
    xhr.addEventListener('error', () => reject(new Error('The image upload was interrupted.')));
    xhr.addEventListener('abort', () => reject(new DOMException('Upload aborted.', 'AbortError')));

    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(formData);
  });
}

export async function uploadImage(
  request: AuthenticatedRequest,
  file: File,
  purpose: ImagePurpose,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
) {
  const upload = await getImageUploadSignature(request, purpose);
  return uploadImageToCloudinary(file, upload, onProgress, signal);
}
