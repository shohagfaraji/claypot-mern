import { randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { userRoles } from '../models/user.model.js';

const tokenIssuer = 'claypot-api';
const tokenAudience = 'claypot-client';
const secretKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);

const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(userRoles),
});

export interface AccessTokenIdentity {
  userId: string;
  role: (typeof userRoles)[number];
}

export async function createAccessToken(identity: AccessTokenIdentity): Promise<string> {
  return new SignJWT({ role: identity.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(identity.userId)
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`)
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenIdentity> {
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ['HS256'],
    issuer: tokenIssuer,
    audience: tokenAudience,
  });
  const claims = accessTokenPayloadSchema.parse(payload);

  return {
    userId: claims.sub,
    role: claims.role,
  };
}
