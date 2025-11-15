/**
 * 인증 API 서비스
 */

import { api } from './api.client';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ResetPasswordRequest,
} from '../types';

export const authService = {
  /**
   * 로그인
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    return api.post<LoginResponse>('/auth/login', credentials);
  },

  /**
   * 회원가입
   */
  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    return api.post<RegisterResponse>('/auth/register', userData);
  },

  /**
   * 로그아웃
   */
  logout: async (): Promise<void> => {
    return api.post<void>('/auth/logout');
  },

  /**
   * 토큰 갱신
   */
  refreshToken: async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    return api.post<RefreshTokenResponse>('/auth/refresh', data);
  },

  /**
   * 비밀번호 재설정 요청
   */
  resetPassword: async (data: ResetPasswordRequest): Promise<void> => {
    return api.post<void>('/auth/reset-password', data);
  },

  /**
   * 이메일 중복 확인
   */
  checkEmailExists: async (email: string): Promise<{ exists: boolean }> => {
    return api.get<{ exists: boolean }>(`/auth/check-email?email=${encodeURIComponent(email)}`);
  },

  /**
   * 닉네임 중복 확인
   */
  checkNicknameExists: async (nickname: string): Promise<{ exists: boolean }> => {
    return api.get<{ exists: boolean }>(`/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
  },
};
