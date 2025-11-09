/**
 * Ainus AI Model Analysis Server
 * 메인 엔트리 포인트
 */

import { createApp } from './app';
import { getConfig } from './config/environment';
import { getDatabasePool } from './database/mysql';
import { getRedisCache } from './database/redis';
import { Logger } from './database/logger';

const logger = new Logger('Server');

async function startServer(): Promise<void> {
  try {
    // 설정 로드
    const config = getConfig();
    logger.info(`Starting server in ${config.nodeEnv} environment`);

    // 데이터베이스 연결 초기화
    logger.info('Initializing database pool...');
    const dbPool = getDatabasePool();
    await dbPool.initialize();
    logger.info('Database pool initialized successfully');

    // Redis 캐시 초기화
    logger.info('Initializing Redis cache...');
    const redisCache = getRedisCache();
    await redisCache.initialize();
    logger.info('Redis cache initialized successfully');

    // Express 애플리케이션 생성
    const app = createApp();

    // 서버 시작
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`API Documentation: http://localhost:${config.port}/api/docs`);
    });

    // 우아한 종료
    const gracefulShutdown = async () => {
      logger.info('Shutting down server gracefully...');

      server.close(async () => {
        logger.info('HTTP server closed');

        // 데이터베이스 연결 종료
        try {
          await dbPool.close();
          logger.info('Database pool closed');
        } catch (error) {
          logger.error('Error closing database pool', error);
        }

        // Redis 연결 종료
        try {
          await redisCache.close();
          logger.info('Redis cache closed');
        } catch (error) {
          logger.error('Error closing Redis cache', error);
        }

        process.exit(0);
      });

      // 5초 후 강제 종료
      setTimeout(() => {
        logger.error('Forced shutdown after 5 seconds');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // 예상 밖의 에러 처리
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// 서버 시작
startServer();
