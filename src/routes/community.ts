/**
 * 커뮤니티 라우트
 */

import { Router } from 'express';
import { requireAuth, optionalAuth } from '@/middleware/auth';
import {
    checkPostOwnership,
    checkCommentOwnership,
    createCommunityRateLimiter,
} from '@/middleware/community';
import communityController from '@/api/community.controller';

const router = Router();
const communityRateLimiter = createCommunityRateLimiter();

// ==================== 게시물 관련 라우트 ====================

/**
 * 게시물 작성
 * POST /api/v1/community/posts
 */
router.post('/posts', requireAuth, communityRateLimiter, communityController.createPost);

/**
 * 게시물 목록 조회
 * GET /api/v1/community/posts
 */
router.get('/posts', optionalAuth, communityController.getPosts);

/**
 * 게시물 검색
 * GET /api/v1/community/posts/search
 */
router.get('/posts/search', optionalAuth, communityController.searchPosts);

/**
 * 게시물 상세 조회
 * GET /api/v1/community/posts/:postId
 */
router.get('/posts/:postId', optionalAuth, communityController.getPostById);

/**
 * 게시물 수정
 * PUT /api/v1/community/posts/:postId
 */
router.put(
    '/posts/:postId',
    requireAuth,
    checkPostOwnership,
    communityRateLimiter,
    communityController.updatePost
);

/**
 * 게시물 삭제
 * DELETE /api/v1/community/posts/:postId
 */
router.delete(
    '/posts/:postId',
    requireAuth,
    checkPostOwnership,
    communityController.deletePost
);

/**
 * 게시물 좋아요 토글
 * POST /api/v1/community/posts/:postId/like
 */
router.post(
    '/posts/:postId/like',
    requireAuth,
    communityRateLimiter,
    communityController.togglePostLike
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
    communityController.createComment
);

/**
 * 댓글 목록 조회
 * GET /api/v1/community/posts/:postId/comments
 */
router.get('/posts/:postId/comments', communityController.getCommentsByPostId);

/**
 * 댓글 삭제
 * DELETE /api/v1/community/comments/:commentId
 */
router.delete(
    '/comments/:commentId',
    requireAuth,
    checkCommentOwnership,
    communityController.deleteComment
);

// ==================== 알림 관련 라우트 ====================

/**
 * 알림 목록 조회
 * GET /api/v1/community/notifications
 */
router.get('/notifications', requireAuth, communityController.getNotifications);

/**
 * 알림 읽음 처리
 * PUT /api/v1/community/notifications/:notificationId/read
 */
router.put('/notifications/:notificationId/read', requireAuth, communityController.markAsRead);

/**
 * 모든 알림 읽음 처리
 * PUT /api/v1/community/notifications/read-all
 */
router.put('/notifications/read-all', requireAuth, communityController.markAllAsRead);

/**
 * 읽지 않은 알림 개수 조회
 * GET /api/v1/community/notifications/unread-count
 */
router.get('/notifications/unread-count', requireAuth, communityController.getUnreadCount);

export default router;
