import type { AdminUserPublic } from '../admin/auth';

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUserPublic;
      adminSession?: {
        id: number;
        expiresAt: Date;
      };
    }
  }
}

export {};
