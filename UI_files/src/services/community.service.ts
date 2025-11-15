/**
 * 커뮤니티 API 서비스
 */

import { api } from './api.client';
import {
  PostListItem,
  PostDetail,
  CreatePostRequest,
  Comment,
  CreateCommentRequest,
  PaginatedResponse,
  PaginationParams,
  PostCategory,
  SortOption,
} from '../types';

export const communityService = {
  /**
   * 게시글 목록 조회
   */
  getPosts: async (params?: PaginationParams & {
    category?: PostCategory;
    sort?: SortOption;
    search?: string;
  }): Promise<PaginatedResponse<PostListItem>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.search) queryParams.append('search', params.search);

    return api.get<PaginatedResponse<PostListItem>>(`/community/posts?${queryParams.toString()}`);
  },

  /**
   * 게시글 상세 조회
   */
  getPostDetail: async (postId: number): Promise<PostDetail> => {
    return api.get<PostDetail>(`/community/posts/${postId}`);
  },

  /**
   * 게시글 작성
   */
  createPost: async (data: CreatePostRequest): Promise<PostDetail> => {
    return api.post<PostDetail>('/community/posts', data);
  },

  /**
   * 게시글 수정
   */
  updatePost: async (postId: number, data: Partial<CreatePostRequest>): Promise<PostDetail> => {
    return api.put<PostDetail>(`/community/posts/${postId}`, data);
  },

  /**
   * 게시글 삭제
   */
  deletePost: async (postId: number): Promise<void> => {
    return api.delete<void>(`/community/posts/${postId}`);
  },

  /**
   * 게시글 좋아요
   */
  likePost: async (postId: number): Promise<void> => {
    return api.post<void>(`/community/posts/${postId}/like`);
  },

  /**
   * 게시글 좋아요 취소
   */
  unlikePost: async (postId: number): Promise<void> => {
    return api.delete<void>(`/community/posts/${postId}/like`);
  },

  /**
   * 게시글 북마크
   */
  bookmarkPost: async (postId: number): Promise<void> => {
    return api.post<void>(`/community/posts/${postId}/bookmark`);
  },

  /**
   * 게시글 북마크 취소
   */
  unbookmarkPost: async (postId: number): Promise<void> => {
    return api.delete<void>(`/community/posts/${postId}/bookmark`);
  },

  /**
   * 댓글 목록 조회
   */
  getComments: async (postId: number, params?: PaginationParams): Promise<PaginatedResponse<Comment>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return api.get<PaginatedResponse<Comment>>(`/community/posts/${postId}/comments?${queryParams.toString()}`);
  },

  /**
   * 댓글 작성
   */
  createComment: async (postId: number, data: CreateCommentRequest): Promise<Comment> => {
    return api.post<Comment>(`/community/posts/${postId}/comments`, data);
  },

  /**
   * 댓글 삭제
   */
  deleteComment: async (postId: number, commentId: number): Promise<void> => {
    return api.delete<void>(`/community/posts/${postId}/comments/${commentId}`);
  },

  /**
   * 댓글 좋아요
   */
  likeComment: async (postId: number, commentId: number): Promise<void> => {
    return api.post<void>(`/community/posts/${postId}/comments/${commentId}/like`);
  },

  /**
   * 댓글 좋아요 취소
   */
  unlikeComment: async (postId: number, commentId: number): Promise<void> => {
    return api.delete<void>(`/community/posts/${postId}/comments/${commentId}/like`);
  },
};
