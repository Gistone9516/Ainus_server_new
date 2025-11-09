/**
 * 인증 API 라우터
 * 회원가입, 로그인, 프로필 조회 등
 */

import { Router, Request, Response } from 'express';
import { register, login, logout, getUserInfo } from '../services/AuthService';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/v1/auth/register
 * 회원가입
 */
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { email, password, nickname } = req.body;

  const result = await register({
    email,
    password,
    nickname
  });

  res.status(201).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/auth/login
 * 로그인
 */
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await login({
    email,
    password
  });

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/auth/me
 * 현재 사용자 정보 조회 (인증 필요)
 */
router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  const user = await getUserInfo(userId);

  res.status(200).json({
    success: true,
    data: user,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/auth/logout
 * 로그아웃 (선택적)
 */
router.post('/logout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.get('Authorization');
  const token = authHeader ? authHeader.slice(7) : '';

  await logout(token);

  res.status(200).json({
    success: true,
    message: '로그아웃되었습니다',
    timestamp: new Date().toISOString()
  });
}));

export default router;
