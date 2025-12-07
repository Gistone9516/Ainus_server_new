/**
 * 커뮤니티 플랫폼 타입 정의
 */

/**
 * 게시물 카테고리
 */
export type PostCategory =
  | 'prompt_share'    // 프롬프트 공유
  | 'qa'              // 질문/답변
  | 'review'          // 후기/리뷰
  | 'general'         // 일상/잡담
  | 'announcement';   // 공지/이벤트

/**
 * 알림 타입
 */
export type NotificationType =
  | 'post_comment'    // 내 게시물에 댓글
  | 'comment_reply';  // 내 댓글에 답글

/**
 * 커뮤니티 게시물
 */
export interface CommunityPost {
  post_id: number;
  user_id: number;
  title: string;
  content: string;
  category: PostCategory;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;

  // 조인 데이터
  author?: {
    user_id: number;
    nickname: string;
    profile_image_url?: string;
  };
  is_liked?: boolean;  // 현재 사용자가 좋아요했는지
}

/**
 * 커뮤니티 댓글
 */
export interface CommunityComment {
  comment_id: number;
  post_id: number;
  user_id: number;
  parent_comment_id?: number;
  content: string;
  likes_count: number;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;

  // 조인 데이터
  author?: {
    user_id: number;
    nickname: string;
    profile_image_url?: string;
  };
  replies?: CommunityComment[];  // 대댓글 목록
}

/**
 * 커뮤니티 알림
 */
export interface CommunityNotification {
  notification_id: number;
  user_id: number;
  actor_id?: number;
  post_id?: number;
  comment_id?: number;
  notification_type: NotificationType;
  content: string;
  is_read: boolean;
  read_at?: Date;
  created_at: Date;

  // 조인 데이터
  actor?: {
    user_id: number;
    nickname: string;
    profile_image_url?: string;
  };
}

/**
 * 게시물 작성 DTO
 */
export interface CreatePostDto {
  title: string;
  content: string;
  category: PostCategory;
}

/**
 * 게시물 수정 DTO
 */
export interface UpdatePostDto {
  title?: string;
  content?: string;
  category?: PostCategory;
}

/**
 * 댓글 작성 DTO
 */
export interface CreateCommentDto {
  content: string;
  parent_comment_id?: number;
}

/**
 * 게시물 목록 조회 쿼리
 */
export interface PostListQuery {
  page?: number;
  limit?: number;
  category?: PostCategory;
  sort?: 'latest' | 'popular';
}

/**
 * 검색 쿼리
 */
export interface SearchQuery {
  q: string;
  category?: PostCategory;
  page?: number;
  limit?: number;
}

/**
 * 알림 목록 조회 쿼리
 */
export interface NotificationListQuery {
  page?: number;
  limit?: number;
  unread_only?: boolean;
}

/**
 * 페이지네이션 결과
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * 좋아요 토글 결과
 */
export interface LikeToggleResult {
  liked: boolean;
  likes_count: number;
}
