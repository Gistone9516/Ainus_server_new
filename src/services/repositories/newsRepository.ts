import { mysqlPool } from '../../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface NewsArticle {
  article_id?: number;
  collected_at: string;
  article_index: number;
  source: string;
  title: string;
  link: string;
  description: string | null;
  pub_date: string;
}

export class NewsRepository {
  async connect(): Promise<void> {
    try {
      await mysqlPool.query('SELECT 1');
      console.log('NewsRepository: MySQL 연결 확인');
    } catch (error) {
      console.error('NewsRepository: MySQL 연결 실패:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Connection pool은 자동 관리되므로 별도 disconnect 불필요
  }

  async saveArticles(articles: NewsArticle[]): Promise<number> {
    if (articles.length === 0) {
      return 0;
    }

    const connection = await mysqlPool.getConnection();
    
    try {
      await connection.beginTransaction();

      let insertedCount = 0;

      for (const article of articles) {
        try {
          const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO news_articles 
              (collected_at, article_index, source, title, link, description, pub_date)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
              title = VALUES(title),
              description = VALUES(description)`,
            [
              article.collected_at,
              article.article_index,
              article.source,
              article.title,
              article.link,
              article.description,
              article.pub_date
            ]
          );

          if (result.affectedRows > 0) {
            insertedCount++;
          }
        } catch (error: any) {
          // 중복 키 오류는 무시 (이미 존재하는 기사)
          if (error.code !== 'ER_DUP_ENTRY') {
            throw error;
          }
        }
      }

      await connection.commit();
      return insertedCount;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getArticlesByCollectedAt(collectedAt: string): Promise<NewsArticle[]> {
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
      `SELECT * FROM news_articles 
       WHERE collected_at = ?
       ORDER BY article_index`,
      [collectedAt]
    );

    return rows as NewsArticle[];
  }

  async getArticlesByIndices(
    collectedAt: string, 
    indices: number[]
  ): Promise<NewsArticle[]> {
    if (indices.length === 0) {
      return [];
    }

    const placeholders = indices.map(() => '?').join(',');
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
      `SELECT * FROM news_articles 
       WHERE collected_at = ? AND article_index IN (${placeholders})
       ORDER BY article_index`,
      [collectedAt, ...indices]
    );

    return rows as NewsArticle[];
  }

  async getLatestCollectedAt(): Promise<string | null> {
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
      `SELECT collected_at FROM news_articles 
       ORDER BY collected_at DESC 
       LIMIT 1`
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0].collected_at;
  }

  async getArticleCount(collectedAt?: string): Promise<number> {
    if (collectedAt) {
      const [rows] = await mysqlPool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM news_articles WHERE collected_at = ?`,
        [collectedAt]
      );
      return rows[0].count;
    } else {
      const [rows] = await mysqlPool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM news_articles`
      );
      return rows[0].count;
    }
  }

  async getTotalArticleCount(): Promise<number> {
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM news_articles`
    );
    return rows[0].count;
  }

  async getCollectedAtList(limit: number = 10): Promise<string[]> {
    const [rows] = await mysqlPool.query<RowDataPacket[]>(
      `SELECT DISTINCT collected_at FROM news_articles 
       ORDER BY collected_at DESC 
       LIMIT ?`,
      [limit]
    );

    return rows.map(row => row.collected_at);
  }

  async deleteOldArticles(daysToKeep: number = 90): Promise<number> {
    const [result] = await mysqlPool.query<ResultSetHeader>(
      `DELETE FROM news_articles 
       WHERE collected_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysToKeep]
    );

    return result.affectedRows;
  }
}
