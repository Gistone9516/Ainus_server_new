/**
 * 데이터베이스 초기화 스크립트
 *
 * 실행: npm run init:db
 *
 * 초기화 대상:
 * 1. MySQL: ai_news_classifier DB + tables
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// ============ 색상 정의 ============

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function log(color: string, message: string) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============ MySQL 초기화 ============

async function initMySQL(): Promise<void> {
  log(colors.blue, "\n========== MySQL Initialization ==========\n");

  const host = process.env.MYSQL_HOST || "localhost";
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "password";
  const database = process.env.MYSQL_DATABASE || process.env.MYSQL_DB || "ai_news_classifier";

  let connection: any = null;

  try {
    // 연결
    log(colors.yellow, "📌 Connecting to MySQL...");
    connection = await mysql.createConnection({
      host,
      user,
      password,
    });
    log(colors.green, `✅ Connected to MySQL\n`);

    // 1. 데이터베이스 생성
    log(colors.yellow, `🗄️  Creating database: ${database}...`);
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS ${database}`);
      log(colors.green, `   ✅ Database created (or already exists)\n`);
    } catch (e: any) {
      if (e.code !== "ER_DB_CREATE_EXISTS") {
        throw e;
      }
    }

    // 2. 데이터베이스 선택
    await connection.changeUser({ database });

    // 3. issue_index 테이블 생성
    log(colors.yellow, "📊 Creating issue_index table...");
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS issue_index (
        collected_at DATETIME NOT NULL,
        overall_index DECIMAL(5, 1) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collected_at),
        INDEX idx_collected_at_desc (collected_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.query(createTableSQL);
    log(colors.green, `   ✅ issue_index table created\n`);

    log(colors.green, `✅ MySQL initialization completed\n`);
  } catch (error) {
    log(colors.red, `❌ MySQL initialization failed: ${error}`);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// ============ 메인 함수 ============

async function main(): Promise<void> {
  log(colors.blue, "\n" + "=".repeat(60));
  log(colors.blue, "🚀 Database Initialization Script Started");
  log(colors.blue, "=".repeat(60));

  try {
    // MySQL
    await initMySQL();

    // 완료
    log(colors.green, "=".repeat(60));
    log(colors.green, "✅ MySQL database initialized successfully!");
    log(colors.green, "=".repeat(60) + "\n");

    process.exit(0);
  } catch (error) {
    log(colors.red, "\n" + "=".repeat(60));
    log(colors.red, "❌ Database initialization failed!");
    log(colors.red, "=".repeat(60) + "\n");
    console.error(error);
    process.exit(1);
  }
}

// 실행
main();
