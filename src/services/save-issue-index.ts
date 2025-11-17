/**
 * MySQL issue_index 테이블에 계산된 이슈 지수 저장
 */

import mysql from "mysql2/promise";

// ============ Type 정의 ============

interface IssueIndexData {
  collected_at: string; // ISO 8601 datetime
  overall_index: number;
}

// ============ MySQL 연결 ============

let mysqlPool: mysql.Pool | null = null;

/**
 * MySQL 풀 초기화
 */
async function initMySQLPool(): Promise<mysql.Pool> {
  if (mysqlPool) {
    return mysqlPool;
  }

  mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "password",
    database: process.env.MYSQL_DB || "ai_news_classifier",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log(`✅ MySQL pool initialized`);
  return mysqlPool;
}

/**
 * MySQL 풀 종료
 */
async function closeMySQLPool(): Promise<void> {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
    console.log(`✅ MySQL pool closed`);
  }
}

// ============ 저장 함수 ============

/**
 * issue_index 테이블에 이슈 지수 저장
 *
 * 테이블 스키마:
 * CREATE TABLE issue_index (
 *   collected_at DATETIME NOT NULL PRIMARY KEY,
 *   overall_index DECIMAL(5, 1) NOT NULL,
 *   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * @param data 저장할 이슈 지수 데이터
 */
async function saveIssueIndexToMySQL(data: IssueIndexData): Promise<void> {
  console.log("\n========== Saving Issue Index to MySQL ==========\n");

  const pool = await initMySQLPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      INSERT INTO issue_index (collected_at, overall_index)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        overall_index = VALUES(overall_index),
        created_at = NOW()
    `;

    // ISO 8601을 MySQL DATETIME 형식으로 변환
    // "2025-11-11T12:00:00Z" → "2025-11-11 12:00:00"
    const collectedAtMySQL = data.collected_at.replace("T", " ").replace("Z", "");

    const [result] = await connection.execute(query, [collectedAtMySQL, data.overall_index]);

    console.log(`✅ Issue index saved successfully`);
    console.log(`   - collected_at: ${data.collected_at}`);
    console.log(`   - overall_index: ${data.overall_index}`);
    console.log(`   - timestamp: ${new Date().toISOString()}\n`);

    return;
  } catch (error) {
    console.error("❌ Error saving issue index to MySQL:", error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 최신 이슈 지수 조회
 *
 * @returns 가장 최신의 이슈 지수 데이터
 */
async function getLatestIssueIndex(): Promise<IssueIndexData | null> {
  console.log("🔍 Fetching latest issue index from MySQL...");

  const pool = await initMySQLPool();
  const connection = await pool.getConnection();

  try {
    const query = `
      SELECT collected_at, overall_index
      FROM issue_index
      ORDER BY collected_at DESC
      LIMIT 1
    `;

    const [rows] = await connection.execute(query);

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0] as any;

      // MySQL DATETIME을 ISO 8601로 변환
      // "2025-11-11 12:00:00" → "2025-11-11T12:00:00Z"
      const collectedAt = new Date(row.collected_at).toISOString();

      console.log(`   ✅ Latest issue index found: ${collectedAt}`);

      return {
        collected_at: collectedAt,
        overall_index: row.overall_index,
      };
    }

    console.log("   ⚠️ No issue index data found");
    return null;
  } catch (error) {
    console.error("❌ Error fetching latest issue index:", error);
    throw error;
  } finally {
    connection.release();
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

  const pool = await initMySQLPool();
  const connection = await pool.getConnection();

  try {
    // ISO 8601을 MySQL DATETIME 형식으로 변환
    const collectedAtMySQL = collectedAt.replace("T", " ").replace("Z", "");

    const query = `
      SELECT collected_at, overall_index
      FROM issue_index
      WHERE collected_at = ?
      LIMIT 1
    `;

    const [rows] = await connection.execute(query, [collectedAtMySQL]);

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0] as any;

      const isoTime = new Date(row.collected_at).toISOString();

      console.log(`   ✅ Issue index found: ${isoTime}`);

      return {
        collected_at: isoTime,
        overall_index: row.overall_index,
      };
    }

    console.log(`   ⚠️ No issue index found for: ${collectedAt}`);
    return null;
  } catch (error) {
    console.error("❌ Error fetching issue index by date:", error);
    throw error;
  } finally {
    connection.release();
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

  const pool = await initMySQLPool();
  const connection = await pool.getConnection();

  try {
    // ISO 8601을 MySQL DATETIME 형식으로 변환
    const startDateMySQL = startDate.replace("T", " ").replace("Z", "");
    const endDateMySQL = endDate.replace("T", " ").replace("Z", "");

    const query = `
      SELECT collected_at, overall_index
      FROM issue_index
      WHERE collected_at BETWEEN ? AND ?
      ORDER BY collected_at DESC
    `;

    const [rows] = await connection.execute(query, [startDateMySQL, endDateMySQL]);

    if (Array.isArray(rows)) {
      const results = rows.map((row: any) => ({
        collected_at: new Date(row.collected_at).toISOString(),
        overall_index: row.overall_index,
      }));

      console.log(`   ✅ Found ${results.length} records in range`);
      return results;
    }

    console.log(`   ⚠️ No records found in range`);
    return [];
  } catch (error) {
    console.error("❌ Error fetching issue index by date range:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// ============ Export ============

export {
  saveIssueIndexToMySQL,
  getLatestIssueIndex,
  getIssueIndexByDate,
  getIssueIndexByDateRange,
  initMySQLPool,
  closeMySQLPool,
  IssueIndexData,
};
