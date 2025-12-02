/**
 * 직업별 이슈 지수 API 컨트롤러
 *
 * 제공 API:
 * 1. GET /api/issue-index/job/:category - 특정 직업의 이슈 지수 조회
 * 2. GET /api/issue-index/jobs/all - 전체 직업 이슈 지수 조회
 * 3. GET /api/issue-index/job/:category/clusters - 직업별 매칭 클러스터 조회
 * 4. GET /api/issue-index/job/:category/articles - 직업별 매칭 기사 원문 조회
 */

import { Request, Response } from 'express';
import { executeQuery } from '../database/mysql';
import { Logger } from '../database/logger';
import { isValidJobCategory } from '../config/job-tag-mapping';
import { RowDataPacket } from 'mysql2/promise';

const logger = new Logger('JobNewsController');

// ============ 유틸리티 함수 ============

/**
 * MySQL Date 객체를 올바른 UTC ISO 문자열로 변환
 * MySQL timezone: '+00:00' 설정으로 인해 Date 객체가 잘못 생성되는 문제 보정
 *
 * @param mysqlDate MySQL에서 반환된 Date 객체
 * @returns 올바른 UTC ISO 문자열
 */
function correctMySQLDateToUTC(mysqlDate: Date): string {
  if (!(mysqlDate instanceof Date)) {
    return mysqlDate; // 이미 문자열이면 그대로 반환
  }

  // MySQL에서 로컬 시간으로 저장된 값이 UTC로 잘못 해석됨
  // 한국 시간(+09:00)을 빼서 실제 UTC 시간으로 보정
  const correctedTime = new Date(mysqlDate.getTime() - (9 * 60 * 60 * 1000));
  return correctedTime.toISOString();
}

// ============ 1. 특정 직업 이슈 지수 조회 ============

/**
 * GET /api/issue-index/job/:category
 *
 * @param category 직업 카테고리 (예: "기술/개발")
 * @param collected_at (optional) 특정 시간 조회, 없으면 최신
 */
export async function getJobIssueIndex(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.params;
    const collectedAt = req.query.collected_at as string | undefined;

    // 직업 카테고리 유효성 검증
    if (!isValidJobCategory(category)) {
      res.status(400).json({
        error: 'Invalid job category',
        message: `"${category}" is not a valid job category`,
      });
      return;
    }

    let query: string;
    let params: any[];

    if (collectedAt) {
      // 특정 시간 조회
      query = `
        SELECT
          job_category,
          collected_at,
          issue_index,
          active_clusters_count,
          inactive_clusters_count,
          total_articles_count,
          created_at
        FROM job_issue_index
        WHERE job_category = ? AND collected_at = ?
      `;
      params = [category, collectedAt];
    } else {
      // 최신 조회
      query = `
        SELECT
          job_category,
          collected_at,
          issue_index,
          active_clusters_count,
          inactive_clusters_count,
          total_articles_count,
          created_at
        FROM job_issue_index
        WHERE job_category = ?
        ORDER BY collected_at DESC
        LIMIT 1
      `;
      params = [category];
    }

    const rows: any[] = await executeQuery(query, params);

    if (rows.length === 0) {
      res.status(404).json({
        error: 'Not found',
        message: `No issue index data found for "${category}"`,
      });
      return;
    }

    const data = rows[0];

    res.json({
      job_category: data.job_category,
      collected_at: correctMySQLDateToUTC(data.collected_at),
      issue_index: parseFloat(data.issue_index),
      active_clusters_count: data.active_clusters_count,
      inactive_clusters_count: data.inactive_clusters_count,
      total_articles_count: data.total_articles_count,
    });
  } catch (error) {
    logger.error('Failed to get job issue index', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve job issue index',
    });
  }
}

// ============ 2. 전체 직업 이슈 지수 조회 ============

/**
 * GET /api/issue-index/jobs/all
 *
 * @param collected_at (optional) 특정 시간 조회, 없으면 최신
 */
export async function getAllJobIssueIndexes(req: Request, res: Response): Promise<void> {
  try {
    const collectedAt = req.query.collected_at as string | undefined;

    let query: string;
    let params: any[];

    if (collectedAt) {
      // 특정 시간의 전체 직업 조회
      query = `
        SELECT
          job_category,
          collected_at,
          issue_index,
          active_clusters_count,
          inactive_clusters_count,
          total_articles_count
        FROM job_issue_index
        WHERE collected_at = ?
        ORDER BY issue_index DESC
      `;
      params = [collectedAt];
    } else {
      // 최신 시간의 전체 직업 조회
      query = `
        SELECT
          job_category,
          collected_at,
          issue_index,
          active_clusters_count,
          inactive_clusters_count,
          total_articles_count
        FROM job_issue_index
        WHERE collected_at = (
          SELECT MAX(collected_at) FROM job_issue_index
        )
        ORDER BY issue_index DESC
      `;
      params = [];
    }

    const rows: any[] = await executeQuery(query, params);

    if (rows.length === 0) {
      res.status(404).json({
        error: 'Not found',
        message: 'No job issue index data found',
      });
      return;
    }

    const collectedAtValue = rows[0].collected_at;

    res.json({
      collected_at: correctMySQLDateToUTC(collectedAtValue),
      jobs: rows.map((row) => ({
        job_category: row.job_category,
        issue_index: parseFloat(row.issue_index),
        active_clusters_count: row.active_clusters_count,
        inactive_clusters_count: row.inactive_clusters_count,
        total_articles_count: row.total_articles_count,
      })),
    });
  } catch (error) {
    logger.error('Failed to get all job issue indexes', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve job issue indexes',
    });
  }
}

// ============ 3. 직업별 매칭 클러스터 조회 ============

/**
 * GET /api/issue-index/job/:category/clusters
 *
 * @param category 직업 카테고리
 * @param collected_at (optional) 특정 시간 조회, 없으면 최신
 * @param status (optional) 'active' | 'inactive' | 'all' (default: 'all')
 */
export async function getJobMatchedClusters(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.params;
    const collectedAt = req.query.collected_at as string | undefined;
    const status = (req.query.status as string) || 'all';

    // 직업 카테고리 유효성 검증
    if (!isValidJobCategory(category)) {
      res.status(400).json({
        error: 'Invalid job category',
        message: `"${category}" is not a valid job category`,
      });
      return;
    }

    // collected_at 결정 (없으면 최신)
    let targetCollectedAt: string;

    if (collectedAt) {
      targetCollectedAt = collectedAt;
    } else {
      const latestQuery = `
        SELECT MAX(collected_at) as latest
        FROM job_issue_index
        WHERE job_category = ?
      `;
      const latestRows: any[] = await executeQuery(latestQuery, [category]);

      if (latestRows.length === 0 || !latestRows[0].latest) {
        res.status(404).json({
          error: 'Not found',
          message: `No data found for "${category}"`,
        });
        return;
      }

      targetCollectedAt = latestRows[0].latest;
    }

    // 매칭된 클러스터 조회 (cluster_snapshots와 JOIN)
    let statusCondition = '';
    if (status === 'active') {
      statusCondition = 'AND cs.status = "active"';
    } else if (status === 'inactive') {
      statusCondition = 'AND cs.status = "inactive"';
    }

    const query = `
      SELECT
        jcm.cluster_id,
        jcm.match_ratio,
        jcm.weighted_score,
        cs.topic_name,
        cs.tags,
        cs.cluster_score,
        cs.status,
        cs.article_count,
        cs.article_indices,
        cs.appearance_count
      FROM job_cluster_mapping jcm
      JOIN cluster_snapshots cs
        ON jcm.cluster_id = cs.cluster_id
        AND jcm.collected_at = cs.collected_at
      WHERE jcm.job_category = ?
        AND jcm.collected_at = ?
        ${statusCondition}
      ORDER BY jcm.weighted_score DESC
    `;

    const rows: any[] = await executeQuery(query, [category, targetCollectedAt]);

    const clusters = rows.map((row) => ({
      cluster_id: row.cluster_id,
      topic_name: row.topic_name,
      tags: JSON.parse(row.tags),
      cluster_score: parseFloat(row.cluster_score),
      status: row.status,
      article_count: row.article_count,
      article_indices: JSON.parse(row.article_indices),
      appearance_count: row.appearance_count,
      match_ratio: parseFloat(row.match_ratio),
      weighted_score: parseFloat(row.weighted_score),
    }));

    // 총 기사 수 계산 (중복 제거)
    const allIndices = new Set<number>();
    clusters.forEach((cluster) => {
      cluster.article_indices.forEach((index: number) => allIndices.add(index));
    });

    res.json({
      job_category: category,
      collected_at: correctMySQLDateToUTC(new Date(targetCollectedAt)),
      clusters,
      metadata: {
        total_clusters: clusters.length,
        total_articles: allIndices.size,
      },
    });
  } catch (error) {
    logger.error('Failed to get job matched clusters', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve job matched clusters',
    });
  }
}

// ============ 4. 직업별 매칭 기사 원문 조회 ============

/**
 * GET /api/issue-index/job/:category/articles
 *
 * @param category 직업 카테고리
 * @param collected_at (optional) 특정 시간 조회, 없으면 최신
 * @param cluster_id (optional) 특정 클러스터의 기사만
 * @param limit (optional) 최대 기사 수 (default: 100)
 */
export async function getJobMatchedArticles(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.params;
    const collectedAt = req.query.collected_at as string | undefined;
    const clusterId = req.query.cluster_id as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    // 직업 카테고리 유효성 검증
    if (!isValidJobCategory(category)) {
      res.status(400).json({
        error: 'Invalid job category',
        message: `"${category}" is not a valid job category`,
      });
      return;
    }

    // collected_at 결정
    let targetCollectedAt: string;

    if (collectedAt) {
      targetCollectedAt = collectedAt;
    } else {
      const latestQuery = `
        SELECT MAX(collected_at) as latest
        FROM job_issue_index
        WHERE job_category = ?
      `;
      const latestRows: any[] = await executeQuery(latestQuery, [category]);

      if (latestRows.length === 0 || !latestRows[0].latest) {
        res.status(404).json({
          error: 'Not found',
          message: `No data found for "${category}"`,
        });
        return;
      }

      targetCollectedAt = latestRows[0].latest;
    }

    // Step 1: 매칭된 클러스터의 article_indices 수집
    let clusterQuery: string;
    let clusterParams: any[];

    if (clusterId) {
      // 특정 클러스터만
      clusterQuery = `
        SELECT cs.article_indices, cs.cluster_id, cs.topic_name
        FROM job_cluster_mapping jcm
        JOIN cluster_snapshots cs
          ON jcm.cluster_id = cs.cluster_id
          AND jcm.collected_at = cs.collected_at
        WHERE jcm.job_category = ?
          AND jcm.collected_at = ?
          AND jcm.cluster_id = ?
      `;
      clusterParams = [category, targetCollectedAt, clusterId];
    } else {
      // 전체 클러스터
      clusterQuery = `
        SELECT cs.article_indices, cs.cluster_id, cs.topic_name
        FROM job_cluster_mapping jcm
        JOIN cluster_snapshots cs
          ON jcm.cluster_id = cs.cluster_id
          AND jcm.collected_at = cs.collected_at
        WHERE jcm.job_category = ?
          AND jcm.collected_at = ?
      `;
      clusterParams = [category, targetCollectedAt];
    }

    const clusterRows: any[] = await executeQuery(clusterQuery, clusterParams);

    if (clusterRows.length === 0) {
      res.status(404).json({
        error: 'Not found',
        message: 'No matched clusters found',
      });
      return;
    }

    // article_indices를 병합하여 유니크한 인덱스 수집
    const indexToClusterMap = new Map<number, { cluster_id: string; topic_name: string }>();

    clusterRows.forEach((row) => {
      const indices: number[] = JSON.parse(row.article_indices);
      indices.forEach((index) => {
        // 중복된 경우 첫 번째 클러스터 정보만 저장
        if (!indexToClusterMap.has(index)) {
          indexToClusterMap.set(index, {
            cluster_id: row.cluster_id,
            topic_name: row.topic_name,
          });
        }
      });
    });

    const uniqueIndices = Array.from(indexToClusterMap.keys());

    // limit 적용
    const limitedIndices = uniqueIndices.slice(0, limit);

    // Step 2: 기사 원문 조회
    if (limitedIndices.length === 0) {
      res.json({
        job_category: category,
        collected_at: correctMySQLDateToUTC(new Date(targetCollectedAt)),
        article_count: 0,
        articles: [],
      });
      return;
    }

    const placeholders = limitedIndices.map(() => '?').join(', ');
    const articleQuery = `
      SELECT
        article_index,
        title,
        link,
        description,
        pub_date
      FROM news_articles
      WHERE collected_at = ?
        AND article_index IN (${placeholders})
      ORDER BY article_index ASC
    `;

    const articleParams = [targetCollectedAt, ...limitedIndices];
    const articleRows: any[] = await executeQuery(articleQuery, articleParams);

    const articles = articleRows.map((row) => {
      const clusterInfo = indexToClusterMap.get(row.article_index)!;
      return {
        index: row.article_index,
        cluster_id: clusterInfo.cluster_id,
        topic_name: clusterInfo.topic_name,
        title: row.title,
        link: row.link,
        description: row.description,
        pub_date: row.pub_date,
      };
    });

    res.json({
      job_category: category,
      collected_at: correctMySQLDateToUTC(new Date(targetCollectedAt)),
      article_count: articles.length,
      total_matched_articles: uniqueIndices.length,
      articles,
    });
  } catch (error) {
    logger.error('Failed to get job matched articles', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve job matched articles',
    });
  }
}
