import { Router, Request, Response } from 'express';
import { db } from '../database/connection';
import { redis } from '../config/redis';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, boolean> = {};

  try {
    checks.database = await db.healthCheck();
  } catch {
    checks.database = false;
  }

  try {
    checks.redis = await redis.healthCheck();
  } catch {
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

router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const dbOk = await db.healthCheck();
    const redisOk = await redis.healthCheck();

    if (dbOk && redisOk) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', db: dbOk, redis: redisOk });
    }
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

export { router as healthRouter };
