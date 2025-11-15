/**
 * Authentication Context
 * 인증 상태 관리 및 캐시 처리
 * - AsyncStorage를 통한 로그인 데이터 캐시
 * - 앱 시작 시 캐시 데이터 확인
 * - 로그인/로그아웃 상태 관리
 * - 권한 분기 (인증됨/미인증)
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services';

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  profile_image_url?: string;
  job_category_id?: number;
}

export interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string, jobCategoryId?: number, interestTagIds?: number[]) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider 컴포넌트
 * 전체 앱을 감싸서 인증 상태 제공
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  /**
   * 앱 시작 시 캐시된 인증 데이터 확인
   */
  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      setIsLoading(true);

      // AsyncStorage에서 저장된 토큰과 사용자 정보 가져오기
      const [storedToken, storedUserJson] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('authUser'),
      ]);

      if (storedToken && storedUserJson) {
        // 캐시된 데이터가 존재하면 인증 상태로 설정
        const storedUser = JSON.parse(storedUserJson);
        setToken(storedToken);
        setUser(storedUser);
        setIsAuthenticated(true);
      } else {
        // 캐시된 데이터가 없으면 미인증 상태
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('Failed to restore token:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 로그인 함수
   */
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      // API 호출
      const response = await authService.login({ email, password });

      // 사용자 정보 변환
      const authUser: AuthUser = {
        id: response.user.user_id.toString(),
        email: response.user.email,
        nickname: response.user.nickname,
        profile_image_url: response.user.profile_image_url,
        job_category_id: response.user.job_category_id,
      };

      // AsyncStorage에 저장
      await Promise.all([
        AsyncStorage.setItem('authToken', response.access_token),
        AsyncStorage.setItem('refreshToken', response.refresh_token),
        AsyncStorage.setItem('authUser', JSON.stringify(authUser)),
      ]);

      // 상태 업데이트
      setToken(response.access_token);
      setUser(authUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 회원가입 함수
   */
  const register = async (email: string, password: string, nickname: string, jobCategoryId?: number, interestTagIds?: number[]) => {
    try {
      setIsLoading(true);

      // API 호출
      const response = await authService.register({
        email,
        password,
        nickname,
        job_category_id: jobCategoryId,
        interest_tag_ids: interestTagIds,
      });

      // 사용자 정보 변환
      const authUser: AuthUser = {
        id: response.user.user_id.toString(),
        email: response.user.email,
        nickname: response.user.nickname,
        profile_image_url: response.user.profile_image_url,
        job_category_id: response.user.job_category_id,
      };

      // AsyncStorage에 저장
      await Promise.all([
        AsyncStorage.setItem('authToken', response.access_token),
        AsyncStorage.setItem('refreshToken', response.refresh_token),
        AsyncStorage.setItem('authUser', JSON.stringify(authUser)),
      ]);

      // 상태 업데이트
      setToken(response.access_token);
      setUser(authUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 로그아웃 함수
   */
  const logout = async () => {
    try {
      setIsLoading(true);

      // 서버에 로그아웃 요청 (옵션)
      try {
        await authService.logout();
      } catch (e) {
        console.warn('Server logout failed:', e);
      }

      // AsyncStorage에서 저장된 데이터 삭제
      await Promise.all([
        AsyncStorage.removeItem('authToken'),
        AsyncStorage.removeItem('refreshToken'),
        AsyncStorage.removeItem('authUser'),
      ]);

      // 상태 초기화
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    isLoading,
    isAuthenticated,
    user,
    token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth 훅
 * 인증 컨텍스트 접근
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
