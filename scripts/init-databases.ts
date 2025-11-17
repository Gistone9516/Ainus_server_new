/**
 * 데이터베이스 초기화 스크립트
 *
 * 실행: npm run init:db
 *
 * 초기화 대상:
 * 1. MongoDB: ai_news_classifier DB + collections + indexes
 * 2. MySQL: ai_news_classifier DB + issue_index table
 * 3. ElasticSearch: articles index + mappings
 */

import { MongoClient } from "mongodb";
import mysql from "mysql2/promise";
import { Client as ElasticsearchClient } from "@elastic/elasticsearch";
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

// ============ MongoDB 초기화 ============

async function initMongoDB(): Promise<void> {
  log(colors.blue, "\n========== MongoDB Initialization ==========\n");

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB_NAME || "ai_news_classifier";

  let client: MongoClient | null = null;

  try {
    // 연결
    log(colors.yellow, "📌 Connecting to MongoDB...");
    client = new MongoClient(mongoUri);
    await client.connect();
    log(colors.green, `✅ Connected to MongoDB\n`);

    const db = client.db(dbName);

    // 1. clusters 컬렉션 생성 및 인덱스
    log(colors.yellow, "📚 Creating clusters collection...");
    try {
      await db.createCollection("clusters");
      log(colors.green, `   ✅ clusters collection created`);
    } catch (e: any) {
      if (e.codeName === "NamespaceExists") {
        log(colors.yellow, `   ⚠️  clusters collection already exists`);
      } else {
        throw e;
      }
    }

    const clustersCollection = db.collection("clusters");

    // clusters 인덱스
    log(colors.yellow, "   📌 Creating indexes for clusters...");
    await clustersCollection.createIndex({ cluster_id: 1 });
    await clustersCollection.createIndex({ status: 1 });
    await clustersCollection.createIndex({ updated_at: -1 });
    log(colors.green, `   ✅ Indexes created\n`);

    // 2. cluster_snapshots 컬렉션 생성 및 인덱스
    log(colors.yellow, "📸 Creating cluster_snapshots collection...");
    try {
      await db.createCollection("cluster_snapshots");
      log(colors.green, `   ✅ cluster_snapshots collection created`);
    } catch (e: any) {
      if (e.codeName === "NamespaceExists") {
        log(colors.yellow, `   ⚠️  cluster_snapshots collection already exists`);
      } else {
        throw e;
      }
    }

    const snapshotsCollection = db.collection("cluster_snapshots");

    // cluster_snapshots 인덱스
    log(colors.yellow, "   📌 Creating indexes for cluster_snapshots...");
    await snapshotsCollection.createIndex({ collected_at: 1 });
    await snapshotsCollection.createIndex({ cluster_id: 1 });
    await snapshotsCollection.createIndex({ collected_at: 1, cluster_id: 1 });
    await snapshotsCollection.createIndex({ status: 1 });

    // TTL 인덱스 (90일 후 자동 삭제)
    // 7776000초 = 90일
    await snapshotsCollection.createIndex(
      { created_at: 1 },
      { expireAfterSeconds: 7776000 }
    );
    log(colors.green, `   ✅ Indexes created (with TTL 90 days)\n`);

    log(colors.green, `✅ MongoDB initialization completed\n`);
  } catch (error) {
    log(colors.red, `❌ MongoDB initialization failed: ${error}`);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// ============ MySQL 초기화 ============

async function initMySQL(): Promise<void> {
  log(colors.blue, "\n========== MySQL Initialization ==========\n");

  const host = process.env.MYSQL_HOST || "localhost";
  const user = process.env.MYSQL_USER || "root";
  const password = process.env.MYSQL_PASSWORD || "password";
  const database = process.env.MYSQL_DB || "ai_news_classifier";

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

// ============ ElasticSearch 초기화 ============

async function initElasticsearch(): Promise<void> {
  log(colors.blue, "\n========== ElasticSearch Initialization ==========\n");

  const host = process.env.ELASTICSEARCH_HOST || "http://localhost:9200";

  const client = new ElasticsearchClient({ node: host });

  try {
    // 연결 테스트
    log(colors.yellow, "📌 Connecting to ElasticSearch...");
    await client.info();
    log(colors.green, `✅ Connected to ElasticSearch\n`);

    // 1. articles 인덱스 삭제 (기존 인덱스 초기화)
    log(colors.yellow, "🗑️  Checking for existing articles index...");
    try {
      const indexExists = await client.indices.exists({ index: "articles" });
      if (indexExists) {
        log(colors.yellow, "   ⚠️  Deleting existing articles index...");
        await client.indices.delete({ index: "articles" });
        log(colors.green, `   ✅ Index deleted\n`);
      }
    } catch (e: any) {
      // 인덱스가 없으면 무시
      if (e.statusCode !== 404) {
        throw e;
      }
    }

    // 2. articles 인덱스 생성
    log(colors.yellow, "📝 Creating articles index with mappings...");
    await client.indices.create({
      index: "articles",
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            korean_analyzer: {
              type: "custom",
              tokenizer: "nori_tokenizer",
              filter: ["nori_part_of_speech", "lowercase"],
            },
          },
        },
      },
      mappings: {
        properties: {
          collected_at: {
            type: "date",
            format:
              "epoch_second||strict_date_optional_time||yyyy-MM-dd'T'HH:mm:ssZ",
          },
          source: {
            type: "keyword",
          },
          articles: {
            type: "nested",
            properties: {
              index: {
                type: "integer",
              },
              title: {
                type: "text",
                analyzer: "korean_analyzer",
                fields: {
                  keyword: {
                    type: "keyword",
                  },
                },
              },
              link: {
                type: "keyword",
              },
              description: {
                type: "text",
                analyzer: "korean_analyzer",
              },
              pubDate: {
                type: "date",
                format: "strict_date_optional_time",
              },
            },
          },
        },
      },
    });

    log(colors.green, `   ✅ articles index created with Korean analyzer\n`);

    log(colors.green, `✅ ElasticSearch initialization completed\n`);
  } catch (error) {
    log(colors.red, `❌ ElasticSearch initialization failed: ${error}`);
    throw error;
  } finally {
    await client.close();
  }
}

// ============ 메인 함수 ============

async function main(): Promise<void> {
  log(colors.blue, "\n" + "=".repeat(60));
  log(colors.blue, "🚀 Database Initialization Script Started");
  log(colors.blue, "=".repeat(60));

  try {
    // MongoDB
    await initMongoDB();

    // MySQL
    await initMySQL();

    // ElasticSearch
    await initElasticsearch();

    // 완료
    log(colors.green, "=".repeat(60));
    log(colors.green, "✅ All databases initialized successfully!");
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
