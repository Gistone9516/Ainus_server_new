/**
 * 이슈 지수 API 라우터 (기능 #7)
 * 이슈 지수 근거 데이터 조회 및 뉴스 기사 추가 조회
 */

import { Router, Request, Response } from 'express';
import { getIssueIndexSources, getNewsArticles } from '../services/IssueIndexService';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createIssueIndexRateLimiter } from '../middleware/rateLimiter';
import { GetIssueIndexSourcesParams } from '../types';

const router = Router();

// Rate Limiter (분당 60 요청)
const issueIndexRateLimiter = createIssueIndexRateLimiter();

/**
 * GET /api/v1/issue-index/:date/sources
 * 이슈 지수 근거 데이터 조회 (TASK-7-1)
 * Rate Limit: 분당 60 요청
 * 인증: Bearer Token 필요
 *
 * 경로 파라미터:
 * - date: 조회 날짜 (YYYY-MM-DD format)
 *
 * 쿼리 파라미터:
 * - limit: 반환할 뉴스 개수 (기본값: 3, 최대: 10)
 * - offset: 페이지네이션 오프셋 (기본값: 0)
 * - category: 카테고리 필터 (all/tech/policy/market, 기본값: all)
 * - sort_by: 정렬 기준 (impact/published_date, 기본값: impact)
 *
 * 응답:
 * {
 *   success: true,
 *   data: {
 *     date: "2025-01-15",
 *     issue_index: {
 *       value: 78,
 *       previous_value: 74,
 *       change_percentage: 5.4,
 *       change_direction: "up"
 *     },
 *     sources: [
 *       {
 *         source_id: 101,
 *         news_id: 1001,
 *         rank: 1,
 *         title: "ChatGPT 다음 버전 공개...",
 *         summary: "...",
 *         source: "Naver News",
 *         source_url: "https://...",
 *         published_at: "2025-01-15T10:30:00Z",
 *         impact_score: 95,
 *         tags: ["LLM", "ChatGPT"],
 *         content_snippet: "...",
 *         image_url: "https://..."
 *       }
 *     ],
 *     total_count: 25,
 *     timestamp: "2025-01-15T12:00:00Z"
 *   }
 * }
 */
router.get(
  '/:date/sources',
  requireAuth,
  issueIndexRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    const { limit, offset, category, sort_by } = req.query;

    const params: GetIssueIndexSourcesParams = {
      date: date,
      limit: limit ? parseInt(limit as string, 10) : 3,
      offset: offset ? parseInt(offset as string, 10) : 0,
      category: (category as 'all' | 'tech' | 'policy' | 'market') || 'all',
      sort_by: (sort_by as 'impact' | 'published_date') || 'impact'
    };

    const result = await getIssueIndexSources(params);

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/issue-index/:date/articles
 * 뉴스 기사 추가 조회 (더보기) (TASK-7-2)
 * Rate Limit: 분당 60 요청
 * 인증: Bearer Token 필요
 *
 * 경로 파라미터:
 * - date: 조회 날짜 (YYYY-MM-DD format)
 *
 * 쿼리 파라미터:
 * - limit: 반환할 뉴스 개수 (기본값: 10, 최대: 20)
 * - offset: 페이지네이션 오프셋 (기본값: 0)
 * - min_impact_score: 최소 영향도 필터 (기본값: 50)
 *
 * 응답:
 * {
 *   success: true,
 *   data: {
 *     date: "2025-01-15",
 *     articles: [
 *       {
 *         news_id: 1004,
 *         title: "AI 투자, 지난해 대비 35% 증가",
 *         summary: "...",
 *         source: "Crunchbase",
 *         source_url: "https://...",
 *         published_at: "2025-01-15T09:00:00Z",
 *         impact_score: 72,
 *         category: "market",
 *         tags: ["investment", "venture_capital"]
 *       }
 *     ],
 *     total_count: 22,
 *     has_more: true
 *   }
 * }
 */
router.get(
  '/:date/articles',
  requireAuth,
  issueIndexRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.params;
    const { limit, offset, min_impact_score } = req.query;

    const result = await getNewsArticles(
      date,
      limit ? parseInt(limit as string, 10) : 10,
      offset ? parseInt(offset as string, 10) : 0,
      min_impact_score ? parseInt(min_impact_score as string, 10) : 50
    );

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

export default router;
