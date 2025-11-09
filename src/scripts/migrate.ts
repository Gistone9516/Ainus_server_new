/**
 * 데이터베이스 마이그레이션 실행 스크립트
 *
 * 사용법: npm run migrate
 */

import { getDatabasePool } from '../database/mysql';
import { runMigrations } from '../database/migrations';
import { Logger } from '../database/logger';

const logger = new Logger('Migrate');

async function main(): Promise<void> {
  try {
    logger.info('Initializing database pool...');
    const dbPool = getDatabasePool();
    await dbPool.initialize();

    logger.info('Running migrations...');
    await runMigrations();

    logger.info('Migrations completed successfully!');
    await dbPool.close();

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
}

main();
