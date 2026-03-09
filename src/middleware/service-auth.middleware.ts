import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { UnauthorizedError } from '../common/errors';
import { logger } from '../common/logger';

/**
 * Service-to-service authentication middleware.
 * Validates requests from internal services (e.g. AI microservice)
 * using a shared API key sent via Authorization header or X-API-Key header.
 *
 * Sets req.user to a synthetic system identity so downstream code
 * that reads req.user.userId / req.user.role keeps working.
 */
export const serviceAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const apiKey =
      req.headers['x-api-key'] as string |
      extractBearerToken(req.headers.authorization);

    if (!apiKey) {
      throw new UnauthorizedError('Service API key is required');
    }

    if (apiKey !== config.serviceAuth.apiKey) {
      throw new UnauthorizedError('Invalid service API key');
    }

    // Set a synthetic system user so existing service code works
    req.user = {
      userId: config.serviceAuth.systemUserId,
      email: 'ai-service@system.internal',
      role: 'admin',
    };

    const source = req.headers['x-source'] as string || 'unknown';
    logger.debug('Service authenticated', { source, path: req.path });

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    next(new UnauthorizedError('Service authentication failed'));
  }
};

function extractBearerToken(header?: string): string | undefined {
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.split(' ')[1];
}
