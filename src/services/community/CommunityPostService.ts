/**
 * 커뮤니티 게시물 서비스
 */

import { executeQuery, executeModify } from '@/database/mysql';
import { Logger } from '@/database/logger';
import {
  CommunityPost,
  CreatePostDto,
  UpdatePostDto,
  PostListQuery,
  PaginatedResult,
} from '@/types/community';
import { ValidationException, DatabaseException } from '@/exceptions/AgentException';
import { RowDataPacket } from 'mysql2';

const logger = new Logger('CommunityPostService');

type PostRow = RowDataPacket & {
  post_id: number;
  user_id: number;
  title: string;
  content: string;
  category: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  is_deleted: 0 | 1;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  author_user_id: number;
  author_nickname: string;
  author_profile_image_url: string | null;
  is_liked?: 0 | 1;
};

type CountRow = RowDataPacket & {
  total: number;
};

type OwnerRow = RowDataPacket & {
  user_id: number;
};

export class CommunityPostService {
  /**
   * 게시물 작성
   */
  async createPost(userId: number, dto: CreatePostDto): Promise<CommunityPost> {
    const methodName = 'createPost';
    try {
      // 입력 검증
      this.validateCreatePostDto(dto);

      const sql = `
        INSERT INTO community_posts (user_id, title, content, category)
        VALUES (?, ?, ?, ?)
      `;

      const result = await executeModify(sql, [
        userId,
        dto.title,
        dto.content,
        dto.category,
      ]);

      const postId = result.insertId;

      // 생성된 게시물 조회
      const post = await this.getPostById(postId, userId);
      if (!post) {
        throw new DatabaseException('Failed to create post', methodName);
      }

      logger.info(`Post created: ${postId} by user ${userId}`);
      return post;
    } catch (error) {
      logger.error('Failed to create post', error);
      throw error;
    }
  }

  /**
   * 게시물 목록 조회
   */
  async getPosts(query: PostListQuery, currentUserId?: number): Promise<PaginatedResult<CommunityPost>> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;
      const sort = query.sort || 'latest';

      // WHERE 조건
      let whereClause = 'WHERE p.is_deleted = FALSE';
      const params: any[] = [];

      if (query.category) {
        whereClause += ' AND p.category = ?';
        params.push(query.category);
      }

      // ORDER BY 조건
      let orderByClause = '';
      if (sort === 'latest') {
        orderByClause = 'ORDER BY p.created_at DESC';
      } else if (sort === 'popular') {
        orderByClause = 'ORDER BY p.likes_count DESC, p.created_at DESC';
      }

      // 전체 개수 조회
      const countSql = `
        SELECT COUNT(*) as total
        FROM community_posts p
        ${whereClause}
      `;
      const countResult = await executeQuery<CountRow>(countSql, params);
      const total = countResult[0]?.total ?? 0;

      // 게시물 목록 조회
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
        ${orderByClause}
        LIMIT ? OFFSET ?
      `;

      const queryParams = currentUserId
        ? [currentUserId, ...params, limit, offset]
        : [...params, limit, offset];

      const rows = await executeQuery<PostRow>(sql, queryParams);

      const items = rows.map((row) => this.mapRowToPost(row));

      return {
        items,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get posts', error);
      throw error;
    }
  }

  /**
   * 게시물 상세 조회
   */
  async getPostById(postId: number, currentUserId?: number): Promise<CommunityPost | null> {
    try {
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
        WHERE p.post_id = ? AND p.is_deleted = FALSE
      `;

      const params = currentUserId ? [currentUserId, postId] : [postId];
      const rows = await executeQuery<PostRow>(sql, params);

      if (rows.length === 0) {
        return null;
      }

      // 조회수 증가
      await this.incrementViewCount(postId);

      return this.mapRowToPost(rows[0]);
    } catch (error) {
      logger.error('Failed to get post by ID', error);
      throw error;
    }
  }

  /**
   * 게시물 수정
   */
  async updatePost(postId: number, userId: number, dto: UpdatePostDto): Promise<CommunityPost> {
    try {
      // 게시물 존재 및 작성자 확인
      await this.checkPostOwnership(postId, userId);

      const updateFields: string[] = [];
      const params: any[] = [];

      if (dto.title !== undefined) {
        updateFields.push('title = ?');
        params.push(dto.title);
      }
      if (dto.content !== undefined) {
        updateFields.push('content = ?');
        params.push(dto.content);
      }
      if (dto.category !== undefined) {
        updateFields.push('category = ?');
        params.push(dto.category);
      }

      if (updateFields.length === 0) {
        throw new ValidationException('No fields to update', 'updatePost');
      }

      params.push(postId);

      const sql = `
        UPDATE community_posts
        SET ${updateFields.join(', ')}
        WHERE post_id = ?
      `;

      await executeQuery(sql, params);

      logger.info(`Post updated: ${postId} by user ${userId}`);

      const post = await this.getPostById(postId, userId);
      if (!post) {
        throw new DatabaseException('Failed to update post', 'updatePost');
      }

      return post;
    } catch (error) {
      logger.error('Failed to update post', error);
      throw error;
    }
  }

  /**
   * 게시물 삭제 (소프트 삭제)
   */
  async deletePost(postId: number, userId: number): Promise<void> {
    try {
      // 게시물 존재 및 작성자 확인
      await this.checkPostOwnership(postId, userId);

      const sql = `
        UPDATE community_posts
        SET is_deleted = TRUE, deleted_at = NOW()
        WHERE post_id = ?
      `;

      await executeQuery(sql, [postId]);

      logger.info(`Post deleted: ${postId} by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete post', error);
      throw error;
    }
  }

  /**
   * 게시물 작성자 확인
   */
  async checkPostOwnership(postId: number, userId: number): Promise<void> {
    const sql = `
      SELECT user_id FROM community_posts
      WHERE post_id = ? AND is_deleted = FALSE
    `;

    const methodName = 'checkPostOwnership';
    const rows = await executeQuery<OwnerRow>(sql, [postId]);

    if (rows.length === 0) {
      throw new ValidationException('Post not found', methodName);
    }

    if (rows[0].user_id !== userId) {
      throw new ValidationException('You are not the author of this post', methodName);
    }
  }

  /**
   * 조회수 증가
   */
  private async incrementViewCount(postId: number): Promise<void> {
    const sql = `
      UPDATE community_posts
      SET views_count = views_count + 1
      WHERE post_id = ?
    `;

    await executeQuery(sql, [postId]);
  }

  /**
   * 게시물 생성 DTO 검증
   */
  private validateCreatePostDto(dto: CreatePostDto): void {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new ValidationException('Title is required', 'validateCreatePostDto');
    }

    if (dto.title.length > 255) {
      throw new ValidationException(
        'Title must be less than 255 characters',
        'validateCreatePostDto'
      );
    }

    if (!dto.content || dto.content.trim().length === 0) {
      throw new ValidationException('Content is required', 'validateCreatePostDto');
    }

    if (!dto.category) {
      throw new ValidationException('Category is required', 'validateCreatePostDto');
    }

    const validCategories = ['prompt_share', 'qa', 'review', 'general', 'announcement'];
    if (!validCategories.includes(dto.category)) {
      throw new ValidationException('Invalid category', 'validateCreatePostDto');
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

export default new CommunityPostService();
