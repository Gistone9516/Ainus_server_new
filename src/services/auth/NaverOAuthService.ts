/**
 * Naver OAuth 2.0 서비스 (TASK-2-9~12)
 * Naver 로그인 및 토큰 관리
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

interface NaverTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface NaverUserInfo {
  resultcode: string;
  message: string;
  response: {
    id: string; // Naver User ID
    nickname?: string;
    name?: string;
    email?: string;
    profile_image?: string;
    mobile?: boolean;
  };
}

/**
 * Naver OAuth 상태 생성
 */
export async function generateNaverOAuthState(): Promise<string> {
  const methodName = 'generateNaverOAuthState';

  try {
    const state = generateRandomToken(32);
    const redisCache = getRedisCache();

    // Redis에 상태 저장 (10분 TTL)
    await redisCache.set(`oauth:naver:state:${state}`, 'pending', 600);

    return state;
  } catch (error) {
    throw new DatabaseException(`Naver OAuth 상태 생성 실패: ${error}`, methodName);
  }
}

/**
 * Naver OAuth 상태 검증
 */
export async function validateNaverOAuthState(state: string): Promise<boolean> {
  const methodName = 'validateNaverOAuthState';

  try {
    const redisCache = getRedisCache();
    const savedState = await redisCache.get(`oauth:naver:state:${state}`);

    if (savedState) {
      await redisCache.delete(`oauth:naver:state:${state}`);
      return true;
    }

    return false;
  } catch (error) {
    throw new DatabaseException(`Naver OAuth 상태 검증 실패: ${error}`, methodName);
  }
}

/**
 * Authorization Code로 Access Token 획득
 */
export async function getNaverAccessToken(code: string, state: string): Promise<NaverTokenResponse> {
  const methodName = 'getNaverAccessToken';

  try {
    const response = await axios.post<NaverTokenResponse>(
      'https://nid.naver.com/oauth2.0/token',
      {
        grant_type: 'authorization_code',
        client_id: config.oauth.naver.clientId,
        client_secret: config.oauth.naver.clientSecret,
        code,
        state
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      }
    );

    return response.data;
  } catch (error) {
    const errorMsg = axios.isAxiosError(error)
      ? `Naver API 오류: ${error.response?.status}`
      : String(error);

    throw new ExternalAPIException(
      `Naver Access Token 획득 실패: ${errorMsg} (ERROR_5004)`,
      methodName,
      axios.isAxiosError(error) ? error.response?.status : undefined
    );
  }
}

/**
 * Naver API로부터 사용자 정보 조회
 * Naver는 특별한 응답 구조 사용 (response.response)
 */
export async function getNaverUserInfo(accessToken: string): Promise<NaverUserInfo['response']> {
  const methodName = 'getNaverUserInfo';

  try {
    const response = await axios.get<NaverUserInfo>(
      'https://openapi.naver.com/v1/nid/me',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Naver-Client-Id': config.oauth.naver.clientId
        },
        timeout: 10000
      }
    );

    // Naver는 resultcode 확인 필요
    if (response.data.resultcode !== '00') {
      throw new Error(`Naver API 오류: ${response.data.message}`);
    }

    return response.data.response;
  } catch (error) {
    const errorMsg = axios.isAxiosError(error)
      ? `Naver API 오류: ${error.response?.status}`
      : String(error);

    throw new ExternalAPIException(
      `Naver 사용자 정보 조회 실패: ${errorMsg} (ERROR_5004)`,
      methodName,
      axios.isAxiosError(error) ? error.response?.status : undefined
    );
  }
}

/**
 * Naver 로그인/회원가입 처리
 */
export async function naverLogin(
  accessToken: string,
  naverUserInfo: NaverUserInfo['response'],
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
  const methodName = 'naverLogin';

  try {
    // 사용자 정보 추출
    const naverId = naverUserInfo.id;
    const nickname = naverUserInfo.nickname || naverUserInfo.name || `naver_${naverId.slice(-6)}`;
    const profileImage = naverUserInfo.profile_image;
    const email = naverUserInfo.email;

    // 1단계: 기존 사용자 조회 (provider_user_id로)
    let user: any = await queryOne<any>(
      'SELECT u.user_id, u.email, u.nickname FROM users u ' +
      'INNER JOIN user_social_accounts s ON u.user_id = s.user_id ' +
      'WHERE s.provider = ? AND s.provider_user_id = ?',
      ['naver', naverId]
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

    // 3단계: Naver 소셜 계정 저장/업데이트
    try {
      const encryptedAccessToken = encrypt(accessToken);

      const existingSocial = await queryOne<any>(
        'SELECT social_account_id FROM user_social_accounts WHERE user_id = ? AND provider = ?',
        [user.user_id, 'naver']
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
            'naver',
            naverId,
            email || null,
            nickname,
            profileImage || null,
            encryptedAccessToken
          ]
        );
      }
    } catch (socialError) {
      throw new DatabaseException(
        `Naver 소셜 계정 저장 실패: ${socialError}`,
        methodName
      );
    }

    // 4단계: 토큰 생성
    const accessTokenJwt = generateAccessToken(
      user.user_id,
      user.email,
      user.nickname,
      'naver'
    );
    const refreshTokenJwt = generateRefreshToken(
      user.user_id,
      user.email,
      user.nickname,
      'naver'
    );

    return {
      user_id: user.user_id,
      email: user.email,
      nickname: user.nickname,
      auth_provider: 'naver',
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
    throw new DatabaseException(`Naver 로그인 처리 실패: ${error}`, methodName);
  }
}
