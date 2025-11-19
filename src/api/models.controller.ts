/**
 * AI 모델 API 컨트롤러
 *
 * 엔드포인트:
 * - GET /api/v1/models - 모델 목록
 * - GET /api/v1/models/:model_id - 모델 상세
 * - GET /api/v1/models/:model_id/evaluations - 벤치마크 평가
 * - GET /api/v1/models/:model_id/overall-scores - 종합 점수
 * - GET /api/v1/models/:model_id/pricing - 가격 정보
 * - GET /api/v1/models/:model_id/performance - 성능 지표
 * - GET /api/v1/models/:model_id/updates - 업데이트 이력
 * - GET /api/v1/models/:model_id/updates/:update_id - 특정 업데이트 상세
 * - GET /api/v1/updates/:update_id/details - 업데이트 벤치마크 상세
 * - GET /api/v1/creators - 제공사 목록
 * - GET /api/v1/creators/:creator_id - 제공사 상세
 * - GET /api/v1/creators/:creator_id/models - 제공사의 모델들
 */

import { Request, Response } from 'express';
import { ModelService } from '../services/models/ModelService';
import { CreatorService } from '../services/models/CreatorService';
import { UpdateService } from '../services/models/UpdateService';

// ============ 모델 정보 API ============

/**
 * GET /api/v1/models
 * 모델 목록 조회
 */
export async function getModels(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isActive = req.query.is_active !== 'false'; // default true

    const result = await ModelService.getModels(page, limit, isActive);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/models/:model_id
 * 모델 상세 조회
 */
export async function getModelById(req: Request, res: Response): Promise<void> {
  try {
    const { model_id } = req.params;

    const model = await ModelService.getModelById(model_id);

    if (!model) {
      res.status(404).json({
        success: false,
        error: {
          code: 'MODEL_NOT_FOUND',
          message: `Model not found: ${model_id}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: model,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/models/:model_id/evaluations
 * 모델 벤치마크 평가 조회
 */
export async function getModelEvaluations(req: Request, res: Response): Promise<void> {
  try {
    const { model_id } = req.params;

    const evaluations = await ModelService.getModelEvaluations(model_id);

    res.status(200).json({
      success: true,
      data: {
        model_id,
        evaluations,
        total: evaluations.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/models/:model_id/overall-scores
 * 모델 종합 점수 조회
 */
export async function getModelOverallScores(req: Request, res: Response): Promise<void> {
  try {
    const { model_id } = req.params;
    const version = req.query.version ? parseInt(req.query.version as string) : undefined;

    const scores = await ModelService.getModelOverallScores(model_id, version);

    res.status(200).json({
      success: true,
      data: {
        model_id,
        scores,
        total: scores.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/models/:model_id/pricing
 * 모델 가격 정보 조회
 */
export async function getModelPricing(req: Request, res: Response): Promise<void> {
  try {
    const { model_id } = req.params;
    const currentOnly = req.query.current !== 'false'; // default true

    const pricing = await ModelService.getModelPricing(model_id, currentOnly);

    res.status(200).json({
      success: true,
      data: {
        model_id,
        pricing,
        total: pricing.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/models/:model_id/performance
 * 모델 성능 지표 조회
 */
export async function getModelPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { model_id } = req.params;
    const latest = req.query.latest !== 'false'; // default true

    const performance = await ModelService.getModelPerformance(model_id, latest);

    res.status(200).json({
      success: true,
      data: {
        model_id,
        performance,
        total: performance.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// ============ 모델 업데이트 API ============

/**
 * GET /api/v1/models/:model_id/updates
 * 모델 업데이트 이력 조회
 */
export async function getModelUpdates(req: Request, res: Response): Promise<void> {
  try {
    const { model_id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string);

    // offset이 지정된 경우 특정 업데이트만 조회
    if (!isNaN(offset)) {
      const update = await UpdateService.getUpdateByOffset(model_id, offset);

      if (!update) {
        res.status(404).json({
          success: false,
          error: {
            code: 'UPDATE_NOT_FOUND',
            message: `Update not found at offset: ${offset}`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: update,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // offset이 없으면 페이지네이션된 목록 조회
    const result = await UpdateService.getModelUpdates(model_id, page, limit);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/models/:model_id/updates/:update_id
 * 특정 업데이트 상세 조회
 */
export async function getUpdateById(req: Request, res: Response): Promise<void> {
  try {
    const { update_id } = req.params;
    const updateIdNum = parseInt(update_id);

    const update = await UpdateService.getUpdateById(updateIdNum);

    if (!update) {
      res.status(404).json({
        success: false,
        error: {
          code: 'UPDATE_NOT_FOUND',
          message: `Update not found: ${update_id}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: update,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/updates/:update_id/details
 * 업데이트 벤치마크 상세 조회
 */
export async function getUpdateDetails(req: Request, res: Response): Promise<void> {
  try {
    const { update_id } = req.params;
    const updateIdNum = parseInt(update_id);

    const details = await UpdateService.getUpdateDetails(updateIdNum);

    res.status(200).json({
      success: true,
      data: {
        update_id: updateIdNum,
        details,
        total: details.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// ============ 제공사 API ============

/**
 * GET /api/v1/creators
 * 제공사 목록 조회
 */
export async function getCreators(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isActive = req.query.is_active !== 'false'; // default true

    const result = await CreatorService.getCreators(page, limit, isActive);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/creators/:creator_id
 * 제공사 상세 조회
 */
export async function getCreatorById(req: Request, res: Response): Promise<void> {
  try {
    const { creator_id } = req.params;

    const creator = await CreatorService.getCreatorById(creator_id);

    if (!creator) {
      res.status(404).json({
        success: false,
        error: {
          code: 'CREATOR_NOT_FOUND',
          message: `Creator not found: ${creator_id}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: creator,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * GET /api/v1/creators/:creator_id/models
 * 제공사의 모델 목록 조회
 */
export async function getCreatorModels(req: Request, res: Response): Promise<void> {
  try {
    const { creator_id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await CreatorService.getCreatorModels(creator_id, page, limit);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
