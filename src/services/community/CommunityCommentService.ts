/**
 * 커뮤니티 댓글 서비스
 */

import { executeQuery } from '@/database/mysql';
import { Logger } from '@/database/logger';
import { CommunityComment, CreateCommentDto } from '@/types/community';
import { ValidationException, DatabaseException } from '@/exceptions/AgentException';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import communityNotificationService from './CommunityNotificationService';

const logger = new Logger('CommunityCommentService');

export class CommunityCommentService {
  /**
   * 댓글 작성
   */
  async createComment(
    postId: number,
    userId: number,
    dto: CreateCommentDto
  ): Promise<CommunityComment> {
    try {
      // 입력 검증
      this.validateCreateCommentDto(dto);

      // 게시물 존재 확인
      await this.checkPostExists(postId);

      // parent_comment_id가 있으면 부모 댓글 존재 확인
      if (dto.parent_comment_id) {
        await this.checkCommentExists(dto.parent_comment_id);
      }

      // 댓글 삽입
      const sql = `
        INSERT INTO community_comments (post_id, user_id, parent_comment_id, content)
        VALUES (?, ?, ?, ?)
      `;

      const result = await executeQuery<ResultSetHeader>(sql, [
        postId,
        userId,
        dto.parent_comment_id || null,
        dto.content,
      ]);

      const commentId = result.insertId;

      // 게시물의 댓글 수 증가
      await this.incrementCommentCount(postId);

      // 알림 생성
      await this.createCommentNotification(commentId, postId, userId, dto.parent_comment_id);

      // 생성된 댓글 조회
      const comment = await this.getCommentById(commentId);
      if (!comment) {
        throw new DatabaseException('Failed to create comment');
      }

      logger.info(`Comment created: ${commentId} on post ${postId} by user ${userId}`);
      return comment;
    } catch (error) {
      logger.error('Failed to create comment', error);
      throw error;
    }
  }

  /**
   * 게시물의 댓글 목록 조회 (계층 구조)
   */
  async getCommentsByPostId(postId: number): Promise<CommunityComment[]> {
    try {
      const sql = `
        SELECT
          c.*,
          u.user_id as author_user_id,
          u.nickname as author_nickname,
          u.profile_image_url as author_profile_image_url
        FROM community_comments c
        INNER JOIN users u ON c.user_id = u.user_id
        WHERE c.post_id = ? AND c.is_deleted = FALSE
        ORDER BY c.created_at ASC
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql, [postId]);

      // 계층 구조로 변환
      const comments = rows.map((row) => this.mapRowToComment(row));
      return this.buildCommentTree(comments);
    } catch (error) {
      logger.error('Failed to get comments by post ID', error);
      throw error;
    }
  }

  /**
   * 댓글 조회 (단일)
   */
  async getCommentById(commentId: number): Promise<CommunityComment | null> {
    try {
      const sql = `
        SELECT
          c.*,
          u.user_id as author_user_id,
          u.nickname as author_nickname,
          u.profile_image_url as author_profile_image_url
        FROM community_comments c
        INNER JOIN users u ON c.user_id = u.user_id
        WHERE c.comment_id = ? AND c.is_deleted = FALSE
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql, [commentId]);

      if (rows.length === 0) {
        return null;
      }

      return this.mapRowToComment(rows[0]);
    } catch (error) {
      logger.error('Failed to get comment by ID', error);
      throw error;
    }
  }

  /**
   * 댓글 삭제 (소프트 삭제)
   */
  async deleteComment(commentId: number, userId: number): Promise<void> {
    try {
      // 댓글 존재 및 작성자 확인
      await this.checkCommentOwnership(commentId, userId);

      const sql = `
        UPDATE community_comments
        SET is_deleted = TRUE, deleted_at = NOW()
        WHERE comment_id = ?
      `;

      await executeQuery(sql, [commentId]);

      // 게시물의 댓글 수 감소
      const comment = await this.getDeletedCommentById(commentId);
      if (comment) {
        await this.decrementCommentCount(comment.post_id);
      }

      logger.info(`Comment deleted: ${commentId} by user ${userId}`);
    } catch (error) {
      logger.error('Failed to delete comment', error);
      throw error;
    }
  }

  /**
   * 댓글 작성자 확인
   */
  async checkCommentOwnership(commentId: number, userId: number): Promise<void> {
    const sql = `
      SELECT user_id FROM community_comments
      WHERE comment_id = ? AND is_deleted = FALSE
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [commentId]);

    if (rows.length === 0) {
      throw new ValidationException('Comment not found');
    }

    if (rows[0].user_id !== userId) {
      throw new ValidationException('You are not the author of this comment');
    }
  }

  /**
   * 게시물 존재 확인
   */
  private async checkPostExists(postId: number): Promise<void> {
    const sql = `
      SELECT post_id FROM community_posts
      WHERE post_id = ? AND is_deleted = FALSE
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [postId]);

    if (rows.length === 0) {
      throw new ValidationException('Post not found');
    }
  }

  /**
   * 댓글 존재 확인
   */
  private async checkCommentExists(commentId: number): Promise<void> {
    const sql = `
      SELECT comment_id FROM community_comments
      WHERE comment_id = ? AND is_deleted = FALSE
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [commentId]);

    if (rows.length === 0) {
      throw new ValidationException('Parent comment not found');
    }
  }

  /**
   * 게시물의 댓글 수 증가
   */
  private async incrementCommentCount(postId: number): Promise<void> {
    const sql = `
      UPDATE community_posts
      SET comments_count = comments_count + 1
      WHERE post_id = ?
    `;

    await executeQuery(sql, [postId]);
  }

  /**
   * 게시물의 댓글 수 감소
   */
  private async decrementCommentCount(postId: number): Promise<void> {
    const sql = `
      UPDATE community_posts
      SET comments_count = GREATEST(comments_count - 1, 0)
      WHERE post_id = ?
    `;

    await executeQuery(sql, [postId]);
  }

  /**
   * 댓글 알림 생성
   */
  private async createCommentNotification(
    commentId: number,
    postId: number,
    actorId: number,
    parentCommentId?: number
  ): Promise<void> {
    try {
      if (parentCommentId) {
        // 대댓글: 부모 댓글 작성자에게 알림
        const parentComment = await this.getCommentById(parentCommentId);
        if (parentComment && parentComment.user_id !== actorId) {
          await communityNotificationService.createNotification({
            userId: parentComment.user_id,
            actorId,
            postId,
            commentId,
            type: 'comment_reply',
          });
        }
      } else {
        // 일반 댓글: 게시물 작성자에게 알림
        const postAuthor = await this.getPostAuthorId(postId);
        if (postAuthor && postAuthor !== actorId) {
          await communityNotificationService.createNotification({
            userId: postAuthor,
            actorId,
            postId,
            commentId,
            type: 'post_comment',
          });
        }
      }
    } catch (error) {
      logger.error('Failed to create comment notification', error);
      // 알림 실패는 댓글 작성을 막지 않음
    }
  }

  /**
   * 게시물 작성자 ID 조회
   */
  private async getPostAuthorId(postId: number): Promise<number | null> {
    const sql = `
      SELECT user_id FROM community_posts
      WHERE post_id = ? AND is_deleted = FALSE
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [postId]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0].user_id;
  }

  /**
   * 삭제된 댓글 조회 (내부용)
   */
  private async getDeletedCommentById(commentId: number): Promise<any | null> {
    const sql = `
      SELECT * FROM community_comments WHERE comment_id = ?
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [commentId]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * 댓글 생성 DTO 검증
   */
  private validateCreateCommentDto(dto: CreateCommentDto): void {
    if (!dto.content || dto.content.trim().length === 0) {
      throw new ValidationException('Content is required');
    }
  }

  /**
   * 댓글 계층 구조 생성
   */
  private buildCommentTree(comments: CommunityComment[]): CommunityComment[] {
    const commentMap = new Map<number, CommunityComment>();
    const rootComments: CommunityComment[] = [];

    // 모든 댓글을 맵에 저장
    comments.forEach((comment) => {
      commentMap.set(comment.comment_id, { ...comment, replies: [] });
    });

    // 계층 구조 생성
    comments.forEach((comment) => {
      const commentNode = commentMap.get(comment.comment_id)!;

      if (comment.parent_comment_id) {
        // 대댓글: 부모 댓글의 replies에 추가
        const parentComment = commentMap.get(comment.parent_comment_id);
        if (parentComment) {
          parentComment.replies!.push(commentNode);
        }
      } else {
        // 최상위 댓글
        rootComments.push(commentNode);
      }
    });

    return rootComments;
  }

  /**
   * DB Row를 CommunityComment 객체로 매핑
   */
  private mapRowToComment(row: any): CommunityComment {
    return {
      comment_id: row.comment_id,
      post_id: row.post_id,
      user_id: row.user_id,
      parent_comment_id: row.parent_comment_id,
      content: row.content,
      likes_count: row.likes_count,
      is_deleted: Boolean(row.is_deleted),
      deleted_at: row.deleted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      author: {
        user_id: row.author_user_id,
        nickname: row.author_nickname,
        profile_image_url: row.author_profile_image_url,
      },
    };
  }
}

export default new CommunityCommentService();
