/**
 * Google OAuth 2.0 서비스 (TASK-2-1~4)
 * Google 로그인 및 토큰 관리
 */

import axios from 'axios';
import { getConfig } from '../config/environment';
import { getRedisCache } from '../database/redis';
import { queryOne, executeModify } from '../database/mysql';
import { generateToken, generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { encrypt, generateRandomToken } from '../utils/encryption';
import {
  ValidationException,
  DatabaseException,
  AuthenticationException,
  ExternalAPIException
} from '../exceptions';

const config = getConfig();

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string; // Google User ID
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

/**
 * Google OAuth 상태 생성
 * CSRF 공격 방지용
 */
export async function generateGoogleOAuthState(): Promise<string> {
  const methodName = 'generateGoogleOAuthState';

  try {
    const state = generateRandomToken(32);
    const redisCache = getRedisCache();

    // Redis에 상태 저장 (10분 TTL)
    await redisCache.set(`oauth:google:state:${state}`, 'pending', 600);

    return state;
  } catch (error) {
    throw new DatabaseException(`Google OAuth 상태 생성 실패: ${error}`, methodName);
  }
}

/**
 * Google OAuth 상태 검증
 */
export async function validateGoogleOAuthState(state: string): Promise<boolean> {
  const methodName = 'validateGoogleOAuthState';

  try {
    const redisCache = getRedisCache();
    const savedState = await redisCache.get(`oauth:google:state:${state}`);

    if (savedState) {
      // 상태 삭제 (한 번만 사용 가능)
      await redisCache.delete(`oauth:google:state:${state}`);
      return true;
    }

    return false;
  } catch (error) {
    throw new DatabaseException(`Google OAuth 상태 검증 실패: ${error}`, methodName);
  }
}

/**
 * Authorization Code로 Access Token 획득
 */
export async function getGoogleAccessToken(code: string): Promise<GoogleTokenResponse> {
  const methodName = 'getGoogleAccessToken';

  try {
    const response = await axios.post<GoogleTokenResponse>(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        redirect_uri: config.oauth.google.redirectUri,
        grant_type: 'authorization_code'
      },
      { timeout: 10000 }
    );

    return response.data;
  } catch (error) {
    const errorMsg = axios.isAxiosError(error)
      ? `Google API 오류: ${error.response?.status} ${error.response?.data?.error_description}`
      : String(error);

    throw new ExternalAPIException(
      `Google Access Token 획득 실패: ${errorMsg} (ERROR_5001)`,
      methodName,
      axios.isAxiosError(error) ? error.response?.status : undefined
    );
  }
}

/**
 * Google API로부터 사용자 정보 조회
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const methodName = 'getGoogleUserInfo';

  try {
    const response = await axios.get<GoogleUserInfo>(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = axios.isAxiosError(error)
      ? `Google API 오류: ${error.response?.status}`
      : String(error);

    throw new ExternalAPIException(
      `Google 사용자 정보 조회 실패: ${errorMsg} (ERROR_5001)`,
      methodName,
      axios.isAxiosError(error) ? error.response?.status : undefined
    );
  }
}

/**
 * Google 로그인/회원가입 처리
 */
export async function googleLogin(
  accessToken: string,
  googleUserInfo: GoogleUserInfo,
  ipAddress: string,
  userAgent: string
): Promise<{
  user_id: number;
  email: string;
  nickname: string;
  auth_provider: string;
  is_new_user: boolean;
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}> {
  const methodName = 'googleLogin';

  try {
    // 1단계: 기존 사용자 조회 (provider_user_id로)
    let user: any = await queryOne<any>(
      'SELECT u.user_id, u.email, u.nickname, u.auth_provider FROM users u ' +
      'INNER JOIN user_social_accounts s ON u.user_id = s.user_id ' +
      'WHERE s.provider = ? AND s.provider_user_id = ?',
      ['google', googleUserInfo.sub]
    );

    let isNewUser = false;

    // 2단계: 새로운 사용자인 경우
    if (!user) {
      // 이메일로 기존 계정 확인
      const existingByEmail = await queryOne<any>(
        'SELECT user_id, email, nickname FROM users WHERE email = ?',
        [googleUserInfo.email]
      );

      if (existingByEmail) {
        // 기존 사용자에게 Google 계정 연동
        user = existingByEmail;
      } else {
        // 완전히 새로운 사용자 생성
        const result = await executeModify(
          `INSERT INTO users (email, nickname, auth_provider, is_active)
           VALUES (?, ?, ?, ?)`,
          [googleUserInfo.email, googleUserInfo.name, 'google', true]
        );

        user = {
          user_id: result.insertId,
          email: googleUserInfo.email,
          nickname: googleUserInfo.name,
          auth_provider: 'google'
        };
        isNewUser = true;
      }
    }

    // 3단계: Google 소셜 계정 저장/업데이트
    try {
      const encryptedAccessToken = encrypt(accessToken);

      const existingSocial = await queryOne<any>(
        'SELECT social_account_id FROM user_social_accounts WHERE user_id = ? AND provider = ?',
        [user.user_id, 'google']
      );

      if (existingSocial) {
        // 업데이트
        await executeModify(
          `UPDATE user_social_accounts
           SET access_token_encrypted = ?, last_login_at = NOW()
           WHERE social_account_id = ?`,
          [encryptedAccessToken, existingSocial.social_account_id]
        );
      } else {
        // 신규 생성
        await executeModify(
          `INSERT INTO user_social_accounts
           (user_id, provider, provider_user_id, provider_email, provider_name, provider_profile_image, access_token_encrypted)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            user.user_id,
            'google',
            googleUserInfo.sub,
            googleUserInfo.email,
            googleUserInfo.name,
            googleUserInfo.picture || null,
            encryptedAccessToken
          ]
        );
      }
    } catch (socialError) {
      throw new DatabaseException(
        `Google 소셜 계정 저장 실패: ${socialError}`,
        methodName
      );
    }

    // 4단계: 토큰 생성
    const accessTokenJwt = generateAccessToken(
      user.user_id,
      user.email,
      user.nickname,
      'google'
    );
    const refreshTokenJwt = generateRefreshToken(
      user.user_id,
      user.email,
      user.nickname,
      'google'
    );

    return {
      user_id: user.user_id,
      email: user.email,
      nickname: user.nickname,
      auth_provider: user.auth_provider,
      is_new_user: isNewUser,
      tokens: {
        access_token: accessTokenJwt,
        refresh_token: refreshTokenJwt,
        token_type: 'Bearer',
        expires_in: 900
      }
    };
  } catch (error) {
    if (error instanceof (DatabaseException || ExternalAPIException)) throw error;
    throw new DatabaseException(`Google 로그인 처리 실패: ${error}`, methodName);
  }
}
