import { Router, Request, Response, NextFunction } from 'express';
import { persistDiscoveredProducts } from '../discovery/repository';
import { runAustralianRetailDiscovery } from '../discovery/service';
import { sendSuccess } from '../middleware/response';

export const discoveryRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

discoveryRouter.post(
  '/australian-retail',
  asyncHandler(async (req: Request, res: Response) => {
    const persist = req.query.persist === 'true' || req.body?.persist === true;
    const result = await runAustralianRetailDiscovery();
    const persisted = persist ? await persistDiscoveredProducts(result.products) : null;

    sendSuccess(res, {
      ...result,
      persisted,
    });
  }),
);
