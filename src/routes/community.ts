/**
 * 커뮤니티 라우트
 */

import { Router, Request, Response } from 'express';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import {
  checkPostOwnership,
  checkCommentOwnership,
  createCommunityRateLimiter,
} from '@/middleware/community';
import communityPostService from '@/services/community/CommunityPostService';
import communityCommentService from '@/services/community/CommunityCommentService';
import communityLikeService from '@/services/community/CommunityLikeService';
import communityNotificationService from '@/services/community/CommunityNotificationService';
import communitySearchService from '@/services/community/CommunitySearchService';

const router = Router();
const communityRateLimiter = createCommunityRateLimiter();

// ==================== 게시물 관련 라우트 ====================

/**
 * 게시물 작성
 * POST /api/v1/community/posts
 */
router.post('/posts', requireAuth, communityRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;
    const { title, content, category } = req.body;

    const post = await communityPostService.createPost(userId, {
      title,
      content,
      category,
    });

    res.status(201).json({
      success: true,
      data: post,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to create post',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 게시물 목록 조회
 * GET /api/v1/community/posts
 */
router.get('/posts', optionalAuth, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.user_id;
    const { page, limit, category, sort } = req.query;

    const result = await communityPostService.getPosts(
      {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        category: category as any,
        sort: sort as any,
      },
      currentUserId
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get posts',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 게시물 검색
 * GET /api/v1/community/posts/search
 */
router.get('/posts/search', optionalAuth, async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user?.user_id;
    const { q, category, page, limit } = req.query;

    const result = await communitySearchService.searchPosts(
      {
        q: q as string,
        category: category as any,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      },
      currentUserId
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to search posts',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 게시물 상세 조회
 * GET /api/v1/community/posts/:postId
 */
router.get('/posts/:postId', optionalAuth, async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const currentUserId = (req as any).user?.user_id;

    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POST_ID',
          message: 'Invalid post ID',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const post = await communityPostService.getPostById(postId, currentUserId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'POST_NOT_FOUND',
          message: 'Post not found',
        },
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: post,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get post',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 게시물 수정
 * PUT /api/v1/community/posts/:postId
 */
router.put(
  '/posts/:postId',
  requireAuth,
  checkPostOwnership,
  communityRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId, 10);
      const userId = (req as any).user.user_id;
      const { title, content, category } = req.body;

      const post = await communityPostService.updatePost(postId, userId, {
        title,
        content,
        category,
      });

      res.json({
        success: true,
        data: post,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to update post',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * 게시물 삭제
 * DELETE /api/v1/community/posts/:postId
 */
router.delete(
  '/posts/:postId',
  requireAuth,
  checkPostOwnership,
  async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId, 10);
      const userId = (req as any).user.user_id;

      await communityPostService.deletePost(postId, userId);

      res.json({
        success: true,
        data: { message: 'Post deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete post',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * 게시물 좋아요 토글
 * POST /api/v1/community/posts/:postId/like
 */
router.post(
  '/posts/:postId/like',
  requireAuth,
  communityRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId, 10);
      const userId = (req as any).user.user_id;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_POST_ID',
            message: 'Invalid post ID',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const result = await communityLikeService.togglePostLike(postId, userId);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to toggle post like',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// ==================== 댓글 관련 라우트 ====================

/**
 * 댓글 작성
 * POST /api/v1/community/posts/:postId/comments
 */
router.post(
  '/posts/:postId/comments',
  requireAuth,
  communityRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.postId, 10);
      const userId = (req as any).user.user_id;
      const { content, parent_comment_id } = req.body;

      if (isNaN(postId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_POST_ID',
            message: 'Invalid post ID',
          },
          timestamp: new Date().toISOString(),
        });
      }

      const comment = await communityCommentService.createComment(postId, userId, {
        content,
        parent_comment_id,
      });

      res.status(201).json({
        success: true,
        data: comment,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to create comment',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * 댓글 목록 조회
 * GET /api/v1/community/posts/:postId/comments
 */
router.get('/posts/:postId/comments', async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.postId, 10);

    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_POST_ID',
          message: 'Invalid post ID',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const comments = await communityCommentService.getCommentsByPostId(postId);

    res.json({
      success: true,
      data: comments,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get comments',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 댓글 삭제
 * DELETE /api/v1/community/comments/:commentId
 */
router.delete(
  '/comments/:commentId',
  requireAuth,
  checkCommentOwnership,
  async (req: Request, res: Response) => {
    try {
      const commentId = parseInt(req.params.commentId, 10);
      const userId = (req as any).user.user_id;

      await communityCommentService.deleteComment(commentId, userId);

      res.json({
        success: true,
        data: { message: 'Comment deleted successfully' },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(error.status || 500).json({
        success: false,
        error: {
          code: error.code || 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to delete comment',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// ==================== 알림 관련 라우트 ====================

/**
 * 알림 목록 조회
 * GET /api/v1/community/notifications
 */
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;
    const { page, limit, unread_only } = req.query;

    const result = await communityNotificationService.getNotifications(userId, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      unread_only: unread_only === 'true',
    });

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get notifications',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 알림 읽음 처리
 * PUT /api/v1/community/notifications/:notificationId/read
 */
router.put('/notifications/:notificationId/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.notificationId, 10);
    const userId = (req as any).user.user_id;

    if (isNaN(notificationId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NOTIFICATION_ID',
          message: 'Invalid notification ID',
        },
        timestamp: new Date().toISOString(),
      });
    }

    await communityNotificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      data: { message: 'Notification marked as read' },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to mark notification as read',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 모든 알림 읽음 처리
 * PUT /api/v1/community/notifications/read-all
 */
router.put('/notifications/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    await communityNotificationService.markAllAsRead(userId);

    res.json({
      success: true,
      data: { message: 'All notifications marked as read' },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to mark all notifications as read',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * 읽지 않은 알림 개수 조회
 * GET /api/v1/community/notifications/unread-count
 */
router.get('/notifications/unread-count', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.user_id;

    const count = await communityNotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get unread count',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
