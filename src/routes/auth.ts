/**
 * 인증 API 라우터
 * 회원가입, 로그인, 프로필 조회 등
 */

import { Router, Request, Response } from 'express';
import {
  register,
  login,
  logout,
  getUserInfo,
  checkEmailAvailability,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail
} from '../services/AuthService';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createLoginRateLimiter, createRegisterRateLimiter } from '../middleware/rateLimiter';
import { getConfig } from '../config/environment';
import {
  generateGoogleOAuthState,
  validateGoogleOAuthState,
  getGoogleAccessToken,
  getGoogleUserInfo,
  googleLogin
} from '../services/GoogleOAuthService';
import {
  generateKakaoOAuthState,
  validateKakaoOAuthState,
  getKakaoAccessToken,
  getKakaoUserInfo,
  kakaoLogin
} from '../services/KakaoOAuthService';
import {
  generateNaverOAuthState,
  validateNaverOAuthState,
  getNaverAccessToken,
  getNaverUserInfo,
  naverLogin
} from '../services/NaverOAuthService';

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

// ===== Phase 3: Email & Password Reset Routes =====

/**
 * POST /api/v1/auth/forgot-password
 * 비밀번호 재설정 요청 (TASK-3-3)
 * Rate Limit: 1시간에 3회
 * 요청: { email: string }
 * 응답: { success: boolean, message: string }
 */
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw new Error('email이 필요합니다');
  }

  const result = await forgotPassword(email);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/auth/reset-password
 * 비밀번호 재설정 (TASK-3-4)
 * 요청: { token: string, password: string }
 * 응답: { success: boolean, message: string }
 */
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token) {
    throw new Error('token이 필요합니다');
  }
  if (!password) {
    throw new Error('password가 필요합니다');
  }

  const result = await resetPassword(token, password);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/auth/change-password
 * 비밀번호 변경 (TASK-3-5)
 * 인증 필요 (로그인한 사용자만)
 * 요청: { current_password: string, new_password: string }
 * 응답: { success: boolean, message: string }
 */
router.post('/change-password', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { current_password, new_password } = req.body;

  if (!current_password) {
    throw new Error('current_password가 필요합니다');
  }
  if (!new_password) {
    throw new Error('new_password가 필요합니다');
  }

  const result = await changePassword(userId, current_password, new_password);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/auth/verify-email
 * 이메일 인증 (TASK-3-2)
 * 요청: { token: string }
 * 응답: { success: boolean, message: string }
 */
router.post('/verify-email', asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    throw new Error('token이 필요합니다');
  }

  const result = await verifyEmail(token);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

// ===== OAuth 2.0 Routes (Phase 2) =====

/**
 * GET /api/v1/auth/google
 * Google OAuth 인증 페이지로 리다이렉트 (TASK-2-1)
 * 응답: 302 Redirect to https://accounts.google.com/o/oauth2/v2/auth
 */
router.get('/google', asyncHandler(async (req: Request, res: Response) => {
  const config = getConfig();

  // Generate state and store in Redis
  const state = await generateGoogleOAuthState();

  // Construct Google OAuth URL
  const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleOAuthUrl.searchParams.set('client_id', config.oauth.google.clientId);
  googleOAuthUrl.searchParams.set('redirect_uri', config.oauth.google.redirectUri);
  googleOAuthUrl.searchParams.set('response_type', 'code');
  googleOAuthUrl.searchParams.set('scope', 'openid profile email');
  googleOAuthUrl.searchParams.set('state', state);

  res.redirect(googleOAuthUrl.toString());
}));

/**
 * GET /api/v1/auth/google/callback
 * Google OAuth 콜백 핸들러 (TASK-2-3)
 * 쿼리: ?code=...&state=...
 * 응답: { user: {...}, tokens: { access_token, refresh_token, token_type, expires_in } }
 */
router.get('/google/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    throw new Error('OAuth authorization code is required');
  }

  if (!state || typeof state !== 'string') {
    throw new Error('OAuth state parameter is required');
  }

  // Validate state
  const isValidState = await validateGoogleOAuthState(state);
  if (!isValidState) {
    throw new Error('Invalid or expired OAuth state');
  }

  // Exchange code for access token
  const tokenResponse = await getGoogleAccessToken(code);

  // Get user info from Google
  const googleUserInfo = await getGoogleUserInfo(tokenResponse.access_token);

  // Get client IP
  const forwarded = req.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';

  // Login or create user
  const result = await googleLogin(tokenResponse.access_token, googleUserInfo, ipAddress, userAgent);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/auth/kakao
 * Kakao OAuth 인증 페이지로 리다이렉트 (TASK-2-5)
 * 응답: 302 Redirect to https://kauth.kakao.com/oauth/authorize
 */
router.get('/kakao', asyncHandler(async (req: Request, res: Response) => {
  const config = getConfig();

  // Generate state and store in Redis
  const state = await generateKakaoOAuthState();

  // Construct Kakao OAuth URL
  const kakaoOAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
  kakaoOAuthUrl.searchParams.set('client_id', config.oauth.kakao.clientId);
  kakaoOAuthUrl.searchParams.set('redirect_uri', config.oauth.kakao.redirectUri);
  kakaoOAuthUrl.searchParams.set('response_type', 'code');
  kakaoOAuthUrl.searchParams.set('state', state);

  res.redirect(kakaoOAuthUrl.toString());
}));

/**
 * GET /api/v1/auth/kakao/callback
 * Kakao OAuth 콜백 핸들러 (TASK-2-7)
 * 쿼리: ?code=...&state=...
 * 응답: { user: {...}, tokens: { access_token, refresh_token, token_type, expires_in } }
 */
router.get('/kakao/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    throw new Error('OAuth authorization code is required');
  }

  if (!state || typeof state !== 'string') {
    throw new Error('OAuth state parameter is required');
  }

  // Validate state
  const isValidState = await validateKakaoOAuthState(state);
  if (!isValidState) {
    throw new Error('Invalid or expired OAuth state');
  }

  // Exchange code for access token
  const tokenResponse = await getKakaoAccessToken(code);

  // Get user info from Kakao
  const kakaoUserInfo = await getKakaoUserInfo(tokenResponse.access_token);

  // Get client IP
  const forwarded = req.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';

  // Login or create user
  const result = await kakaoLogin(tokenResponse.access_token, kakaoUserInfo, ipAddress, userAgent);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/auth/naver
 * Naver OAuth 인증 페이지로 리다이렉트 (TASK-2-9)
 * 응답: 302 Redirect to https://nid.naver.com/oauth2.0/authorize
 */
router.get('/naver', asyncHandler(async (req: Request, res: Response) => {
  const config = getConfig();

  // Generate state and store in Redis
  const state = await generateNaverOAuthState();

  // Construct Naver OAuth URL
  const naverOAuthUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
  naverOAuthUrl.searchParams.set('client_id', config.oauth.naver.clientId);
  naverOAuthUrl.searchParams.set('redirect_uri', config.oauth.naver.redirectUri);
  naverOAuthUrl.searchParams.set('response_type', 'code');
  naverOAuthUrl.searchParams.set('state', state);

  res.redirect(naverOAuthUrl.toString());
}));

/**
 * GET /api/v1/auth/naver/callback
 * Naver OAuth 콜백 핸들러 (TASK-2-11)
 * 쿼리: ?code=...&state=...
 * 응답: { user: {...}, tokens: { access_token, refresh_token, token_type, expires_in } }
 */
router.get('/naver/callback', asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    throw new Error('OAuth authorization code is required');
  }

  if (!state || typeof state !== 'string') {
    throw new Error('OAuth state parameter is required');
  }

  // Validate state
  const isValidState = await validateNaverOAuthState(state);
  if (!isValidState) {
    throw new Error('Invalid or expired OAuth state');
  }

  // Exchange code for access token
  const tokenResponse = await getNaverAccessToken(code, state);

  // Get user info from Naver
  const naverUserInfo = await getNaverUserInfo(tokenResponse.access_token);

  // Get client IP
  const forwarded = req.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';

  // Login or create user
  const result = await naverLogin(tokenResponse.access_token, naverUserInfo, ipAddress, userAgent);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

export default router;
