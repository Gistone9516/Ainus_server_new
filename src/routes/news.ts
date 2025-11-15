/**
 * 뉴스 분류 라우트 (Feature #9)
 * POST /api/v1/news/classify - 단일 뉴스 분류
 * POST /api/v1/news/classify/batch - 배치 분류
 * GET /api/v1/news/classifications/{classification_id} - 분류 결과 조회
 * GET /api/v1/news/manual-review - 수동 검토 대기 항목 조회
 * POST /api/v1/news/manual-review/{review_id}/confirm - 수동 검토 결과 저장
 */

import { Router, Request, Response } from 'express';
import { Logger } from '../database/logger';
import { requireAuth } from '../middleware/auth';
import {
  classifyNews,
  classifyNewsBatch,
  saveClassification,
  getClassification,
} from '../services/NewsClassificationService';
import {
  getManualReviewQueue,
  getManualReviewItem,
  confirmManualReview,
  rejectManualReview,
} from '../services/ManualReviewService';
import {
  ClassifyNewsRequest,
  BatchClassifyRequest,
  ManualReviewConfirmRequest,
  ApiResponse,
} from '../types';

const router = Router();
const logger = new Logger('NewsRoutes');

/**
 * POST /api/v1/news/classify
 * 단일 뉴스 제목 분류
 */
router.post('/classify', async (req: Request, res: Response) => {
  try {
    const { news_title, news_source, published_at, content_preview } = req.body;

    // 입력 검증
    if (!news_title) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EmptyTitle',
          message: '뉴스 제목을 입력해주세요',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (news_title.length > 500) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TitleTooLong',
          message: '제목은 500자 이하여야 합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const request: ClassifyNewsRequest = {
      news_title,
      news_source,
      published_at,
      content_preview,
    };

    const result = await classifyNews(request);

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    logger.error('뉴스 분류 실패', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'SLMModelError',
        message: error.message || '분류 모델 실행 중 오류가 발생했습니다',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * POST /api/v1/news/classify/batch
 * 배치 뉴스 분류 (관리자용)
 */
router.post('/classify/batch', requireAuth, async (req: Request, res: Response) => {
  try {
    const { articles, reprocess_unconfirmed } = req.body;

    // 입력 검증
    if (!articles || !Array.isArray(articles)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidFormat',
          message: '요청 형식이 올바르지 않습니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (articles.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EmptyArticles',
          message: '분류할 기사가 없습니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (articles.length > 500) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TooManyArticles',
          message: '배치는 최대 500개 기사까지 처리 가능합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const request: BatchClassifyRequest = {
      articles,
      reprocess_unconfirmed,
    };

    const result = await classifyNewsBatch(request);

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    logger.error('배치 분류 실패', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'SLMModelError',
        message: error.message || '분류 모델 실행 중 오류가 발생했습니다',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * GET /api/v1/news/classifications/:classification_id
 * 분류 결과 조회
 */
router.get('/classifications/:classification_id', async (req: Request, res: Response) => {
  try {
    const { classification_id } = req.params;

    if (!classification_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidParameter',
          message: 'classification_id가 필요합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const result = await getClassification(classification_id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NotFound',
          message: '분류 결과를 찾을 수 없습니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    logger.error('분류 결과 조회 실패', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'InternalError',
        message: '분류 결과 조회 중 오류가 발생했습니다',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * GET /api/v1/news/manual-review
 * 수동 검토 대기 항목 조회 (관리자용)
 */
router.get('/manual-review', requireAuth, async (req: Request, res: Response) => {
  try {
    let limit = parseInt(req.query.limit as string) || 20;
    let offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sort_by as string) || 'created_at';
    const confidenceMin = parseFloat(req.query.confidence_min as string) || 0;

    // 입력 검증
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidParameter',
          message: 'limit은 1-100 범위여야 합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (confidenceMin < 0 || confidenceMin > 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidParameter',
          message: '신뢰도는 0-1 범위여야 합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const result = await getManualReviewQueue(
      limit,
      offset,
      sortBy as any,
      confidenceMin
    );

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    logger.error('수동 검토 조회 실패', error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'InternalError',
        message: '수동 검토 항목 조회 중 오류가 발생했습니다',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * POST /api/v1/news/manual-review/:review_id/confirm
 * 수동 검토 결과 저장 (관리자용)
 */
router.post('/manual-review/:review_id/confirm', requireAuth, async (req: Request, res: Response) => {
  try {
    const { review_id } = req.params;
    const { confirmed_tags, rejected_tags, notes, reviewer_id } = req.body;

    // 입력 검증
    if (!review_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidParameter',
          message: 'review_id가 필요합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!Array.isArray(confirmed_tags) || typeof reviewer_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidFormat',
          message: '요청 형식이 올바르지 않습니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const request: ManualReviewConfirmRequest = {
      confirmed_tags: confirmed_tags || [],
      rejected_tags: rejected_tags || [],
      notes: notes || '',
      reviewer_id,
    };

    const result = await confirmManualReview(review_id, request);

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    logger.error('수동 검토 확정 실패', error);

    const statusCode = error.message.includes('찾을 수 없습니다') ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NotFound' : 'InternalError',
        message: error.message || '수동 검토 결과 저장 중 오류가 발생했습니다',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

/**
 * POST /api/v1/news/manual-review/:review_id/reject
 * 수동 검토 거절 (관리자용)
 */
router.post('/manual-review/:review_id/reject', requireAuth, async (req: Request, res: Response) => {
  try {
    const { review_id } = req.params;
    const { reason, reviewer_id } = req.body;

    // 입력 검증
    if (!review_id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidParameter',
          message: 'review_id가 필요합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (typeof reviewer_id !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'InvalidFormat',
          message: 'reviewer_id가 필요합니다',
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const result = await rejectManualReview(review_id, reason || '', reviewer_id);

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  } catch (error: any) {
    logger.error('수동 검토 거절 실패', error);

    const statusCode = error.message.includes('찾을 수 없습니다') ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode === 404 ? 'NotFound' : 'InternalError',
        message: error.message || '수동 검토 거절 중 오류가 발생했습니다',
      },
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

export default router;
