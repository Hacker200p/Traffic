"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeInput = void 0;

/**
 * Middleware that recursively sanitizes all string values in req.body
 * to prevent stored XSS attacks.
 *
 * Strips HTML tags and dangerous characters from user-provided strings.
 */
const DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<\/?\s*(?:script|iframe|object|embed|form|input|button|select|textarea|style|link|meta|base)\b[^>]*>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript\s*:/gi,
    /data\s*:\s*text\/html/gi,
];

function sanitizeString(value) {
    if (typeof value !== 'string') return value;
    let sanitized = value;
    for (const pattern of DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }
    // Trim remaining HTML entities that may form attacks
    sanitized = sanitized
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/<[^>]*>/g, '');
    return sanitized;
}

function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = sanitizeObject(value);
        }
        return result;
    }
    return obj;
}

/**
 * Express middleware to sanitize request body strings.
 */
const sanitizeInput = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
