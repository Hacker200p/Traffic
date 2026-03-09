"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const connection_1 = require("../database/connection");
const redis_1 = require("../config/redis");
const router = (0, express_1.Router)();
exports.healthRouter = router;
router.get('/health', async (_req, res) => {
    const checks = {};
    try {
        checks.database = await connection_1.db.healthCheck();
    }
    catch {
        checks.database = false;
    }
    try {
        checks.redis = await redis_1.redis.healthCheck();
    }
    catch {
        checks.redis = false;
    }
    const healthy = Object.values(checks).every(Boolean);
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks,
    });
});
router.get('/ready', async (_req, res) => {
    try {
        const dbOk = await connection_1.db.healthCheck();
        const redisOk = await redis_1.redis.healthCheck();
        if (dbOk && redisOk) {
            res.status(200).json({ status: 'ready' });
        }
        else {
            res.status(503).json({ status: 'not ready', db: dbOk, redis: redisOk });
        }
    }
    catch {
        res.status(503).json({ status: 'not ready' });
    }
});
