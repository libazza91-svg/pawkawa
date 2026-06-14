import { Request, Response, NextFunction } from 'express';
import { sendError } from './response';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('Unhandled error:', err.message);
  sendError(res, 'INTERNAL_SERVER_ERROR', err.message || 'Internal server error', 500);
}
