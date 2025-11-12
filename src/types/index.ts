/**
 * 공통 타입 정의
 */

/**
 * API 응답 형식
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  workflow_id?: string;
}

/**
 * 페이지네이션 파라미터
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * 사용자 정보
 */
export interface User {
  user_id: number;
  email: string;
  nickname: string;
  profile_image_url?: string;
  job_category_id?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * JWT 토큰 페이로드
 */
export interface JwtPayload {
  user_id: number;
  email: string;
  nickname: string;
  auth_provider?: string;
  iat: number;
  exp: number;
  iss?: string; // issuer
  aud?: string; // audience
  jti?: string; // JWT ID (token unique identifier)
  token_type?: 'access' | 'refresh'; // 토큰 타입
}

/**
 * 메서드 실행 결과 (성공/부분 성공)
 */
export interface MethodResult<T = any> {
  success: boolean;
  data?: T;
  errors?: Array<{
    item: any;
    error: string;
  }>;
}

/**
 * ===== 기능 #4: 모델 추천 관련 타입 =====
 */

/**
 * SLM 분류 결과
 */
export interface SLMClassificationResult {
  category_id: number;
  category_name: string;
  category_en: string;
  confidence: number;
  is_confident: boolean;
  reasoning?: string;
  alternatives?: Array<{
    rank: number;
    category_id: number;
    category_name: string;
    confidence: number;
    description?: string;
  }>;
}

/**
 * 모델 추천 요청 (통합 SLM 분류 + 추천)
 */
export interface RecommendByInputRequest {
  user_input: string;
  user_id?: string;
  limit?: number;
}

/**
 * 모델 추천 요청 (카테고리 기반)
 */
export interface RecommendByCategoryRequest {
  category_id: number;
  user_id?: string;
  limit?: number;
}

/**
 * SLM 분류 요청
 */
export interface SlmClassifyRequest {
  user_input: string;
  top_k?: number;
}

/**
 * 카테고리 조회 응답
 */
export interface CategoriesResponse {
  id: number;
  code: string;
  name: string;
  name_en: string;
  description?: string;
  icon_url?: string;
}

/**
 * 추천 모델 정보 (응답용)
 */
export interface RecommendedModelInfo {
  rank: number;
  model_id: number;
  model_name: string;
  provider: string;
  base_score: number;
  task_category: string;
  score_source?: {
    benchmark: string;
    weight_formula: string;
  };
  reasoning?: string;
  strengths?: string[];
  weaknesses?: string[];
  personalized_score?: number;
  final_score?: number;
}

/**
 * 모델 추천 응답 데이터
 */
export interface ModelRecommendationData {
  classification: SLMClassificationResult;
  recommended_models: RecommendedModelInfo[];
}

/**
 * 카테고리 기반 추천 응답 데이터
 */
export interface CategoryRecommendationData {
  category: {
    id: number;
    name: string;
    icon_url?: string;
  };
  recommended_models: RecommendedModelInfo[];
}
