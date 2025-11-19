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
  password_hash: string;
  nickname: string;
  job_category_id?: number;
  profile_image_url?: string;
  auth_provider?: string;
  is_active?: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 사용자 프로필
 */
export interface UserProfile {
  profile_id: number;
  user_id: number;
  job_occupation_id?: number;
  bio?: string;
  preferences?: any; // JSON
  created_at: Date;
}

/**
 * 사용자 세션
 */
export interface UserSession {
  session_id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

/**
 * 모델 제공사
 */
export interface ModelCreator {
  creator_id: string; // UUID (VARCHAR(36))
  creator_name: string;
  creator_slug: string;
  website_url?: string;
  description?: string;
  country?: string;
  founded_year?: number; // YEAR
  is_active?: boolean;
  created_at: Date; // DATETIME
  updated_at: Date; // DATETIME
}

/**
 * AI 모델
 */
export interface AiModel {
  model_id: string; // UUID (Artificial Analysis API ID, VARCHAR(36))
  model_name: string;
  model_slug: string;
  creator_id: string; // FK to model_creators
  release_date?: string; // DATE
  model_type?: string; // LLM, Vision 등
  parameter_size?: string;
  context_length?: number; // INT
  is_open_source?: boolean;
  is_active?: boolean;
  raw_data?: any; // JSON
  created_at: Date; // DATETIME
  updated_at: Date; // DATETIME
}

/**
 * 모델 평가 (벤치마크)
 */
export interface ModelEvaluation {
  evaluation_id: number; // BIGINT
  model_id: string; // FK
  benchmark_name: string;
  score?: number; // DECIMAL(10,4)
  max_score?: number; // DECIMAL(10,4)
  normalized_score?: number; // DECIMAL(5,2) - 0-100
  model_rank?: number;
  measured_at?: string; // DATE
  created_at: Date; // DATETIME
  updated_at: Date; // DATETIME
}

/**
 * 모델 종합 점수
 */
export interface ModelOverallScore {
  score_id: number; // BIGINT
  model_id: string; // FK
  overall_score: number; // DECIMAL(5,2) - 0-100
  intelligence_index?: number; // DECIMAL(5,2)
  coding_index?: number; // DECIMAL(5,2)
  math_index?: number; // DECIMAL(5,2)
  reasoning_index?: number; // DECIMAL(5,2)
  language_index?: number; // DECIMAL(5,2)
  calculated_at: Date; // DATETIME NOT NULL
  version?: number; // 버전 번호
  created_at: Date; // DATETIME
  updated_at: Date; // DATETIME
}

/**
 * 모델 가격 정보
 */
export interface ModelPricing {
  pricing_id: number; // BIGINT
  model_id: string; // FK
  price_input_1m?: number; // DECIMAL(10,6) - 100만 토큰당
  price_output_1m?: number; // DECIMAL(10,6)
  price_blended_3to1?: number; // DECIMAL(10,6)
  currency?: string; // default 'USD'
  effective_date?: string; // DATE
  is_current?: boolean;
  created_at: Date; // DATETIME
  updated_at: Date; // DATETIME
}

/**
 * 모델 성능 지표
 */
export interface ModelPerformance {
  performance_id: number; // BIGINT
  model_id: string; // FK
  median_output_tokens_per_second?: number; // DECIMAL(10,2)
  median_time_to_first_token?: number; // DECIMAL(10,4)
  median_time_to_first_answer?: number; // DECIMAL(10,4)
  latency_p50?: number; // DECIMAL(10,4)
  latency_p95?: number; // DECIMAL(10,4)
  latency_p99?: number; // DECIMAL(10,4)
  measured_at?: Date; // DATETIME
  created_at: Date; // DATETIME
  updated_at: Date; // DATETIME
}

/**
 * 모델 업데이트
 */
export interface ModelUpdate {
  update_id: number; // INT
  model_id: string; // FK (UUID)
  version_before?: string;
  version_after?: string;
  update_date: string; // DATE NOT NULL
  summary?: string;
  key_improvements?: any; // JSON
  performance_improvement?: number; // DECIMAL(5,2) - %
  created_at: Date; // TIMESTAMP
  updated_at: Date; // TIMESTAMP
}

/**
 * 모델 업데이트 상세
 */
export interface ModelUpdateDetail {
  detail_id: number; // INT
  update_id: number; // INT (FK)
  benchmark_name?: string;
  before_score?: number; // DECIMAL(8,4)
  after_score?: number; // DECIMAL(8,4)
  improvement_pct?: number; // DECIMAL(5,2)
  created_at: Date; // TIMESTAMP
}

/**
 * AI 카테고리
 */
export interface AiCategory {
  category_id: number;
  category_name: string;
  category_code: string;
  description?: string;
  weight?: number;
  created_at: Date;
}

/**
 * 직업 카테고리
 */
export interface JobCategory {
  job_category_id: number;
  job_name: string;
  category_code: string;
  description?: string;
  created_at: Date;
}

/**
 * 직업군
 */
export interface JobOccupation {
  job_occupation_id: number;
  job_category_id: number;
  occupation_name: string;
  created_at: Date;
}

/**
 * 관심 태그
 */
export interface InterestTag {
  interest_tag_id: number;
  tag_name: string;
  tag_code: string;
  category_id?: number;
  description?: string;
  created_at: Date;
}

/**
 * 일일 이슈 지수
 */
export interface IssueIndexDaily {
  index_id: number;
  index_date: string; // DATE
  score?: number;
  comparison_previous_week?: number;
  main_keyword?: string;
  trend?: string;
  article_count?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 카테고리별 이슈 지수
 */
export interface IssueIndexByCategory {
  category_index_id: number;
  index_date: string; // DATE
  category_id: number;
  score?: number;
  comparison_previous_week?: number;
  weight?: number;
  article_count?: number;
  created_at: Date;
}

/**
 * 뉴스 기사
 */
export interface NewsArticle {
  article_id: number;
  title: string;
  url: string;
  source?: string;
  published_at?: Date;
  collected_at?: Date;
  summary?: string;
  impact_score?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 기사-태그 매핑
 */
export interface ArticleToTag {
  mapping_id: number;
  article_id: number;
  interest_tag_id: number;
  classification_status?: 'confirmed' | 'pending_review' | 'rejected';
  confidence_score?: number;
  created_at: Date;
}

/**
 * 커뮤니티 게시글
 */
export interface CommunityPost {
  post_id: number;
  user_id: number;
  title: string;
  content: string;
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 커뮤니티 댓글
 */
export interface CommunityComment {
  comment_id: number;
  post_id: number;
  user_id: number;
  content: string;
  likes_count?: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * 게시글 좋아요
 */
export interface CommunityPostLike {
  like_id: number;
  post_id: number;
  user_id: number;
  created_at: Date;
}

/**
 * 게시글 태그
 */
export interface CommunityPostTag {
  tag_id: number;
  post_id: number;
  interest_tag_id: number;
  created_at: Date;
}

/**
 * 사용자 관심 모델
 */
export interface UserInterestedModel {
  interested_id: number;
  user_id: number;
  model_id: number;
  added_at: Date;
}

/**
 * FCM 토큰
 */
export interface FcmToken {
  token_id: number;
  user_id: number;
  fcm_token: string;
  device_type?: string;
  is_active?: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 사용자 푸시 알림
 */
export interface UserPushNotification {
  notification_id: number;
  user_id: number;
  model_update_id?: number;
  issue_index_id?: number;
  notification_type: 'model_update' | 'issue_alert' | 'digest';
  title?: string;
  body?: string;
  sent_at?: Date;
  read_at?: Date;
  created_at: Date;
}

/**
 * 직업-태그 매핑
 */
export interface JobOccupationToTask {
  mapping_id: number;
  job_occupation_id: number;
  interest_tag_id: number;
  boost_weight?: number;
  created_at: Date;
}

/**
 * 모델 비교 캐시
 */
export interface ModelComparisonCache {
  cache_id: number;
  model_id_1: number;
  model_id_2: number;
  comparison_data?: any; // JSON
  cached_at: Date;
  expires_at?: Date;
}

/**
 * 사용자 소셜 계정
 */
export interface UserSocialAccount {
  social_account_id: number;
  user_id: number;
  provider: string;
  provider_user_id: string;
  provider_email?: string;
  provider_name?: string;
  provider_profile_image?: string;
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  connected_at: Date;
  disconnected_at?: Date;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * 비밀번호 재설정 토큰
 */
export interface PasswordResetToken {
  token_id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used_at?: Date;
  created_at: Date;
}

/**
 * 로그인 감사 로그
 */
export interface LoginAuditLog {
  log_id: number;
  user_id?: number;
  email?: string;
  status: 'success' | 'failed' | 'blocked';
  failure_reason?: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  location_info?: any; // JSON
  created_at: Date;
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
