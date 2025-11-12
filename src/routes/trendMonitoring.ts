/**
 * Feature #8: 개인화된 AI 트렌드 모니터링 라우터
 * API 엔드포인트: /api/v1/jobs, /api/v1/users/profile/job-and-tags, 등
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { createGlobalRateLimiter } from '../middleware/rateLimiter';
import {
  getJobs,
  saveUserJobAndTags,
  getJobIssueIndex,
  getNewsByTags,
  getRecommendedTools
} from '../services/TrendMonitoringService';
import { ValidationException, DatabaseException, AgentException } from '../exceptions';

const router = Router();

/**
 * GET /api/v1/jobs
 * 직업 목록 및 자동 추천 태그 조회
 * 인증: Bearer Token (선택)
 * 속도 제한: 분당 100 요청
 * 캐시 TTL: 24시간
 * 타임아웃: 1초
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await getJobs();

    res.status(200).json({
      success: true,
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * PUT /api/v1/users/profile/job-and-tags
 * 사용자 직업 및 관심 태그 저장
 * 인증: Bearer Token (필수)
 * 요청: { job_category_id: number, interest_tag_ids: number[] }
 * 속도 제한: 분당 20 요청
 * 타임아웃: 2초
 */
router.put(
  '/job-and-tags',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { job_category_id, interest_tag_ids } = req.body;

    // 입력 검증
    if (!job_category_id) {
      throw new ValidationException('job_category_id가 필요합니다', 'trendMonitoring.put');
    }

    if (!interest_tag_ids) {
      throw new ValidationException('interest_tag_ids가 필요합니다', 'trendMonitoring.put');
    }

    const result = await saveUserJobAndTags(
      BigInt(userId),
      job_category_id,
      interest_tag_ids
    );

    res.status(200).json({
      success: true,
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/jobs/{job_category_id}/issue-index
 * 직업별 AI 이슈 지수 조회
 * 인증: Bearer Token (필수)
 * 쿼리: ?days=30
 * 속도 제한: 분당 60 요청
 * 캐시 TTL: 1시간
 * 타임아웃: 2초
 */
router.get(
  '/:job_category_id/issue-index',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { job_category_id } = req.params;
    const { days } = req.query;

    // 입력 검증
    if (!job_category_id) {
      throw new ValidationException('job_category_id가 필요합니다', 'trendMonitoring.getJobIndex');
    }

    const jobId = parseInt(job_category_id, 10);
    if (isNaN(jobId)) {
      throw new ValidationException('job_category_id는 숫자여야 합니다', 'trendMonitoring.getJobIndex');
    }

    const daysParam = days ? parseInt(days as string, 10) : 30;

    const result = await getJobIssueIndex(jobId, daysParam);

    res.status(200).json({
      success: true,
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/news/by-tags
 * 관심사 태그 기반 뉴스 피드 조회
 * 인증: Bearer Token (필수)
 * 쿼리: ?limit=10&offset=0&sort_by=published_at&days=7
 * 속도 제한: 분당 60 요청
 * 캐시 TTL: 1시간
 * 타임아웃: 2초
 */
router.get(
  '/by-tags',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { limit, offset, sort_by, days } = req.query;

    // 입력 검증
    const limitParam = limit ? parseInt(limit as string, 10) : 10;
    const offsetParam = offset ? parseInt(offset as string, 10) : 0;
    const sortByParam = sort_by ? (sort_by as string) : 'published_at';
    const daysParam = days ? parseInt(days as string, 10) : 7;

    const result = await getNewsByTags(
      BigInt(userId),
      limitParam,
      offsetParam,
      sortByParam,
      daysParam
    );

    res.status(200).json({
      success: true,
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/jobs/{job_category_id}/recommended-tools
 * 직업별 추천 도구 조회
 * 인증: Bearer Token (선택)
 * 속도 제한: 분당 60 요청
 * 캐시 TTL: 24시간
 * 타임아웃: 1초
 */
router.get(
  '/:job_category_id/recommended-tools',
  asyncHandler(async (req: Request, res: Response) => {
    const { job_category_id } = req.params;

    // 입력 검증
    if (!job_category_id) {
      throw new ValidationException('job_category_id가 필요합니다', 'trendMonitoring.getTools');
    }

    const jobId = parseInt(job_category_id, 10);
    if (isNaN(jobId)) {
      throw new ValidationException('job_category_id는 숫자여야 합니다', 'trendMonitoring.getTools');
    }

    const result = await getRecommendedTools(jobId);

    res.status(200).json({
      success: true,
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

export default router;
