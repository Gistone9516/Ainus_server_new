/**
 * 직업별 이슈 지수 API 라우트
 *
 * Base Path: /api/issue-index
 */

import { Router } from 'express';
import {
  getJobIssueIndex,
  getAllJobIssueIndexes,
  getJobMatchedClusters,
  getJobMatchedArticles,
} from '../api/job-news.controller';

const router = Router();

/**
 * GET /api/issue-index/job/:category
 * 특정 직업의 이슈 지수 조회
 *
 * Path Parameters:
 *   - category: 직업 카테고리 (예: "기술/개발")
 *
 * Query Parameters:
 *   - collected_at (optional): 특정 시간 조회 (ISO 8601)
 *
 * Response:
 * {
 *   "job_category": "기술/개발",
 *   "collected_at": "2025-11-21T12:00:00Z",
 *   "issue_index": 58.3,
 *   "active_clusters_count": 5,
 *   "inactive_clusters_count": 3,
 *   "total_articles_count": 234
 * }
 */
router.get('/job/:category', getJobIssueIndex);

/**
 * GET /api/issue-index/jobs/all
 * 전체 직업 이슈 지수 조회
 *
 * Query Parameters:
 *   - collected_at (optional): 특정 시간 조회 (ISO 8601)
 *
 * Response:
 * {
 *   "collected_at": "2025-11-21T12:00:00Z",
 *   "jobs": [
 *     {
 *       "job_category": "기술/개발",
 *       "issue_index": 58.3,
 *       "active_clusters_count": 5,
 *       "inactive_clusters_count": 3,
 *       "total_articles_count": 234
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/jobs/all', getAllJobIssueIndexes);

/**
 * GET /api/issue-index/job/:category/clusters
 * 직업별 매칭 클러스터 조회 (근거 데이터)
 *
 * Path Parameters:
 *   - category: 직업 카테고리
 *
 * Query Parameters:
 *   - collected_at (optional): 특정 시간 조회
 *   - status (optional): 'active' | 'inactive' | 'all' (default: 'all')
 *
 * Response:
 * {
 *   "job_category": "기술/개발",
 *   "collected_at": "2025-11-21T12:00:00Z",
 *   "clusters": [
 *     {
 *       "cluster_id": "cluster_001",
 *       "topic_name": "GPT-5 출시",
 *       "tags": ["LLM", "코드생성", ...],
 *       "cluster_score": 65.3,
 *       "status": "active",
 *       "article_count": 45,
 *       "article_indices": [0, 4, 15, ...],
 *       "appearance_count": 5,
 *       "match_ratio": 0.4,
 *       "weighted_score": 26.12
 *     },
 *     ...
 *   ],
 *   "metadata": {
 *     "total_clusters": 8,
 *     "total_articles": 234
 *   }
 * }
 */
router.get('/job/:category/clusters', getJobMatchedClusters);

/**
 * GET /api/issue-index/job/:category/articles
 * 직업별 매칭 기사 원문 조회
 *
 * Path Parameters:
 *   - category: 직업 카테고리
 *
 * Query Parameters:
 *   - collected_at (optional): 특정 시간 조회
 *   - cluster_id (optional): 특정 클러스터의 기사만
 *   - limit (optional): 최대 기사 수 (default: 100)
 *
 * Response:
 * {
 *   "job_category": "기술/개발",
 *   "collected_at": "2025-11-21T12:00:00Z",
 *   "article_count": 100,
 *   "total_matched_articles": 234,
 *   "articles": [
 *     {
 *       "index": 0,
 *       "cluster_id": "cluster_001",
 *       "topic_name": "GPT-5 출시",
 *       "title": "OpenAI, GPT-5 공개",
 *       "link": "https://...",
 *       "description": "...",
 *       "pub_date": "2025-11-21T11:30:00Z"
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/job/:category/articles', getJobMatchedArticles);

export default router;
