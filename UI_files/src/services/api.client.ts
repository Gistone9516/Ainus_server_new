/**
 * API 클라이언트 설정
 * Axios 기반 HTTP 클라이언트
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse } from '../types';

// API 기본 URL (환경 변수에서 가져오기)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Axios 인스턴스 생성
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 요청 인터셉터
 * - 토큰 자동 추가
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // AsyncStorage에서 토큰 가져오기
      const token = await AsyncStorage.getItem('authToken');

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get token from storage:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 응답 인터셉터
 * - 에러 처리
 * - 토큰 만료 처리
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 Unauthorized - 토큰 만료 또는 인증 실패
      if (status === 401) {
        // 토큰 제거 및 로그아웃 처리
        try {
          await AsyncStorage.multiRemove(['authToken', 'authUser']);
        } catch (e) {
          console.error('Failed to remove auth data:', e);
        }
      }

      // 에러 데이터 반환
      return Promise.reject({
        status,
        message: data?.error?.message || 'An error occurred',
        code: data?.error?.code || 'UNKNOWN_ERROR',
        details: data?.error?.details,
      });
    }

    // 네트워크 에러
    if (error.request) {
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      });
    }

    // 기타 에러
    return Promise.reject({
      status: 0,
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    });
  }
);

/**
 * API 요청 헬퍼 함수
 */
export const api = {
  /**
   * GET 요청
   */
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    return response.data.data as T;
  },

  /**
   * POST 요청
   */
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  },

  /**
   * PUT 요청
   */
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  },

  /**
   * PATCH 요청
   */
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
    return response.data.data as T;
  },

  /**
   * DELETE 요청
   */
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<ApiResponse<T>>(url, config);
    return response.data.data as T;
  },
};

export default apiClient;
