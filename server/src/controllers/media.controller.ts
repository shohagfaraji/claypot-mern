import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { CreateImageUploadSignatureInput } from '../schemas/media.schema.js';
import { createImageUploadSignature } from '../services/media.service.js';

export const createUploadSignature: RequestHandler = (request, response) => {
  if (request.auth === undefined) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  const { purpose } = request.body as CreateImageUploadSignatureInput;
  const upload = createImageUploadSignature(request.auth.userId, purpose);

  response.status(200).json({ data: { upload } });
};
