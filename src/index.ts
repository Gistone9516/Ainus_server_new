import { createApp } from './app';
import { getConfig } from './config/environment';
import { getDatabasePool } from './database/mysql';
import { getRedisCache } from './database/redis';
import { Logger } from './database/logger';
import { startUpdateScheduler } from './jobs/collectModelUpdates';
import { startIssueIndexScheduler } from './jobs/calculateIssueIndex';

const logger = new Logger('Server');

async function startServer(): Promise<void> {
  try {
    const config = getConfig();
    logger.info(`Starting server in ${config.nodeEnv} environment`);

    logger.info('Initializing database pool...');
    const dbPool = getDatabasePool();
    await dbPool.initialize();
    logger.info('Database pool initialized successfully');

    logger.info('Initializing Redis cache...');
    const redisCache = getRedisCache();
    await redisCache.initialize();
    logger.info('Redis cache initialized successfully');

    startUpdateScheduler();
    startIssueIndexScheduler();

    const app = createApp();

    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`API Documentation: http://localhost:${config.port}/api/docs`);
    });

    const gracefulShutdown = async () => {
      logger.info('Shutting down server gracefully...');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await dbPool.close();
          logger.info('Database pool closed');
        } catch (error) {
          logger.error('Error closing database pool', error);
        }

        try {
          await redisCache.close();
          logger.info('Redis cache closed');
        } catch (error) {
          logger.error('Error closing Redis cache', error);
        }

        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after 5 seconds');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

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

startServer();