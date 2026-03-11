"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const connection_1 = require("../../database/connection");
const redis_1 = require("../../config/redis");
const config_1 = require("../../config");
const logger_1 = require("../../common/logger");
const errors_1 = require("../../common/errors");
const audit_service_1 = require("../../common/audit.service");
const SALT_ROUNDS = 12;
class AuthService {
    async register(input) {
        const { email, password, firstName, lastName, role, badgeNumber, department } = input;
        // Check if user exists
        const existing = await connection_1.db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            throw new errors_1.ConflictError('User with this email already exists');
        }
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        const id = (0, uuid_1.v4)();
        const result = await connection_1.db.query(`INSERT INTO users (id, email, password_hash, first_name, last_name, role, badge_number, department, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, badge_number, department, created_at`, [id, email, hashedPassword, firstName, lastName, role, badgeNumber || null, department || null]);
        logger_1.logger.info('User registered', { userId: id, email, role });
        audit_service_1.auditService.log({
            userId: id,
            action: 'user_register',
            entityType: 'user',
            entityId: id,
            newValues: { email, role, department },
        }).catch(() => {});
        return result.rows[0];
    }
    async login(input) {
        const { email, password } = input;
        const result = await connection_1.db.query('SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        const user = result.rows[0];
        if (!user.is_active) {
            throw new errors_1.UnauthorizedError('Account has been deactivated');
        }
        const isValid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValid) {
            audit_service_1.auditService.log({
                action: 'login_failed',
                entityType: 'auth',
                newValues: { email, reason: 'invalid_password' },
            }).catch(() => {});
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        const tokens = await this.generateTokens(user);
        // Update last login
        await connection_1.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        logger_1.logger.info('User logged in', { userId: user.id, email });
        audit_service_1.auditService.log({
            userId: user.id,
            action: 'user_login',
            entityType: 'auth',
            newValues: { email },
        }).catch(() => {});
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
    async refreshToken(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwt.refreshSecret);
            // Check if refresh token is still valid in Redis
            const isValid = await redis_1.redis.isRefreshTokenValid(decoded.userId, decoded.tokenId);
            if (!isValid) {
                throw new errors_1.UnauthorizedError('Refresh token has been revoked');
            }
            // Revoke old refresh token
            await redis_1.redis.revokeRefreshToken(decoded.userId, decoded.tokenId);
            // Get current user data
            const result = await connection_1.db.query('SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1', [decoded.userId]);
            if (result.rows.length === 0 || !result.rows[0].is_active) {
                throw new errors_1.UnauthorizedError('User no longer exists or has been deactivated');
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
        }
        catch (error) {
            if (error instanceof errors_1.UnauthorizedError)
                throw error;
            throw new errors_1.UnauthorizedError('Invalid refresh token');
        }
    }
    async logout(userId, accessToken) {
        // Blacklist the access token
        const decoded = jsonwebtoken_1.default.decode(accessToken);
        if (decoded?.exp) {
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await redis_1.redis.blacklistToken(accessToken, ttl);
            }
        }
        // Revoke all refresh tokens
        await redis_1.redis.revokeAllUserTokens(userId);
        logger_1.logger.info('User logged out', { userId });
        audit_service_1.auditService.log({
            userId,
            action: 'user_logout',
            entityType: 'auth',
        }).catch(() => {});
    }
    async changePassword(userId, input) {
        const result = await connection_1.db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('User');
        }
        const isValid = await bcrypt_1.default.compare(input.currentPassword, result.rows[0].password_hash);
        if (!isValid) {
            throw new errors_1.UnauthorizedError('Current password is incorrect');
        }
        const newHash = await bcrypt_1.default.hash(input.newPassword, SALT_ROUNDS);
        await connection_1.db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);
        // Revoke all existing tokens
        await redis_1.redis.revokeAllUserTokens(userId);
        logger_1.logger.info('Password changed', { userId });
        audit_service_1.auditService.log({
            userId,
            action: 'password_change',
            entityType: 'user',
            entityId: userId,
        }).catch(() => {});
    }
    async getProfile(userId) {
        const result = await connection_1.db.query(`SELECT id, email, first_name, last_name, role, badge_number, department, created_at, last_login_at
       FROM users WHERE id = $1`, [userId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('User');
        }
        return result.rows[0];
    }
    async generateTokens(user) {
        const tokenId = (0, uuid_1.v4)();
        const accessToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role }, config_1.config.jwt.accessSecret, { expiresIn: config_1.config.jwt.accessExpiry });
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: user.role, tokenId }, config_1.config.jwt.refreshSecret, { expiresIn: config_1.config.jwt.refreshExpiry });
        // Store refresh token in Redis (7 days TTL)
        await redis_1.redis.storeRefreshToken(user.id, tokenId, 7 * 24 * 60 * 60);
        return { accessToken, refreshToken };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
