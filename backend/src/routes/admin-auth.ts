import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ADMIN_INVALID_CREDENTIALS_MESSAGE,
  ADMIN_STATUS_ACTIVE,
} from '../admin/constants';
import { assertAdminLoginAllowed, clearAdminLoginFailures, registerAdminLoginFailure } from '../admin/login-rate-limit';
import { authenticateAdminCredentials, createAdminSession, assertGenericAdminLoginFailure, revokeAdminSession } from '../admin/auth';
import { clearAdminSessionCookie, setAdminSessionCookie } from '../admin/cookies';
import { requireAdminAuth } from '../middleware/admin-auth';
import { sendError, sendSuccess } from '../middleware/response';

export const adminAuthRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

adminAuthRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'INVALID_PARAMETER', 'Email and password are required', 400);
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    try {
      assertAdminLoginAllowed(parsed.data.email.trim().toLowerCase(), ip);
    } catch (error) {
      sendError(res, 'ADMIN_RATE_LIMITED', (error as Error).message, 429);
      return;
    }

    const user = await authenticateAdminCredentials(parsed.data.email, parsed.data.password);
    if (!user || user.status !== ADMIN_STATUS_ACTIVE) {
      registerAdminLoginFailure(parsed.data.email.trim().toLowerCase(), ip);
      try {
        assertGenericAdminLoginFailure();
      } catch (error) {
        sendError(res, 'ADMIN_INVALID_CREDENTIALS', (error as Error).message || ADMIN_INVALID_CREDENTIALS_MESSAGE, 401);
        return;
      }
    }

    clearAdminLoginFailures(parsed.data.email.trim().toLowerCase(), ip);
    const session = await createAdminSession(user.id);
    setAdminSessionCookie(res, session.token, session.expiresAt);
    sendSuccess(res, { user });
  }),
);

adminAuthRouter.post(
  '/logout',
  requireAdminAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await revokeAdminSession(req.adminSession!.id, req.adminUser!.id);
    clearAdminSessionCookie(res);
    sendSuccess(res, { logged_out: true });
  }),
);

adminAuthRouter.get(
  '/me',
  requireAdminAuth,
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, { user: req.adminUser });
  }),
);
