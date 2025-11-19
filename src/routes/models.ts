/**
 * AI 모델 라우트
 */

import { Router } from 'express';
import {
  // 모델 정보
  getModels,
  getModelById,
  getModelEvaluations,
  getModelOverallScores,
  getModelPricing,
  getModelPerformance,
  // 모델 업데이트
  getModelUpdates,
  getUpdateById,
  getUpdateDetails,
  // 제공사
  getCreators,
  getCreatorById,
  getCreatorModels,
} from '../api/models.controller';

const router = Router();

// ============ 모델 정보 라우트 ============

/**
 * GET /api/v1/models
 * 모델 목록 조회
 * Query: page, limit, is_active
 */
router.get('/', getModels);

/**
 * GET /api/v1/models/:model_id
 * 모델 상세 조회
 */
router.get('/:model_id', getModelById);

/**
 * GET /api/v1/models/:model_id/evaluations
 * 모델 벤치마크 평가 조회
 */
router.get('/:model_id/evaluations', getModelEvaluations);

/**
 * GET /api/v1/models/:model_id/overall-scores
 * 모델 종합 점수 조회
 * Query: version (optional)
 */
router.get('/:model_id/overall-scores', getModelOverallScores);

/**
 * GET /api/v1/models/:model_id/pricing
 * 모델 가격 정보 조회
 * Query: current (default: true)
 */
router.get('/:model_id/pricing', getModelPricing);

/**
 * GET /api/v1/models/:model_id/performance
 * 모델 성능 지표 조회
 * Query: latest (default: true)
 */
router.get('/:model_id/performance', getModelPerformance);

// ============ 모델 업데이트 라우트 ============

/**
 * GET /api/v1/models/:model_id/updates
 * 모델 업데이트 이력 조회
 * Query: page, limit, offset (offset이 있으면 특정 업데이트만 조회)
 */
router.get('/:model_id/updates', getModelUpdates);

/**
 * GET /api/v1/models/:model_id/updates/:update_id
 * 특정 업데이트 상세 조회
 */
router.get('/:model_id/updates/:update_id', getUpdateById);

export default router;

// ============ 별도 라우터 (업데이트 상세, 제공사) ============
// 이 라우트들은 /api/v1에 직접 마운트됩니다

export const updateRouter = Router();
export const creatorRouter = Router();

/**
 * GET /api/v1/updates/:update_id/details
 * 업데이트 벤치마크 상세 조회
 */
updateRouter.get('/:update_id/details', getUpdateDetails);

/**
 * GET /api/v1/creators
 * 제공사 목록 조회
 * Query: page, limit, is_active
 */
creatorRouter.get('/', getCreators);

/**
 * GET /api/v1/creators/:creator_id
 * 제공사 상세 조회
 */
creatorRouter.get('/:creator_id', getCreatorById);

/**
 * GET /api/v1/creators/:creator_id/models
 * 제공사의 모델 목록 조회
 * Query: page, limit
 */
creatorRouter.get('/:creator_id/models', getCreatorModels);
