/**
 * 커뮤니티 미들웨어
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import communityPostService from '@/services/community/CommunityPostService';
import communityCommentService from '@/services/community/CommunityCommentService';

/**
 * 게시물 작성자 확인 미들웨어
 */
export async function checkPostOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const postId = parseInt(req.params.postId, 10);
    const userId = (req as any).user?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (isNaN(postId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POST_ID',
          message: 'Invalid post ID',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 게시물 작성자 확인
    await communityPostService.checkPostOwnership(postId, userId);

    next();
  } catch (error: any) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: error.message || 'You are not allowed to perform this action',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 댓글 작성자 확인 미들웨어
 */
export async function checkCommentOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const commentId = parseInt(req.params.commentId, 10);
    const userId = (req as any).user?.user_id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (isNaN(commentId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COMMENT_ID',
          message: 'Invalid comment ID',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 댓글 작성자 확인
    await communityCommentService.checkCommentOwnership(commentId, userId);

    next();
  } catch (error: any) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: error.message || 'You are not allowed to perform this action',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 커뮤니티 Rate Limiter
 * 15분 내 50회 제한
 */
export function createCommunityRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15분
    max: 50, // 최대 50회
    message: '커뮤니티 요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요',
    statusCode: 429,
    keyGenerator: (req: Request) => {
      const forwarded = req.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || 'unknown';
      return `${ip}:community`;
    },
    skip: (req: Request) => {
      return req.method === 'OPTIONS' || req.method === 'GET';
    },
    handler: (req: Request, res: Response) => {
      const resetTime = req.rateLimit?.resetTime as number | undefined;
      const retryAfter = resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 900;
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: '커뮤니티 요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요',
          details: {
            retry_after: Math.max(0, retryAfter),
          },
        },
        timestamp: new Date().toISOString(),
      });
    },
  });
}
