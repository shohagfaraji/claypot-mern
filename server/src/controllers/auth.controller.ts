import type { RequestHandler } from 'express';
import type { RegisterInput } from '../schemas/auth.schema.js';
import { registerUser } from '../services/auth.service.js';

export const register: RequestHandler = async (request, response) => {
  const user = await registerUser(request.body as RegisterInput);

  response.status(201).json({
    data: {
      user,
    },
  });
};
