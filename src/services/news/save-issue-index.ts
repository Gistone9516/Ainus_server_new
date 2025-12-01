/**
 * MySQL issue_index 테이블에 계산된 이슈 지수 저장 (시간별)
 */

import { executeQuery, executeModify, getDatabasePool } from "../../database/mysql";
import { PoolConnection } from "mysql2/promise";

// ============ 헬퍼 함수 ============

/**
 * ISO 8601 문자열을 MySQL DATETIME 형식으로 변환
 * '2025-11-30T17:00:46.419Z' → '2025-11-30 17:00:46'
 */
function toMySQLDatetime(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

// ============ Type 정의 ============

interface IssueIndexData {
  collected_at: string; // ISO 8601 datetime
  overall_index: number;
  active_clusters_count: number;
  inactive_clusters_count: number;
  total_articles_analyzed?: number;
}

// ============ 저장 함수 ============

/**
 * issue_index 테이블에 이슈 지수 저장
 *
 * 테이블 스키마:
 * CREATE TABLE IF NOT EXISTS issue_index (
 *   collected_at DATETIME NOT NULL PRIMARY KEY,
 *   overall_index DECIMAL(5,1) NOT NULL,
 *   active_clusters_count INT,
 *   inactive_clusters_count INT,
 *   total_articles_analyzed INT,
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *   ...
 * )
 *
 * @param data 저장할 이슈 지수 데이터
 */
async function saveIssueIndexToMySQL(data: IssueIndexData): Promise<void> {
  console.log("\n========== Saving Issue Index to MySQL ==========\n");

  try {
    const query = `
      INSERT INTO issue_index 
      (collected_at, overall_index, active_clusters_count, inactive_clusters_count, total_articles_analyzed)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        overall_index = VALUES(overall_index),
        active_clusters_count = VALUES(active_clusters_count),
        inactive_clusters_count = VALUES(inactive_clusters_count),
        total_articles_analyzed = VALUES(total_articles_analyzed)
    `;

    await executeModify(query, [
      toMySQLDatetime(data.collected_at),
      data.overall_index,
      data.active_clusters_count,
      data.inactive_clusters_count,
      data.total_articles_analyzed || 0
    ]);

    console.log(`✅ Issue index saved successfully`);
    console.log(`   - collected_at: ${data.collected_at}`);
    console.log(`   - overall_index: ${data.overall_index}`);
    console.log(`   - active: ${data.active_clusters_count}, inactive: ${data.inactive_clusters_count}`);
    console.log(`   - timestamp: ${new Date().toISOString()}\n`);

    return;
  } catch (error) {
    console.error("❌ Error saving issue index to MySQL:", error);
    throw error;
  }
}

/**
 * 최신 이슈 지수 조회
 *
 * @returns 가장 최신의 이슈 지수 데이터
 */
async function getLatestIssueIndex(): Promise<IssueIndexData | null> {
  console.log("🔍 Fetching latest issue index from MySQL...");

  try {
    const query = `
      SELECT collected_at, overall_index, active_clusters_count, inactive_clusters_count, total_articles_analyzed
      FROM issue_index
      ORDER BY collected_at DESC
      LIMIT 1
    `;

    const rows = await executeQuery<any>(query);

    if (rows.length > 0) {
      const row = rows[0];

      // Date 객체 또는 문자열을 ISO 문자열로 변환
      const collectedAt = row.collected_at instanceof Date ? row.collected_at.toISOString() : row.collected_at;

      console.log(`   ✅ Latest issue index found: ${collectedAt}`);

      return {
        collected_at: collectedAt,
        overall_index: row.overall_index,
        active_clusters_count: row.active_clusters_count,
        inactive_clusters_count: row.inactive_clusters_count,
        total_articles_analyzed: row.total_articles_analyzed
      };
    }

    console.log("   ⚠️ No issue index data found");
    return null;
  } catch (error) {
    console.error("❌ Error fetching latest issue index:", error);
    throw error;
  }
}

/**
 * 특정 시점의 이슈 지수 조회
 *
 * @param collectedAt ISO 8601 datetime (예: "2025-11-11T12:00:00Z")
 * @returns 해당 시점의 이슈 지수 데이터
 */
async function getIssueIndexByDate(collectedAt: string): Promise<IssueIndexData | null> {
  console.log(`🔍 Fetching issue index for: ${collectedAt}`);

  try {
    const query = `
      SELECT collected_at, overall_index, active_clusters_count, inactive_clusters_count, total_articles_analyzed
      FROM issue_index
      WHERE collected_at = ?
      LIMIT 1
    `;

    const rows = await executeQuery<any>(query, [toMySQLDatetime(collectedAt)]);

    if (rows.length > 0) {
      const row = rows[0];
      const isoTime = row.collected_at instanceof Date ? row.collected_at.toISOString() : row.collected_at;

      console.log(`   ✅ Issue index found: ${isoTime}`);

      return {
        collected_at: isoTime,
        overall_index: row.overall_index,
        active_clusters_count: row.active_clusters_count,
        inactive_clusters_count: row.inactive_clusters_count,
        total_articles_analyzed: row.total_articles_analyzed
      };
    }

    console.log(`   ⚠️ No issue index found for: ${collectedAt}`);
    return null;
  } catch (error) {
    console.error("❌ Error fetching issue index by date:", error);
    throw error;
  }
}

/**
 * 날짜 범위로 이슈 지수 조회
 *
 * @param startDate 시작 날짜 (ISO 8601)
 * @param endDate 종료 날짜 (ISO 8601)
 * @returns 해당 범위의 이슈 지수 데이터 배열
 */
async function getIssueIndexByDateRange(
  startDate: string,
  endDate: string
): Promise<IssueIndexData[]> {
  console.log(`🔍 Fetching issue index range: ${startDate} to ${endDate}`);

  try {
    const query = `
      SELECT collected_at, overall_index, active_clusters_count, inactive_clusters_count, total_articles_analyzed
      FROM issue_index
      WHERE collected_at BETWEEN ? AND ?
      ORDER BY collected_at DESC
    `;

    const rows = await executeQuery<any>(query, [toMySQLDatetime(startDate), toMySQLDatetime(endDate)]);

    const results = rows.map((row: any) => ({
      collected_at: row.collected_at instanceof Date ? row.collected_at.toISOString() : row.collected_at,
      overall_index: row.overall_index,
      active_clusters_count: row.active_clusters_count,
      inactive_clusters_count: row.inactive_clusters_count,
      total_articles_analyzed: row.total_articles_analyzed
    }));

    console.log(`   ✅ Found ${results.length} records in range`);
    return results;
  } catch (error) {
    console.error("❌ Error fetching issue index by date range:", error);
    throw error;
  }
}

// ============ 데이터 가용성 조회 ============

interface DataAvailability {
  oldest_date: string | null;
  latest_date: string | null;
  total_snapshots: number;
  collection_frequency: string;
  available_dates: string[];
}

/**
 * 데이터 가용성 정보 조회
 * 
 * @returns 가용 데이터 범위 및 날짜 목록
 */
async function getDataAvailability(): Promise<DataAvailability> {
  console.log("🔍 Fetching data availability...");

  try {
    // 전체 스냅샷 수 및 날짜 범위 조회
    const summaryQuery = `
      SELECT 
        MIN(collected_at) as oldest_date,
        MAX(collected_at) as latest_date,
        COUNT(*) as total_snapshots
      FROM issue_index
    `;
    const summaryRows = await executeQuery<any>(summaryQuery);
    const summary = summaryRows[0];

    // 데이터가 있는 날짜 목록 조회 (날짜만 추출, 중복 제거)
    const datesQuery = `
      SELECT DISTINCT DATE(collected_at) as date
      FROM issue_index
      ORDER BY date DESC
    `;
    const dateRows = await executeQuery<any>(datesQuery);
    
    const availableDates = dateRows.map((row: any) => {
      const date = row.date instanceof Date ? row.date : new Date(row.date);
      return date.toISOString().split('T')[0];
    });

    const result: DataAvailability = {
      oldest_date: summary.oldest_date 
        ? (summary.oldest_date instanceof Date ? summary.oldest_date.toISOString().split('T')[0] : summary.oldest_date.split('T')[0])
        : null,
      latest_date: summary.latest_date 
        ? (summary.latest_date instanceof Date ? summary.latest_date.toISOString().split('T')[0] : summary.latest_date.split('T')[0])
        : null,
      total_snapshots: summary.total_snapshots || 0,
      collection_frequency: "daily",
      available_dates: availableDates
    };

    console.log(`   ✅ Data availability: ${result.total_snapshots} snapshots, ${availableDates.length} dates`);
    return result;
  } catch (error) {
    console.error("❌ Error fetching data availability:", error);
    throw error;
  }
}

/**
 * 날짜 범위 내에서 누락된 날짜 계산
 * 
 * @param startDate 시작 날짜 (YYYY-MM-DD)
 * @param endDate 종료 날짜 (YYYY-MM-DD)
 * @param existingDates 실제 데이터가 있는 날짜들
 * @returns 누락된 날짜 배열
 */
function calculateMissingDates(
  startDate: string,
  endDate: string,
  existingDates: string[]
): string[] {
  const existingSet = new Set(existingDates.map(d => d.split('T')[0]));
  const missingDates: string[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (!existingSet.has(dateStr)) {
      missingDates.push(dateStr);
    }
  }
  
  return missingDates;
}

// ============ Export ============

export {
  saveIssueIndexToMySQL,
  getLatestIssueIndex,
  getIssueIndexByDate,
  getIssueIndexByDateRange,
  getDataAvailability,
  calculateMissingDates,
  IssueIndexData,
  DataAvailability,
};
