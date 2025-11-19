/**
 * 커뮤니티 좋아요 서비스
 */

import { executeQuery } from '@/database/mysql';
import { Logger } from '@/database/logger';
import { LikeToggleResult } from '@/types/community';
import { ValidationException } from '@/exceptions/AgentException';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const logger = new Logger('CommunityLikeService');

export class CommunityLikeService {
  /**
   * 게시물 좋아요 토글
   */
  async togglePostLike(postId: number, userId: number): Promise<LikeToggleResult> {
    try {
      // 게시물 존재 확인
      await this.checkPostExists(postId);

      // 현재 좋아요 상태 확인
      const isLiked = await this.checkPostLiked(postId, userId);

      if (isLiked) {
        // 좋아요 취소
        await this.unlikePost(postId, userId);
        await this.decrementPostLikeCount(postId);
      } else {
        // 좋아요 추가
        await this.likePost(postId, userId);
        await this.incrementPostLikeCount(postId);
      }

      // 업데이트된 좋아요 수 조회
      const likesCount = await this.getPostLikesCount(postId);

      logger.info(`Post ${postId} ${isLiked ? 'unliked' : 'liked'} by user ${userId}`);

      return {
        liked: !isLiked,
        likes_count: likesCount,
      };
    } catch (error) {
      logger.error('Failed to toggle post like', error);
      throw error;
    }
  }

  /**
   * 게시물 좋아요 추가
   */
  private async likePost(postId: number, userId: number): Promise<void> {
    const sql = `
      INSERT INTO community_post_likes (post_id, user_id)
      VALUES (?, ?)
    `;

    await executeQuery(sql, [postId, userId]);
  }

  /**
   * 게시물 좋아요 취소
   */
  private async unlikePost(postId: number, userId: number): Promise<void> {
    const sql = `
      DELETE FROM community_post_likes
      WHERE post_id = ? AND user_id = ?
    `;

    await executeQuery(sql, [postId, userId]);
  }

  /**
   * 게시물 좋아요 여부 확인
   */
  private async checkPostLiked(postId: number, userId: number): Promise<boolean> {
    const sql = `
      SELECT 1 FROM community_post_likes
      WHERE post_id = ? AND user_id = ?
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [postId, userId]);

    return rows.length > 0;
  }

  /**
   * 게시물 좋아요 수 증가
   */
  private async incrementPostLikeCount(postId: number): Promise<void> {
    const sql = `
      UPDATE community_posts
      SET likes_count = likes_count + 1
      WHERE post_id = ?
    `;

    await executeQuery(sql, [postId]);
  }

  /**
   * 게시물 좋아요 수 감소
   */
  private async decrementPostLikeCount(postId: number): Promise<void> {
    const sql = `
      UPDATE community_posts
      SET likes_count = GREATEST(likes_count - 1, 0)
      WHERE post_id = ?
    `;

    await executeQuery(sql, [postId]);
  }

  /**
   * 게시물 좋아요 수 조회
   */
  private async getPostLikesCount(postId: number): Promise<number> {
    const sql = `
      SELECT likes_count FROM community_posts
      WHERE post_id = ?
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [postId]);

    if (rows.length === 0) {
      return 0;
    }

    return rows[0].likes_count;
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
}

export default new CommunityLikeService();
