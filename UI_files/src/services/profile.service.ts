/**
 * 프로필 API 서비스
 */

import { api } from './api.client';
import {
  UserProfile,
  UpdateProfileRequest,
  JobCategory,
  InterestTag,
  Bookmark,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export const profileService = {
  /**
   * 내 프로필 조회
   */
  getMyProfile: async (): Promise<UserProfile> => {
    return api.get<UserProfile>('/users/profile/me');
  },

  /**
   * 프로필 수정
   */
  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    return api.put<UserProfile>('/users/profile/me', data);
  },

  /**
   * 직업 카테고리 목록 조회
   */
  getJobCategories: async (): Promise<JobCategory[]> => {
    return api.get<JobCategory[]>('/jobs');
  },

  /**
   * 관심사 태그 목록 조회
   */
  getInterestTags: async (jobCategoryId?: number): Promise<InterestTag[]> => {
    const queryParams = jobCategoryId ? `?job_category_id=${jobCategoryId}` : '';
    return api.get<InterestTag[]>(`/jobs/interest-tags${queryParams}`);
  },

  /**
   * 내가 작성한 게시글 조회
   */
  getMyPosts: async (params?: PaginationParams): Promise<PaginatedResponse<any>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return api.get<PaginatedResponse<any>>(`/users/profile/me/posts?${queryParams.toString()}`);
  },

  /**
   * 북마크 목록 조회
   */
  getBookmarks: async (params?: PaginationParams): Promise<PaginatedResponse<Bookmark>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return api.get<PaginatedResponse<Bookmark>>(`/users/profile/me/bookmarks?${queryParams.toString()}`);
  },

  /**
   * 프로필 이미지 업로드
   */
  uploadProfileImage: async (imageFile: FormData): Promise<{ url: string }> => {
    return api.post<{ url: string }>('/users/profile/me/image', imageFile, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
