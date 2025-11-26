import cron from "node-cron";
import { RawDataManager } from "../utils/rawDataManager";

export interface SchedulerConfig {
  enableRawDataCleanup: boolean;
  cleanupSchedule: string;
  cleanupOnStartup: boolean;
}

export class DataCleanupScheduler {
  private rawDataManager: RawDataManager;
  private config: SchedulerConfig;
  private scheduledTask: cron.ScheduledTask | null = null;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      enableRawDataCleanup: process.env.ENABLE_RAW_DATA_CLEANUP !== "false",
      cleanupSchedule: process.env.RAW_CLEANUP_SCHEDULE || "0 2 * * *", // 매일 새벽 2시
      cleanupOnStartup: process.env.CLEANUP_ON_STARTUP === "true",
      ...config,
    };

    this.rawDataManager = new RawDataManager();
  }

  /**
   * 스케줄러 시작
   */
  start(): void {
    if (!this.config.enableRawDataCleanup) {
      console.log("[Cleanup Scheduler] 원본 데이터 자동 정리 비활성화");
      return;
    }

    console.log("[Cleanup Scheduler] 스케줄러 시작");
    console.log(`  스케줄: ${this.config.cleanupSchedule}`);
    console.log(`  시작 시 정리: ${this.config.cleanupOnStartup}`);

    // 시작 시 정리 (옵션)
    if (this.config.cleanupOnStartup) {
      console.log("[Cleanup Scheduler] 시작 시 정리 실행...");
      this.executeCleanup();
    }

    // 스케줄 등록
    this.scheduledTask = cron.schedule(
      this.config.cleanupSchedule,
      () => {
        this.executeCleanup();
      },
      {
        scheduled: true,
        timezone: "Asia/Seoul",
      }
    );

    console.log("[Cleanup Scheduler] 스케줄 등록 완료");
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      console.log("[Cleanup Scheduler] 스케줄러 중지");
    }
  }

  /**
   * 정리 작업 실행
   */
  private executeCleanup(): void {
    console.log("\n" + "=".repeat(60));
    console.log(
      "[Cleanup Scheduler] 정리 작업 시작:",
      new Date().toISOString()
    );
    console.log("=".repeat(60));

    const startTime = Date.now();

    try {
      // 1. 정리 전 통계
      const beforeStats = this.rawDataManager.getStatistics();
      console.log("\n[정리 전 통계]");
      console.log(`  전체 파일: ${beforeStats.totalFiles}개`);
      console.log(`  전체 크기: ${this.formatBytes(beforeStats.totalSize)}`);
      if (beforeStats.oldestFile) {
        console.log(`  가장 오래된 파일: ${beforeStats.oldestFile}`);
      }

      // 2. 정리 실행
      const result = this.rawDataManager.cleanupOldFiles();

      // 3. 정리 후 통계
      const afterStats = this.rawDataManager.getStatistics();
      console.log("\n[정리 후 통계]");
      console.log(`  전체 파일: ${afterStats.totalFiles}개`);
      console.log(`  전체 크기: ${this.formatBytes(afterStats.totalSize)}`);

      // 4. 정리 결과
      console.log("\n[정리 결과]");
      console.log(`  삭제된 파일: ${result.deletedCount}개`);
      console.log(`  확보된 공간: ${this.formatBytes(result.totalSize)}`);
      console.log(`  오류: ${result.errorCount}개`);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`  소요 시간: ${duration}초`);

      // 5. 성공 로그
      console.log("\n[Cleanup Scheduler] 정리 작업 완료");
    } catch (error) {
      console.error("[Cleanup Scheduler] 정리 작업 실패:", error);
    }

    console.log("=".repeat(60) + "\n");
  }

  /**
   * 수동 정리 실행
   */
  async runManualCleanup(): Promise<void> {
    console.log("[Cleanup Scheduler] 수동 정리 시작...");
    this.executeCleanup();
  }

  /**
   * 바이트를 읽기 쉬운 형식으로 변환
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * 스케줄 정보 반환
   */
  getScheduleInfo(): {
    enabled: boolean;
    schedule: string;
    isRunning: boolean;
  } {
    return {
      enabled: this.config.enableRawDataCleanup,
      schedule: this.config.cleanupSchedule,
      isRunning: this.scheduledTask !== null,
    };
  }
}

/**
 * 전역 스케줄러 인스턴스
 */
let schedulerInstance: DataCleanupScheduler | null = null;

/**
 * 스케줄러 초기화 및 시작
 */
export function initializeCleanupScheduler(
  config?: Partial<SchedulerConfig>
): DataCleanupScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new DataCleanupScheduler(config);
    schedulerInstance.start();
  }
  return schedulerInstance;
}

/**
 * 스케줄러 가져오기
 */
export function getCleanupScheduler(): DataCleanupScheduler | null {
  return schedulerInstance;
}

/**
 * 스케줄러 중지
 */
export function stopCleanupScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
