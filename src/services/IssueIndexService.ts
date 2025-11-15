import { queryOne, executeQuery } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { DatabaseException } from '../exceptions';
import { Logger } from '../database/logger';

const logger = new Logger('IssueIndexService');

export async function getLatestIssueIndex(): Promise<any> {
  const methodName = 'getLatestIssueIndex';
  const cacheKey = 'issue:index:latest';
  const redisCache = getRedisCache();

  try {
    const cachedData = await redisCache.getJson<any>(cacheKey);
    if (cachedData) {
      logger.info('Serving latest issue index from cache');
      return cachedData;
    }

    logger.info('Fetching latest issue index from DB');
    const indexData = await queryOne<any>(
      `SELECT
         index_id,
         index_date,
         score,
         comparison_previous_week,
         main_keyword,
         trend,
         article_count
       FROM issue_index_daily
       ORDER BY index_date DESC
       LIMIT 1`,
      []
    );

    if (indexData) {
      await redisCache.setJson(cacheKey, indexData, 3600);
    }

    return indexData;
  } catch (error) {
    throw new DatabaseException(`최신 이슈 지수 조회 실패: ${error}`, methodName);
  }
}

export async function getRecentIndexTrend(days: number = 30): Promise<any[]> {
  const methodName = 'getRecentIndexTrend';
  try {
    const trendData = await executeQuery<any>(
      `SELECT index_date, score
       FROM issue_index_daily
       WHERE index_date >= CURDATE() - INTERVAL ? DAY
       ORDER BY index_date ASC`,
      [days]
    );
    return trendData;
  } catch (error) {
    throw new DatabaseException(`이슈 지수 트렌드 조회 실패: ${error}`, methodName);
  }
}

export async function getLatestIndexByCategory(): Promise<any[]> {
  const methodName = 'getLatestIndexByCategory';
  const cacheKey = 'issue:index:by_category';
  const redisCache = getRedisCache();

  try {
    const cachedData = await redisCache.getJson<any[]>(cacheKey);
    if (cachedData) {
      logger.info('Serving category issue index from cache');
      return cachedData;
    }

    logger.info('Fetching category issue index from DB');
    const categoryData = await executeQuery<any>(
      `SELECT
         i.category_index_id,
         i.index_date,
         i.category_id,
         c.category_name,
         c.category_code,
         i.score,
         i.comparison_previous_week,
         i.article_count
       FROM issue_index_by_category i
       JOIN ai_categories c ON i.category_id = c.category_id
       WHERE i.index_date = (SELECT MAX(index_date) FROM issue_index_daily)`,
      []
    );

    if (categoryData.length > 0) {
      await redisCache.setJson(cacheKey, categoryData, 3600);
    }

    return categoryData;
  } catch (error) {
    throw new DatabaseException(`카테고리별 이슈 지수 조회 실패: ${error}`, methodName);
  }
}