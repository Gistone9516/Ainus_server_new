import dotenv from "dotenv";
import { runPipelineManually, PipelineResult } from "../services/news/news-clustering-pipeline";
import { getDatabasePool } from "../database/mysql";

dotenv.config();

/**
 * 클러스터링 파이프라인 테스트 결과 포맷팅
 */
export function formatClusteringResult(result: PipelineResult): string {
  const lines: string[] = [];
  
  lines.push("=".repeat(60));
  lines.push("📊 클러스터링 파이프라인 테스트 결과");
  lines.push("=".repeat(60));
  lines.push(`상태: ${result.status === "success" ? "✅ 성공" : "❌ 실패"}`);
  lines.push(`실행 시간: ${result.duration}ms (${(result.duration / 1000).toFixed(2)}초)`);
  
  if (result.status === "success") {
    lines.push(`이슈 지수: ${result.issue_index}`);
    lines.push(`처리된 클러스터: ${result.clusters_updated}`);
  } else if (result.error) {
    lines.push(`에러: ${result.error}`);
  }
  
  lines.push("=".repeat(60));
  
  return lines.join("\n");
}

async function testClusteringPipeline() {
  console.log("\n" + "*".repeat(60));
  console.log("  뉴스 클러스터링 파이프라인 테스트");
  console.log("*".repeat(60));

  const dbPool = getDatabasePool();

  try {
    // DB Pool 초기화
    await dbPool.initialize();
    console.log("[DB] 연결 완료\n");

    console.log("[1] 클러스터링 파이프라인 실행");
    console.log("=".repeat(60));

    const result = await runPipelineManually();

    // 결과 출력
    console.log("\n" + formatClusteringResult(result));

    // DB Pool 종료
    await dbPool.close();

    if (result.status === "failure") {
      console.error("\n클러스터링 파이프라인 테스트 실패");
      process.exit(1);
    }

    console.log("\n클러스터링 파이프라인 테스트 완료\n");
  } catch (error) {
    console.error("\n테스트 실패:", error);
    
    // DB 연결 에러 메시지 처리
    if (error instanceof Error) {
      if (error.message.includes("DB 연결") || error.message.includes("연결")) {
        console.error("\n❌ 데이터베이스 연결에 실패했습니다. 연결 설정을 확인해주세요.");
      }
    }
    
    // DB Pool 정리 시도
    try {
      await dbPool.close();
    } catch {
      // 이미 닫혔거나 초기화되지 않은 경우 무시
    }
    
    process.exit(1);
  }
}

// 직접 실행 시
if (require.main === module) {
  testClusteringPipeline();
}

export { testClusteringPipeline };
