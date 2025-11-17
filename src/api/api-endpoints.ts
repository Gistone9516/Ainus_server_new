/**
 * API 엔드포인트 구현
 *
 * 4개 엔드포인트:
 * 1. GET /api/issue-index/current - 최신 이슈 지수
 * 2. GET /api/issue-index/history?date=... - 과거 이슈 지수
 * 3. GET /api/issue-index/clusters?collected_at=... - 클러스터 스냅샷
 * 4. GET /api/issue-index/articles?collected_at=...&indices=... - 기사 원문
 */

import { Request, Response } from "express";
import {
  getLatestIssueIndex,
  getIssueIndexByDate,
} from "../services/save-issue-index";
import { getSnapshotsCollection } from "../services/db-save";
import { getArticlesByIndices } from "../database/elasticsearch";

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
}

interface ClustersResponse {
  collected_at: string;
  clusters: ClusterSnapshot[];
  metadata: {
    total_clusters: number;
    total_articles: number;
  };
}

interface ArticlesResponse {
  collected_at: string;
  article_count: number;
  articles: Array<{
    index: number;
    title: string;
    link: string;
    description: string;
    pubDate: string;
  }>;
}

// ============ 1️⃣ GET /api/issue-index/current ============

/**
 * 현재 (최신) 이슈 지수 조회
 *
 * 응답 (200):
 * {
 *   "collected_at": "2025-11-11T12:00:00Z",
 *   "overall_index": 44.1
 * }
 */
async function getCurrentIssueIndex(req: Request, res: Response): Promise<void> {
  console.log("🔍 GET /api/issue-index/current");

  try {
    const issueIndex = await getLatestIssueIndex();

    if (!issueIndex) {
      console.log("   ⚠️ No data found");
      res.status(404).json({
        error: "No data available",
        message: "No issue index data found",
      });
      return;
    }

    console.log(
      `   ✅ Response sent: overall_index=${issueIndex.overall_index}`
    );

    res.status(200).json({
      collected_at: issueIndex.collected_at,
      overall_index: issueIndex.overall_index,
    });
  } catch (error) {
    console.error("   ❌ Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============ 2️⃣ GET /api/issue-index/history ============

/**
 * 과거 특정 시점의 이슈 지수 조회
 *
 * 쿼리 파라미터:
 * - date (required): ISO 8601 형식 (예: 2025-11-11T12:00:00Z)
 *
 * 응답 (200):
 * {
 *   "collected_at": "2025-11-11T12:00:00Z",
 *   "overall_index": 42.5
 * }
 */
async function getHistoryIssueIndex(
  req: Request,
  res: Response
): Promise<void> {
  const { date } = req.query;

  console.log(`🔍 GET /api/issue-index/history?date=${date}`);

  try {
    if (!date || typeof date !== "string") {
      console.log("   ❌ Missing date parameter");
      res.status(400).json({
        error: "Missing parameter",
        message: "date parameter is required (ISO 8601 format)",
      });
      return;
    }

    const issueIndex = await getIssueIndexByDate(date);

    if (!issueIndex) {
      console.log(`   ⚠️ No data found for date: ${date}`);
      res.status(404).json({
        error: "Data not found",
        message: `No issue index data at ${date}`,
      });
      return;
    }

    console.log(
      `   ✅ Response sent: overall_index=${issueIndex.overall_index}`
    );

    res.status(200).json({
      collected_at: issueIndex.collected_at,
      overall_index: issueIndex.overall_index,
    });
  } catch (error) {
    console.error("   ❌ Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============ 3️⃣ GET /api/issue-index/clusters ============

/**
 * 특정 시점의 클러스터 스냅샷 조회 (이슈 지수 근거)
 *
 * 쿼리 파라미터:
 * - collected_at (required): ISO 8601 형식
 *
 * 응답 (200):
 * {
 *   "collected_at": "2025-11-11T12:00:00Z",
 *   "clusters": [...],
 *   "metadata": { "total_clusters": 2, "total_articles": 9 }
 * }
 */
async function getClustersSnapshot(req: Request, res: Response): Promise<void> {
  const { collected_at } = req.query;

  console.log(`🔍 GET /api/issue-index/clusters?collected_at=${collected_at}`);

  try {
    if (!collected_at || typeof collected_at !== "string") {
      console.log("   ❌ Missing collected_at parameter");
      res.status(400).json({
        error: "Missing parameter",
        message: "collected_at parameter is required (ISO 8601 format)",
      });
      return;
    }

    const snapshotsCollection = await getSnapshotsCollection();
    const clusters = (await snapshotsCollection
      .find({ collected_at })
      .toArray()) as ClusterSnapshot[];

    if (clusters.length === 0) {
      console.log(
        `   ⚠️ No clusters found for collected_at: ${collected_at}`
      );
      res.status(404).json({
        error: "Data not found",
        message: `No cluster snapshots at ${collected_at}`,
      });
      return;
    }

    const totalArticles = clusters.reduce((sum, c) => sum + c.article_count, 0);

    const response: ClustersResponse = {
      collected_at,
      clusters,
      metadata: {
        total_clusters: clusters.length,
        total_articles: totalArticles,
      },
    };

    console.log(
      `   ✅ Response sent: ${clusters.length} clusters, ${totalArticles} articles`
    );

    res.status(200).json(response);
  } catch (error) {
    console.error("   ❌ Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============ 4️⃣ GET /api/issue-index/articles ============

/**
 * 특정 클러스터의 기사 원문 조회
 *
 * 쿼리 파라미터:
 * - collected_at (required): ISO 8601 형식
 * - indices (required): 쉼표로 구분된 인덱스 (예: 0,4,15,67)
 *
 * 응답 (200):
 * {
 *   "collected_at": "2025-11-11T12:00:00Z",
 *   "article_count": 4,
 *   "articles": [...]
 * }
 */
async function getArticlesOriginal(req: Request, res: Response): Promise<void> {
  const { collected_at, indices } = req.query;

  console.log(
    `🔍 GET /api/issue-index/articles?collected_at=${collected_at}&indices=${indices}`
  );

  try {
    if (!collected_at || typeof collected_at !== "string") {
      console.log("   ❌ Missing collected_at parameter");
      res.status(400).json({
        error: "Missing parameter",
        message: "collected_at parameter is required",
      });
      return;
    }

    if (!indices || typeof indices !== "string") {
      console.log("   ❌ Missing indices parameter");
      res.status(400).json({
        error: "Missing parameter",
        message:
          "indices parameter is required (comma-separated, e.g. 0,4,15,67)",
      });
      return;
    }

    // 인덱스 파싱
    const indexArray = indices
      .split(",")
      .map((i) => parseInt(i.trim(), 10))
      .filter((i) => !isNaN(i));

    if (indexArray.length === 0) {
      console.log("   ❌ Invalid indices format");
      res.status(400).json({
        error: "Invalid format",
        message: "indices must be comma-separated numbers",
      });
      return;
    }

    // ElasticSearch에서 기사 조회
    const articles = await getArticlesByIndices(indexArray);

    if (articles.length === 0) {
      console.log(`   ⚠️ No articles found for indices: ${indices}`);
      res.status(404).json({
        error: "Data not found",
        message: "No articles found for the given indices",
      });
      return;
    }

    const response: ArticlesResponse = {
      collected_at,
      article_count: articles.length,
      articles: articles.map((a) => ({
        index: a.index,
        title: a.title,
        link: a.link,
        description: a.description,
        pubDate: a.pubDate,
      })),
    };

    console.log(`   ✅ Response sent: ${articles.length} articles`);

    res.status(200).json(response);
  } catch (error) {
    console.error("   ❌ Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============ Export ============

export {
  getCurrentIssueIndex,
  getHistoryIssueIndex,
  getClustersSnapshot,
  getArticlesOriginal,
};
