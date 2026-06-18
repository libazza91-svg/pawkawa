import { Router, Request, Response, NextFunction } from 'express';
import { isMarketRegion, parseMarket } from '../price-comparison/markets';
import { getPriceComparison, getProductOffers } from '../price-comparison/service';
import { sendError, sendSuccess } from '../middleware/response';

export const priceComparisonRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function readMarket(req: Request, res: Response) {
  const rawMarket = req.query.market;
  if (rawMarket !== undefined && !isMarketRegion(rawMarket)) {
    sendError(res, 'INVALID_MARKET', 'market must be AU or NZ', 400);
    return null;
  }
  return parseMarket(rawMarket);
}

priceComparisonRouter.get(
  '/:slug/offers',
  asyncHandler(async (req: Request, res: Response) => {
    const market = readMarket(req, res);
    if (!market) return;

    const result = await getProductOffers(req.params.slug, market);
    if (!result) {
      sendError(res, 'PRODUCT_NOT_FOUND', 'Product not found', 404);
      return;
    }

    sendSuccess(res, result);
  }),
);

priceComparisonRouter.get(
  '/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const market = readMarket(req, res);
    if (!market) return;

    const result = await getPriceComparison(req.params.slug, market);
    if (!result) {
      sendError(res, 'PRODUCT_NOT_FOUND', 'Product not found', 404);
      return;
    }

    sendSuccess(res, result);
  }),
);
