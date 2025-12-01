/**
 * API 엔드포인트 구현 (개선된 버전)
 *
 * 엔드포인트:
 * 1. GET /api/issue-index/current - 최신 이슈 지수 + 가용 데이터 정보
 * 2. GET /api/issue-index/history - 범위 조회 지원 (start_date, end_date)
 * 3. GET /api/issue-index/clusters - 빈 데이터 명확한 처리
 * 4. GET /api/issue-index/articles - 기사 원문
 * 5. GET /api/issue-index/dashboard - 통합 대시보드 API
 */

import { Request, Response } from "express";
import {
  getLatestIssueIndex,
  getIssueIndexByDate,
  getIssueIndexByDateRange,
  getDataAvailability,
  calculateMissingDates,
  IssueIndexData,
} from "../services/news/save-issue-index";
import { getClusterSnapshots, ClusterSnapshot } from "../services/news/db-save";
import { getArticlesByIndices } from "../database/articles";
import { runPipelineManually, PipelineResult } from "../services/news/news-clustering-pipeline";

// ============ Type 정의 ============

interface SuccessResponse<T> {
  success: true;
  data: T;
  metadata?: Record<string, any>;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
  };
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// ============ 1️⃣ GET /api/issue-index/current ============

/**
 * 현재 (최신) 이슈 지수 조회 + 가용 데이터 범위 정보
 *
 * 응답 (200):
 * {
 *   "success": true,
 *   "data": {
 *     "collected_at": "2025-11-30T23:00:15.000Z",
 *     "overall_index": 43.5,
 *     "active_clusters_count": 8,
 *     "inactive_clusters_count": 3,
 *     "total_articles_analyzed": 1247
 *   },
 *   "metadata": {
 *     "data_availability": {
 *       "oldest_date": "2025-11-30",
 *       "latest_date": "2025-11-30",
 *       "total_snapshots": 1,
 *       "collection_frequency": "daily"
 *     },
 *     "available_dates": ["2025-11-30"]
 *   }
 * }
 */
async function getCurrentIssueIndex(req: Request, res: Response): Promise<void> {
  console.log("🔍 GET /api/issue-index/current");

  try {
    const [issueIndex, dataAvailability] = await Promise.all([
      getLatestIssueIndex(),
      getDataAvailability()
    ]);

    if (!issueIndex) {
      console.log("   ⚠️ No data found");
      const response: ApiResponse<null> = {
        success: true,
        data: null,
        metadata: {
          message: "현재 수집된 이슈 지수 데이터가 없습니다.",
          data_availability: dataAvailability
        }
      };
      res.status(200).json(response);
      return;
    }

    console.log(
      `   ✅ Response sent: overall_index=${issueIndex.overall_index}`
    );

    const response: SuccessResponse<IssueIndexData> = {
      success: true,
      data: {
        collected_at: issueIndex.collected_at,
        overall_index: issueIndex.overall_index,
        active_clusters_count: issueIndex.active_clusters_count,
        inactive_clusters_count: issueIndex.inactive_clusters_count,
        total_articles_analyzed: issueIndex.total_articles_analyzed
      },
      metadata: {
        data_availability: {
          oldest_date: dataAvailability.oldest_date,
          latest_date: dataAvailability.latest_date,
          total_snapshots: dataAvailability.total_snapshots,
          collection_frequency: dataAvailability.collection_frequency
        },
        available_dates: dataAvailability.available_dates
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("   ❌ Error:", error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error)
      }
    };
    res.status(500).json(response);
  }
}

// ============ 2️⃣ GET /api/issue-index/history ============

/**
 * 이슈 지수 히스토리 조회
 * 
 * 쿼리 파라미터:
 * - date (기존): 단일 날짜 조회 (YYYY-MM-DD 또는 ISO 8601)
 * - start_date, end_date (신규): 범위 조회 (YYYY-MM-DD)
 *
 * 범위 조회 응답 (200):
 * {
 *   "success": true,
 *   "data": [
 *     { "collected_at": "2025-11-30T23:00:15.000Z", "overall_index": 43.5, ... },
 *     ...
 *   ],
 *   "metadata": {
 *     "requested_start": "2025-11-24",
 *     "requested_end": "2025-11-30",
 *     "actual_count": 2,
 *     "missing_dates": ["2025-11-24", "2025-11-25", ...]
 *   }
 * }
 */
async function getHistoryIssueIndex(
  req: Request,
  res: Response
): Promise<void> {
  const { date, start_date, end_date } = req.query;

  console.log(`🔍 GET /api/issue-index/history`);
  console.log(`   Params: date=${date}, start_date=${start_date}, end_date=${end_date}`);

  try {
    // 범위 조회 (start_date & end_date)
    if (start_date && end_date) {
      if (typeof start_date !== "string" || typeof end_date !== "string") {
        const response: ErrorResponse = {
          success: false,
          error: {
            code: "INVALID_PARAMETERS",
            message: "start_date와 end_date는 문자열이어야 합니다.",
            suggestion: "YYYY-MM-DD 형식으로 전달하세요."
          }
        };
        res.status(400).json(response);
        return;
      }

      // 날짜 유효성 검증
      const startDateParsed = new Date(start_date);
      const endDateParsed = new Date(end_date);
      
      if (isNaN(startDateParsed.getTime()) || isNaN(endDateParsed.getTime())) {
        const response: ErrorResponse = {
          success: false,
          error: {
            code: "INVALID_DATE_FORMAT",
            message: "날짜 형식이 올바르지 않습니다.",
            suggestion: "YYYY-MM-DD 형식으로 전달하세요. 예: 2025-11-24"
          }
        };
        res.status(400).json(response);
        return;
      }

      if (startDateParsed > endDateParsed) {
        const response: ErrorResponse = {
          success: false,
          error: {
            code: "INVALID_DATE_RANGE",
            message: "start_date는 end_date보다 이전이어야 합니다."
          }
        };
        res.status(400).json(response);
        return;
      }

      // 범위를 하루 전체로 확장 (시작일 00:00:00 ~ 종료일 23:59:59)
      const startIso = `${start_date}T00:00:00.000Z`;
      const endIso = `${end_date}T23:59:59.999Z`;

      const data = await getIssueIndexByDateRange(startIso, endIso);
      
      // 실제 데이터가 있는 날짜 추출
      const existingDates = data.map(d => d.collected_at.split('T')[0]);
      const missingDates = calculateMissingDates(start_date, end_date, existingDates);

      const response: SuccessResponse<IssueIndexData[]> = {
        success: true,
        data,
        metadata: {
          requested_start: start_date,
          requested_end: end_date,
          actual_count: data.length,
          missing_dates: missingDates
        }
      };

      console.log(`   ✅ Range query: ${data.length} records found`);
      res.status(200).json(response);
      return;
    }

    // 단일 날짜 조회 (기존 방식 - 하위 호환성)
    if (!date || typeof date !== "string") {
      console.log("   ❌ Missing date parameter");
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "MISSING_PARAMETERS",
          message: "date 파라미터 또는 start_date/end_date 파라미터가 필요합니다.",
          suggestion: "단일 조회: ?date=2025-11-30 / 범위 조회: ?start_date=2025-11-24&end_date=2025-11-30"
        }
      };
      res.status(400).json(response);
      return;
    }

    const issueIndex = await getIssueIndexByDate(date);

    if (!issueIndex) {
      console.log(`   ⚠️ No data found for date: ${date}`);
      const response: SuccessResponse<null> = {
        success: true,
        data: null,
        metadata: {
          requested_date: date,
          message: `${date} 시점의 이슈 지수 데이터가 없습니다.`
        }
      };
      res.status(200).json(response);
      return;
    }

    console.log(
      `   ✅ Response sent: overall_index=${issueIndex.overall_index}`
    );

    const response: SuccessResponse<IssueIndexData> = {
      success: true,
      data: issueIndex,
      metadata: {
        requested_date: date
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("   ❌ Error:", error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error)
      }
    };
    res.status(500).json(response);
  }
}

// ============ 3️⃣ GET /api/issue-index/clusters ============

/**
 * 특정 시점의 클러스터 스냅샷 조회 (명확한 빈 데이터 처리)
 *
 * 쿼리 파라미터:
 * - collected_at (required): ISO 8601 형식
 *
 * 데이터 있음 (200):
 * {
 *   "success": true,
 *   "data": [...],
 *   "metadata": {
 *     "collected_at": "2025-11-30T23:00:15.000Z",
 *     "total_clusters": 8,
 *     "active_count": 5,
 *     "inactive_count": 3
 *   }
 * }
 *
 * 데이터 없음 (200 - 에러 아님!):
 * {
 *   "success": true,
 *   "data": [],
 *   "metadata": {
 *     "collected_at": "2025-11-30T23:00:15.000Z",
 *     "total_clusters": 0,
 *     "active_count": 0,
 *     "inactive_count": 0,
 *     "message": "해당 시점에 분석된 클러스터가 없습니다."
 *   }
 * }
 */
async function getClustersSnapshot(req: Request, res: Response): Promise<void> {
  const { collected_at } = req.query;

  console.log(`🔍 GET /api/issue-index/clusters?collected_at=${collected_at}`);

  try {
    if (!collected_at || typeof collected_at !== "string") {
      console.log("   ❌ Missing collected_at parameter");
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "MISSING_PARAMETER",
          message: "collected_at 파라미터가 필요합니다 (ISO 8601 형식).",
          suggestion: "최신 데이터를 사용하려면 /issue-index/current API를 먼저 호출하세요."
        }
      };
      res.status(400).json(response);
      return;
    }

    // collected_at 형식 유효성 검증
    const parsedDate = new Date(collected_at);
    if (isNaN(parsedDate.getTime())) {
      console.log(`   ❌ Invalid collected_at format: ${collected_at}`);
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "INVALID_COLLECTED_AT",
          message: "유효하지 않은 collected_at 값입니다.",
          suggestion: "ISO 8601 형식으로 전달하세요. 예: 2025-11-30T23:00:15.000Z"
        }
      };
      res.status(400).json(response);
      return;
    }

    const clusters = await getClusterSnapshots(collected_at);

    // 활성/비활성 카운트 계산
    const activeCount = clusters.filter(c => c.status === 'active').length;
    const inactiveCount = clusters.filter(c => c.status === 'inactive').length;
    const totalArticles = clusters.reduce((sum, c) => sum + c.article_count, 0);

    // 빈 데이터도 성공 응답으로 처리
    if (clusters.length === 0) {
      console.log(`   ℹ️ No clusters found for collected_at: ${collected_at}`);
      const response: SuccessResponse<ClusterSnapshot[]> = {
        success: true,
        data: [],
        metadata: {
          collected_at,
          total_clusters: 0,
          active_count: 0,
          inactive_count: 0,
          total_articles: 0,
          message: "해당 시점에 분석된 클러스터가 없습니다."
        }
      };
      res.status(200).json(response);
      return;
    }

    console.log(
      `   ✅ Response sent: ${clusters.length} clusters, ${totalArticles} articles`
    );

    const response: SuccessResponse<ClusterSnapshot[]> = {
      success: true,
      data: clusters,
      metadata: {
        collected_at,
        total_clusters: clusters.length,
        active_count: activeCount,
        inactive_count: inactiveCount,
        total_articles: totalArticles
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("   ❌ Error:", error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error)
      }
    };
    res.status(500).json(response);
  }
}

// ============ 4️⃣ GET /api/issue-index/articles ============

/**
 * 특정 클러스터의 기사 원문 조회
 *
 * 쿼리 파라미터:
 * - collected_at (required): ISO 8601 형식 (스냅샷 시간)
 * - article_collected_at (optional): 기사의 실제 수집 시간 (이 값이 있으면 우선 사용)
 * - indices (required): 쉼표로 구분된 인덱스 (예: 0,4,15,67)
 * 
 * ⚠️ 비활성 클러스터의 기사 조회 시에는 article_collected_at을 사용해야 함
 *    (cluster_snapshots 응답의 article_collected_at 값)
 */
async function getArticlesOriginal(req: Request, res: Response): Promise<void> {
  const { collected_at, article_collected_at, indices } = req.query;

  // article_collected_at이 있으면 우선 사용 (비활성 클러스터 기사 조회용)
  const effectiveCollectedAt = (article_collected_at && typeof article_collected_at === "string") 
    ? article_collected_at 
    : collected_at;

  console.log(
    `🔍 GET /api/issue-index/articles?collected_at=${collected_at}&article_collected_at=${article_collected_at}&indices=${indices}`
  );
  console.log(`   📰 Using effective collected_at: ${effectiveCollectedAt}`);

  try {
    if (!effectiveCollectedAt || typeof effectiveCollectedAt !== "string") {
      console.log("   ❌ Missing collected_at parameter");
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "MISSING_PARAMETER",
          message: "collected_at 또는 article_collected_at 파라미터가 필요합니다."
        }
      };
      res.status(400).json(response);
      return;
    }

    if (!indices || typeof indices !== "string") {
      console.log("   ❌ Missing indices parameter");
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "MISSING_PARAMETER",
          message: "indices 파라미터가 필요합니다 (쉼표로 구분된 숫자, 예: 0,4,15,67)."
        }
      };
      res.status(400).json(response);
      return;
    }

    // 인덱스 파싱
    const indexArray = indices
      .split(",")
      .map((i) => parseInt(i.trim(), 10))
      .filter((i) => !isNaN(i));

    if (indexArray.length === 0) {
      console.log("   ❌ Invalid indices format");
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "INVALID_FORMAT",
          message: "indices는 쉼표로 구분된 숫자여야 합니다."
        }
      };
      res.status(400).json(response);
      return;
    }

    // MySQL에서 기사 조회 (Redis 캐싱 적용)
    // effectiveCollectedAt 사용 (article_collected_at 또는 collected_at)
    const articles = await getArticlesByIndices(effectiveCollectedAt, indexArray);

    if (articles.length === 0) {
      console.log(`   ℹ️ No articles found for indices: ${indices} at ${effectiveCollectedAt}`);
      const response: SuccessResponse<any[]> = {
        success: true,
        data: [],
        metadata: {
          collected_at: effectiveCollectedAt,
          article_collected_at: article_collected_at || null,
          requested_indices: indexArray,
          article_count: 0,
          message: "요청한 인덱스에 해당하는 기사가 없습니다."
        }
      };
      res.status(200).json(response);
      return;
    }

    console.log(`   ✅ Response sent: ${articles.length} articles from ${effectiveCollectedAt}`);

    const response: SuccessResponse<any[]> = {
      success: true,
      data: articles.map((a) => ({
        index: a.index,
        title: a.title,
        link: a.link,
        description: a.description,
        pubDate: a.pubDate,
      })),
      metadata: {
        collected_at: effectiveCollectedAt,
        article_collected_at: article_collected_at || null,
        requested_indices: indexArray,
        article_count: articles.length
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("   ❌ Error:", error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error)
      }
    };
    res.status(500).json(response);
  }
}

// ============ 5️⃣ GET /api/issue-index/dashboard ============

/**
 * 통합 대시보드 API - 한 번의 호출로 필요한 모든 데이터 반환
 *
 * 쿼리 파라미터:
 * - days (optional): 히스토리 조회 일수 (기본값: 7)
 *
 * 응답 (200):
 * {
 *   "success": true,
 *   "data": {
 *     "current": { ... },
 *     "history": [ ... ],
 *     "top_clusters": [ ... ]
 *   },
 *   "metadata": {
 *     "requested_days": 7,
 *     "actual_history_count": 5,
 *     "data_available_from": "2025-11-24"
 *   }
 * }
 */
async function getDashboard(req: Request, res: Response): Promise<void> {
  const daysParam = req.query.days;
  const days = daysParam ? parseInt(String(daysParam), 10) : 7;

  console.log(`🔍 GET /api/issue-index/dashboard?days=${days}`);

  try {
    if (isNaN(days) || days < 1 || days > 90) {
      const response: ErrorResponse = {
        success: false,
        error: {
          code: "INVALID_PARAMETER",
          message: "days 파라미터는 1~90 사이의 숫자여야 합니다."
        }
      };
      res.status(400).json(response);
      return;
    }

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const startIso = `${startDateStr}T00:00:00.000Z`;
    const endIso = `${endDateStr}T23:59:59.999Z`;

    // 병렬로 데이터 조회
    const [latestIssueIndex, historyData, dataAvailability] = await Promise.all([
      getLatestIssueIndex(),
      getIssueIndexByDateRange(startIso, endIso),
      getDataAvailability()
    ]);

    // 최신 클러스터 조회 (current가 있는 경우에만)
    let topClusters: ClusterSnapshot[] = [];
    if (latestIssueIndex) {
      const allClusters = await getClusterSnapshots(latestIssueIndex.collected_at);
      // 상위 클러스터 (cluster_score 기준 정렬, 상위 10개)
      topClusters = allClusters
        .filter(c => c.status === 'active')
        .sort((a, b) => b.cluster_score - a.cluster_score)
        .slice(0, 10);
    }

    console.log(
      `   ✅ Dashboard: current=${latestIssueIndex ? 'found' : 'null'}, history=${historyData.length}, topClusters=${topClusters.length}`
    );

    const response: SuccessResponse<{
      current: IssueIndexData | null;
      history: IssueIndexData[];
      top_clusters: ClusterSnapshot[];
    }> = {
      success: true,
      data: {
        current: latestIssueIndex,
        history: historyData,
        top_clusters: topClusters
      },
      metadata: {
        requested_days: days,
        requested_start: startDateStr,
        requested_end: endDateStr,
        actual_history_count: historyData.length,
        data_available_from: dataAvailability.oldest_date,
        data_available_to: dataAvailability.latest_date,
        total_snapshots: dataAvailability.total_snapshots
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("   ❌ Error:", error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error)
      }
    };
    res.status(500).json(response);
  }
}

// ============ 6️⃣ POST /api/issue-index/trigger ============

/**
 * 뉴스 클러스터링 파이프라인 수동 실행
 *
 * 보안: 이 엔드포인트는 개발/관리 목적으로만 사용
 * 실제 운영 환경에서는 인증이 필요할 수 있음
 *
 * 응답 (200):
 * {
 *   "success": true,
 *   "data": {
 *     "status": "success",
 *     "message": "Pipeline executed successfully",
 *     "executedAt": "2025-12-01T09:00:00.000Z",
 *     "duration": 45000,
 *     "clusters_updated": 15,
 *     "issue_index": 43.5
 *   }
 * }
 */
async function triggerPipeline(req: Request, res: Response): Promise<void> {
  console.log("🚀 POST /api/issue-index/trigger - Manual pipeline execution requested");

  try {
    // 비동기로 파이프라인 실행 (오래 걸릴 수 있음)
    const result: PipelineResult = await runPipelineManually();

    if (result.status === "success") {
      console.log(`   ✅ Pipeline completed: ${result.issue_index}`);

      const response: SuccessResponse<PipelineResult> = {
        success: true,
        data: result,
        metadata: {
          triggered_by: "manual",
          triggered_at: new Date().toISOString()
        }
      };

      res.status(200).json(response);
    } else {
      console.log(`   ❌ Pipeline failed: ${result.error}`);

      const response: ErrorResponse = {
        success: false,
        error: {
          code: "PIPELINE_FAILED",
          message: result.message,
          suggestion: result.error
        }
      };

      res.status(500).json(response);
    }
  } catch (error) {
    console.error("   ❌ Error triggering pipeline:", error);
    const response: ErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error)
      }
    };
    res.status(500).json(response);
  }
}

// ============ Export ============

export {
  getCurrentIssueIndex,
  getHistoryIssueIndex,
  getClustersSnapshot,
  getArticlesOriginal,
  getDashboard,
  triggerPipeline,
};
