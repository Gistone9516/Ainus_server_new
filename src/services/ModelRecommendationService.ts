/**
 * 모델 추천 서비스
 * 통합 SLM 분류 + 카테고리 기반 모델 추천
 * 메서드 단위 예외 처리 패턴을 따릅니다
 */

import { executeQuery, queryOne, executeModify } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { ValidationException, DatabaseException, ExternalAPIException } from '../exceptions';
import {
  validateUserInput,
  normalizeUserInput,
  validateCategoryId,
  validateAndNormalizeLimit,
  validateUserId,
  calculatePersonalizedScore,
  calculateFinalScore,
  generateCacheKey,
  isConfident
} from '../utils/modelRecommendationUtils';
import {
  classifyUserInput,
  classifyWithAlternatives,
  getCategoryById,
  getAllCategories
} from './SlmClassificationService';
import {
  RecommendByInputRequest,
  RecommendByCategoryRequest,
  SLMClassificationResult,
  RecommendedModelInfo,
  ModelRecommendationData,
  CategoryRecommendationData,
  CategoriesResponse
} from '../types';

/**
 * 내부 타입 정의
 */
interface ModelData {
  model_id: number;
  model_name: string;
  provider: string;
  computed_score?: number;
  relevance_score?: number;
  strengths?: string;
  weaknesses?: string;
}

interface TaskCategoryMapping {
  task_category: string;
  boost_weight?: number;
}

interface UserJobProfile {
  job_category_id: number;
}

/**
 * 사용자 입력 기반 모델 추천 (통합 SLM 분류 + 추천)
 * POST /api/v1/models/recommend-by-input
 */
export async function recommendModelsByInput(
  request: RecommendByInputRequest
): Promise<ModelRecommendationData> {
  const methodName = 'recommendModelsByInput';

  // 1단계: 입력 검증
  try {
    validateUserInput(request.user_input, methodName);
    if (request.user_id) {
      validateUserId(request.user_id, methodName);
    }
    const limit = validateAndNormalizeLimit(request.limit, methodName);
    request.limit = limit;
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 2단계: SLM 분류
  let classification: SLMClassificationResult;
  try {
    classification = await classifyUserInput(request.user_input, methodName);
  } catch (error) {
    if (error instanceof ExternalAPIException) throw error;
    throw new ExternalAPIException(`분류 실패: ${error}`, methodName);
  }

  // 3단계: 신뢰도 검증 (< 0.70이면 대체 옵션 제시)
  if (!isConfident(classification.confidence)) {
    // 대체 옵션 포함하여 반환
    try {
      classification = await classifyWithAlternatives(request.user_input, 3, methodName);
    } catch (error) {
      // 실패해도 기본 분류 결과는 반환
    }
  }

  // 4단계: 카테고리 → task_category 매핑
  let taskCategory: string;
  try {
    const mapping = await queryOne<TaskCategoryMapping>(
      `SELECT task_category FROM category_to_task_mapping
       WHERE slm_category_id = ? AND is_active = TRUE`,
      [classification.category_id]
    );

    if (!mapping) {
      throw new ValidationException(
        `카테고리 ${classification.category_id}에 대한 매핑이 없습니다 (ERROR_6006)`,
        methodName
      );
    }
    taskCategory = mapping.task_category;
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`카테고리 매핑 조회 실패: ${error}`, methodName);
  }

  // 5단계: 모델 점수 조회 (기본 점수)
  let models: RecommendedModelInfo[];
  try {
    models = await getModelsByTaskCategory(taskCategory, request.limit || 5, methodName);

    if (!models || models.length === 0) {
      throw new ValidationException(
        `이 카테고리의 모델 정보가 아직 준비 중입니다 (ERROR_6007)`,
        methodName
      );
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`모델 조회 실패: ${error}`, methodName);
  }

  // 6단계: 개인화 가중치 적용 (선택사항)
  if (request.user_id) {
    try {
      models = await applyPersonalizationWeight(models, request.user_id, taskCategory, methodName);
    } catch (error) {
      // 개인화 실패해도 기본 점수로 계속 진행
      // (로그만 남김, 사용자에게 에러 반환하지 않음)
    }
  }

  return {
    classification,
    recommended_models: models
  };
}

/**
 * 카테고리 기반 모델 추천
 * POST /api/v1/models/recommend-by-category
 */
export async function recommendModelsByCategory(
  request: RecommendByCategoryRequest
): Promise<CategoryRecommendationData> {
  const methodName = 'recommendModelsByCategory';

  // 1단계: 입력 검증
  try {
    validateCategoryId(request.category_id, methodName);
    if (request.user_id) {
      validateUserId(request.user_id, methodName);
    }
    const limit = validateAndNormalizeLimit(request.limit, methodName);
    request.limit = limit;
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 2단계: 카테고리 조회 및 검증
  let category: any;
  try {
    category = getCategoryById(request.category_id);
    if (!category) {
      throw new ValidationException(
        `유효하지 않은 카테고리 ID입니다 (ERROR_6005)`,
        methodName
      );
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`카테고리 조회 실패: ${error}`, methodName);
  }

  // 3단계: task_category 매핑 조회
  let taskCategory: string;
  try {
    const mapping = await queryOne<TaskCategoryMapping>(
      `SELECT task_category FROM category_to_task_mapping
       WHERE slm_category_id = ? AND is_active = TRUE`,
      [request.category_id]
    );

    if (!mapping) {
      throw new ValidationException(
        `카테고리 ${request.category_id}에 대한 매핑이 없습니다 (ERROR_6006)`,
        methodName
      );
    }
    taskCategory = mapping.task_category;
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`카테고리 매핑 조회 실패: ${error}`, methodName);
  }

  // 4단계: 모델 조회
  let models: RecommendedModelInfo[];
  try {
    models = await getModelsByTaskCategory(taskCategory, request.limit || 5, methodName);

    if (!models || models.length === 0) {
      throw new ValidationException(
        `이 카테고리의 모델 정보가 아직 준비 중입니다 (ERROR_6007)`,
        methodName
      );
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`모델 조회 실패: ${error}`, methodName);
  }

  // 5단계: 개인화 가중치 적용
  if (request.user_id) {
    try {
      models = await applyPersonalizationWeight(models, request.user_id, taskCategory, methodName);
    } catch (error) {
      // 개인화 실패해도 계속 진행
    }
  }

  return {
    category: {
      id: category.id,
      name: category.name,
      icon_url: category.icon_url
    },
    recommended_models: models
  };
}

/**
 * 모든 카테고리 조회
 * GET /api/v1/categories
 */
export async function getAllCategoriesList(): Promise<CategoriesResponse[]> {
  const methodName = 'getAllCategoriesList';

  // 캐시 확인
  try {
    const cacheKey = 'categories:all';
    const cached = await getRedisCache().getJson<CategoriesResponse[]>(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (error) {
    // 캐시 실패는 무시하고 계속 진행
  }

  // 카테고리 조회
  try {
    const categories: CategoriesResponse[] = getAllCategories();

    // 캐시에 저장 (24시간)
    try {
      await getRedisCache().setJson('categories:all', categories, 24 * 3600);
    } catch (error) {
      // 캐시 저장 실패는 무시
    }

    return categories;
  } catch (error) {
    throw new DatabaseException(`카테고리 조회 실패: ${error}`, methodName);
  }
}

/**
 * ===== 내부 헬퍼 함수 =====
 */

/**
 * task_category에 해당하는 모델들을 점수순으로 조회
 */
async function getModelsByTaskCategory(
  taskCategory: string,
  limit: number,
  methodName: string
): Promise<RecommendedModelInfo[]> {
  try {
    // model_task_scores 테이블에서 점수 조회
    const results = await executeQuery<ModelData>(
      `SELECT
        m.model_id,
        m.model_name,
        m.provider,
        mts.computed_score,
        m.strengths,
        m.weaknesses
      FROM ai_models m
      JOIN model_task_scores mts ON m.model_id = mts.model_id
      WHERE mts.task_category = ? AND m.is_active = TRUE
      ORDER BY mts.computed_score DESC
      LIMIT ?`,
      [taskCategory, limit]
    );

    if (!results || results.length === 0) {
      return [];
    }

    // 응답 형식으로 변환
    return results.map((model, index) => ({
      rank: index + 1,
      model_id: model.model_id,
      model_name: model.model_name,
      provider: model.provider,
      base_score: model.computed_score || 0,
      task_category: taskCategory,
      score_source: {
        benchmark: 'MMLU Pro + GSM8K',
        weight_formula: 'Σ(benchmark_score × weight) / Σ(weight)'
      },
      reasoning: `${taskCategory} 작업에 특화된 높은 성능`,
      strengths: model.strengths ? JSON.parse(model.strengths) : [],
      weaknesses: model.weaknesses ? JSON.parse(model.weaknesses) : []
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Syntax')) {
      throw new DatabaseException(`DB 쿼리 오류: ${error.message}`, methodName);
    }
    throw error;
  }
}

/**
 * 직업별 가중치 적용
 */
async function applyPersonalizationWeight(
  models: RecommendedModelInfo[],
  userId: string,
  taskCategory: string,
  methodName: string
): Promise<RecommendedModelInfo[]> {
  try {
    // 사용자의 직업 정보 조회
    const userProfile = await queryOne<UserJobProfile>(
      `SELECT job_category_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (!userProfile || !userProfile.job_category_id) {
      // 직업 정보 없으면 기본 점수 반환
      return models;
    }

    // 직업별 가중치 조회
    const weights = await executeQuery<any>(
      `SELECT task_category, boost_weight FROM job_occupation_to_tasks
       WHERE job_category_id = ? AND is_primary = TRUE`,
      [userProfile.job_category_id]
    );

    if (!weights || weights.length === 0) {
      return models;
    }

    // task_category에 해당하는 가중치 찾기
    const weight = weights.find(w => w.task_category === taskCategory);
    const boostWeight = weight?.boost_weight || 1.0;

    // 각 모델에 가중치 적용
    return models.map(model => ({
      ...model,
      personalized_score: calculatePersonalizedScore(model.base_score, boostWeight),
      final_score: calculateFinalScore(model.base_score, boostWeight)
    }));
  } catch (error) {
    // 개인화 적용 실패는 무시하고 기본 점수만 반환
    return models.map(model => ({
      ...model,
      final_score: calculateFinalScore(model.base_score)
    }));
  }
}
