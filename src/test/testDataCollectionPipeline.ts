import dotenv from "dotenv";
import { DataCollectionScheduler } from "../cron/dataCollectionScheduler";
import { getDatabasePool } from "../database/mysql";

dotenv.config();

async function testDataCollectionScheduler() {
  console.log("\n" + "*".repeat(60));
  console.log("  데이터 수집 파이프라인 테스트");
  console.log("*".repeat(60));

  try {
    // DB Pool 초기화
    const dbPool = getDatabasePool();
    await dbPool.initialize();
    console.log("[DB] 연결 완료\n");

    const scheduler = new DataCollectionScheduler();

    console.log("\n[1] 스케줄 정보");
    console.log("=".repeat(60));
    const info = scheduler.getScheduleInfo();

    console.log("\n[Naver 뉴스 수집]");
    console.log(`  활성화: ${info.naver.enabled}`);
    console.log(`  스케줄: ${info.naver.schedule}`);
    console.log(`  키워드: ${info.naver.keywords.join(", ")}`);

    console.log("\n[AA 모델 수집]");
    console.log(`  활성화: ${info.aa.enabled}`);
    console.log(`  스케줄: ${info.aa.schedule}`);

    console.log("\n[2] Naver 뉴스 수집 테스트");
    console.log("=".repeat(60));
    await scheduler.runNaverCollectionNow();

    console.log("\n[3] AA 모델 수집 + 정제 + 저장 테스트");
    console.log("=".repeat(60));
    await scheduler.runAACollectionNow();

    console.log("\n[4] 스케줄러 중지");
    console.log("=".repeat(60));
    scheduler.stop();
    console.log("스케줄러 중지 완료");

    // DB Pool 종료
    await dbPool.close();

    console.log("\n" + "*".repeat(60));
    console.log("  테스트 완료");
    console.log("*".repeat(60) + "\n");
  } catch (error) {
    console.error("\n테스트 실패:", error);
    process.exit(1);
  }
}

async function testScheduleOnly() {
  console.log("\n" + "*".repeat(60));
  console.log("  스케줄러 등록 테스트 (실제 수집 안함)");
  console.log("*".repeat(60));

  try {
    const scheduler = new DataCollectionScheduler();

    console.log("\n스케줄러가 등록되었습니다.");
    console.log("실제 환경에서는 다음 시간에 자동 실행됩니다:");

    const info = scheduler.getScheduleInfo();
    console.log(`  - Naver: ${info.naver.schedule} (매시간)`);
    console.log(`  - AA: ${info.aa.schedule} (매일 새벽 1시)`);

    console.log("\n3초 후 종료...");
    await new Promise((resolve) => setTimeout(resolve, 3000));

    scheduler.stop();
    console.log("스케줄러 중지 완료\n");
  } catch (error) {
    console.error("\n테스트 실패:", error);
    process.exit(1);
  }
}

async function testNaverOnly() {
  console.log("\n" + "*".repeat(60));
  console.log("  Naver 뉴스 수집만 테스트");
  console.log("*".repeat(60));

  try {
    // DB Pool 초기화
    const dbPool = getDatabasePool();
    await dbPool.initialize();
    console.log("[DB] 연결 완료\n");

    const scheduler = new DataCollectionScheduler();
    await scheduler.runNaverCollectionNow();

    // DB Pool 종료
    await dbPool.close();

    console.log("\nNaver 수집 테스트 완료\n");
  } catch (error) {
    console.error("\n테스트 실패:", error);
    process.exit(1);
  }
}

async function testAAOnly() {
  console.log("\n" + "*".repeat(60));
  console.log("  AA 모델 수집 + 정제 + 저장만 테스트");
  console.log("*".repeat(60));

  try {
    // DB Pool 초기화
    const dbPool = getDatabasePool();
    await dbPool.initialize();
    console.log("[DB] 연결 완료\n");

    const scheduler = new DataCollectionScheduler();
    await scheduler.runAACollectionNow();

    // DB Pool 종료
    await dbPool.close();

    console.log("\nAA 수집 테스트 완료\n");
  } catch (error) {
    console.error("\n테스트 실패:", error);
    process.exit(1);
  }
}

// Valid modes for the test runner
export const VALID_MODES = ["all", "schedule", "naver", "aa"] as const;
export type TestMode = (typeof VALID_MODES)[number];

/**
 * Validates if the given mode is a valid test mode
 */
export function isValidMode(mode: string): mode is TestMode {
  return VALID_MODES.includes(mode as TestMode);
}

/**
 * Displays error message for invalid mode and exits with code 1
 */
export function handleInvalidMode(invalidMode: string): never {
  console.error(`\n오류: '${invalidMode}'은(는) 유효하지 않은 모드입니다.`);
  console.error("\n유효한 모드:");
  console.error("  all      - 전체 테스트 (기본값)");
  console.error("  schedule - 스케줄러 등록만");
  console.error("  naver    - Naver 수집만");
  console.error("  aa       - AA 수집만");
  console.error("\n사용법:");
  console.error("  npm run test:pipeline [mode]\n");
  process.exit(1);
}

if (require.main === module) {
  const mode = process.argv[2] || "all";

  if (!isValidMode(mode)) {
    handleInvalidMode(mode);
  }

  switch (mode) {
    case "all":
      testDataCollectionScheduler();
      break;
    case "schedule":
      testScheduleOnly();
      break;
    case "naver":
      testNaverOnly();
      break;
    case "aa":
      testAAOnly();
      break;
  }
}
