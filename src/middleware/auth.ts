/**
 * JWT 인증 미들웨어
 * 보호된 라우트에서 토큰을 검증
 */

import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../services/AuthService';
import { AuthenticationException } from '../exceptions';
import { JwtPayload } from '../types';

/**
 * 인증 요구 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하고 검증
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.get('Authorization');

    if (!authHeader) {
      throw new AuthenticationException(
        'Authorization 헤더가 없습니다',
        'requireAuth'
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthenticationException(
        'Invalid Authorization 헤더 형식입니다. "Bearer <token>" 형식이어야 합니다',
        'requireAuth'
      );
    }

    const token = authHeader.slice(7);
    const payload = await validateToken(token);

    // 요청 객체에 사용자 정보 추가
    (req as any).user = payload;
    (req as any).userId = payload.user_id;

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
