/**
 * JWT 토큰 관리 유틸리티
 * 토큰 생성, 검증, 갱신
 * TASK-1-13, 1-14, 1-15 구현
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../config/environment';
import { JwtPayload } from '../types';
import { AuthenticationException } from '../exceptions';

const config = getConfig();

/**
 * 기간 문자열을 초 단위 숫자로 변환
 * @param duration 기간 문자열 (예: '15m', '7d', '1h')
 */
export function parseDuration(duration: string): number {
  const unit = duration.slice(-1);
  const value = parseInt(duration.slice(0, -1), 10);
  
  if (isNaN(value)) {
    // 숫자만 있는 경우 초 단위로 간주
    const num = parseInt(duration, 10);
    return isNaN(num) ? 15 * 60 : num;
  }

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return value;
  }
}

/**
 * Access Token 생성 (TASK-1-13)
 */
export function generateAccessToken(
  user_id: number,
  email: string,
  nickname: string,
  auth_provider: string = 'local'
): string {
  const methodName = 'generateAccessToken';

  try {
    const jti = uuidv4();
    const iat = Math.floor(Date.now() / 1000);
    const expirySeconds = parseDuration(config.jwt.expiresIn);
    const exp = iat + expirySeconds;

    const payload: JwtPayload = {
      user_id,
      email,
      nickname,
      auth_provider,
      jti,
      iat,
      exp,
      iss: 'ainus',
      aud: 'ainus-app',
      token_type: 'access'
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256'
    });

    return token;
  } catch (error) {
    throw new AuthenticationException(
      `Access Token 생성 실패: ${error}`,
      methodName
    );
  }
}

/**
 * Refresh Token 생성 (TASK-1-13)
 */
export function generateRefreshToken(
  user_id: number,
  email: string,
  nickname: string,
  auth_provider: string = 'local'
): string {
  const methodName = 'generateRefreshToken';

  try {
    const jti = uuidv4();
    const iat = Math.floor(Date.now() / 1000);
    const expirySeconds = parseDuration(config.jwt.refreshExpiresIn);
    const exp = iat + expirySeconds;

    const payload: JwtPayload = {
      user_id,
      email,
      nickname,
      auth_provider,
      jti,
      iat,
      exp,
      iss: 'ainus',
      aud: 'ainus-app',
      token_type: 'refresh'
    };

    // Refresh Token은 별도의 시크릿 사용 권장
    const secret = config.jwt.refreshSecret || config.jwt.secret;

    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256'
    });

    return token;
  } catch (error) {
    throw new AuthenticationException(
      `Refresh Token 생성 실패: ${error}`,
      methodName
    );
  }
}

/**
 * 호환성: 기존 generateToken() 유지
 * 새로운 코드에서는 generateAccessToken() 사용 권장
 */
export function generateToken(user_id: number, email: string, nickname: string): string {
  return generateAccessToken(user_id, email, nickname);
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string, isRefresh: boolean = false): JwtPayload {
  const methodName = 'verifyToken';

  try {
    // 'Bearer ' 접두사 제거
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const secret = isRefresh ? (config.jwt.refreshSecret || config.jwt.secret) : config.jwt.secret;

    const decoded = jwt.verify(cleanToken, secret, {
      algorithms: ['HS256']
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationException(
        '토큰이 만료되었습니다',
        methodName
      );
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationException(
        '유효하지 않은 토큰입니다',
        methodName
      );
    } else {
      throw new AuthenticationException(
        `토큰 검증 실패: ${error}`,
        methodName
      );
    }
  }
}

/**
 * 토큰에서 payload 추출 (검증 없음)
 * 예: 토큰 갱신 시 기존 정보를 빠르게 읽을 때 사용
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.decode(cleanToken) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
