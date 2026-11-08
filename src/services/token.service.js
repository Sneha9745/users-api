
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/http-error.js';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export class TokenService {
  constructor(refreshTokensRepository, { jwtSecret, accessTokenTtlSeconds, refreshTokenTtlDays, issuer, audience }) {
    this.refreshTokens = refreshTokensRepository;
    this.secret = jwtSecret;
    this.accessTokenTtlSeconds = accessTokenTtlSeconds;
    this.refreshTokenTtlMs = refreshTokenTtlDays * 24 * 60 * 60 * 1000;
    this.jwtOptions = { issuer, audience };
  }

  signAccessToken(user) {
    return jwt.sign({ role: user.role }, this.secret, {
      ...this.jwtOptions,
      subject: user.id,
      algorithm: 'HS256',
      expiresIn: this.accessTokenTtlSeconds,
    });
  }

  verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, this.secret, {
        ...this.jwtOptions,
        algorithms: ['HS256'],
      });
      return { id: payload.sub, role: payload.role };
    } catch (err) {
      throw unauthorized(
        err.name === 'TokenExpiredError'
          ? 'Access token expired'
          : 'Invalid access token',
      );
    }
  }

  async issueRefreshToken(userId, familyId = randomUUID()) {
    const token = randomBytes(32).toString('base64url');
    const row = await this.refreshTokens.create({
      userId,
      tokenHash: sha256(token),
      familyId,
      expiresAt: new Date(
        Date.now() + this.refreshTokenTtlMs,
      ).toISOString(),
      revokedAt: null,
      replacedBy: null,
    });
    return { token, id: row.id, expiresAt: row.expiresAt };
  }

  async rotateRefreshToken(token) {
    const row = token
      ? await this.refreshTokens.findByHash(sha256(token))
      : null;

    if (!row) throw unauthorized('Invalid refresh token');

    if (row.revokedAt) {
      await this.refreshTokens.revokeFamily(row.familyId);
      throw unauthorized(
        'Refresh token reuse detected — please log in again',
      );
    }

    if (new Date(row.expiresAt) <= new Date()) {
      throw unauthorized('Refresh token expired');
    }

    const next = await this.issueRefreshToken(row.userId, row.familyId);
    await this.refreshTokens.update(row.id, {
      revokedAt: new Date().toISOString(),
      replacedBy: next.id,
    });

    return { userId: row.userId, refresh: next };
  }

  async revokeRefreshToken(token) {
    const row = token
      ? await this.refreshTokens.findByHash(sha256(token))
      : null;

    if (row) await this.refreshTokens.revokeFamily(row.familyId);
  }

  revokeAllForUser(userId) {
    return this.refreshTokens.revokeAllForUser(userId);
  }
}
