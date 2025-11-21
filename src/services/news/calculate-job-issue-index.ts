/**
 * AI 뉴스 클러스터링 - 직업별 이슈 지수 계산
 *
 * 프로세스:
 * 1. cluster_snapshots에서 최신 스냅샷 조회
 * 2. 13개 직업별로 태그 매칭 (match_ratio 계산)
 * 3. 가중 점수 계산 (weighted_score = cluster_score × match_ratio)
 * 4. 직업별 이슈 지수 계산 (활성 × 1.0 + 비활성 × 0.5)
 *
 * 공식:
 * - weighted_score = cluster_score × match_ratio
 * - 비활성_가중점수 = weighted_score × e^(-0.1 × 비활성_경과일수)
 * - 활성_평균 = Σ(활성 가중점수) / 활성 수
 * - 비활성_평균 = Σ(비활성_가중점수) / 비활성 수
 * - 직업별 지수 = (활성_평균 × 1.0) + (비활성_평균 × 0.5)
 */

import { executeQuery } from '../../database/mysql';
import { Logger } from '../../database/logger';
import {
  JOB_CATEGORIES,
  getJobTags,
  calculateTagMatch,
} from '../../config/job-tag-mapping';

const logger = new Logger('CalculateJobIssueIndex');

// ============ Type 정의 ============

interface ClusterSnapshot {
  cluster_id: string;
  topic_name: string;
  tags: string[];
  appearance_count: number;
  article_count: number;
  article_indices: number[];
  status: 'active' | 'inactive';
  cluster_score: number;
  collected_at: string;
}

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
 * 두 ISO 8601 datetime 문자열 사이의 일수 계산
 */
function calculateDaysDifference(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(0, diffDays);
}

/**
 * 지수감쇠 계산
 */
function applyExponentialDecay(baseScore: number, daysPassed: number): number {
  const decayFactor = Math.exp(-0.1 * daysPassed);
  return baseScore * decayFactor;
}

/**
 * cluster_snapshots에서 최신 스냅샷 조회
 */
async function getLatestClusterSnapshots(
  collectedAt: string
): Promise<ClusterSnapshot[]> {
  const query = `
    SELECT
      cluster_id,
      topic_name,
      tags,
      appearance_count,
      article_count,
      article_indices,
      status,
      cluster_score,
      collected_at
    FROM cluster_snapshots
    WHERE collected_at = ?
    ORDER BY cluster_score DESC
  `;

  const rows: any[] = await executeQuery(query, [collectedAt]);

  return rows.map((row) => ({
    cluster_id: row.cluster_id,
    topic_name: row.topic_name,
    tags: JSON.parse(row.tags),
    appearance_count: row.appearance_count,
    article_count: row.article_count,
    article_indices: JSON.parse(row.article_indices),
    status: row.status,
    cluster_score: parseFloat(row.cluster_score),
    collected_at: row.collected_at,
  }));
}

/**
 * 특정 직업에 대한 클러스터 매칭 계산
 */
function calculateJobClusterMatches(
  jobCategory: string,
  clusters: ClusterSnapshot[]
): ClusterMatch[] {
  const jobTags = getJobTags(jobCategory);
  const matches: ClusterMatch[] = [];

  for (const cluster of clusters) {
    const { matchedTags, matchRatio } = calculateTagMatch(cluster.tags, jobTags);

    // 매칭이 없으면 스킵 (0개 매칭)
    if (matchRatio === 0) {
      continue;
    }

    const weightedScore = cluster.cluster_score * matchRatio;

    matches.push({
      cluster_id: cluster.cluster_id,
      cluster_score: cluster.cluster_score,
      status: cluster.status,
      collected_at: cluster.collected_at,
      matched_tags: matchedTags,
      match_ratio: matchRatio,
      weighted_score: weightedScore,
    });
  }

  return matches;
}

/**
 * 활성 클러스터의 가중 평균 계산
 */
function calculateActiveWeightedAverage(activeMatches: ClusterMatch[]): number {
  if (activeMatches.length === 0) {
    return 0;
  }

  const totalWeightedScore = activeMatches.reduce(
    (sum, match) => sum + match.weighted_score,
    0
  );

  return totalWeightedScore / activeMatches.length;
}

/**
 * 비활성 클러스터의 감쇠된 가중 평균 계산
 */
function calculateInactiveWeightedAverage(
  inactiveMatches: ClusterMatch[],
  currentTime: string
): number {
  if (inactiveMatches.length === 0) {
    return 0;
  }

  const decayedScores = inactiveMatches.map((match) => {
    const daysPassed = calculateDaysDifference(match.collected_at, currentTime);
    return applyExponentialDecay(match.weighted_score, daysPassed);
  });

  const totalDecayedScore = decayedScores.reduce((sum, score) => sum + score, 0);

  return totalDecayedScore / inactiveMatches.length;
}

/**
 * 직업별 이슈 지수 계산
 * 공식: (활성_평균 × 1.0) + (비활성_평균 × 0.5)
 */
function calculateJobIssueIndex(
  activeAverage: number,
  inactiveAverage: number
): number {
  return activeAverage * 1.0 + inactiveAverage * 0.5;
}

/**
 * 총 기사 개수 계산 (중복 제거)
 */
function calculateTotalArticlesCount(matches: ClusterMatch[]): number {
  // 클러스터 ID를 사용하여 cluster_snapshots에서 article_indices를 조회해야 하지만,
  // 여기서는 간단히 모든 매칭된 클러스터의 article_count 합산
  // (실제로는 중복 제거가 필요할 수 있음)
  return matches.reduce((sum, match) => {
    // cluster_score와 match_ratio를 곱한 비율만큼만 카운트
    // 정확한 구현을 위해서는 실제 article_indices를 병합하여 중복 제거 필요
    return sum;
  }, 0);
}

// ============ 메인 함수 ============

/**
 * 특정 직업 카테고리에 대한 이슈 지수 계산
 */
export async function calculateSingleJobIssueIndex(
  jobCategory: string,
  collectedAt: string
): Promise<JobIssueIndexResult> {
  logger.info(`\n========== Calculating Job Issue Index: ${jobCategory} ==========\n`);

  // Step 1: 최신 클러스터 스냅샷 조회
  logger.info('📊 Step 1: Fetching cluster snapshots...');
  const clusters = await getLatestClusterSnapshots(collectedAt);
  logger.info(`   ✅ Fetched ${clusters.length} clusters`);

  // Step 2: 직업별 태그 매칭
  logger.info(`\n📊 Step 2: Matching tags for "${jobCategory}"...`);
  const allMatches = calculateJobClusterMatches(jobCategory, clusters);
  logger.info(`   ✅ Matched ${allMatches.length} clusters`);

  // Step 3: 활성/비활성 분리
  const activeMatches = allMatches.filter((m) => m.status === 'active');
  const inactiveMatches = allMatches.filter((m) => m.status === 'inactive');

  logger.info(`   📈 Active: ${activeMatches.length}`);
  logger.info(`   📉 Inactive: ${inactiveMatches.length}`);

  // Step 4: 활성 가중 평균 계산
  logger.info('\n📊 Step 3: Calculating active weighted average...');
  const activeAverage = calculateActiveWeightedAverage(activeMatches);
  logger.info(`   ✅ Active average: ${activeAverage.toFixed(2)}`);

  // Step 5: 비활성 가중 평균 계산 (감쇠 적용)
  logger.info('\n📊 Step 4: Calculating inactive weighted average with decay...');
  const inactiveAverage = calculateInactiveWeightedAverage(inactiveMatches, collectedAt);
  logger.info(`   ✅ Inactive average (with decay): ${inactiveAverage.toFixed(2)}`);

  // Step 6: 최종 직업별 이슈 지수 계산
  logger.info('\n📊 Step 5: Calculating final job issue index...');
  const issueIndex = calculateJobIssueIndex(activeAverage, inactiveAverage);
  logger.info(`   ✅ Job Issue Index: ${issueIndex.toFixed(1)}`);
  logger.info(
    `   📐 Formula: (${activeAverage.toFixed(2)} × 1.0) + (${inactiveAverage.toFixed(2)} × 0.5)`
  );

  // Step 7: 총 기사 개수 계산 (클러스터별 article_count 합산)
  const totalArticlesCount = allMatches.reduce((sum, match) => {
    // 실제로는 cluster_snapshots에서 article_indices를 가져와 중복 제거 필요
    // 여기서는 간단히 0으로 설정 (나중에 DB 조회로 정확히 계산)
    return sum;
  }, 0);

  logger.info(`\n========== Job Issue Index Complete: ${jobCategory} ==========\n`);

  return {
    job_category: jobCategory,
    collected_at: collectedAt,
    issue_index: Math.round(issueIndex * 10) / 10, // 소수점 1자리
    active_clusters_count: activeMatches.length,
    inactive_clusters_count: inactiveMatches.length,
    total_articles_count: totalArticlesCount,
    cluster_matches: allMatches,
  };
}

/**
 * 모든 직업 카테고리(13개)에 대한 이슈 지수 계산
 */
export async function calculateAllJobIssueIndexes(
  collectedAt: string
): Promise<JobIssueIndexResult[]> {
  logger.info(
    `\n========== Calculating All Job Issue Indexes (${JOB_CATEGORIES.length} jobs) ==========\n`
  );
  logger.info(`Collected At: ${collectedAt}`);

  const results: JobIssueIndexResult[] = [];

  for (const jobCategory of JOB_CATEGORIES) {
    try {
      const result = await calculateSingleJobIssueIndex(jobCategory, collectedAt);
      results.push(result);
    } catch (error) {
      logger.error(`Failed to calculate issue index for "${jobCategory}"`, error);
      throw error;
    }
  }

  logger.info(
    `\n========== All Job Issue Indexes Calculated Successfully ==========\n`
  );

  return results;
}
