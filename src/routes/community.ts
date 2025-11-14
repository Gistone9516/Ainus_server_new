/**
 * 커뮤니티 API 라우터
 * 게시글, 댓글, 좋아요, 검색 등 커뮤니티 기능 제공
 */

import { Router, Request, Response } from 'express';
import {
  createPost,
  getPosts,
  getPostDetail,
  updatePostDetail,
  deletePostDetail,
  togglePostLike,
  createComment,
  searchPosts
} from '../services/CommunityService';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import rateLimit from 'express-rate-limit';
import { PostCategory, SortOption } from '../types';

const router = Router();

// Rate Limiters
const postCreateRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 10회
  message: '게시글 작성 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false
});

const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // 30회
  message: '검색 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/v1/community/posts
 * 게시글 작성
 * 인증 필요
 * Rate Limit: 1분에 10회
 */
router.post('/posts', requireAuth, postCreateRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { title, content, category } = req.body;

  const result = await createPost(userId, {
    title,
    content,
    category
  });

  res.status(201).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/community/posts
 * 게시글 목록 조회 (피드)
 * 인증 선택적
 */
router.get('/posts', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId || null;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const sort = (req.query.sort as SortOption) || 'latest';
  const category = req.query.category as PostCategory | undefined;

  const result = await getPosts(userId, {
    page,
    limit,
    sort,
    category
  });

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/community/posts/:post_id
 * 게시글 상세 조회
 * 인증 선택적
 */
router.get('/posts/:post_id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId || null;
  const postId = parseInt(req.params.post_id);

  if (isNaN(postId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '유효하지 않은 게시글 ID입니다'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const result = await getPostDetail(postId, userId);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * PUT /api/v1/community/posts/:post_id
 * 게시글 수정
 * 인증 필요, 소유자만 가능
 */
router.put('/posts/:post_id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const postId = parseInt(req.params.post_id);
  const { title, content, category } = req.body;

  if (isNaN(postId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '유효하지 않은 게시글 ID입니다'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const result = await updatePostDetail(postId, userId, {
    title,
    content,
    category
  });

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * DELETE /api/v1/community/posts/:post_id
 * 게시글 삭제
 * 인증 필요, 소유자만 가능
 */
router.delete('/posts/:post_id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const postId = parseInt(req.params.post_id);

  if (isNaN(postId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '유효하지 않은 게시글 ID입니다'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  await deletePostDetail(postId, userId);

  res.status(200).json({
    success: true,
    message: '게시글이 삭제되었습니다',
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/community/posts/:post_id/like
 * 게시글 좋아요 토글
 * 인증 필요
 */
router.post('/posts/:post_id/like', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const postId = parseInt(req.params.post_id);

  if (isNaN(postId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '유효하지 않은 게시글 ID입니다'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const result = await togglePostLike(postId, userId);

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * POST /api/v1/community/posts/:post_id/comments
 * 댓글 작성
 * 인증 필요
 */
router.post('/posts/:post_id/comments', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const postId = parseInt(req.params.post_id);
  const { content } = req.body;

  if (isNaN(postId)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '유효하지 않은 게시글 ID입니다'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const result = await createComment(postId, userId, { content });

  res.status(201).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/v1/community/search
 * 게시글 검색
 * 인증 선택적
 * Rate Limit: 1분에 30회
 */
router.get('/search', optionalAuth, searchRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId || null;
  const q = req.query.q as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const category = req.query.category as PostCategory | undefined;
  const sort = (req.query.sort as SortOption) || 'relevance';

  if (!q || q.trim().length < 2) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: '검색어는 최소 2자 이상이어야 합니다'
      },
      timestamp: new Date().toISOString()
    });
    return;
  }

  const result = await searchPosts(userId, {
    q: q.trim(),
    page,
    limit,
    category,
    sort
  });

  res.status(200).json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

export default router;
