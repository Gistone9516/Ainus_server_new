/**
 * 커뮤니티 관련 타입 정의
 */

/**
 * 게시글 카테고리
 */
export type PostCategory = 'prompt_tip' | 'coding' | 'tips';

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
 * 게시글 목록 항목
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
 * 게시글 상세
 */
export interface PostDetail extends PostListItem {
  content: string;
  tags?: string[];
  updated_at: string;
}

/**
 * 게시글 작성 요청
 */
export interface CreatePostRequest {
  title: string;
  content: string;
  category: PostCategory;
  tags?: string[];
}

/**
 * 댓글 정보
 */
export interface Comment {
  comment_id: number;
  post_id: number;
  user_id: number;
  author: PostAuthor;
  content: string;
  likes_count: number;
  is_liked?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 댓글 작성 요청
 */
export interface CreateCommentRequest {
  content: string;
}
