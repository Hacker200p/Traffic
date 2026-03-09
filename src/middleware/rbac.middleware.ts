import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../../common/errors';

type Role = 'admin' | 'police' | 'analyst';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError(`Role '${req.user.role}' is not authorized to access this resource`));
      return;
    }

    next();
  };
};

// Convenience helpers
export const adminOnly = authorize('admin');
export const policeAndAdmin = authorize('admin', 'police');
export const allRoles = authorize('admin', 'police', 'analyst');
