/**
 * MySQL issue_index_daily 테이블에 계산된 이슈 지수 저장
 */

import mysql from "mysql2/promise";

// ============ Type 정의 ============

interface IssueIndexData {
  collected_at: string; // ISO 8601 datetime
  overall_index: number;
  article_count?: number;
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
 * issue_index_daily 테이블에 이슈 지수 저장
 *
 * 테이블 스키마:
 * CREATE TABLE issue_index_daily (
 *   index_id INT PRIMARY KEY AUTO_INCREMENT,
 *   index_date DATE UNIQUE NOT NULL,
 *   score INT CHECK (score >= 0 AND score <= 100),
 *   comparison_previous_week DECIMAL(5, 2),
 *   main_keyword VARCHAR(100),
 *   trend VARCHAR(20),
 *   article_count INT,
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 *   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 *   INDEX idx_index_date (index_date)
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
      INSERT INTO issue_index_daily (index_date, score, article_count)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        score = VALUES(score),
        article_count = VALUES(article_count),
        updated_at = NOW()
    `;

    // ISO 8601에서 날짜 부분만 추출 (YYYY-MM-DD)
    const indexDate = data.collected_at.split("T")[0];
    const score = Math.round(data.overall_index);

    await connection.execute(query, [indexDate, score, data.article_count || null]);

    console.log(`✅ Issue index saved successfully`);
    console.log(`   - index_date: ${indexDate}`);
    console.log(`   - score: ${score}`);
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
      SELECT index_date, score, article_count
      FROM issue_index_daily
      ORDER BY index_date DESC
      LIMIT 1
    `;

    const [rows] = await connection.execute(query);

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0] as any;

      // Date 객체 또는 문자열을 ISO 문자열로 변환
      // row.index_date가 Date 객체일 수 있음
      const dateObj = new Date(row.index_date);
      const collectedAt = dateObj.toISOString();

      console.log(`   ✅ Latest issue index found: ${collectedAt}`);

      return {
        collected_at: collectedAt,
        overall_index: row.score,
        article_count: row.article_count
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
    // ISO 8601에서 날짜 부분만 추출
    const indexDate = collectedAt.split("T")[0];

    const query = `
      SELECT index_date, score, article_count
      FROM issue_index_daily
      WHERE index_date = ?
      LIMIT 1
    `;

    const [rows] = await connection.execute(query, [indexDate]);

    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0] as any;

      const dateObj = new Date(row.index_date);
      const isoTime = dateObj.toISOString();

      console.log(`   ✅ Issue index found: ${isoTime}`);

      return {
        collected_at: isoTime,
        overall_index: row.score,
        article_count: row.article_count
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
    const startDateStr = startDate.split("T")[0];
    const endDateStr = endDate.split("T")[0];

    const query = `
      SELECT index_date, score, article_count
      FROM issue_index_daily
      WHERE index_date BETWEEN ? AND ?
      ORDER BY index_date DESC
    `;

    const [rows] = await connection.execute(query, [startDateStr, endDateStr]);

    if (Array.isArray(rows)) {
      const results = rows.map((row: any) => ({
        collected_at: new Date(row.index_date).toISOString(),
        overall_index: row.score,
        article_count: row.article_count
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
