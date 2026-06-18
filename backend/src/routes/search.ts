import { Router, Request, Response, NextFunction } from 'express';
import { isMarketRegion, parseMarket } from '../price-comparison/markets';
import { searchCanonicalProducts } from '../price-comparison/service';
import { sendError, sendSuccess } from '../middleware/response';

export const searchRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

searchRouter.get(
  '/products',
  asyncHandler(async (req: Request, res: Response) => {
    const rawMarket = req.query.market;
    if (rawMarket !== undefined && !isMarketRegion(rawMarket)) {
      sendError(res, 'INVALID_MARKET', 'market must be AU or NZ', 400);
      return;
    }

    const q = typeof req.query.q === 'string' ? req.query.q : '';
    sendSuccess(res, {
      items: await searchCanonicalProducts(q, parseMarket(rawMarket)),
    });
  }),
);
