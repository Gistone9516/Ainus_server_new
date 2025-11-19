/**
 * 모델 제공사 서비스
 * model_creators 테이블 조회
 */

import { executeQuery } from '../../database/mysql';
import { Logger } from '../../database/logger';
import { ModelCreator, AiModel, PaginatedResponse } from '../../types';

const logger = new Logger('CreatorService');

export class CreatorService {
  /**
   * 제공사 목록 조회 (페이지네이션)
   */
  static async getCreators(
    page: number = 1,
    limit: number = 20,
    isActive: boolean = true
  ): Promise<PaginatedResponse<ModelCreator>> {
    try {
      const offset = (page - 1) * limit;

      // 전체 개수 조회
      const countSql = `
        SELECT COUNT(*) as total
        FROM model_creators
        WHERE is_active = ?
      `;
      const countResult = await executeQuery<{ total: number }>(countSql, [isActive]);
      const total = countResult[0]?.total || 0;

      // 제공사 목록 조회
      const sql = `
        SELECT *
        FROM model_creators
        WHERE is_active = ?
        ORDER BY creator_name ASC
        LIMIT ? OFFSET ?
      `;
      const creators = await executeQuery<ModelCreator>(sql, [isActive, limit, offset]);

      const totalPages = Math.ceil(total / limit);

      return {
        items: creators,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      logger.error('Failed to get creators', error);
      throw error;
    }
  }

  /**
   * 제공사 ID로 단일 제공사 조회
   */
  static async getCreatorById(creatorId: string): Promise<ModelCreator | null> {
    try {
      const sql = `
        SELECT *
        FROM model_creators
        WHERE creator_id = ?
      `;
      const result = await executeQuery<ModelCreator>(sql, [creatorId]);

      return result[0] || null;
    } catch (error) {
      logger.error(`Failed to get creator by ID: ${creatorId}`, error);
      throw error;
    }
  }

  /**
   * 제공사 슬러그로 단일 제공사 조회
   */
  static async getCreatorBySlug(creatorSlug: string): Promise<ModelCreator | null> {
    try {
      const sql = `
        SELECT *
        FROM model_creators
        WHERE creator_slug = ?
      `;
      const result = await executeQuery<ModelCreator>(sql, [creatorSlug]);

      return result[0] || null;
    } catch (error) {
      logger.error(`Failed to get creator by slug: ${creatorSlug}`, error);
      throw error;
    }
  }

  /**
   * 제공사의 모델 목록 조회
   */
  static async getCreatorModels(
    creatorId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<AiModel>> {
    try {
      const offset = (page - 1) * limit;

      // 전체 개수 조회
      const countSql = `
        SELECT COUNT(*) as total
        FROM ai_models
        WHERE creator_id = ? AND is_active = TRUE
      `;
      const countResult = await executeQuery<{ total: number }>(countSql, [creatorId]);
      const total = countResult[0]?.total || 0;

      // 모델 목록 조회
      const sql = `
        SELECT *
        FROM ai_models
        WHERE creator_id = ? AND is_active = TRUE
        ORDER BY release_date DESC
        LIMIT ? OFFSET ?
      `;
      const models = await executeQuery<AiModel>(sql, [creatorId, limit, offset]);

      const totalPages = Math.ceil(total / limit);

      return {
        items: models,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get models for creator: ${creatorId}`, error);
      throw error;
    }
  }
}
