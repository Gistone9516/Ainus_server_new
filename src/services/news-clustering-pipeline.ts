/**
 * AI 뉴스 클러스터링 전체 파이프라인 오케스트레이션
 *
 * 실행 흐름:
 * 1️⃣ 전처리: ElasticSearch + MongoDB에서 데이터 조회
 * 2️⃣ GPT 분류: ChatGPT Assistants API 호출
 * 3️⃣ DB 저장: MongoDB + MySQL에 결과 저장
 * 4️⃣ 완료: 로그 및 통계 출력
 *
 * 스케줄: 1시간마다 자동 실행
 * 재시도: GPT API/검증 오류 시 최대 2번
 */

import cron from "node-cron";

// ============ 서비스 import ============
// 주: 실제 구현 시 다음 모듈들을 import해야 함

// import { preprocessGPTInputData } from "./gpt_input_preprocessing";
// import { classifyNewsWithGPT } from "./gpt-classifier";
// import { saveClassificationResultToDB } from "./db-save";
// import { calculateIssueIndex, IssueIndexInput } from "./calculate-issue-index";
// import { saveIssueIndexToMySQL, closeMySQLPool } from "./save-issue-index";
// import { closeMongoDBConnection } from "./db-save";

// ============ Type 정의 ============

interface PipelineConfig {
  maxRetries: number;
  retryDelayMs: number;
  enableSchedule: boolean;
  scheduleTime: string; // cron 형식
}

interface PipelineResult {
  status: "success" | "failure";
  message: string;
  executedAt: string;
  duration: number;
  clusters_created: number;
  clusters_updated: number;
  issue_index?: number;
  error?: string;
}

// ============ 설정 ============

const DEFAULT_CONFIG: PipelineConfig = {
  maxRetries: 2,
  retryDelayMs: 5000, // 5초
  enableSchedule: true,
  scheduleTime: "0 * * * *", // 매 시간 정각 (0분)
};

// ============ 헬퍼 함수 ============

/**
 * 지정된 시간 동안 대기
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 파이프라인 실행 (재시도 로직 포함)
 */
async function executePipelineWithRetry(
  retryCount: number = 0,
  maxRetries: number = 2
): Promise<PipelineResult> {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 News Clustering Pipeline Started");
  console.log("=".repeat(70));
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`🔄 Attempt: ${retryCount + 1}/${maxRetries + 1}\n`);

  const startTime = Date.now();

  try {
    // ========== Step 1: 전처리 ==========
    console.log("📋 [Step 1/4] Data Preprocessing...\n");

    // const gptInput = await preprocessGPTInputData();
    // console.log(`✅ Preprocessing complete\n`);

    // ========== Step 2: GPT 분류 ==========
    console.log("🤖 [Step 2/4] GPT Classification...\n");

    // const classificationResult = await classifyNewsWithGPT(gptInput);
    // console.log(`✅ Classification complete\n`);

    // ========== Step 3: DB 저장 ==========
    console.log("💾 [Step 3/4] Saving to Databases...\n");

    // await saveClassificationResultToDB(classificationResult);
    // console.log(`✅ DB save complete\n`);

    // ========== Step 4: 이슈 지수 계산 & 저장 ==========
    console.log("📊 [Step 4/4] Calculating Issue Index...\n");

    // // active + 30일 이내 inactive 클러스터 조회 후 계산
    // const issueIndexInput: IssueIndexInput = {
    //   active_clusters: /* ... */,
    //   inactive_clusters_within_30days: /* ... */,
    //   calculated_at: new Date().toISOString(),
    // };

    // const issueIndexOutput = calculateIssueIndex(issueIndexInput);
    // await saveIssueIndexToMySQL({
    //   collected_at: issueIndexOutput.collected_at,
    //   overall_index: issueIndexOutput.overall_index,
    // });
    // console.log(`✅ Issue index calculation complete\n`);

    const duration = Date.now() - startTime;

    const result: PipelineResult = {
      status: "success",
      message: "Pipeline executed successfully",
      executedAt: new Date().toISOString(),
      duration,
      clusters_created: 0, // 실제 구현 시 계산
      clusters_updated: 0, // 실제 구현 시 계산
      issue_index: 0, // 실제 구현 시 계산
    };

    // ========== 완료 로그 ==========
    console.log("=".repeat(70));
    console.log("✅ Pipeline Completed Successfully");
    console.log("=".repeat(70));
    console.log(`⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`📊 Summary:`);
    console.log(`   - Clusters created: ${result.clusters_created}`);
    console.log(`   - Clusters updated: ${result.clusters_updated}`);
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
      error: error instanceof Error ? error.message : String(error),
    };

    console.log("=".repeat(70));
    console.log("❌ Pipeline Failed");
    console.log("=".repeat(70));
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`❌ Error: ${result.error}`);
    console.log(`📅 Next execution: ${getNextExecutionTime()}\n`);

    return result;
  }
}

/**
 * 다음 실행 예정 시간 계산
 */
function getNextExecutionTime(): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(next.getHours() + 1, 0, 0, 0); // 다음 시간 정각
  return next.toISOString();
}

// ============ 스케줄러 ==========

let scheduledJob: any = null;

/**
 * 파이프라인 스케줄 시작
 *
 * @param config 파이프라인 설정
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
