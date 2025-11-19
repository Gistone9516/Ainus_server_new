/**
 * 커뮤니티 검색 서비스
 */

import { executeQuery } from '@/database/mysql';
import { Logger } from '@/database/logger';
import { CommunityPost, SearchQuery, PaginatedResult } from '@/types/community';
import { ValidationException } from '@/exceptions/AgentException';
import { RowDataPacket } from 'mysql2';

const logger = new Logger('CommunitySearchService');

export class CommunitySearchService {
  /**
   * 게시물 검색
   */
  async searchPosts(
    query: SearchQuery,
    currentUserId?: number
  ): Promise<PaginatedResult<CommunityPost>> {
    try {
      // 검색어 검증
      if (!query.q || query.q.trim().length === 0) {
        throw new ValidationException('Search query is required');
      }

      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      // 검색어 준비
      const searchTerm = query.q.trim();

      // WHERE 조건
      let whereClause = 'WHERE p.is_deleted = FALSE';
      const params: any[] = [];

      // FULLTEXT 검색 또는 LIKE 검색
      // MySQL 5.7+ FULLTEXT 지원
      const useFulltext = await this.checkFulltextSupport();

      if (useFulltext) {
        // FULLTEXT 검색
        whereClause += ' AND MATCH(p.title, p.content) AGAINST(? IN NATURAL LANGUAGE MODE)';
        params.push(searchTerm);
      } else {
        // LIKE 검색 (대안)
        whereClause += ' AND (p.title LIKE ? OR p.content LIKE ?)';
        const likeTerm = `%${searchTerm}%`;
        params.push(likeTerm, likeTerm);
      }

      // 카테고리 필터
      if (query.category) {
        whereClause += ' AND p.category = ?';
        params.push(query.category);
      }

      // 전체 개수 조회
      const countSql = `
        SELECT COUNT(*) as total
        FROM community_posts p
        ${whereClause}
      `;
      const countResult = await executeQuery<RowDataPacket[]>(countSql, params);
      const total = countResult[0].total;

      // 게시물 검색
      const sql = `
        SELECT
          p.*,
          u.user_id as author_user_id,
          u.nickname as author_nickname,
          u.profile_image_url as author_profile_image_url
          ${currentUserId ? `, EXISTS(
            SELECT 1 FROM community_post_likes
            WHERE post_id = p.post_id AND user_id = ?
          ) as is_liked` : ''}
        FROM community_posts p
        INNER JOIN users u ON p.user_id = u.user_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const queryParams = currentUserId
        ? [currentUserId, ...params, limit, offset]
        : [...params, limit, offset];

      const rows = await executeQuery<RowDataPacket[]>(sql, queryParams);

      const items = rows.map((row) => this.mapRowToPost(row));

      logger.info(`Search performed: "${searchTerm}" - ${total} results found`);

      return {
        items,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to search posts', error);
      throw error;
    }
  }

  /**
   * FULLTEXT INDEX 지원 여부 확인
   */
  private async checkFulltextSupport(): Promise<boolean> {
    try {
      const sql = `
        SHOW INDEX FROM community_posts
        WHERE Key_name = 'idx_fulltext_search'
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql, []);

      return rows.length > 0;
    } catch (error) {
      logger.warn('Failed to check FULLTEXT support, using LIKE search', error);
      return false;
    }
  }

  /**
   * DB Row를 CommunityPost 객체로 매핑
   */
  private mapRowToPost(row: any): CommunityPost {
    return {
      post_id: row.post_id,
      user_id: row.user_id,
      title: row.title,
      content: row.content,
      category: row.category,
      likes_count: row.likes_count,
      comments_count: row.comments_count,
      views_count: row.views_count,
      is_deleted: Boolean(row.is_deleted),
      deleted_at: row.deleted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: {
        user_id: row.author_user_id,
        nickname: row.author_nickname,
        profile_image_url: row.author_profile_image_url,
      },
      is_liked: row.is_liked !== undefined ? Boolean(row.is_liked) : undefined,
    };
  }
}

export default new CommunitySearchService();
