/**
 * AI 모델 API 서비스
 */

import { api } from './api.client';
import {
  AIModel,
  ModelRecommendationRequest,
  ModelRecommendationResponse,
  ModelCompareRequest,
  ModelCompareResponse,
  ModelUpdate,
  PaginatedResponse,
  PaginationParams,
} from '../types';

export const modelService = {
  /**
   * 모델 목록 조회
   */
  getModels: async (params?: PaginationParams & { category?: string }): Promise<PaginatedResponse<AIModel>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);

    return api.get<PaginatedResponse<AIModel>>(`/models?${queryParams.toString()}`);
  },

  /**
   * 모델 상세 조회
   */
  getModelDetail: async (modelId: number): Promise<AIModel> => {
    return api.get<AIModel>(`/models/${modelId}`);
  },

  /**
   * 모델 추천
   */
  getRecommendations: async (params?: ModelRecommendationRequest): Promise<ModelRecommendationResponse> => {
    return api.post<ModelRecommendationResponse>('/models/recommendations', params);
  },

  /**
   * 모델 비교
   */
  compareModels: async (data: ModelCompareRequest): Promise<ModelCompareResponse> => {
    return api.post<ModelCompareResponse>('/models/compare', data);
  },

  /**
   * 모델 업데이트 목록
   */
  getModelUpdates: async (params?: PaginationParams): Promise<PaginatedResponse<ModelUpdate>> => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return api.get<PaginatedResponse<ModelUpdate>>(`/models/updates?${queryParams.toString()}`);
  },

  /**
   * 특정 모델의 업데이트 히스토리
   */
  getModelUpdateHistory: async (modelId: number): Promise<ModelUpdate[]> => {
    return api.get<ModelUpdate[]>(`/models/${modelId}/updates`);
  },
};
