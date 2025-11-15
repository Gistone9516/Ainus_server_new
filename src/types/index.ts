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
 * Feature #9: 분류된 태그 정보
 */
export interface ClassifiedTag {
  tag_id: number;
  tag_name_ko: string;
  tag_name_en: string;
  confidence: number; // 0-1 범위 (0-100% 표시)
  rank: number;
}

/**
 * Feature #9: 뉴스 분류 요청
 */
export interface ClassifyNewsRequest {
  news_title: string;
  news_source?: string;
  published_at?: string;
  content_preview?: string;
}

/**
 * Feature #9: 뉴스 분류 응답
 */
export interface ClassifyNewsResponse {
  classification_id: string;
  input_title: string;
  classified_tags: ClassifiedTag[];
  recommendation: {
    status: 'confirmed' | 'pending_review' | 'rejected';
    reason: string;
  };
  processing_time_ms: number;
  timestamp: string;
}

/**
 * Feature #9: 배치 분류 요청
 */
export interface BatchClassifyRequest {
  articles: Array<{
    article_id: number;
    title: string;
    source?: string;
    published_at?: string;
  }>;
  reprocess_unconfirmed?: boolean;
}

/**
 * Feature #9: 배치 분류 결과 항목
 */
export interface BatchClassifyResultItem {
  article_id: number;
  status: 'confirmed' | 'pending_review' | 'rejected';
  classified_tags: ClassifiedTag[];
  processing_time_ms: number;
}

/**
 * Feature #9: 배치 분류 응답
 */
export interface BatchClassifyResponse {
  batch_id: string;
  total_articles: number;
  processed: number;
  failed: number;
  results: BatchClassifyResultItem[];
  batch_processing_time_ms: number;
  timestamp: string;
}

/**
 * Feature #9: 분류 결과 조회 응답
 */
export interface ClassificationDetailResponse {
  classification_id: string;
  article_id: number;
  title: string;
  status: 'confirmed' | 'pending_review' | 'rejected';
  classified_tags: ClassifiedTag[];
  created_at: string;
  confirmed_at?: string;
}

/**
 * Feature #9: 수동 검토 항목
 */
export interface ManualReviewItem {
  review_id: string;
  article_id: number;
  title: string;
  source: string;
  published_at: string;
  suggested_tags: ClassifiedTag[];
  submitted_at: string;
  processing_time_ms: number;
}

/**
 * Feature #9: 수동 검토 조회 응답
 */
export interface ManualReviewListResponse {
  total_pending: number;
  items: ManualReviewItem[];
}

/**
 * Feature #9: 수동 검토 결과 요청
 */
export interface ManualReviewConfirmRequest {
  confirmed_tags: number[];
  rejected_tags: number[];
  notes: string;
  reviewer_id: string;
}

/**
 * Feature #9: 수동 검토 결과 응답
 */
export interface ManualReviewConfirmResponse {
  review_id: string;
  article_id: number;
  confirmed_tags: number[];
  status: 'confirmed' | 'rejected';
  confirmed_at: string;
  confirmed_by: string;
}

/**
 * Feature #9: SLM 모델 응답
 */
export interface SLMModelResponse {
  tags: Array<{
    tag_id: number;
    tag_name: string;
    confidence: number;
    reasoning: string;
  }>;
  max_tags: number;
  processing_time_ms: number;
}
