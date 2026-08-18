import { createHash, randomBytes } from 'node:crypto';

export function createEmailVerificationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashEmailVerificationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
