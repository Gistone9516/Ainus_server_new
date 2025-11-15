/**
 * 인증 관련 타입 정의
 */

/**
 * 사용자 정보
 */
export interface User {
  user_id: number;
  email: string;
  nickname: string;
  profile_image_url?: string;
  job_category_id?: number;
  created_at: string;
  updated_at: string;
}

/**
 * 로그인 요청
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 로그인 응답
 */
export interface LoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

/**
 * 회원가입 요청
 */
export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  job_category_id?: number;
  interest_tag_ids?: number[];
}

/**
 * 회원가입 응답
 */
export interface RegisterResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

/**
 * 토큰 갱신 요청
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * 토큰 갱신 응답
 */
export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

/**
 * 비밀번호 재설정 요청
 */
export interface ResetPasswordRequest {
  email: string;
}
