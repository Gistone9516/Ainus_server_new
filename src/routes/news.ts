import { Router } from 'express';
import {
    getCurrentIssueIndex,
    getHistoryIssueIndex,
    getClustersSnapshot,
    getArticlesOriginal,
} from '../api/news.controller';

const router = Router();

/**
 * 1️⃣ 현재 이슈 지수
 * GET /api/issue-index/current
 */
router.get('/current', getCurrentIssueIndex);

/**
 * 2️⃣ 과거 이슈 지수
 * GET /api/issue-index/history?date=...
 */
router.get('/history', getHistoryIssueIndex);

/**
 * 3️⃣ 클러스터 스냅샷
 * GET /api/issue-index/clusters?collected_at=...
 */
router.get('/clusters', getClustersSnapshot);

/**
 * 4️⃣ 기사 원문
 * GET /api/issue-index/articles?collected_at=...&indices=...
 */
router.get('/articles', getArticlesOriginal);

export default router;
