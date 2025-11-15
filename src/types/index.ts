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
 * ==================== Community 타입 정의 ====================
 */

/**
 * 게시글 카테고리
 */
export type PostCategory = 'prompt_tip' | 'coding' | 'tips';

/**
 * 정렬 기준
 */
export type SortOption = 'latest' | 'popular' | 'relevance';

/**
 * 게시글 작성자 정보
 */
export interface PostAuthor {
  user_id: number;
  username: string;
  profile_image_url?: string;
  followers_count?: number;
  is_following?: boolean;
}

/**
 * 게시글 통계
 */
export interface PostStats {
  likes_count: number;
  comments_count: number;
  views_count: number;
}

/**
 * 게시글 엔티티 (데이터베이스)
 */
export interface Post {
  post_id: number;
  user_id: number;
  title: string;
  content: string;
  content_preview?: string;
  category: PostCategory;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 게시글 목록 항목 (응답용)
 */
export interface PostListItem {
  post_id: number;
  title: string;
  content_preview?: string;
  category: PostCategory;
  author: PostAuthor;
  stats: PostStats;
  created_at: string;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

/**
 * 게시글 상세 (응답용)
 */
export interface PostDetail extends PostListItem {
  content: string;
  updated_at: string;
  comments?: CommentResponse[];
}

/**
 * 게시글 작성 요청
 */
export interface CreatePostRequest {
  title: string;
  content: string;
  category: PostCategory;
}

/**
 * 게시글 수정 요청
 */
export interface UpdatePostRequest {
  title?: string;
  content?: string;
  category?: PostCategory;
}

/**
 * 댓글 엔티티 (데이터베이스)
 */
export interface Comment {
  comment_id: number;
  post_id: number;
  user_id: number;
  content: string;
  likes_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 댓글 응답 (작성자 정보 포함)
 */
export interface CommentResponse {
  comment_id: number;
  content: string;
  author: {
    user_id: number;
    username: string;
    profile_image_url?: string;
  };
  likes_count: number;
  created_at: string;
  is_liked?: boolean;
}

/**
 * 댓글 작성 요청
 */
export interface CreateCommentRequest {
  content: string;
}

/**
 * 게시글 목록 조회 쿼리 파라미터
 */
export interface GetPostsQuery {
  page?: number;
  limit?: number;
  sort?: SortOption;
  category?: PostCategory;
}

/**
 * 검색 쿼리 파라미터
 */
export interface SearchPostsQuery {
  q: string;
  page?: number;
  limit?: number;
  category?: PostCategory;
  sort?: SortOption;
}

/**
 * 검색 결과 항목
 */
export interface SearchResultItem extends PostListItem {
  highlight?: string;
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
}

/**
 * 게시글 목록 응답
 */
export interface PostsListResponse {
  posts: PostListItem[];
  pagination: PaginationInfo;
}

/**
 * 검색 결과 응답
 */
export interface SearchResponse {
  query: string;
  results: SearchResultItem[];
  pagination: PaginationInfo;
}

/**
 * ==================== 모델 추천 관련 타입 정의 ====================
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

/**
 * ==================== 이슈 지수 관련 타입 정의 (기능 #7) ====================
 */

/**
 * 이슈 지수 정보
 */
export interface IssueIndexInfo {
  value: number;
  previous_value?: number;
  change_percentage?: number;
  change_direction?: 'up' | 'down' | 'same';
}

/**
 * 이슈 지수 근거 뉴스 소스
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
 * 이슈 지수 근거 데이터 조회 응답
 */
export interface IssueIndexSourcesResponse {
  date: string;
  issue_index: IssueIndexInfo;
  sources: IssueIndexSource[];
  total_count: number;
  timestamp: string;
}

/**
 * 이슈 지수 근거 데이터 조회 파라미터
 */
export interface GetIssueIndexSourcesParams {
  date: string; // YYYY-MM-DD
  limit?: number; // 1-10, 기본값 3
  offset?: number; // 기본값 0
  category?: 'all' | 'tech' | 'policy' | 'market'; // 기본값 'all'
  sort_by?: 'impact' | 'published_date'; // 기본값 'impact'
}

/**
 * 뉴스 기사
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
 * 뉴스 기사 추가 조회 응답
 */
export interface NewsArticlesResponse {
  date: string;
  articles: NewsArticle[];
  total_count: number;
  has_more: boolean;
}

/**
 * ==================== 뉴스 분류 관련 타입 정의 (Feature #9) ====================
 */

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
