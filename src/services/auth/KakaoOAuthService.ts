/**
 * Kakao OAuth 2.0 서비스 (TASK-2-5~8)
 * Kakao 로그인 및 토큰 관리
 */

import axios from 'axios';
import { getConfig } from '../../config/environment';
import { getRedisCache } from '../../database/redis';
import { queryOne, executeModify } from '../../database/mysql';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { encrypt, generateRandomToken } from '../../utils/encryption';
import { hashPassword } from '../../utils/password';
import {
  DatabaseException,
  ExternalAPIException
} from '../../exceptions';

const config = getConfig();

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  scope?: string;
}

interface KakaoUserInfo {
  id: number; // Kakao User ID
  kakao_account?: {
    profile_nickname?: string;
    profile_image_url?: string;
    email?: string;
    email_needs_agreement?: boolean;
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
  };
}

/**
 * Kakao OAuth 상태 생성
 */
export async function generateKakaoOAuthState(): Promise<string> {
  const methodName = 'generateKakaoOAuthState';

  try {
    const state = generateRandomToken(32);
    const redisCache = getRedisCache();

    // Redis에 상태 저장 (10분 TTL)
    await redisCache.set(`oauth:kakao:state:${state}`, 'pending', 600);

    return state;
  } catch (error) {
    throw new DatabaseException(`Kakao OAuth 상태 생성 실패: ${error}`, methodName);
  }
}

/**
 * Kakao OAuth 상태 검증
 */
export async function validateKakaoOAuthState(state: string): Promise<boolean> {
  const methodName = 'validateKakaoOAuthState';

  try {
    const redisCache = getRedisCache();
    const savedState = await redisCache.get(`oauth:kakao:state:${state}`);

    if (savedState) {
      await redisCache.delete(`oauth:kakao:state:${state}`);
      return true;
    }

    return false;
  } catch (error) {
    throw new DatabaseException(`Kakao OAuth 상태 검증 실패: ${error}`, methodName);
  }
}

/**
 * Authorization Code로 Access Token 획득
 */
export async function getKakaoAccessToken(code: string): Promise<KakaoTokenResponse> {
  const methodName = 'getKakaoAccessToken';

  try {
    const response = await axios.post<KakaoTokenResponse>(
      'https://kauth.kakao.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: config.oauth.kakao.clientId,
        client_secret: config.oauth.kakao.clientSecret,
        redirect_uri: config.oauth.kakao.callbackUrl,
        code
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = axios.isAxiosError(error)
      ? `Kakao API 오류: ${error.response?.status}`
      : String(error);

    throw new ExternalAPIException(
      `Kakao Access Token 획득 실패: ${errorMsg} (ERROR_5003)`,
      methodName,
      axios.isAxiosError(error) ? error.response?.status : undefined
    );
  }
}

/**
 * Kakao API로부터 사용자 정보 조회
 */
export async function getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
  const methodName = 'getKakaoUserInfo';

  try {
    const response = await axios.get<KakaoUserInfo>(
      'https://kapi.kakao.com/v2/user/me',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = axios.isAxiosError(error)
      ? `Kakao API 오류: ${error.response?.status}`
      : String(error);

    throw new ExternalAPIException(
      `Kakao 사용자 정보 조회 실패: ${errorMsg} (ERROR_5003)`,
      methodName,
      axios.isAxiosError(error) ? error.response?.status : undefined
    );
  }
}

/**
 * Kakao 로그인/회원가입 처리
 */
export async function kakaoLogin(
  accessToken: string,
  kakaoUserInfo: KakaoUserInfo,
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
  const methodName = 'kakaoLogin';

  try {
    // 사용자 정보 추출
    const kakaoId = String(kakaoUserInfo.id);
    const nickname = kakaoUserInfo.kakao_account?.profile_nickname ||
      kakaoUserInfo.properties?.nickname ||
      `kakao_${kakaoId.slice(-6)}`;
    const profileImage = kakaoUserInfo.kakao_account?.profile_image_url ||
      kakaoUserInfo.properties?.profile_image;
    const email = kakaoUserInfo.kakao_account?.email;

    // 1단계: 기존 사용자 조회 (provider_user_id로)
    let user: any = await queryOne<any>(
      'SELECT u.user_id, u.email, u.nickname FROM users u ' +
      'INNER JOIN user_social_accounts s ON u.user_id = s.user_id ' +
      'WHERE s.provider = ? AND s.provider_user_id = ?',
      ['kakao', kakaoId]
    );

    let isNewUser = false;

    // 2단계: 새로운 사용자인 경우
    if (!user) {
      // 이메일이 있으면 이메일로 기존 계정 확인
      let existingByEmail = null;
      if (email) {
        existingByEmail = await queryOne<any>(
          'SELECT user_id, email, nickname FROM users WHERE email = ?',
          [email]
        );
      }

      if (existingByEmail) {
        user = existingByEmail;
      } else {
        // 완전히 새로운 사용자 생성
        // 비밀번호는 랜덤 생성
        const randomPassword = generateRandomToken(16);
        const passwordHash = await hashPassword(randomPassword);

        const result = await executeModify(
          `INSERT INTO users (email, nickname, password_hash)
           VALUES (?, ?, ?)`,
          [email || null, nickname, passwordHash]
        );

        user = {
          user_id: result.insertId,
          email: email || null,
          nickname
        };
        isNewUser = true;
      }
    }

    // 3단계: Kakao 소셜 계정 저장/업데이트
    try {
      const encryptedAccessToken = encrypt(accessToken);

      const existingSocial = await queryOne<any>(
        'SELECT social_account_id FROM user_social_accounts WHERE user_id = ? AND provider = ?',
        [user.user_id, 'kakao']
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
            'kakao',
            kakaoId,
            email || null,
            nickname,
            profileImage || null,
            encryptedAccessToken
          ]
        );
      }
    } catch (socialError) {
      throw new DatabaseException(
        `Kakao 소셜 계정 저장 실패: ${socialError}`,
        methodName
      );
    }

    // 4단계: 토큰 생성
    const accessTokenJwt = generateAccessToken(
      user.user_id,
      user.email,
      user.nickname,
      'kakao'
    );
    const refreshTokenJwt = generateRefreshToken(
      user.user_id,
      user.email,
      user.nickname,
      'kakao'
    );

    return {
      user_id: user.user_id,
      email: user.email,
      nickname: user.nickname,
      auth_provider: 'kakao',
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
    throw new DatabaseException(`Kakao 로그인 처리 실패: ${error}`, methodName);
  }
}
