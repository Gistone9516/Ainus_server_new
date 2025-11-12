/**
 * 모델 추천 API 라우터
 * 기능 #4: 사용자 입력 기반 AI 모델 추천
 *
 * 엔드포인트:
 * - POST /api/v1/models/recommend-by-input (통합 SLM 분류 + 추천)
 * - POST /api/v1/models/recommend-by-category (카테고리 기반 추천)
 * - POST /api/v1/slm/classify (SLM 분류)
 * - GET /api/v1/categories (카테고리 조회)
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { createGlobalRateLimiter } from '../middleware/rateLimiter';
import { Logger } from '../database/logger';
import {
  recommendModelsByInput,
  recommendModelsByCategory,
  getAllCategoriesList
} from '../services/ModelRecommendationService';
import { classifyWithAlternatives } from '../services/SlmClassificationService';
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

router.use(recommendRateLimiter);

/**
 * POST /api/v1/models/recommend-by-input
 * 통합 SLM 분류 + 모델 추천
 *
 * 요청:
 * {
 *   "user_input": "블로그 글을 SEO 최적화해서 써줄 수 있어?",
 *   "user_id": "123" (선택사항),
 *   "limit": 5 (선택사항, 기본값: 5, 범위: 1-10)
 * }
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "classification": { ... },
 *     "recommended_models": [ ... ]
 *   },
 *   "timestamp": "2025-11-11T10:30:00Z"
 * }
 */
router.post('/recommend-by-input', asyncHandler(async (req: Request, res: Response) => {
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

    // 서비스 호출
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

    // 예상 외 에러
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
 *
 * 요청:
 * {
 *   "category_id": 1,
 *   "user_id": "123" (선택사항),
 *   "limit": 5 (선택사항)
 * }
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "category": { ... },
 *     "recommended_models": [ ... ]
 *   }
 * }
 */
router.post('/recommend-by-category', asyncHandler(async (req: Request, res: Response) => {
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
 *
 * 요청:
 * {
 *   "user_input": "오늘 뭐 만들어 먹고 싶은데",
 *   "top_k": 3 (선택사항, 기본값: 3, 최대: 5)
 * }
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "primary": { ... },
 *     "alternatives": [ ... ]
 *   }
 * }
 */
router.post('/slm/classify', asyncHandler(async (req: Request, res: Response) => {
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
 *
 * 응답:
 * {
 *   "success": true,
 *   "data": {
 *     "categories": [ ... ],
 *     "total": 25
 *   }
 * }
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
