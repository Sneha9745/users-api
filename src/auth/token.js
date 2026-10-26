
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      type: 'access',
    },
    config.auth.jwtSecret,
    {
      expiresIn: config.auth.accessTokenTtlSeconds,
      issuer: config.auth.issuer,
      audience: config.auth.audience,
    },
  );
}

export function createRefreshToken(user, tokenId) {
  return jwt.sign(
    {
      sub: user.id,
      jti: tokenId,
      type: 'refresh',
    },
    config.auth.jwtSecret,
    {
      expiresIn: `${config.auth.refreshTokenTtlDays}d`,
      issuer: config.auth.issuer,
      audience: config.auth.audience,
    },
  );
}

export function verifyToken(token, expectedType) {
  const payload = jwt.verify(token, config.auth.jwtSecret, {
    issuer: config.auth.issuer,
    audience: config.auth.audience,
  });

  if (payload.type !== expectedType) {
    throw new Error('Invalid token type');
  }

  return payload;
}
