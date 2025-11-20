/**
 * 뉴스 기사 데이터베이스 액세스 (MySQL 기반)
 *
 * 역할:
 * - news_articles 테이블에서 기사 조회
 * - 크롤러용 기사 저장 함수 제공
 * - Redis 캐싱을 통한 성능 최적화
 */

import { getDatabasePool } from './mysql';
import { getRedisCache } from './redis';
import { PoolConnection } from 'mysql2/promise';

/**
 * 기사 데이터 타입
 */
export interface Article {
  index: number;          // 0-999
  title: string;
  link: string;
  description: string;
  pubDate: string;        // ISO 8601 형식
}

/**
 * DB에서 조회한 기사 타입 (article_id 포함)
 */
export interface ArticleFromDB extends Article {
  article_id: number;
  collected_at: string;
  source: string;
}

/**
 * 특정 시간의 특정 인덱스 기사들 조회 (Redis 캐싱 적용)
 *
 * @param collectedAt - 수집 시간 (ISO 8601 형식)
 * @param indices - 기사 인덱스 배열 (예: [0, 4, 15, 67])
 * @returns 기사 배열
 */
export async function getArticlesByIndices(
  collectedAt: string,
  indices: number[]
): Promise<Article[]> {
  if (!collectedAt || indices.length === 0) {
    return [];
  }

  const redis = getRedisCache();
  const sortedIndices = [...indices].sort((a, b) => a - b);
  const cacheKey = `articles:${collectedAt}:${sortedIndices.join(',')}`;

  try {
    // 1. Redis 캐시 확인
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for ${collectedAt} indices ${sortedIndices.slice(0, 3).join(',')}...`);
      return JSON.parse(cached);
    }

    console.log(`⚠️  Cache MISS for ${collectedAt}, fetching from MySQL...`);

    // 2. MySQL 조회
    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    try {
      const placeholders = indices.map(() => '?').join(',');

      const [rows] = await connection.execute(
        `SELECT
          article_index as \`index\`,
          title,
          link,
          description,
          pub_date as pubDate
        FROM news_articles
        WHERE collected_at = ? AND article_index IN (${placeholders})
        ORDER BY article_index ASC`,
        [collectedAt, ...indices]
      );

      const articles = (rows as any[]).map((row) => ({
        index: row.index,
        title: row.title,
        link: row.link,
        description: row.description || '',
        pubDate: row.pubDate ? new Date(row.pubDate).toISOString() : ''
      }));

      // 3. Redis에 캐싱 (1시간 TTL)
      await redis.set(cacheKey, JSON.stringify(articles), 3600);
      console.log(`💾 Cached ${articles.length} articles for 1 hour`);

      return articles;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error fetching articles by indices:', error);
    throw error;
  }
}

/**
 * 특정 시간의 모든 기사 조회 (Redis 캐싱 적용)
 *
 * @param collectedAt - 수집 시간 (ISO 8601 형식)
 * @returns 기사 배열
 */
export async function getArticlesByCollectedAt(
  collectedAt: string
): Promise<ArticleFromDB[]> {
  if (!collectedAt) {
    return [];
  }

  const redis = getRedisCache();
  const cacheKey = `articles:all:${collectedAt}`;

  try {
    // 1. Redis 캐시 확인
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`✅ Cache HIT for all articles at ${collectedAt}`);
      return JSON.parse(cached);
    }

    console.log(`⚠️  Cache MISS for ${collectedAt}, fetching all articles from MySQL...`);

    // 2. MySQL 조회
    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT
          article_id,
          collected_at,
          article_index as \`index\`,
          source,
          title,
          link,
          description,
          pub_date as pubDate
        FROM news_articles
        WHERE collected_at = ?
        ORDER BY article_index ASC`,
        [collectedAt]
      );

      const articles = (rows as any[]).map((row) => ({
        article_id: row.article_id,
        collected_at: row.collected_at,
        index: row.index,
        source: row.source,
        title: row.title,
        link: row.link,
        description: row.description || '',
        pubDate: row.pubDate ? new Date(row.pubDate).toISOString() : ''
      }));

      // 3. Redis에 캐싱 (1시간 TTL)
      await redis.set(cacheKey, JSON.stringify(articles), 3600);
      console.log(`💾 Cached ${articles.length} articles for 1 hour`);

      return articles;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error fetching articles by collected_at:', error);
    throw error;
  }
}

/**
 * 최신 수집 시간 조회 (Redis 캐싱 적용)
 *
 * @returns 최신 수집 시간 (ISO 8601 형식) 또는 null
 */
export async function getLatestCollectedAt(): Promise<string | null> {
  const redis = getRedisCache();
  const cacheKey = 'articles:latest_collected_at';

  try {
    // 1. Redis 캐시 확인
    const cached = await redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. MySQL 조회
    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    try {
      const [rows] = await connection.execute(
        `SELECT MAX(collected_at) as latest FROM news_articles`
      );

      const latest = (rows as any[])[0]?.latest;

      if (!latest) {
        return null;
      }

      const latestISO = new Date(latest).toISOString();

      // 3. Redis에 캐싱 (5분 TTL)
      await redis.set(cacheKey, latestISO, 300);

      return latestISO;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error fetching latest collected_at:', error);
    throw error;
  }
}

/**
 * 기사 일괄 저장 (크롤러용)
 *
 * 트랜잭션을 사용하여 원자성 보장
 * ON DUPLICATE KEY UPDATE로 중복 처리
 *
 * @param collectedAt - 수집 시간 (ISO 8601 형식)
 * @param articles - 기사 배열 (1000개)
 * @param source - 출처 (기본값: 'naver')
 */
export async function saveArticles(
  collectedAt: string,
  articles: Article[],
  source: string = 'naver'
): Promise<void> {
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log(`💾 Saving ${articles.length} articles for ${collectedAt}...`);

    for (const article of articles) {
      await connection.execute(
        `INSERT INTO news_articles
         (collected_at, article_index, source, title, link, description, pub_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           title = VALUES(title),
           link = VALUES(link),
           description = VALUES(description),
           pub_date = VALUES(pub_date)`,
        [
          collectedAt,
          article.index,
          source,
          article.title,
          article.link,
          article.description || '',
          article.pubDate
        ]
      );
    }

    await connection.commit();
    console.log(`✅ Saved ${articles.length} articles to MySQL`);

    // Redis 캐시 무효화
    const redis = getRedisCache();
    await invalidateCache(redis, collectedAt);

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error saving articles, rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 특정 시간의 기사 캐시 무효화
 *
 * @param redis - Redis 캐시 인스턴스
 * @param collectedAt - 수집 시간
 */
async function invalidateCache(redis: any, collectedAt: string): Promise<void> {
  try {
    // 해당 시간의 모든 캐시 키 삭제
    const pattern = `articles:*${collectedAt}*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.deleteMany(keys);
      console.log(`🗑️  Invalidated ${keys.length} cache entries for ${collectedAt}`);
    }

    // latest_collected_at 캐시도 무효화
    await redis.delete('articles:latest_collected_at');
  } catch (error) {
    console.error('⚠️  Failed to invalidate cache:', error);
    // 캐시 무효화 실패는 치명적이지 않으므로 throw하지 않음
  }
}

/**
 * MySQL 연결 테스트
 *
 * @returns 연결 성공 여부
 */
export async function testMySQLConnection(): Promise<boolean> {
  try {
    const pool = getDatabasePool();
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ MySQL connection test failed:', error);
    return false;
  }
}

/**
 * Redis 연결 테스트
 *
 * @returns 연결 성공 여부
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const redis = getRedisCache();
    const client = redis.getClient();
    await client.ping();
    return true;
  } catch (error) {
    console.error('❌ Redis connection test failed:', error);
    return false;
  }
}
