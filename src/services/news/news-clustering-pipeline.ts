/**
 * 뉴스 클러스터링 파이프라인 (MySQL 기반)
 *
 * 전체 프로세스:
 * 1. 전처리 (MySQL에서 기사/클러스터 조회 -> GPT 입력 생성)
 * 2. GPT 분류 (OpenAI API 호출)
 * 3. DB 저장 (MySQL에 결과 저장)
 * 4. 이슈 지수 계산 (MySQL 데이터 기반 계산)
 * 5. 이슈 지수 저장 (MySQL issue_index 테이블에 저장)
 */

import cron from "node-cron";
import {
  preprocessGPTInputData,
  getActiveClustersFromDB,
  getRecentInactiveClustersFromDB,
  Cluster
} from "./gpt_input_preprocessing";
import { classifyNewsWithGPT } from "./gpt-classifier";
import {
  saveClassificationResultToDB,
  calculateClusterScore,
  ClusterSnapshot as DBClusterSnapshot
} from "./db-save";
import {
  calculateIssueIndex,
  IssueIndexInput,
  IssueIndexOutput
} from "./calculate-issue-index";
import { saveIssueIndexToMySQL } from "./save-issue-index";

// ============ 설정 ============

interface PipelineConfig {
  maxRetries: number;
  retryDelayMs: number;
  enableSchedule: boolean;
  scheduleTime: string; // cron 형식
}

const DEFAULT_CONFIG: PipelineConfig = {
  retryDelayMs: 5000, // 5초
  maxRetries: 2,
  enableSchedule: true,
  scheduleTime: "0 * * * *", // 매 시간 정각
};

interface PipelineResult {
  status: "success" | "failure";
  message: string;
  executedAt: string;
  duration: number;
  clusters_created: number;
  clusters_updated: number;
  issue_index: number;
  error?: string;
}

// ============ 헬퍼 함수 ============

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNextExecutionTime(): string {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  now.setSeconds(0);
  now.setMilliseconds(0);
  return now.toISOString();
}

/**
 * Cluster 객체를 IssueIndexInput용 ClusterSnapshot으로 변환
 */
function mapToClusterSnapshot(cluster: Cluster): any {
  // calculate-issue-index.ts의 ClusterSnapshot 인터페이스에 맞춤
  return {
    cluster_id: cluster.cluster_id,
    topic_name: cluster.topic_name,
    tags: cluster.tags,
    appearance_count: cluster.appearance_count,
    article_count: 0, // 계산에 직접 사용되지 않음 (점수 계산은 appearance_count 기반)
    article_indices: [],
    status: cluster.status,
    cluster_score: calculateClusterScore(cluster.appearance_count),
    collected_at: cluster.updated_at // 최근 업데이트 시간을 수집 시간으로 간주
  };
}

// ============ 메인 파이프라인 ============

async function executePipelineWithRetry(
  retryCount: number = 0,
  maxRetries: number = DEFAULT_CONFIG.maxRetries
): Promise<PipelineResult> {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 News Clustering Pipeline Started (MySQL)");
  console.log("=".repeat(70));
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🔄 Attempt: ${retryCount + 1}/${maxRetries + 1}\n`);

  const startTime = Date.now();

  try {
    // ========== Step 1: 전처리 ==========
    console.log("📋 [Step 1/4] Data Preprocessing...\n");

    const gptInput = await preprocessGPTInputData();
    console.log(`✅ Preprocessing complete\n`);

    // ========== Step 2: GPT 분류 ==========
    console.log("🤖 [Step 2/4] GPT Classification...\n");

    const classificationResult = await classifyNewsWithGPT(gptInput);
    console.log(`✅ Classification complete\n`);

    // ========== Step 3: DB 저장 ==========
    console.log("💾 [Step 3/4] Saving to Databases...\n");

    await saveClassificationResultToDB(classificationResult);
    console.log(`✅ DB save complete\n`);

    // ========== Step 4: 이슈 지수 계산 & 저장 ==========
    console.log("📊 [Step 4/4] Calculating Issue Index...\n");

    // DB 상태가 업데이트되었으므로 다시 조회하여 최신 상태 반영
    const activeClusters = await getActiveClustersFromDB();
    const inactiveClusters = await getRecentInactiveClustersFromDB();

    const issueIndexInput: IssueIndexInput = {
      active_clusters: activeClusters.map(mapToClusterSnapshot),
      inactive_clusters_within_30days: inactiveClusters.map(mapToClusterSnapshot),
      calculated_at: new Date().toISOString(),
    };

    const issueIndexOutput = calculateIssueIndex(issueIndexInput);

    await saveIssueIndexToMySQL({
      collected_at: issueIndexOutput.collected_at,
      overall_index: issueIndexOutput.overall_index,
      active_clusters_count: issueIndexOutput.active_count,
      inactive_clusters_count: issueIndexOutput.inactive_count,
      total_articles_analyzed: gptInput.new_articles.length // 이번에 분석한 기사 수
    });
    console.log(`✅ Issue index calculation complete\n`);

    const duration = Date.now() - startTime;

    // 통계 계산
    const processedClusters = classificationResult.clusters.length;

    const result: PipelineResult = {
      status: "success",
      message: "Pipeline executed successfully",
      executedAt: new Date().toISOString(),
      duration,
      clusters_created: 0, // 상세 통계는 로그 참조
      clusters_updated: processedClusters,
      issue_index: issueIndexOutput.overall_index,
    };

    // ========== 완료 로그 ==========
    console.log("=".repeat(70));
    console.log("✅ Pipeline Completed Successfully");
    console.log("=".repeat(70));
    console.log(`⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`📊 Summary:`);
    console.log(`   - Clusters processed: ${processedClusters}`);
    console.log(`   - Issue index: ${result.issue_index}`);
    console.log(`📅 Next execution: ${getNextExecutionTime()}\n`);

    return result;
  } catch (error) {
    console.error("\n❌ Pipeline Error:", error);

    if (retryCount < maxRetries) {
      console.log(
        `\n⏳ Retrying in ${DEFAULT_CONFIG.retryDelayMs}ms...`
      );
      await delay(DEFAULT_CONFIG.retryDelayMs);
      return executePipelineWithRetry(retryCount + 1, maxRetries);
    }

    const duration = Date.now() - startTime;

    const result: PipelineResult = {
      status: "failure",
      message: `Pipeline failed after ${maxRetries + 1} attempts`,
      executedAt: new Date().toISOString(),
      duration,
      clusters_created: 0,
      clusters_updated: 0,
      issue_index: 0,
      error: error instanceof Error ? error.message : String(error),
    };

    console.log("=".repeat(70));
    console.log("❌ Pipeline Failed");
    console.log("=".repeat(70));

    return result;
  }
}

// ============ 스케줄러 ==========

let scheduledJob: any = null;

/**
 * 파이프라인 스케줄 시작
 */
function startScheduler(config: Partial<PipelineConfig> = {}): void {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  if (!finalConfig.enableSchedule) {
    console.log("⏭️  Schedule is disabled. Pipeline will run manually only.");
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("📅 News Clustering Pipeline Scheduler Started");
  console.log("=".repeat(70));
  console.log(`⏰ Schedule: ${finalConfig.scheduleTime} (every hour)`);
  console.log(`🔄 Max retries: ${finalConfig.maxRetries}`);
  console.log(`⏳ Retry delay: ${finalConfig.retryDelayMs}ms\n`);

  // cron 형식: "0 * * * *" = 매 시간 정각
  scheduledJob = cron.schedule(finalConfig.scheduleTime, () => {
    executePipelineWithRetry(0, finalConfig.maxRetries);
  });

  console.log("✅ Scheduler is running. Next execution: " + getNextExecutionTime());
}

/**
 * 파이프라인 스케줄 중지
 */
function stopScheduler(): void {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log("⏹️  Scheduler stopped");
  }
}

/**
 * 파이프라인 수동 실행
 */
async function runPipelineManually(): Promise<PipelineResult> {
  return executePipelineWithRetry(0, DEFAULT_CONFIG.maxRetries);
}

// ============ Export ============

export {
  startScheduler,
  stopScheduler,
  runPipelineManually,
  executePipelineWithRetry,
  getNextExecutionTime,
  PipelineConfig,
  PipelineResult,
};
