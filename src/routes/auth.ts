/**
 * 인증 API 라우터
 * 회원가입, 로그인, 프로필 조회 등
 */

import { Router, Request, Response } from 'express';
import { register, login, logout, getUserInfo, checkEmailAvailability, refreshAccessToken } from '../services/AuthService';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createLoginRateLimiter, createRegisterRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate Limiters (TASK-1-18)
const loginRateLimiter = createLoginRateLimiter();
const registerRateLimiter = createRegisterRateLimiter();

/**
 * POST /api/v1/auth/register
 * 회원가입 (TASK-1-7)
 * Rate Limit: 1시간에 3회 (TASK-1-18)
 * 요청: { email, password, nickname, terms_agreed, privacy_agreed, marketing_agreed? }
 */
router.post('/register', registerRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, nickname, terms_agreed, privacy_agreed, marketing_agreed } = req.body;

  const result = await register({
    email,
    password,
    nickname,
    terms_agreed,
    privacy_agreed,
    marketing_agreed
  });

  res.status(201).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/auth/check-email
 * 이메일 중복 확인 (TASK-1-9)
 * 요청: ?email=user@example.com
 * 응답: { available: boolean, message: string }
 */
router.get('/check-email', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.query;

  if (!email || typeof email !== 'string') {
    throw new Error('email 파라미터가 필요합니다');
  }

  const result = await checkEmailAvailability(email);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * Helper function to extract client IP address
 */
function getClientIp(req: Request): string {
  // 프록시를 통한 요청인 경우
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  // 직접 연결
  return (
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * POST /api/v1/auth/login
 * 로그인 (TASK-1-10)
 * Rate Limit: 15분에 5회 (TASK-1-18)
 * 요청: { email, password, device_type? }
 * 응답: { user: {...}, tokens: { access_token, token_type, expires_in } }
 */
router.post('/login', loginRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email, password, device_type } = req.body;
  const ip_address = getClientIp(req);
  const user_agent = req.get('user-agent') || 'unknown';

  const result = await login({
    email,
    password,
    ip_address,
    user_agent,
    device_type
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
 * POST /api/v1/auth/refresh
 * Access Token 갱신 (TASK-1-15)
 * 요청: { refresh_token: string }
 * 응답: { access_token, refresh_token?, token_type, expires_in }
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    throw new Error('refresh_token이 필요합니다');
  }

  const result = await refreshAccessToken(refresh_token, true);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/auth/logout
 * 로그아웃 (TASK-1-16)
 * 요청 (선택): { refresh_token?: string }
 */
router.post('/logout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.get('Authorization');
  const accessToken = authHeader ? authHeader.slice(7) : '';
  const { refresh_token } = req.body;

  await logout(accessToken, refresh_token);

  res.status(200).json({
    success: true,
    message: '로그아웃되었습니다',
    timestamp: new Date().toISOString()
  });
}));

export default router;
