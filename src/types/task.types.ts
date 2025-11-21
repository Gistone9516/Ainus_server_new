/**
 * 작업 분류 및 모델 추천 관련 타입 정의
 */

// ============ 데이터베이스 모델 타입 ============

/**
 * task_categories 테이블 타입
 */
export interface TaskCategory {
  task_category_id: number;
  category_code: string;
  category_name_ko: string;
  category_name_en: string;
  description?: string;
  keywords?: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * task_benchmark_mapping 테이블 타입
 */
export interface TaskBenchmarkMapping {
  mapping_id: number;
  task_category_id: number;
  primary_benchmark: string;
  secondary_benchmark: string;
  primary_weight: number;
  secondary_weight: number;
  created_at: Date;
  updated_at: Date;
}

// ============ GPT 분류 관련 타입 ============

/**
 * GPT Assistant에 전송할 입력 데이터
 */
export interface GPTClassificationInput {
  user_input: string;
}

/**
 * GPT Assistant 응답 타입
 */
export interface GPTClassificationRawResponse {
  category_code: string;
  confidence_score: number;
  reasoning: string;
}

/**
 * 작업 분류 결과 타입
 */
export interface TaskClassificationResult {
  task_category_id: number;
  category_code: string;
  category_name_ko: string;
  category_name_en: string;
  confidence_score: number;
  reasoning: string;
}

// ============ 모델 추천 관련 타입 ============

/**
 * 벤치마크 점수 타입
 */
export interface BenchmarkScore {
  name: string;
  score: number;
  weight: number;
  contribution: number; // score * weight
}

/**
 * 추천 모델 타입
 */
export interface RecommendedModel {
  rank: number;
  model_id: string;
  model_name: string;
  creator_name?: string;
  weighted_score: number;
  benchmark_scores: {
    primary: BenchmarkScore;
    secondary: BenchmarkScore;
  };
  overall_score?: number;
  pricing?: {
    input_price: number;
    output_price: number;
  };
}

/**
 * 추천 기준 타입
 */
export interface RecommendationCriteria {
  primary_benchmark: string;
  secondary_benchmark: string;
  weights: {
    primary: number;
    secondary: number;
  };
}

/**
 * 작업 기반 추천 결과 타입
 */
export interface TaskRecommendationResult {
  task_category: {
    task_category_id: number;
    category_code: string;
    category_name_ko: string;
    category_name_en: string;
  };
  criteria: RecommendationCriteria;
  recommended_models: RecommendedModel[];
}

// ============ API 요청/응답 타입 ============

/**
 * 작업 분류 API 요청
 */
export interface ClassifyTaskRequest {
  user_input: string;
}

/**
 * 작업 분류 API 응답
 */
export interface ClassifyTaskResponse {
  success: boolean;
  data?: TaskClassificationResult;
  error?: string;
}

/**
 * 작업 분류 및 추천 통합 API 요청
 */
export interface ClassifyAndRecommendRequest {
  user_input: string;
  limit?: number;
}

/**
 * 작업 분류 및 추천 통합 API 응답
 */
export interface ClassifyAndRecommendResponse {
  success: boolean;
  data?: {
    classification: TaskClassificationResult;
    criteria: RecommendationCriteria;
    recommended_models: RecommendedModel[];
    metadata?: {
      total_models_evaluated: number;
      classification_time_ms: number;
      recommendation_time_ms: number;
    };
  };
  error?: string;
}

/**
 * 작업 카테고리 목록 조회 API 응답
 */
export interface GetTaskCategoriesResponse {
  success: boolean;
  data?: TaskCategory[];
  error?: string;
}

/**
 * 특정 카테고리로 모델 추천 API 요청
 */
export interface RecommendByTaskCategoryRequest {
  category_code: string;
  limit?: number;
}

/**
 * 특정 카테고리로 모델 추천 API 응답
 */
export interface RecommendByTaskCategoryResponse {
  success: boolean;
  data?: TaskRecommendationResult;
  error?: string;
}
