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
 * 이슈 지수 정보 (기능 #7)
 */
export interface IssueIndexInfo {
  value: number;
  previous_value?: number;
  change_percentage?: number;
  change_direction?: 'up' | 'down' | 'same';
}

/**
 * 이슈 지수 근거 뉴스 소스 (기능 #7)
 */
export interface IssueIndexSource {
  source_id: number;
  news_id: number;
  rank: number;
  title: string;
  summary?: string;
  source: string;
  source_url: string;
  published_at: string;
  impact_score: number;
  category?: string;
  tags?: string[];
  content_snippet?: string;
  image_url?: string;
}

/**
 * 이슈 지수 근거 데이터 조회 응답 (기능 #7)
 */
export interface IssueIndexSourcesResponse {
  date: string;
  issue_index: IssueIndexInfo;
  sources: IssueIndexSource[];
  total_count: number;
  timestamp: string;
}

/**
 * 이슈 지수 근거 데이터 조회 파라미터 (기능 #7)
 */
export interface GetIssueIndexSourcesParams {
  date: string; // YYYY-MM-DD
  limit?: number; // 1-10, 기본값 3
  offset?: number; // 기본값 0
  category?: 'all' | 'tech' | 'policy' | 'market'; // 기본값 'all'
  sort_by?: 'impact' | 'published_date'; // 기본값 'impact'
}

/**
 * 뉴스 기사 추가 조회 응답 (기능 #7)
 */
export interface NewsArticle {
  news_id: number;
  title: string;
  summary?: string;
  source: string;
  source_url: string;
  published_at: string;
  impact_score: number;
  category?: string;
  tags?: string[];
}

/**
 * 뉴스 기사 추가 조회 응답 (기능 #7)
 */
export interface NewsArticlesResponse {
  date: string;
  articles: NewsArticle[];
  total_count: number;
  has_more: boolean;
}
