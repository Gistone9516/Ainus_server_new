/**
 * AI 뉴스 클러스터링 - 직업별 이슈 지수 DB 저장
 *
 * 저장 프로세스:
 * 1. job_issue_index 테이블에 직업별 이슈 지수 저장
 * 2. job_cluster_mapping 테이블에 매칭된 클러스터 정보 저장
 *
 * 트랜잭션으로 데이터 무결성 보장
 */

import { getDatabasePool } from '../../database/mysql';
import { Logger } from '../../database/logger';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

const logger = new Logger('SaveJobIssueIndex');

// ============ 헬퍼 함수 ============

/**
 * ISO 8601 문자열을 MySQL DATETIME 형식으로 변환
 * '2025-11-30T17:00:46.419Z' → '2025-11-30 17:00:46'
 */
function toMySQLDatetime(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ============ Type 정의 ============

interface ClusterMatch {
  cluster_id: string;
  cluster_score: number;
  status: 'active' | 'inactive';
  collected_at: string;
  matched_tags: string[];
  match_ratio: number;
  weighted_score: number;
}

interface JobIssueIndexResult {
  job_category: string;
  collected_at: string;
  issue_index: number;
  active_clusters_count: number;
  inactive_clusters_count: number;
  total_articles_count: number;
  cluster_matches: ClusterMatch[];
}

// ============ 헬퍼 함수 ============

/**
 * 총 기사 개수 계산 (중복 제거)
 * cluster_snapshots에서 article_indices를 병합하여 유니크한 기사 개수 계산
 */
async function calculateTotalArticlesCount(
  connection: PoolConnection,
  clusterMatches: ClusterMatch[],
  collectedAt: string
): Promise<number> {
  if (clusterMatches.length === 0) {
    return 0;
  }

  const clusterIds = clusterMatches.map((m) => m.cluster_id);
  const placeholders = clusterIds.map(() => '?').join(', ');

  const query = `
    SELECT article_indices
    FROM cluster_snapshots
    WHERE collected_at = ?
      AND cluster_id IN (${placeholders})
  `;

  const params = [toMySQLDatetime(collectedAt), ...clusterIds];
  const [rows] = await connection.query<RowDataPacket[]>(query, params);

  // 모든 article_indices를 병합하여 중복 제거
  const allIndices = new Set<number>();

  for (const row of rows) {
    // article_indices가 이미 파싱된 배열이면 그대로 사용, 문자열이면 파싱
    const indices: number[] = typeof row.article_indices === 'string'
      ? JSON.parse(row.article_indices)
      : row.article_indices;
    indices.forEach((index) => allIndices.add(index));
  }

  return allIndices.size;
}

/**
 * job_issue_index 테이블에 저장
 */
async function saveJobIssueIndex(
  connection: PoolConnection,
  result: JobIssueIndexResult,
  totalArticlesCount: number
): Promise<void> {
  const query = `
    INSERT INTO job_issue_index (
      job_category,
      collected_at,
      issue_index,
      active_clusters_count,
      inactive_clusters_count,
      total_articles_count
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      issue_index = VALUES(issue_index),
      active_clusters_count = VALUES(active_clusters_count),
      inactive_clusters_count = VALUES(inactive_clusters_count),
      total_articles_count = VALUES(total_articles_count),
      created_at = CURRENT_TIMESTAMP
  `;

  const params = [
    result.job_category,
    toMySQLDatetime(result.collected_at),
    result.issue_index,
    result.active_clusters_count,
    result.inactive_clusters_count,
    totalArticlesCount,
  ];

  await connection.query(query, params);
  logger.info(`   ✅ Saved job_issue_index for "${result.job_category}"`);
}

/**
 * job_cluster_mapping 테이블에 매칭 정보 저장 (배치 처리)
 */
async function saveJobClusterMappings(
  connection: PoolConnection,
  jobCategory: string,
  collectedAt: string,
  clusterMatches: ClusterMatch[]
): Promise<void> {
  if (clusterMatches.length === 0) {
    logger.info(`   ℹ️  No cluster matches to save for "${jobCategory}"`);
    return;
  }

  // 기존 매핑 삭제 (동일 job_category, collected_at)
  const deleteQuery = `
    DELETE FROM job_cluster_mapping
    WHERE job_category = ? AND collected_at = ?
  `;
  await connection.query(deleteQuery, [jobCategory, toMySQLDatetime(collectedAt)]);

  // 배치 삽입
  const insertQuery = `
    INSERT INTO job_cluster_mapping (
      job_category,
      collected_at,
      cluster_id,
      match_ratio,
      weighted_score
    ) VALUES ?
  `;

  const mysqlDatetime = toMySQLDatetime(collectedAt);
  const values = clusterMatches.map((match) => [
    jobCategory,
    mysqlDatetime,
    match.cluster_id,
    match.match_ratio,
    match.weighted_score,
  ]);

  await connection.query(insertQuery, [values]);
  logger.info(
    `   ✅ Saved ${clusterMatches.length} cluster mappings for "${jobCategory}"`
  );
}

// ============ 메인 함수 ============

/**
 * 단일 직업 카테고리의 이슈 지수 저장
 */
export async function saveSingleJobIssueIndex(
  result: JobIssueIndexResult
): Promise<void> {
  const connection = await getDatabasePool().getConnection();

  try {
    await connection.beginTransaction();
    logger.info(`\n📦 Saving job issue index for "${result.job_category}"...`);

    // Step 1: 총 기사 개수 계산
    const totalArticlesCount = await calculateTotalArticlesCount(
      connection,
      result.cluster_matches,
      result.collected_at
    );
    logger.info(`   📊 Total articles: ${totalArticlesCount}`);

    // Step 2: job_issue_index 저장
    await saveJobIssueIndex(connection, result, totalArticlesCount);

    // Step 3: job_cluster_mapping 저장
    await saveJobClusterMappings(
      connection,
      result.job_category,
      result.collected_at,
      result.cluster_matches
    );

    await connection.commit();
    logger.info(`   ✅ Transaction committed for "${result.job_category}"\n`);
  } catch (error) {
    await connection.rollback();
    logger.error(`Failed to save job issue index for "${result.job_category}"`, error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 모든 직업 카테고리(13개)의 이슈 지수 저장
 */
export async function saveAllJobIssueIndexes(
  results: JobIssueIndexResult[]
): Promise<void> {
  logger.info(
    `\n========== Saving All Job Issue Indexes (${results.length} jobs) ==========\n`
  );

  for (const result of results) {
    try {
      await saveSingleJobIssueIndex(result);
    } catch (error) {
      logger.error(`Failed to save job issue index for "${result.job_category}"`, error);
      throw error;
    }
  }

  logger.info(`\n========== All Job Issue Indexes Saved Successfully ==========\n`);
}
