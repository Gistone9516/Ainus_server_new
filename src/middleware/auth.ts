/**
 * JWT 인증 미들웨어
 * 보호된 라우트에서 토큰을 검증
 */

import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../services/auth/AuthService';
import { AuthenticationException } from '../exceptions';
import { JwtPayload } from '../types';

/**
 * 인증 요구 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하고 검증
 * 프로토타입 모드: 토큰이 없거나 유효하지 않아도 기본 사용자로 처리
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.get('Authorization');

    // 프로토타입 모드: 토큰이 없으면 기본 사용자(user_id: 1)로 처리
    if (!authHeader) {
      console.warn('[PROTOTYPE MODE] No Authorization header, using default user_id: 1');
      (req as any).user = {
        user_id: 1,
        email: 'test@example.com',
        nickname: 'Test User',
        auth_provider: 'local'
      };
      (req as any).userId = 1;
      next();
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.warn('[PROTOTYPE MODE] Invalid Authorization header format, using default user_id: 1');
      (req as any).user = {
        user_id: 1,
        email: 'test@example.com',
        nickname: 'Test User',
        auth_provider: 'local'
      };
      (req as any).userId = 1;
      next();
      return;
    }

    const token = authHeader.slice(7);

    // 프로토타입 모드: 토큰 검증 실패해도 기본 사용자로 처리
    try {
      const payload = await validateToken(token);
      // 요청 객체에 사용자 정보 추가
      (req as any).user = payload;
      (req as any).userId = payload.user_id;
    } catch (error) {
      console.warn('[PROTOTYPE MODE] Token validation failed, using default user_id: 1');
      (req as any).user = {
        user_id: 1,
        email: 'test@example.com',
        nickname: 'Test User',
        auth_provider: 'local'
      };
      (req as any).userId = 1;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 선택적 인증 미들웨어
 * 토큰이 있으면 검증하지만, 없어도 계속 진행
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.get('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const payload = await validateToken(token);

      (req as any).user = payload;
      (req as any).userId = payload.user_id;
    }

    next();
  } catch (error) {
    // 토큰 검증 실패해도 계속 진행 (로그인하지 않은 사용자로 취급)
    next();
  }
}
