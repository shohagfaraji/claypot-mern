import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  discardImage,
  getImageUploadSignature,
  uploadImageToCloudinary,
} from '@/features/media/api/upload-image';
import type { ImageUploadSignature } from '@/features/media/types';

const upload: ImageUploadSignature = {
  uploadUrl: 'https://api.cloudinary.com/v1_1/claypot-cloud/image/upload',
  cloudName: 'claypot-cloud',
  apiKey: 'public-api-key',
  signature: 'signed-parameters',
  timestamp: 1_786_579_200,
  assetFolder: 'claypot/recipes/user-id',
  publicId: 'claypot/recipes/user-id/image-id',
  allowedFormats: 'avif,jpeg,jpg,png,webp',
  transformation: 'c_limit,w_2400,h_2400',
};

type EventListener = (event: ProgressEvent) => void;

class XMLHttpRequestMock {
  static current: XMLHttpRequestMock | null = null;

  readonly listeners = new Map<string, EventListener>();
  readonly uploadListeners = new Map<string, EventListener>();
  readonly upload = {
    addEventListener: (type: string, listener: EventListener) => {
      this.uploadListeners.set(type, listener);
    },
  };
  readonly open = vi.fn();
  body: FormData | null = null;
  response: unknown = null;
  responseType: XMLHttpRequestResponseType = '';
  status = 0;

  constructor() {
    XMLHttpRequestMock.current = this;
  }

  addEventListener(type: string, listener: EventListener) {
    this.listeners.set(type, listener);
  }

  send(body: FormData) {
    this.body = body;
  }

  abort() {
    this.listeners.get('abort')?.({} as ProgressEvent);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  XMLHttpRequestMock.current = null;
});

describe('media upload API', () => {
  it('requests an authenticated signature for a controlled purpose', async () => {
    const request = vi.fn().mockResolvedValue({ data: { upload } });

    await expect(getImageUploadSignature(request, 'recipe-cover')).resolves.toEqual(upload);
    expect(request).toHaveBeenCalledWith('/media/images/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'recipe-cover' }),
    });
  });

  it('requests removal of an unused managed image', async () => {
    const request = vi.fn().mockResolvedValue(undefined);

    await discardImage(request, 'recipe-cover', upload.publicId);

    expect(request).toHaveBeenCalledWith('/media/images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'recipe-cover', publicId: upload.publicId }),
    });
  });

  it('uploads the exact signed parameters and reports progress', async () => {
    vi.stubGlobal('XMLHttpRequest', XMLHttpRequestMock);
    const onProgress = vi.fn();
    const file = new File(['image-bytes'], 'cover.webp', { type: 'image/webp' });
    const result = uploadImageToCloudinary(file, upload, onProgress);
    const xhr = XMLHttpRequestMock.current;

    expect(xhr).not.toBeNull();
    expect(xhr?.open).toHaveBeenCalledWith('POST', upload.uploadUrl);
    expect(xhr?.body?.get('file')).toBe(file);
    expect(xhr?.body?.get('asset_folder')).toBe(upload.assetFolder);
    expect(xhr?.body?.get('public_id')).toBe(upload.publicId);
    expect(xhr?.body?.get('signature')).toBe(upload.signature);

    xhr?.uploadListeners.get('progress')?.({
      lengthComputable: true,
      loaded: 3,
      total: 4,
    } as ProgressEvent);
    expect(onProgress).toHaveBeenCalledWith(75);

    if (xhr) {
      xhr.status = 200;
      xhr.response = {
        public_id: upload.publicId,
        secure_url: 'https://res.cloudinary.com/claypot-cloud/image/upload/cover.webp',
      };
      xhr.listeners.get('load')?.({} as ProgressEvent);
    }

    await expect(result).resolves.toEqual({
      publicId: upload.publicId,
      url: 'https://res.cloudinary.com/claypot-cloud/image/upload/cover.webp',
    });
    expect(onProgress).toHaveBeenLastCalledWith(100);
  });

  it('rejects an upload response with an unexpected public ID', async () => {
    vi.stubGlobal('XMLHttpRequest', XMLHttpRequestMock);
    const result = uploadImageToCloudinary(
      new File(['image-bytes'], 'cover.jpg', { type: 'image/jpeg' }),
      upload,
      vi.fn(),
    );
    const xhr = XMLHttpRequestMock.current;

    if (xhr) {
      xhr.status = 200;
      xhr.response = {
        public_id: 'claypot/recipes/another-user/image-id',
        secure_url: 'https://res.cloudinary.com/claypot-cloud/image/upload/cover.jpg',
      };
      xhr.listeners.get('load')?.({} as ProgressEvent);
    }

    await expect(result).rejects.toThrow('The image could not be uploaded.');
  });
});
