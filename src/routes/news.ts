import { Router } from 'express';
import {
    getCurrentIssueIndex,
    getHistoryIssueIndex,
    getClustersSnapshot,
    getArticlesOriginal,
    getDashboard,
    triggerPipeline,
} from '../api/news.controller';

const router = Router();

/**
 * 1️⃣ 현재 이슈 지수 + 가용 데이터 정보
 * GET /api/issue-index/current
 * 
 * 응답에 data_availability 메타데이터 포함
 */
router.get('/current', getCurrentIssueIndex);

/**
 * 2️⃣ 이슈 지수 히스토리 (단일 또는 범위 조회)
 * 
 * 단일 조회: GET /api/issue-index/history?date=2025-11-30
 * 범위 조회: GET /api/issue-index/history?start_date=2025-11-24&end_date=2025-11-30
 * 
 * 범위 조회 시 missing_dates 메타데이터 포함
 */
router.get('/history', getHistoryIssueIndex);

/**
 * 3️⃣ 클러스터 스냅샷
 * GET /api/issue-index/clusters?collected_at=...
 * 
 * 빈 데이터도 success: true, data: []로 반환 (에러 아님)
 */
router.get('/clusters', getClustersSnapshot);

/**
 * 4️⃣ 기사 원문
 * GET /api/issue-index/articles?collected_at=...&indices=...
 */
router.get('/articles', getArticlesOriginal);

/**
 * 5️⃣ 통합 대시보드 API (최적화용)
 * GET /api/issue-index/dashboard?days=7
 * 
 * 한 번의 호출로 current + history + top_clusters 반환
 */
router.get('/dashboard', getDashboard);

/**
 * 6️⃣ 파이프라인 수동 실행 (관리용)
 * POST /api/issue-index/trigger
 * 
 * 뉴스 클러스터링 파이프라인을 즉시 실행
 * ⚠️ 실행 시간이 오래 걸릴 수 있음 (GPT API 호출 포함)
 */
router.post('/trigger', triggerPipeline);

export default router;
