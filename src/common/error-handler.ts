import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from './errors';
import { logger } from './logger';
import { config } from '../config';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: any[];
    stack?: string;
  };
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error caught by handler', {
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  if (err instanceof ValidationError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        errors: err.errors,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(config.env === 'development' && { stack: err.stack }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Unhandled errors
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.env === 'production' ? 'Internal server error' : err.message,
      ...(config.env === 'development' && { stack: err.stack }),
    },
  };
  res.status(500).json(response);
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
  });
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
