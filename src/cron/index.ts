import { initializeDataCollectionScheduler } from "./dataCollectionScheduler";
import { initializeCleanupScheduler } from "./cleanupScheduler";

/**
 * 모든 스케줄러 초기화 및 시작
 */
export function initializeAllSchedulers(): void {
  console.log("\n" + "=".repeat(60));
  console.log("  Ainus 스케줄러 시스템 초기화");
  console.log("=".repeat(60));

  try {
    // 1. 데이터 수집 스케줄러
    console.log("\n[1] 데이터 수집 스케줄러");
    console.log("-".repeat(60));
    const dataScheduler = initializeDataCollectionScheduler();
    const dataInfo = dataScheduler.getScheduleInfo();

    if (dataInfo.naver.enabled) {
      console.log(`  Naver: ${dataInfo.naver.schedule} (매시간)`);
    }
    if (dataInfo.aa.enabled) {
      console.log(`  AA: ${dataInfo.aa.schedule} (매일 새벽 1시)`);
    }

    // 2. 원본 데이터 정리 스케줄러
    console.log("\n[2] 원본 데이터 정리 스케줄러");
    console.log("-".repeat(60));
    const cleanupScheduler = initializeCleanupScheduler();
    const cleanupInfo = cleanupScheduler.getScheduleInfo();

    if (cleanupInfo.enabled) {
      console.log(`  정리 스케줄: ${cleanupInfo.schedule} (매일 새벽 2시)`);
    } else {
      console.log("  비활성화");
    }

    console.log("\n" + "=".repeat(60));
    console.log("  모든 스케줄러 초기화 완료");
    console.log("=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n스케줄러 초기화 실패:", error);
    throw error;
  }
}

/**
 * 모든 스케줄러 중지
 */
export function stopAllSchedulers(): void {
  console.log("[Schedulers] 모든 스케줄러 중지 중...");

  try {
    const {
      stopDataCollectionScheduler,
    } = require("./dataCollectionScheduler");
    const { stopCleanupScheduler } = require("./cleanupScheduler");

    stopDataCollectionScheduler();
    stopCleanupScheduler();

    console.log("[Schedulers] 모든 스케줄러 중지 완료");
  } catch (error) {
    console.error("[Schedulers] 스케줄러 중지 실패:", error);
  }
}
