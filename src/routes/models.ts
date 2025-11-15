/**
 * 모델 관련 API 라우터 (통합)
 * - 기능 #4: 사용자 입력 기반 AI 모델 추천
 * - 기능 #5/#6: 이슈 인덱스 및 모델 업데이트 추적
 *
 * 엔드포인트:
 * [모델 추천]
 * - POST /api/v1/models/recommend-by-input (통합 SLM 분류 + 추천)
 * - POST /api/v1/models/recommend-by-category (카테고리 기반 추천)
 * - POST /api/v1/slm/classify (SLM 분류)
 * - GET /api/v1/categories (카테고리 조회)
 *
 * [이슈 인덱스 & 모델 업데이트]
 * - GET /api/v1/models/issue-index/latest
 * - GET /api/v1/models/issue-index/recent
 * - GET /api/v1/models/issue-index/by-category
 * - GET /api/v1/models/updates/recent
 * - GET /api/v1/models/:modelId/updates
 * - GET /api/v1/models/:modelId/updates/:updateId
 * - POST /api/v1/models/:modelId/interest
 * - DELETE /api/v1/models/:modelId/interest
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { createGlobalRateLimiter } from '../middleware/rateLimiter';
import { Logger } from '../database/logger';

// 모델 추천 관련 서비스
import {
  recommendModelsByInput,
  recommendModelsByCategory,
  getAllCategoriesList
} from '../services/ModelRecommendationService';
import { classifyWithAlternatives } from '../services/SlmClassificationService';

// 이슈 인덱스 & 모델 업데이트 관련 서비스
import * as ModelUpdateService from '../services/ModelUpdateService';
import * as IssueIndexService from '../services/IssueIndexService';

import { ApiResponse, RecommendByInputRequest, RecommendByCategoryRequest, SlmClassifyRequest } from '../types';
import { AgentException, ValidationException } from '../exceptions';

const logger = new Logger('ModelsRouter');
const router = Router();

// Rate Limiter: 모델 추천 API는 50 req/min
const recommendRateLimiter = createGlobalRateLimiter({
  windowMs: 60 * 1000,     // 1분
  max: 50,                 // 최대 50회
  message: '요청 횟수를 초과했습니다 (ERROR_4001)'
});

/**
 * ========================================
 * 모델 추천 API (기능 #4)
 * ========================================
 */

/**
 * POST /api/v1/models/recommend-by-input
 * 통합 SLM 분류 + 모델 추천
 */
router.post('/recommend-by-input', recommendRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const methodName = 'POST /models/recommend-by-input';
  const workflowId = (req as any).workflowId;

  try {
    const request: RecommendByInputRequest = {
      user_input: req.body.user_input,
      user_id: req.body.user_id,
      limit: req.body.limit
    };

    logger.info(`${methodName} 시작`, {
      workflowId,
      hasUserId: !!request.user_id,
      inputLength: request.user_input?.length || 0
    });

    const result = await recommendModelsByInput(request);

    logger.info(`${methodName} 성공`, {
      workflowId,
      categoryId: result.classification.category_id,
      modelCount: result.recommended_models.length
    });

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);

  } catch (error) {
    if (error instanceof AgentException) {
      const httpStatus = getHttpStatusFromException(error);
      logger.warn(`${methodName} 실패 [${error.code}]`, {
        workflowId,
        code: error.code,
        message: error.message,
        method: error.method
      });

      return res.status(httpStatus).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: {
            method: error.method,
            retryable: error.retry_able
          }
        },
        timestamp: new Date().toISOString(),
        workflow_id: workflowId
      } as ApiResponse);
    }

    logger.error(`${methodName} 예상 외 에러`, {
      workflowId,
      error: error instanceof Error ? error.message : String(error)
    });

    return res.status(500).json({
      success: false,
      error: {
        code: '9999',
        message: '알 수 없는 오류가 발생했습니다'
      },
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);
  }
}));

/**
 * POST /api/v1/models/recommend-by-category
 * 카테고리 기반 모델 추천
 */
router.post('/recommend-by-category', recommendRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const methodName = 'POST /models/recommend-by-category';
  const workflowId = (req as any).workflowId;

  try {
    const request: RecommendByCategoryRequest = {
      category_id: req.body.category_id,
      user_id: req.body.user_id,
      limit: req.body.limit
    };

    logger.info(`${methodName} 시작`, {
      workflowId,
      categoryId: request.category_id
    });

    const result = await recommendModelsByCategory(request);

    logger.info(`${methodName} 성공`, {
      workflowId,
      categoryId: request.category_id,
      modelCount: result.recommended_models.length
    });

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);

  } catch (error) {
    if (error instanceof AgentException) {
      const httpStatus = getHttpStatusFromException(error);
      logger.warn(`${methodName} 실패 [${error.code}]`, {
        workflowId,
        code: error.code,
        message: error.message
      });

      return res.status(httpStatus).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        timestamp: new Date().toISOString(),
        workflow_id: workflowId
      } as ApiResponse);
    }

    logger.error(`${methodName} 예상 외 에러`, { workflowId, error });
    return res.status(500).json({
      success: false,
      error: {
        code: '9999',
        message: '알 수 없는 오류가 발생했습니다'
      },
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);
  }
}));

/**
 * POST /api/v1/slm/classify
 * SLM 분류 (저신뢰도 시 대체 옵션 제시)
 */
router.post('/slm/classify', recommendRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const methodName = 'POST /slm/classify';
  const workflowId = (req as any).workflowId;

  try {
    const request: SlmClassifyRequest = {
      user_input: req.body.user_input,
      top_k: req.body.top_k
    };

    logger.info(`${methodName} 시작`, { workflowId });

    const result = await classifyWithAlternatives(request.user_input, request.top_k, methodName);

    logger.info(`${methodName} 성공`, {
      workflowId,
      categoryId: result.category_id,
      confidence: result.confidence
    });

    return res.status(200).json({
      success: true,
      data: {
        primary: {
          category_id: result.category_id,
          category_name: result.category_name,
          confidence: result.confidence,
          is_confident: result.is_confident
        },
        alternatives: result.alternatives || []
      },
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);

  } catch (error) {
    if (error instanceof AgentException) {
      const httpStatus = getHttpStatusFromException(error);
      logger.warn(`${methodName} 실패 [${error.code}]`, {
        workflowId,
        code: error.code,
        message: error.message
      });

      return res.status(httpStatus).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        timestamp: new Date().toISOString(),
        workflow_id: workflowId
      } as ApiResponse);
    }

    logger.error(`${methodName} 예상 외 에러`, { workflowId, error });
    return res.status(500).json({
      success: false,
      error: {
        code: '9999',
        message: '알 수 없는 오류가 발생했습니다'
      },
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);
  }
}));

/**
 * GET /api/v1/categories
 * 모든 카테고리 조회
 */
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const methodName = 'GET /categories';
  const workflowId = (req as any).workflowId;

  try {
    logger.info(`${methodName} 시작`, { workflowId });

    const categories = await getAllCategoriesList();

    logger.info(`${methodName} 성공`, {
      workflowId,
      categoryCount: categories.length
    });

    return res.status(200).json({
      success: true,
      data: {
        categories,
        total: categories.length
      },
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);

  } catch (error) {
    if (error instanceof AgentException) {
      const httpStatus = getHttpStatusFromException(error);
      logger.warn(`${methodName} 실패 [${error.code}]`, {
        workflowId,
        code: error.code
      });

      return res.status(httpStatus).json({
        success: false,
        error: {
          code: error.code,
          message: error.message
        },
        timestamp: new Date().toISOString(),
        workflow_id: workflowId
      } as ApiResponse);
    }

    logger.error(`${methodName} 예상 외 에러`, { workflowId, error });
    return res.status(500).json({
      success: false,
      error: {
        code: '9999',
        message: '알 수 없는 오류가 발생했습니다'
      },
      timestamp: new Date().toISOString(),
      workflow_id: workflowId
    } as ApiResponse);
  }
}));

/**
 * ========================================
 * 이슈 인덱스 & 모델 업데이트 API (기능 #5/#6)
 * ========================================
 */

/**
 * GET /api/v1/models/issue-index/latest
 * 최신 이슈 인덱스 조회
 */
router.get('/issue-index/latest', asyncHandler(async (req: Request, res: Response) => {
  const result = await IssueIndexService.getLatestIssueIndex();
  res.status(200).json({ success: true, data: result });
}));

/**
 * GET /api/v1/models/issue-index/recent
 * 최근 이슈 인덱스 트렌드
 */
router.get('/issue-index/recent', asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const result = await IssueIndexService.getRecentIndexTrend(days);
  res.status(200).json({ success: true, data: result });
}));

/**
 * GET /api/v1/models/issue-index/by-category
 * 카테고리별 최신 이슈 인덱스
 */
router.get('/issue-index/by-category', asyncHandler(async (req: Request, res: Response) => {
  const result = await IssueIndexService.getLatestIndexByCategory();
  res.status(200).json({ success: true, data: result });
}));

/**
 * GET /api/v1/models/updates/recent
 * 최근 모델 업데이트 목록
 */
router.get('/updates/recent', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const result = await ModelUpdateService.getRecentUpdates(limit, offset);
  res.status(200).json({ success: true, data: result });
}));

/**
 * GET /api/v1/models/:modelId/updates
 * 특정 모델의 업데이트 이력
 */
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

/**
 * GET /api/v1/models/:modelId/updates/:updateId
 * 특정 업데이트 상세 정보
 */
router.get('/:modelId/updates/:updateId', asyncHandler(async (req: Request, res: Response) => {
  const updateId = parseInt(req.params.updateId);
  if (isNaN(updateId)) {
    throw new ValidationException('유효하지 않은 업데이트 ID입니다.', 'getUpdateDetails');
  }

  const result = await ModelUpdateService.getUpdateDetails(updateId);
  res.status(200).json({ success: true, data: result });
}));

/**
 * POST /api/v1/models/:modelId/interest
 * 관심 모델 추가
 */
router.post('/:modelId/interest', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const modelId = parseInt(req.params.modelId);
  if (isNaN(modelId)) {
    throw new ValidationException('유효하지 않은 모델 ID입니다.', 'addInterest');
  }

  const result = await ModelUpdateService.addInterestedModel(userId, modelId);
  res.status(201).json({ success: true, data: result });
}));

/**
 * DELETE /api/v1/models/:modelId/interest
 * 관심 모델 제거
 */
router.delete('/:modelId/interest', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const modelId = parseInt(req.params.modelId);
  if (isNaN(modelId)) {
    throw new ValidationException('유효하지 않은 모델 ID입니다.', 'removeInterest');
  }

  const result = await ModelUpdateService.removeInterestedModel(userId, modelId);
  res.status(200).json({ success: true, data: result });
}));

/**
 * ===== 헬퍼 함수 =====
 */

/**
 * 예외 타입에 따라 HTTP 상태 코드 결정
 */
function getHttpStatusFromException(error: AgentException): number {
  const statusMap: Record<string, number> = {
    'VALIDATION_ERROR': 400,
    'AUTH_ERROR': 401,
    'API_ERROR': 503,
    'DB_ERROR': 500,
    'TIMEOUT_ERROR': 504,
    'RATE_LIMIT_ERROR': 429,
    'LOGIC_ERROR': 500
  };

  return statusMap[error.code] || 500;
}

export default router;
