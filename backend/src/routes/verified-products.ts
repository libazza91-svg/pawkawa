import { Router, Request, Response, NextFunction } from 'express';
import {
  getCompareReadyProduct,
  getVerifiedProductDetail,
  listVerifiedProducts,
  parseVerifiedProductListQuery,
} from '../verified-products/service';
import { sendError, sendSuccess } from '../middleware/response';

export const verifiedProductsRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

verifiedProductsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = parseVerifiedProductListQuery(req.query);
    sendSuccess(res, listVerifiedProducts(query));
  }),
);

verifiedProductsRouter.get(
  '/:slug/compare-ready',
  asyncHandler(async (req: Request, res: Response) => {
    const query = parseVerifiedProductListQuery(req.query);
    const product = getCompareReadyProduct(req.params.slug, query.need_code);
    if (!product) {
      sendError(res, 'PRODUCT_NOT_FOUND', 'Verified product not found', 404);
      return;
    }

    sendSuccess(res, product);
  }),
);

verifiedProductsRouter.get(
  '/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const product = getVerifiedProductDetail(req.params.slug);
    if (!product) {
      sendError(res, 'PRODUCT_NOT_FOUND', 'Verified product not found', 404);
      return;
    }

    sendSuccess(res, product);
  }),
);
