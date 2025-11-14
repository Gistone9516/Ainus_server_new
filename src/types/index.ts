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