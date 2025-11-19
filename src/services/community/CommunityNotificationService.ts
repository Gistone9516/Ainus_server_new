/**
 * 커뮤니티 알림 서비스
 */

import { executeQuery } from '@/database/mysql';
import { Logger } from '@/database/logger';
import {
  CommunityNotification,
  NotificationListQuery,
  PaginatedResult,
  NotificationType,
} from '@/types/community';
import { ValidationException } from '@/exceptions/AgentException';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const logger = new Logger('CommunityNotificationService');

interface CreateNotificationDto {
  userId: number;
  actorId: number;
  postId?: number;
  commentId?: number;
  type: NotificationType;
}

export class CommunityNotificationService {
  /**
   * 알림 생성
   */
  async createNotification(dto: CreateNotificationDto): Promise<void> {
    try {
      // 알림 내용 생성
      const content = await this.generateNotificationContent(dto);

      const sql = `
        INSERT INTO community_notifications
        (user_id, actor_id, post_id, comment_id, notification_type, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await executeQuery(sql, [
        dto.userId,
        dto.actorId,
        dto.postId || null,
        dto.commentId || null,
        dto.type,
        content,
      ]);

      logger.info(`Notification created for user ${dto.userId}`);
    } catch (error) {
      logger.error('Failed to create notification', error);
      throw error;
    }
  }

  /**
   * 알림 목록 조회
   */
  async getNotifications(
    userId: number,
    query: NotificationListQuery
  ): Promise<PaginatedResult<CommunityNotification>> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      // WHERE 조건
      let whereClause = 'WHERE n.user_id = ?';
      const params: any[] = [userId];

      if (query.unread_only) {
        whereClause += ' AND n.is_read = FALSE';
      }

      // 전체 개수 조회
      const countSql = `
        SELECT COUNT(*) as total
        FROM community_notifications n
        ${whereClause}
      `;
      const countResult = await executeQuery<RowDataPacket[]>(countSql, params);
      const total = countResult[0].total;

      // 알림 목록 조회
      const sql = `
        SELECT
          n.*,
          u.user_id as actor_user_id,
          u.nickname as actor_nickname,
          u.profile_image_url as actor_profile_image_url
        FROM community_notifications n
        LEFT JOIN users u ON n.actor_id = u.user_id
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql, [...params, limit, offset]);

      const items = rows.map((row) => this.mapRowToNotification(row));

      return {
        items,
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Failed to get notifications', error);
      throw error;
    }
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      // 알림이 해당 사용자의 것인지 확인
      await this.checkNotificationOwnership(notificationId, userId);

      const sql = `
        UPDATE community_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE notification_id = ?
      `;

      await executeQuery(sql, [notificationId]);

      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: number): Promise<void> {
    try {
      const sql = `
        UPDATE community_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = ? AND is_read = FALSE
      `;

      await executeQuery(sql, [userId]);

      logger.info(`All notifications marked as read for user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      throw error;
    }
  }

  /**
   * 읽지 않은 알림 개수 조회
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const sql = `
        SELECT COUNT(*) as count
        FROM community_notifications
        WHERE user_id = ? AND is_read = FALSE
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql, [userId]);

      return rows[0].count;
    } catch (error) {
      logger.error('Failed to get unread count', error);
      throw error;
    }
  }

  /**
   * 알림 소유자 확인
   */
  private async checkNotificationOwnership(notificationId: number, userId: number): Promise<void> {
    const sql = `
      SELECT user_id FROM community_notifications
      WHERE notification_id = ?
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [notificationId]);

    if (rows.length === 0) {
      throw new ValidationException('Notification not found');
    }

    if (rows[0].user_id !== userId) {
      throw new ValidationException('This notification does not belong to you');
    }
  }

  /**
   * 알림 내용 생성
   */
  private async generateNotificationContent(dto: CreateNotificationDto): Promise<string> {
    // 행위자 닉네임 조회
    const actorNickname = await this.getUserNickname(dto.actorId);

    switch (dto.type) {
      case 'post_comment':
        return `${actorNickname}님이 회원님의 게시물에 댓글을 남겼습니다.`;
      case 'comment_reply':
        return `${actorNickname}님이 회원님의 댓글에 답글을 남겼습니다.`;
      default:
        return '새로운 알림이 있습니다.';
    }
  }

  /**
   * 사용자 닉네임 조회
   */
  private async getUserNickname(userId: number): Promise<string> {
    const sql = `
      SELECT nickname FROM users WHERE user_id = ?
    `;

    const rows = await executeQuery<RowDataPacket[]>(sql, [userId]);

    if (rows.length === 0) {
      return '알 수 없음';
    }

    return rows[0].nickname;
  }

  /**
   * DB Row를 CommunityNotification 객체로 매핑
   */
  private mapRowToNotification(row: any): CommunityNotification {
    return {
      notification_id: row.notification_id,
      user_id: row.user_id,
      actor_id: row.actor_id,
      post_id: row.post_id,
      comment_id: row.comment_id,
      notification_type: row.notification_type,
      content: row.content,
      is_read: Boolean(row.is_read),
      read_at: row.read_at,
      created_at: row.created_at,
      actor: row.actor_user_id
        ? {
            user_id: row.actor_user_id,
            nickname: row.actor_nickname,
            profile_image_url: row.actor_profile_image_url,
          }
        : undefined,
    };
  }
}

export default new CommunityNotificationService();
