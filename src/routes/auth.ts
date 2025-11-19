/**
 * 인증 API 라우터
 * 회원가입, 로그인, 프로필 조회 등
 */

import { Router } from 'express';
import { AuthController } from '../api/auth.controller';
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
 */
router.post('/register', registerRateLimiter, asyncHandler(AuthController.register));

/**
 * GET /api/v1/auth/check-email
 * 이메일 중복 확인 (TASK-1-9)
 */
router.get('/check-email', asyncHandler(AuthController.checkEmail));

/**
 * POST /api/v1/auth/login
 * 로그인 (TASK-1-10)
 * Rate Limit: 15분에 5회 (TASK-1-18)
 */
router.post('/login', loginRateLimiter, asyncHandler(AuthController.login));

/**
 * GET /api/v1/auth/me
 * 현재 사용자 정보 조회 (인증 필요)
 */
router.get('/me', requireAuth, asyncHandler(AuthController.getMe));

/**
 * POST /api/v1/auth/refresh
 * Access Token 갱신 (TASK-1-15)
 */
router.post('/refresh', asyncHandler(AuthController.refresh));

/**
 * POST /api/v1/auth/logout
 * 로그아웃 (TASK-1-16)
 */
router.post('/logout', requireAuth, asyncHandler(AuthController.logout));

// ===== Phase 3: Email & Password Reset Routes =====

/**
 * POST /api/v1/auth/forgot-password
 * 비밀번호 재설정 요청 (TASK-3-3)
 * Rate Limit: 1시간에 3회
 */
router.post('/forgot-password', asyncHandler(AuthController.forgotPassword));

/**
 * POST /api/v1/auth/reset-password
 * 비밀번호 재설정 (TASK-3-4)
 */
router.post('/reset-password', asyncHandler(AuthController.resetPassword));

/**
 * POST /api/v1/auth/change-password
 * 비밀번호 변경 (TASK-3-5)
 * 인증 필요 (로그인한 사용자만)
 */
router.post('/change-password', requireAuth, asyncHandler(AuthController.changePassword));

/**
 * POST /api/v1/auth/verify-email
 * 이메일 인증 (TASK-3-2)
 */
router.post('/verify-email', asyncHandler(AuthController.verifyEmail));

// ===== OAuth 2.0 Routes (Phase 2) =====

/**
 * GET /api/v1/auth/google
 * Google OAuth 인증 페이지로 리다이렉트 (TASK-2-1)
 */
router.get('/google', asyncHandler(AuthController.googleAuth));

/**
 * GET /api/v1/auth/google/callback
 * Google OAuth 콜백 핸들러 (TASK-2-3)
 */
router.get('/google/callback', asyncHandler(AuthController.googleCallback));

/**
 * GET /api/v1/auth/kakao
 * Kakao OAuth 인증 페이지로 리다이렉트 (TASK-2-5)
 */
router.get('/kakao', asyncHandler(AuthController.kakaoAuth));

/**
 * GET /api/v1/auth/kakao/callback
 * Kakao OAuth 콜백 핸들러 (TASK-2-7)
 */
router.get('/kakao/callback', asyncHandler(AuthController.kakaoCallback));

/**
 * GET /api/v1/auth/naver
 * Naver OAuth 인증 페이지로 리다이렉트 (TASK-2-9)
 */
router.get('/naver', asyncHandler(AuthController.naverAuth));

/**
 * GET /api/v1/auth/naver/callback
 * Naver OAuth 콜백 핸들러 (TASK-2-11)
 */
router.get('/naver/callback', asyncHandler(AuthController.naverCallback));

export default router;
