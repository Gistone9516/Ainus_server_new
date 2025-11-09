/**
 * JWT 토큰 관리 유틸리티
 * 토큰 생성, 검증, 갱신
 */

import jwt from 'jsonwebtoken';
import { getConfig } from '../config/environment';
import { JwtPayload } from '../types';
import { AuthenticationException } from '../exceptions';

const config = getConfig();

/**
 * JWT 토큰 생성
 */
export function generateToken(user_id: number, email: string, nickname: string): string {
  const methodName = 'generateToken';

  try {
    const payload: JwtPayload = {
      user_id,
      email,
      nickname,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30일
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256'
    });

    return token;
  } catch (error) {
    throw new AuthenticationException(
      `토큰 생성 실패: ${error}`,
      methodName
    );
  }
}

/**
 * JWT 토큰 검증
 */
export function verifyToken(token: string): JwtPayload {
  const methodName = 'verifyToken';

  try {
    // 'Bearer ' 접두사 제거
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const decoded = jwt.verify(cleanToken, config.jwt.secret, {
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
