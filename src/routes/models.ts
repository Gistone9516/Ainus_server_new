import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import * as ModelUpdateService from '../services/ModelUpdateService';
import * as IssueIndexService from '../services/IssueIndexService';
import { ValidationException } from '../exceptions';

const router = Router();

router.get('/issue-index/latest', asyncHandler(async (req: Request, res: Response) => {
  const result = await IssueIndexService.getLatestIssueIndex();
  res.status(200).json({ success: true, data: result });
}));

router.get('/issue-index/recent', asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const result = await IssueIndexService.getRecentIndexTrend(days);
  res.status(200).json({ success: true, data: result });
}));

router.get('/issue-index/by-category', asyncHandler(async (req: Request, res: Response) => {
  const result = await IssueIndexService.getLatestIndexByCategory();
  res.status(200).json({ success: true, data: result });
}));

router.get('/updates/recent', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const result = await ModelUpdateService.getRecentUpdates(limit, offset);
  res.status(200).json({ success: true, data: result });
}));

router.get('/:modelId/updates', asyncHandler(async (req: Request, res: Response) => {
  const modelId = parseInt(req.params.modelId);
  if (isNaN(modelId)) {
    throw new ValidationException('유효하지 않은 모델 ID입니다.', 'getModelUpdates');
  }
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const offset = (page - 1) * limit;

  const result = await ModelUpdateService.getUpdatesByModelId(modelId, limit, offset);
  res.status(200).json({ success: true, data: result });
}));

router.get('/:modelId/updates/:updateId', asyncHandler(async (req: Request, res: Response) => {
  const updateId = parseInt(req.params.updateId);
  if (isNaN(updateId)) {
    throw new ValidationException('유효하지 않은 업데이트 ID입니다.', 'getUpdateDetails');
  }

  const result = await ModelUpdateService.getUpdateDetails(updateId);
  res.status(200).json({ success: true, data: result });
}));

router.post('/:modelId/interest', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const modelId = parseInt(req.params.modelId);
  if (isNaN(modelId)) {
    throw new ValidationException('유효하지 않은 모델 ID입니다.', 'addInterest');
  }

  const result = await ModelUpdateService.addInterestedModel(userId, modelId);
  res.status(201).json({ success: true, data: result });
}));

router.delete('/:modelId/interest', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const modelId = parseInt(req.params.modelId);
  if (isNaN(modelId)) {
    throw new ValidationException('유효하지 않은 모델 ID입니다.', 'removeInterest');
  }

  const result = await ModelUpdateService.removeInterestedModel(userId, modelId);
  res.status(200).json({ success: true, data: result });
}));

export default router;