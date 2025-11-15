/**
 * AI 모델 관련 타입 정의
 */

/**
 * AI 모델 정보
 */
export interface AIModel {
  model_id: number;
  model_name: string;
  developer: string;
  release_date: string;
  category: string;
  description?: string;
  score?: number;
  rank?: number;
  strengths?: string[];
  performance_metrics?: {
    [key: string]: number;
  };
  created_at: string;
  updated_at: string;
}

/**
 * 모델 추천 요청
 */
export interface ModelRecommendationRequest {
  job_category_id?: number;
  interest_tag_ids?: number[];
  category?: string;
}

/**
 * 모델 추천 응답
 */
export interface ModelRecommendationResponse {
  models: AIModel[];
  recommendation_reason?: string;
}

/**
 * 모델 비교 요청
 */
export interface ModelCompareRequest {
  model_ids: number[];
}

/**
 * 모델 비교 응답
 */
export interface ModelCompareResponse {
  models: AIModel[];
  comparison: {
    [key: string]: {
      [model_id: number]: any;
    };
  };
}

/**
 * 모델 업데이트 정보
 */
export interface ModelUpdate {
  update_id: number;
  model_id: number;
  model_name: string;
  update_type: 'new_version' | 'feature' | 'performance';
  title: string;
  description: string;
  release_date: string;
  created_at: string;
}
