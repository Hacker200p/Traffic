import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../database/connection';
import { redis } from '../../config/redis';
import { config } from '../../config';
import { logger } from '../../common/logger';
import { UnauthorizedError, ConflictError, NotFoundError, AppError } from '../../common/errors';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.validation';
import { JwtPayload } from '../../middleware/auth.middleware';

const SALT_ROUNDS = 12;

export class AuthService {
  async register(input: RegisterInput) {
    const { email, password, firstName, lastName, role, badgeNumber, department } = input;

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw new ConflictError('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();

    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, badge_number, department, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, badge_number, department, created_at`,
      [id, email, hashedPassword, firstName, lastName, role, badgeNumber || null, department || null]
    );

    logger.info('User registered', { userId: id, email, role });
    return result.rows[0];
  }

  async login(input: LoginInput) {
    const { email, password } = input;

    const result = await db.query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];
    if (!user.is_active) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);

    // Update last login
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    logger.info('User logged in', { userId: user.id, email });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload & { tokenId: string };

      // Check if refresh token is still valid in Redis
      const isValid = await redis.isRefreshTokenValid(decoded.userId, decoded.tokenId);
      if (!isValid) {
        throw new UnauthorizedError('Refresh token has been revoked');
      }

      // Revoke old refresh token
      await redis.revokeRefreshToken(decoded.userId, decoded.tokenId);

      // Get current user data
      const result = await db.query(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        throw new UnauthorizedError('User no longer exists or has been deactivated');
      }

      const user = result.rows[0];
      const tokens = await this.generateTokens(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async logout(userId: string, accessToken: string) {
    // Blacklist the access token
    const decoded = jwt.decode(accessToken) as JwtPayload;
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.blacklistToken(accessToken, ttl);
      }
    }

    // Revoke all refresh tokens
    await redis.revokeAllUserTokens(userId);

    logger.info('User logged out', { userId });
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const isValid = await bcrypt.compare(input.currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

    // Revoke all existing tokens
    await redis.revokeAllUserTokens(userId);

    logger.info('Password changed', { userId });
  }

  async getProfile(userId: string) {
    const result = await db.query(
      `SELECT id, email, first_name, last_name, role, badge_number, department, created_at, last_login_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    return result.rows[0];
  }

  private async generateTokens(user: { id: string; email: string; role: string }) {
    const tokenId = uuidv4();

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role } as JwtPayload,
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiry as string }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, tokenId } as JwtPayload,
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry as string }
    );

    // Store refresh token in Redis (7 days TTL)
    await redis.storeRefreshToken(user.id, tokenId, 7 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
