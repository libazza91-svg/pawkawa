import { Router, Request, Response, NextFunction } from 'express';
import { listMarkets } from '../price-comparison/service';
import { sendSuccess } from '../middleware/response';

export const marketsRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

marketsRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    sendSuccess(res, listMarkets());
  }),
);
