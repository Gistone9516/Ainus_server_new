/**
 * 모델 업데이트 서비스
 * model_updates, model_updates_details 테이블 조회
 */

import { executeQuery } from '../../database/mysql';
import { Logger } from '../../database/logger';
import { ModelUpdate, ModelUpdateDetail, PaginatedResponse } from '../../types';

const logger = new Logger('UpdateService');

// 업데이트 + 상세 정보 조합 타입
export interface ModelUpdateWithDetails extends ModelUpdate {
  details: ModelUpdateDetail[];
}

export class UpdateService {
  /**
   * 모델의 업데이트 이력 조회 (페이지네이션)
   */
  static async getModelUpdates(
    modelId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<ModelUpdate>> {
    try {
      const offset = (page - 1) * limit;

      // 전체 개수 조회
      const countSql = `
        SELECT COUNT(*) as total
        FROM model_updates
        WHERE model_id = ?
      `;
      const countResult = await executeQuery<{ total: number }>(countSql, [modelId]);
      const total = countResult[0]?.total || 0;

      // 업데이트 목록 조회 (최신순)
      const sql = `
        SELECT *
        FROM model_updates
        WHERE model_id = ?
        ORDER BY update_date DESC
        LIMIT ? OFFSET ?
      `;
      const updates = await executeQuery<ModelUpdate>(sql, [modelId, limit, offset]);

      const totalPages = Math.ceil(total / limit);

      return {
        items: updates,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (error) {
      logger.error(`Failed to get model updates for model: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 특정 업데이트 조회 (상세 정보 포함)
   */
  static async getUpdateById(updateId: number): Promise<ModelUpdateWithDetails | null> {
    try {
      // 업데이트 기본 정보 조회 (JOIN으로 model_name, model_slug 포함)
      const updateSql = `
        SELECT
          mu.*,
          am.model_name,
          am.model_slug
        FROM model_updates mu
        INNER JOIN ai_models am ON mu.model_id = am.model_id
        WHERE mu.update_id = ?
      `;
      const updateResult = await executeQuery<ModelUpdate & { model_name?: string; model_slug?: string }>(updateSql, [updateId]);

      if (updateResult.length === 0) {
        return null;
      }

      const update = updateResult[0];

      // 업데이트 상세 정보 조회 (벤치마크별 before/after)
      const detailsSql = `
        SELECT *
        FROM model_updates_details
        WHERE update_id = ?
        ORDER BY benchmark_name ASC
      `;
      const details = await executeQuery<ModelUpdateDetail>(detailsSql, [updateId]);

      return {
        ...update,
        details,
      };
    } catch (error) {
      logger.error(`Failed to get update by ID: ${updateId}`, error);
      throw error;
    }
  }

  /**
   * 업데이트 상세 정보만 조회 (벤치마크 성능 비교)
   */
  static async getUpdateDetails(updateId: number): Promise<ModelUpdateDetail[]> {
    try {
      const sql = `
        SELECT *
        FROM model_updates_details
        WHERE update_id = ?
        ORDER BY benchmark_name ASC
      `;
      const details = await executeQuery<ModelUpdateDetail>(sql, [updateId]);

      return details;
    } catch (error) {
      logger.error(`Failed to get update details for update: ${updateId}`, error);
      throw error;
    }
  }

  /**
   * 모델의 최신 업데이트 조회
   */
  static async getLatestUpdate(modelId: string): Promise<ModelUpdate | null> {
    try {
      const sql = `
        SELECT *
        FROM model_updates
        WHERE model_id = ?
        ORDER BY update_date DESC
        LIMIT 1
      `;
      const result = await executeQuery<ModelUpdate>(sql, [modelId]);

      return result[0] || null;
    } catch (error) {
      logger.error(`Failed to get latest update for model: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 모델의 업데이트 개수 조회
   */
  static async getUpdateCount(modelId: string): Promise<number> {
    try {
      const sql = `
        SELECT COUNT(*) as total
        FROM model_updates
        WHERE model_id = ?
      `;
      const result = await executeQuery<{ total: number }>(sql, [modelId]);

      return result[0]?.total || 0;
    } catch (error) {
      logger.error(`Failed to get update count for model: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 모델의 N번째 업데이트 조회 (0 = 최신, 1 = 그 이전, ...)
   */
  static async getUpdateByOffset(
    modelId: string,
    offset: number
  ): Promise<ModelUpdateWithDetails | null> {
    try {
      // N번째 업데이트 조회
      const updateSql = `
        SELECT *
        FROM model_updates
        WHERE model_id = ?
        ORDER BY update_date DESC
        LIMIT 1 OFFSET ?
      `;
      const updateResult = await executeQuery<ModelUpdate>(updateSql, [modelId, offset]);

      if (updateResult.length === 0) {
        return null;
      }

      const update = updateResult[0];

      // 상세 정보 조회
      const detailsSql = `
        SELECT *
        FROM model_updates_details
        WHERE update_id = ?
        ORDER BY benchmark_name ASC
      `;
      const details = await executeQuery<ModelUpdateDetail>(detailsSql, [update.update_id]);

      return {
        ...update,
        details,
      };
    } catch (error) {
      logger.error(
        `Failed to get update by offset for model: ${modelId}, offset: ${offset}`,
        error
      );
      throw error;
    }
  }
}
