// ── Import Routes (A7) ───────────────────────────────────────────

import { Router, Request, Response, NextFunction } from 'express';
import { getImportReport as getReport } from '../importer/orchestrator';
import { sendSuccess, sendError } from '../middleware/response';

export const importRouter = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ── GET /api/import/report/:batchId ──────────────────────────────
importRouter.get(
  '/report/:batchId',
  asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;
    if (!batchId || batchId.length < 10) {
      sendError(res, 'INVALID_PARAMETER', 'Invalid batch ID', 400);
      return;
    }

    const report = await getReport(batchId);
    if (!report) {
      sendError(res, 'BATCH_NOT_FOUND', 'Import batch not found', 404);
      return;
    }

    sendSuccess(res, report);
  }),
);
