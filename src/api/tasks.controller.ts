/**
 * 작업 분류 및 추천 API 컨트롤러
 *
 * 엔드포인트:
 * - POST /api/v1/tasks/classify - 작업 분류
 * - POST /api/v1/tasks/classify-and-recommend - 작업 분류 및 모델 추천 (통합)
 * - GET /api/v1/tasks/categories - 작업 카테고리 목록
 * - GET /api/v1/tasks/categories/:category_code/recommend - 특정 카테고리로 모델 추천
 */

import { Request, Response } from 'express';
import { classifyTask } from '../services/tasks/TaskClassificationService';
import { TaskRecommendationService } from '../services/tasks/TaskRecommendationService';
import {
  ClassifyTaskRequest,
  ClassifyTaskResponse,
  ClassifyAndRecommendRequest,
  ClassifyAndRecommendResponse,
  GetTaskCategoriesResponse,
  RecommendByTaskCategoryResponse,
} from '@/types/task.types';

// ============ 작업 분류 API ============

/**
 * POST /api/v1/tasks/classify
 * 사용자 입력을 25개 작업 카테고리로 분류
 */
export async function classifyTaskHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { user_input } = req.body as ClassifyTaskRequest;

    // 입력 검증
    if (!user_input || typeof user_input !== 'string' || user_input.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'user_input is required and must be a non-empty string',
      } as ClassifyTaskResponse);
      return;
    }

    // 작업 분류 실행
    const result = await classifyTask(user_input);

    res.status(200).json({
      success: true,
      data: result,
    } as ClassifyTaskResponse);
  } catch (error) {
    console.error('Error in classifyTaskHandler:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ClassifyTaskResponse);
  }
}

/**
 * POST /api/v1/tasks/classify-and-recommend
 * 작업 분류 및 모델 추천 (통합 API)
 */
export async function classifyAndRecommendHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { user_input, limit = 3 } = req.body as ClassifyAndRecommendRequest;

    // 입력 검증
    if (!user_input || typeof user_input !== 'string' || user_input.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'user_input is required and must be a non-empty string',
      } as ClassifyAndRecommendResponse);
      return;
    }

    // 시작 시간 기록
    const startTime = Date.now();

    // Step 1: 작업 분류
    const classificationStartTime = Date.now();
    const classification = await classifyTask(user_input);
    const classificationTime = Date.now() - classificationStartTime;

    // Step 2: 모델 추천
    const recommendationStartTime = Date.now();
    const recommendation =
      await TaskRecommendationService.recommendByTaskCategoryCode(
        classification.category_code,
        limit
      );
    const recommendationTime = Date.now() - recommendationStartTime;

    // 응답 구성
    res.status(200).json({
      success: true,
      data: {
        classification,
        criteria: recommendation.criteria,
        recommended_models: recommendation.recommended_models,
        metadata: {
          total_models_evaluated: recommendation.recommended_models.length,
          classification_time_ms: classificationTime,
          recommendation_time_ms: recommendationTime,
        },
      },
    } as ClassifyAndRecommendResponse);
  } catch (error) {
    console.error('Error in classifyAndRecommendHandler:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ClassifyAndRecommendResponse);
  }
}

// ============ 작업 카테고리 조회 API ============

/**
 * GET /api/v1/tasks/categories
 * 모든 작업 카테고리 목록 조회
 */
export async function getTaskCategoriesHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const categories = await TaskRecommendationService.getAllTaskCategories();

    res.status(200).json({
      success: true,
      data: categories,
    } as GetTaskCategoriesResponse);
  } catch (error) {
    console.error('Error in getTaskCategoriesHandler:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as GetTaskCategoriesResponse);
  }
}

/**
 * GET /api/v1/tasks/categories/:category_code/recommend
 * 특정 카테고리로 모델 추천
 */
export async function recommendByTaskCategoryHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { category_code } = req.params;
    const limit = parseInt(req.query.limit as string) || 3;

    // 카테고리 코드 검증
    if (!category_code || typeof category_code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'category_code is required',
      } as RecommendByTaskCategoryResponse);
      return;
    }

    // 모델 추천
    const result =
      await TaskRecommendationService.recommendByTaskCategoryCode(
        category_code,
        limit
      );

    res.status(200).json({
      success: true,
      data: result,
    } as RecommendByTaskCategoryResponse);
  } catch (error) {
    console.error('Error in recommendByTaskCategoryHandler:', error);

    // 카테고리를 찾을 수 없는 경우 404 반환
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: error.message,
      } as RecommendByTaskCategoryResponse);
      return;
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as RecommendByTaskCategoryResponse);
  }
}
