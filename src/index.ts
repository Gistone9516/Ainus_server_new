/**
 * Ainus AI Model Analysis Server
 * 메인 엔트리 포인트
 *
 * 포함 기능:
 * 1. 기존 Ainus AI 서비스
 * 2. AI 뉴스 클러스터링 & 이슈 지수 시스템
 */

// Development: tsconfig-paths handles path aliases via ts-node -r tsconfig-paths/register
// Production: module-alias handles path aliases after compilation
if (process.env.NODE_ENV === 'production') {
  require('module-alias/register');
}
import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { createApp } from "./app";
import { getConfig } from "./config/environment";
import { getDatabasePool } from "./database/mysql";
import { getRedisCache } from "./database/redis";
import { Logger } from "./database/logger";
import { initializeAllSchedulers, stopAllSchedulers } from "./cron";

// 뉴스 클러스터링 라우터
import newsRouter from "./routes/news";
import { startScheduler } from "./services/news/news-clustering-pipeline";
import { testMySQLConnection, testRedisConnection } from "./database/articles";

dotenv.config();

const logger = new Logger("Server");
const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    // 설정 로드
    const config = getConfig();
    logger.info(`Starting server in ${config.nodeEnv} environment`);

    console.log("\n" + "=".repeat(70));
    console.log("🚀 Ainus AI & News Clustering System");
    console.log("=".repeat(70));
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);

    // 데이터베이스 연결 초기화
    logger.info("Initializing database pool...");
    const dbPool = getDatabasePool();
    await dbPool.initialize();
    logger.info("Database pool initialized successfully");

    // Redis 캐시 초기화
    logger.info("Initializing Redis cache...");
    const redisCache = getRedisCache();
    await redisCache.initialize();
    logger.info("Redis cache initialized successfully");

    // Express 애플리케이션 생성 (기존 Ainus 서비스)
    const app = createApp();

    // ============ 뉴스 클러스터링 API 라우트 추가 ============

    console.log("\n📋 News Clustering API Routes:");

    // Mount news router
    app.use("/api/issue-index", newsRouter);
    console.log(`   Mounted /api/issue-index routes`);

    /**
     * 뉴스 클러스터링 헬스 체크
     */
    app.get("/health/news-clustering", (req: Request, res: Response) => {
      res.status(200).json({
        status: "ok",
        service: "news-clustering",
        timestamp: new Date().toISOString(),
      });
    });
    console.log(`   GET  /health/news-clustering`);

    /**
     * 뉴스 클러스터링 상세 헬스 체크
     */
    app.get(
      "/health/news-clustering/detailed",
      async (req: Request, res: Response) => {
        try {
          const mysqlConnected = await testMySQLConnection();
          const redisConnected = await testRedisConnection();

          res.status(200).json({
            status: "ok",
            service: "news-clustering",
            timestamp: new Date().toISOString(),
            services: {
              mysql: mysqlConnected ? "connected" : "disconnected",
              redis: redisConnected ? "connected" : "disconnected",
            },
          });
        } catch (error) {
          res.status(500).json({
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );
    console.log(`   GET  /health/news-clustering/detailed\n`);

    // ============ 서버 시작 ============

    // 모든 네트워크 인터페이스에서 수신 (0.0.0.0)
    // 이렇게 해야 로컬 네트워크의 다른 기기(모바일 앱 등)에서 접근 가능
    const server = app.listen(config.port, '0.0.0.0', () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(
        `API Documentation: http://localhost:${config.port}/api/docs`
      );

      console.log("=".repeat(70));
      console.log(`✅ Server is running on http://0.0.0.0:${config.port}`);
      console.log(`   - Local: http://localhost:${config.port}`);
      console.log(`   - Network: http://192.168.x.x:${config.port}`);
      console.log("=".repeat(70) + "\n");
    });

    // ============ 데이터 수집 파이프라인 스케줄러 시작 ============

    console.log("📅 Starting Data Collection Pipeline Scheduler...\n");
    initializeAllSchedulers();

    // ============ 뉴스 클러스터링 파이프라인 스케줄러 시작 ============

    console.log("📅 Starting News Clustering Pipeline Scheduler...\n");
    const scheduleTime = process.env.PIPELINE_SCHEDULE_TIME || "0 * * * *";
    const enableSchedule = process.env.PIPELINE_ENABLE_SCHEDULE !== "false";

    if (enableSchedule) {
      startScheduler({
        enableSchedule: true,
        scheduleTime: scheduleTime,
        maxRetries: parseInt(process.env.PIPELINE_MAX_RETRIES || "2"),
        retryDelayMs: parseInt(process.env.PIPELINE_RETRY_DELAY_MS || "5000"),
      });
    } else {
      logger.info("Pipeline scheduler disabled (manual mode)");
    }

    // ============ 우아한 종료 ============

    const gracefulShutdown = async () => {
      logger.info("Shutting down server gracefully...");

      // 데이터 수집 스케줄러 중지
      stopAllSchedulers();

      server.close(async () => {
        logger.info("HTTP server closed");

        // 데이터베이스 연결 종료
        try {
          await dbPool.close();
          logger.info("Database pool closed");
        } catch (error) {
          logger.error("Error closing database pool", error);
        }

        // Redis 연결 종료
        try {
          await redisCache.close();
          logger.info("Redis cache closed");
        } catch (error) {
          logger.error("Error closing Redis cache", error);
        }

        process.exit(0);
      });

      // 5초 후 강제 종료
      setTimeout(() => {
        logger.error("Forced shutdown after 5 seconds");
        process.exit(1);
      }, 5000);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

    // 예상 밖의 에러 처리
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", error);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection", { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

// 서버 시작
startServer();
