import type { NextFunction, Request, Response } from 'express';
import { validateAdminCsrfToken } from '../admin/csrf';
import { sendError } from './response';

export function requireAdminCsrf(req: Request, res: Response, next: NextFunction): void {
  if (!req.adminSession || !req.adminUser) {
    sendError(res, 'ADMIN_UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  const token = req.header('x-csrf-token') || undefined;
  const isValid = validateAdminCsrfToken(token, {
    sessionId: req.adminSession.id,
    adminUserId: req.adminUser.id,
  });

  if (!isValid) {
    sendError(res, 'ADMIN_CSRF_INVALID', 'Invalid CSRF token', 403);
    return;
  }

  next();
}
