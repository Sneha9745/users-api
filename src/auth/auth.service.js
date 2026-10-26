
import { randomUUID } from 'node:crypto';
import { conflict, unauthorized } from '../utils/http-error.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { createAccessToken, createRefreshToken } from './token.js';

export class AuthService {
  constructor(usersRepository) {
    this.users = usersRepository;
    this.refreshTokens = new Map();
  }

  async register(data) {
    const email = data.email.trim().toLowerCase();
    const existing = await this.users.findByEmail(email);

    if (existing) {
      throw conflict(`Email ${email} is already registered`);
    }

    const passwordHash = await hashPassword(data.password);
    const user = await this.users.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email,
      passwordHash,
      role: 'customer',
      phone: data.phone ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      address: data.address ?? null,
    });

    return this.#issueTokens(user);
  }

  async login({ email, password }) {
    const user = await this.users.findByEmail(email.trim().toLowerCase());

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw unauthorized('Invalid email or password');
    }

    return this.#issueTokens(user);
  }

  async refresh(tokenId) {
    const record = this.refreshTokens.get(tokenId);

    if (!record || record.revoked) {
      throw unauthorized('Refresh token is invalid or has been revoked');
    }

    record.revoked = true;
    return this.#issueTokens(record.user);
  }

  async logout(tokenId) {
    const record = this.refreshTokens.get(tokenId);

    if (record) {
      record.revoked = true;
    }

    return { message: 'Logged out successfully' };
  }

  async #issueTokens(user) {
    const tokenId = randomUUID();
    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user, tokenId);

    this.refreshTokens.set(tokenId, {
      user,
      revoked: false,
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
    };
  }
}
