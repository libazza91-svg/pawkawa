import { Router, Request, Response } from 'express';
import { checkConnection } from '../db/client';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/db', async (_req: Request, res: Response) => {
  try {
    const connected = await checkConnection();
    if (connected) {
      res.status(200).json({ status: 'healthy', database: 'connected' });
    } else {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});
