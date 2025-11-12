/**
 * Rate Limiting 미들웨어 (TASK-1-18)
 * 엔드포인트별로 요청 속도 제한
 * 메모리 저장소 사용 (프로덕션에서는 rate-limit-redis로 변경 권장)
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

// TODO: 프로덕션 환경에서는 rate-limit-redis를 사용하여 분산 환경 지원
// import RedisStore from 'rate-limit-redis';

/**
 * 로그인 실패 Rate Limiter
 * 15분 내 5회 제한 → 423 (RATE_LIMIT_EXCEEDED)
 * 참고: 프로덕션에서는 rate-limit-redis를 사용하여 분산 환경 지원
 */
export function createLoginRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 5, // 최대 5회
    message: '로그인 시도 횟수를 초과했습니다. 나중에 다시 시도해주세요',
    statusCode: 429,
    keyGenerator: (req: Request) => {
      // IP 주소 기반 제한
      const forwarded = req.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
      return `${ip}:login`;
    },
    skip: (req: Request) => {
      // OPTIONS 요청은 제한하지 않음
      return req.method === 'OPTIONS';
    },
    handler: (req: Request, res: Response) => {
      const reset = req.rateLimit?.resetTime;
      const resetMs =
        reset instanceof Date
          ? reset.getTime()
          : typeof reset === 'number'
          ? reset
          : undefined;
      const retryAfter = resetMs ? Math.ceil((resetMs - Date.now()) / 1000) : 60;
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '로그인 시도 횟수를 초과했습니다. 나중에 다시 시도해주세요',
          details: {
            retry_after: Math.max(0, retryAfter)
          }
        },
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * 회원가입 Rate Limiter
 * 1시간 내 3회 제한
 */
export function createRegisterRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1시간
    max: 3, // 최대 3회
    message: '회원가입 시도 횟수를 초과했습니다. 나중에 다시 시도해주세요',
    statusCode: 429,
    keyGenerator: (req: Request) => {
      const forwarded = req.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
      return `${ip}:register`;
    },
    skip: (req: Request) => {
      return req.method === 'OPTIONS';
    },
    handler: (req: Request, res: Response) => {
      const reset = req.rateLimit?.resetTime;
      const resetMs =
        reset instanceof Date
          ? reset.getTime()
          : typeof reset === 'number'
          ? reset
          : undefined;
      const retryAfter = resetMs ? Math.ceil((resetMs - Date.now()) / 1000) : 3600;
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '회원가입 시도 횟수를 초과했습니다. 나중에 다시 시도해주세요',
          details: {
            retry_after: Math.max(0, retryAfter)
          }
        },
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * 전역/커스텀 API Rate Limiter
 * 기본값: 15분 내 100회 제한
 */
export function createGlobalRateLimiter(options?: {
  windowMs?: number;
  max?: number;
  message?: string;
}): RateLimitRequestHandler {
  const windowMs = options?.windowMs ?? 15 * 60 * 1000;
  const max = options?.max ?? 100;
  const message =
    options?.message ?? 'API 요청 횟수를 초과했습니다. 나중에 다시 시도해주세요';

  return rateLimit({
    windowMs,
    max,
    message,
    statusCode: 429,
    keyGenerator: (req: Request) => {
      const forwarded = req.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
      return ip;
    },
    skip: (req: Request) => {
      // 헬스 체크는 제한하지 않음
      return req.path === '/health' || req.method === 'OPTIONS';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message
        },
        timestamp: new Date().toISOString()
      });
    }
  });
}
