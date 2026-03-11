"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptionUtil = void 0;
const crypto = require("crypto");
const config_1 = require("../config");

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Application-level field encryption for sensitive PII data.
 * Uses AES-256-GCM with a server-managed encryption key.
 *
 * The key is derived from ENCRYPTION_KEY env var (or falls back to JWT secret in dev).
 * In production, ENCRYPTION_KEY MUST be set to a strong 32-byte hex string.
 */
function getKey() {
    const raw = config_1.config.encryption?.key;
    if (!raw) {
        // Derive a deterministic key from JWT secret (dev fallback only)
        return crypto.createHash('sha256').update(config_1.config.jwt.accessSecret).digest();
    }
    // Expect a 64-char hex string (32 bytes)
    return Buffer.from(raw, 'hex');
}

/**
 * Encrypt a plaintext string. Returns base64 string: iv:ciphertext:tag
 */
function encrypt(plaintext) {
    if (!plaintext) return plaintext;
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypt a previously encrypted string.
 */
function decrypt(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) return encryptedText;
        const key = getKey();
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = Buffer.from(parts[1], 'hex');
        const tag = Buffer.from(parts[2], 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    } catch {
        // If decryption fails, return the original value (may not be encrypted)
        return encryptedText;
    }
}

/**
 * Check if a value looks like it's already encrypted (hex:hex:hex format).
 */
function isEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    return /^[a-f0-9]{32}:[a-f0-9]+:[a-f0-9]{32}$/.test(value);
}

exports.encryptionUtil = { encrypt, decrypt, isEncrypted };
