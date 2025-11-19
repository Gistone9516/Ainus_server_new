/**
 * AI 뉴스 클러스터링 - 통합 이슈 지수 계산
 *
 * 공식:
 * 1. 비활성_점수 = 클러스터_점수 × e^(-0.1 × 비활성_경과일수)
 * 2. 활성_평균 = Σ(활성 점수) / 활성 수
 * 3. 비활성_평균 = Σ(비활성_점수) / 30일 이내 비활성 수
 * 4. 통합 지수 = (활성_평균 × 0.7) + (비활성_평균 × 0.3)
 */

// ============ Type 정의 ============

interface ClusterSnapshot {
  cluster_id: string;
  topic_name: string;
  tags: string[];
  appearance_count: number;
  article_count: number;
  article_indices: number[];
  status: "active" | "inactive";
  cluster_score: number;
  collected_at: string;
}

interface IssueIndexInput {
  active_clusters: ClusterSnapshot[];
  inactive_clusters_within_30days: ClusterSnapshot[];
  calculated_at: string;
}

interface IssueIndexOutput {
  collected_at: string;
  overall_index: number;
  active_average: number;
  inactive_average: number;
  active_count: number;
  inactive_count: number;
  calculated_at: string;
}

// ============ 헬퍼 함수 ============

/**
 * 두 ISO 8601 datetime 문자열 사이의 일수 계산
 * @param startDate ISO 8601 datetime (예: "2025-11-11T10:00:00Z")
 * @param endDate ISO 8601 datetime (예: "2025-11-15T12:00:00Z")
 * @returns 경과 일수
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
 * @param baseScore 기본 점수
 * @param daysPassed 경과 일수
 * @returns 감쇠된 점수
 */
function applyExponentialDecay(baseScore: number, daysPassed: number): number {
  // e^(-0.1 × 비활성_경과일수)
  const decayFactor = Math.exp(-0.1 * daysPassed);
  return baseScore * decayFactor;
}

/**
 * 활성 클러스터의 평균 점수 계산
 * @param activeClusters 활성 클러스터 배열
 * @returns 활성 평균 점수
 */
function calculateActiveAverage(activeClusters: ClusterSnapshot[]): number {
  if (activeClusters.length === 0) {
    return 0;
  }

  const totalScore = activeClusters.reduce((sum, cluster) => {
    return sum + cluster.cluster_score;
  }, 0);

  return totalScore / activeClusters.length;
}

/**
 * 비활성 클러스터의 감쇠된 평균 점수 계산
 * @param inactiveClusters 30일 이내 비활성 클러스터 배열
 * @param currentTime 현재 시간 (기준점)
 * @returns 비활성 감쇠 평균 점수
 */
function calculateInactiveAverage(
  inactiveClusters: ClusterSnapshot[],
  currentTime: string
): number {
  if (inactiveClusters.length === 0) {
    return 0;
  }

  const decayedScores = inactiveClusters.map((cluster) => {
    const daysPassed = calculateDaysDifference(cluster.collected_at, currentTime);
    return applyExponentialDecay(cluster.cluster_score, daysPassed);
  });

  const totalDecayedScore = decayedScores.reduce((sum, score) => sum + score, 0);

  return totalDecayedScore / inactiveClusters.length;
}

/**
 * 통합 이슈 지수 계산
 * @param activeAverage 활성 평균 점수
 * @param inactiveAverage 비활성 감쇠 평균 점수
 * @returns 최종 통합 이슈 지수
 */
function calculateOverallIndex(
  activeAverage: number,
  inactiveAverage: number
): number {
  // 통합 지수 = (활성_평균 × 0.7) + (비활성_평균 × 0.3)
  return activeAverage * 0.7 + inactiveAverage * 0.3;
}

// ============ 메인 함수 ============

/**
 * 통합 이슈 지수 계산
 *
 * 프로세스:
 * 1. 활성 클러스터의 평균 점수 계산
 * 2. 비활성 클러스터 점수에 시간 감쇠 적용
 * 3. 비활성 클러스터의 감쇠된 평균 점수 계산
 * 4. 최종 통합 지수 산출 (활성 70% + 비활성 30%)
 *
 * @param input 활성/비활성 클러스터 데이터
 * @returns 계산된 이슈 지수 정보
 */
function calculateIssueIndex(input: IssueIndexInput): IssueIndexOutput {
  console.log("\n========== Calculating Issue Index ==========\n");

  const { active_clusters, inactive_clusters_within_30days, calculated_at } = input;

  // Step 1: 활성 클러스터 평균 계산
  console.log("📊 Step 1: Calculating active cluster average...");
  const activeAverage = calculateActiveAverage(active_clusters);
  console.log(`   ✅ Active average: ${activeAverage.toFixed(2)}`);
  console.log(`   📈 Active clusters: ${active_clusters.length}`);

  // Step 2: 비활성 클러스터 감쇠 평균 계산
  console.log("\n📊 Step 2: Calculating inactive cluster average with decay...");
  const inactiveAverage = calculateInactiveAverage(
    inactive_clusters_within_30days,
    calculated_at
  );
  console.log(`   ✅ Inactive average (with decay): ${inactiveAverage.toFixed(2)}`);
  console.log(`   📉 Inactive clusters (≤30 days): ${inactive_clusters_within_30days.length}`);

  // Step 3: 개별 비활성 클러스터 점수 로그
  if (inactive_clusters_within_30days.length > 0) {
    console.log("\n   📋 Inactive cluster decay details:");
    inactive_clusters_within_30days.forEach((cluster) => {
      const daysPassed = calculateDaysDifference(cluster.collected_at, calculated_at);
      const decayedScore = applyExponentialDecay(cluster.cluster_score, daysPassed);
      console.log(
        `      - ${cluster.cluster_id}: ${cluster.cluster_score.toFixed(1)} → ${decayedScore.toFixed(1)} (${daysPassed.toFixed(1)} days)`
      );
    });
  }

  // Step 4: 최종 지수 계산
  console.log("\n📊 Step 3: Calculating final integrated index...");
  const overallIndex = calculateOverallIndex(activeAverage, inactiveAverage);
  console.log(`   ✅ Overall Index: ${overallIndex.toFixed(1)}`);
  console.log(`   📐 Formula: (${activeAverage.toFixed(2)} × 0.7) + (${inactiveAverage.toFixed(2)} × 0.3)`);

  console.log("\n========== Issue Index Calculation Complete ==========\n");

  return {
    collected_at: calculated_at,
    overall_index: Math.round(overallIndex * 10) / 10, // 소수점 1자리
    active_average: Math.round(activeAverage * 10) / 10,
    inactive_average: Math.round(inactiveAverage * 10) / 10,
    active_count: active_clusters.length,
    inactive_count: inactive_clusters_within_30days.length,
    calculated_at: new Date().toISOString(),
  };
}

// ============ Export ============

export {
  calculateIssueIndex,
  calculateActiveAverage,
  calculateInactiveAverage,
  applyExponentialDecay,
  calculateDaysDifference,
  IssueIndexInput,
  IssueIndexOutput,
  ClusterSnapshot,
};
