import type { NextFunction, Request, Response } from 'express';
import { readAdminSessionToken } from '../admin/cookies';
import { resolveAdminSession } from '../admin/auth';
import { sendError } from './response';

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readAdminSessionToken(req);
  if (!token) {
    sendError(res, 'ADMIN_UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  const session = await resolveAdminSession(token);
  if (!session) {
    sendError(res, 'ADMIN_UNAUTHORIZED', 'Authentication required', 401);
    return;
  }

  req.adminUser = session.adminUser;
  req.adminSession = {
    id: session.sessionId,
    expiresAt: session.expiresAt,
  };

  next();
}
