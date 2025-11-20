/**
 * AI 뉴스 기사 태그 분류 API 라우트
 */

import { Router } from 'express';
import { requireAuth } from '@/middleware/auth';
import { requireAdmin } from '@/middleware/admin-auth';
import * as taggingController from '@/api/news-tagging.controller';

const router = Router();

// ============ Admin API (관리자 전용) ============

/**
 * POST /api/v1/news-tagging/admin/run
 * 파이프라인 수동 실행
 */
router.post('/admin/run', requireAuth, requireAdmin, taggingController.runTaggingPipeline);

/**
 * GET /api/v1/news-tagging/admin/status
 * 파이프라인 상태 조회
 */
router.get(
  '/admin/status',
  requireAuth,
  requireAdmin,
  taggingController.getPipelineStatus
);

/**
 * GET /api/v1/news-tagging/admin/untagged
 * 미분류 기사 목록 조회
 */
router.get(
  '/admin/untagged',
  requireAuth,
  requireAdmin,
  taggingController.getUntaggedArticles
);

// ============ Article Tags API (인증 필요) ============

/**
 * GET /api/v1/news-tagging/articles/:article_id/tags
 * 특정 기사의 태그 조회
 */
router.get(
  '/articles/:article_id/tags',
  requireAuth,
  taggingController.getArticleTags
);

/**
 * POST /api/v1/news-tagging/articles/tags/batch
 * 여러 기사의 태그 일괄 조회
 */
router.post(
  '/articles/tags/batch',
  requireAuth,
  taggingController.getBatchArticleTags
);

// ============ Tags API (Public) ============

/**
 * GET /api/v1/news-tagging/tags
 * 전체 태그 목록 조회
 */
router.get('/tags', taggingController.getAllTags);

/**
 * GET /api/v1/news-tagging/tags/:tag_id
 * 특정 태그 상세 정보
 */
router.get('/tags/:tag_id', taggingController.getTagDetail);

/**
 * GET /api/v1/news-tagging/tags/:tag_id/articles
 * 특정 태그의 기사 목록
 */
router.get('/tags/:tag_id/articles', requireAuth, taggingController.getArticlesByTag);

// ============ Stats API (인증 필요) ============

/**
 * GET /api/v1/news-tagging/stats/distribution
 * 태그 분포 통계
 */
router.get(
  '/stats/distribution',
  requireAuth,
  taggingController.getTagDistribution
);

export default router;
