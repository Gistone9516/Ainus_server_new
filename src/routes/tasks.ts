/**
 * 작업 분류 및 추천 라우트
 */

import { Router } from 'express';
import {
  classifyTaskHandler,
  classifyAndRecommendHandler,
  getTaskCategoriesHandler,
  recommendByTaskCategoryHandler,
} from '../api/tasks.controller';

const router = Router();

// ============ 작업 분류 라우트 ============

/**
 * POST /api/v1/tasks/classify
 * 사용자 입력을 25개 작업 카테고리로 분류
 * Body: { user_input: string }
 */
router.post('/classify', classifyTaskHandler);

/**
 * POST /api/v1/tasks/classify-and-recommend
 * 작업 분류 및 모델 추천 (통합 API)
 * Body: { user_input: string, limit?: number }
 */
router.post('/classify-and-recommend', classifyAndRecommendHandler);

// ============ 작업 카테고리 라우트 ============

/**
 * GET /api/v1/tasks/categories
 * 모든 작업 카테고리 목록 조회
 */
router.get('/categories', getTaskCategoriesHandler);

/**
 * GET /api/v1/tasks/categories/:category_code/recommend
 * 특정 카테고리로 모델 추천
 * Params: category_code
 * Query: limit (default: 3)
 */
router.get('/categories/:category_code/recommend', recommendByTaskCategoryHandler);

export default router;
