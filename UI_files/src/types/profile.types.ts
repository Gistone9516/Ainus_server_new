/**
 * 프로필 관련 타입 정의
 */

/**
 * 직업 카테고리
 */
export interface JobCategory {
  id: number;
  name: string;
  description?: string;
}

/**
 * 관심사 태그
 */
export interface InterestTag {
  interest_tag_id: number;
  tag_name: string;
  description?: string;
  category?: string;
}

/**
 * 사용자 프로필
 */
export interface UserProfile {
  user_id: number;
  email: string;
  nickname: string;
  profile_image_url?: string;
  job_category?: JobCategory;
  interest_tags?: InterestTag[];
  stats: {
    posts_count: number;
    likes_count: number;
    bookmarks_count: number;
    followers_count?: number;
    following_count?: number;
  };
  created_at: string;
}

/**
 * 프로필 업데이트 요청
 */
export interface UpdateProfileRequest {
  nickname?: string;
  profile_image_url?: string;
  job_category_id?: number;
  interest_tag_ids?: number[];
}

/**
 * 북마크 정보
 */
export interface Bookmark {
  bookmark_id: number;
  user_id: number;
  post_id: number;
  post: {
    post_id: number;
    title: string;
    category: string;
    created_at: string;
  };
  created_at: string;
}
