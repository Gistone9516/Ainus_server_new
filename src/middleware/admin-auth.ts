/**
 * 관리자 권한 체크 미들웨어
 */

import { Request, Response, NextFunction } from 'express';
import { executeQuery } from '@/database/mysql';

/**
 * 관리자 권한 확인
 * requireAuth 미들웨어 이후에 사용해야 함
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // 환경 변수로 관리자 ID 목록 확인
    const adminIds = process.env.ADMIN_USER_IDS
      ? process.env.ADMIN_USER_IDS.split(',').map((id) => parseInt(id.trim()))
      : [];

    // 관리자 ID 목록에 있으면 통과
    if (adminIds.includes(userId)) {
      next();
      return;
    }

    // DB에서 사용자 정보 확인 (is_admin 컬럼이 있는 경우)
    const users = await executeQuery<{ is_admin?: boolean }>(
      'SELECT 1 FROM users WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (users.length === 0) {
      res.status(403).json({
        status: 'error',
        message: 'Forbidden - Admin access required',
        code: 'FORBIDDEN',
      });
      return;
    }

    // TODO: users 테이블에 is_admin 또는 role 컬럼 추가 시 체크 로직 활성화
    // if (!users[0].is_admin) {
    //   return res.status(403).json({
    //     status: 'error',
    //     message: 'Forbidden - Admin access required',
    //     code: 'FORBIDDEN',
    //   });
    // }

    // 임시: 환경 변수에 설정된 관리자 ID만 허용
    if (adminIds.length === 0) {
      // 환경 변수 미설정 시 모든 인증된 사용자 허용 (개발 모드)
      console.warn(
        '⚠️  WARNING: ADMIN_USER_IDS not set. Allowing all authenticated users for admin endpoints.'
      );
      next();
      return;
    }

    res.status(403).json({
      status: 'error',
      message: 'Forbidden - Admin access required',
      code: 'FORBIDDEN',
    });
    return;
  } catch (error) {
    next(error);
  }
}
