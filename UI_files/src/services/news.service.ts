/**
 * 뉴스 API 서비스
 */

import { api } from './api.client';
import {
  NewsArticle,
  NewsListRequest,
  RecommendedNews,
  PaginatedResponse,
} from '../types';

export const newsService = {
  /**
   * 뉴스 목록 조회
   */
  getNews: async (params?: NewsListRequest): Promise<PaginatedResponse<NewsArticle>> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return api.get<PaginatedResponse<NewsArticle>>(`/news?${queryParams.toString()}`);
  },

  /**
   * 뉴스 상세 조회
   */
  getNewsDetail: async (articleId: number): Promise<NewsArticle> => {
    return api.get<NewsArticle>(`/news/${articleId}`);
  },

  /**
   * 추천 뉴스 조회 (개인화)
   */
  getRecommendedNews: async (limit?: number): Promise<RecommendedNews[]> => {
    const queryParams = limit ? `?limit=${limit}` : '';
    return api.get<RecommendedNews[]>(`/news/recommended${queryParams}`);
  },

  /**
   * 인기 뉴스 조회
   */
  getPopularNews: async (limit?: number): Promise<NewsArticle[]> => {
    const queryParams = limit ? `?limit=${limit}` : '';
    return api.get<NewsArticle[]>(`/news/popular${queryParams}`);
  },

  /**
   * 최신 뉴스 조회
   */
  getLatestNews: async (limit?: number): Promise<NewsArticle[]> => {
    const queryParams = limit ? `?limit=${limit}` : '';
    return api.get<NewsArticle[]>(`/news/latest${queryParams}`);
  },
};
