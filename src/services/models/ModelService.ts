/**
 * AI 모델 정보 서비스
 * ai_models, model_evaluations, model_overall_scores, model_pricing, model_performance 테이블 조회
 */

import { executeQuery } from '../../database/mysql';
import { Logger } from '../../database/logger';
import {
  AiModel,
  ModelEvaluation,
  ModelOverallScore,
  ModelPricing,
  ModelPerformance,
  PaginatedResponse,
} from '../../types';

const logger = new Logger('ModelService');

export class ModelService {
  /**
   * 모델 목록 조회 (페이지네이션)
   */
  static async getModels(
    page: number = 1,
    limit: number = 10,
    isActive: boolean = true
  ): Promise<PaginatedResponse<AiModel>> {
    try {
      const offset = (page - 1) * limit;

      // 전체 개수 조회
      const countSql = `
        SELECT COUNT(*) as total
        FROM ai_models
        WHERE is_active = ?
      `;
      const countResult = await executeQuery<{ total: number }>(countSql, [isActive]);
      const total = countResult[0]?.total || 0;

      // 모델 목록 조회
      const sql = `
        SELECT
          am.*,
          mc.creator_name,
          mc.creator_slug
        FROM ai_models am
        INNER JOIN model_creators mc ON am.creator_id = mc.creator_id
        WHERE am.is_active = ?
        ORDER BY am.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const models = await executeQuery<AiModel>(sql, [isActive, limit, offset]);

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
      logger.error('Failed to get models', error);
      throw error;
    }
  }

  /**
   * 모델 ID로 단일 모델 조회
   */
  static async getModelById(modelId: string): Promise<AiModel | null> {
    try {
      const sql = `
        SELECT
          am.*,
          mc.creator_name,
          mc.creator_slug,
          mc.website_url,
          mc.country
        FROM ai_models am
        INNER JOIN model_creators mc ON am.creator_id = mc.creator_id
        WHERE am.model_id = ?
      `;
      const result = await executeQuery<AiModel>(sql, [modelId]);

      return result[0] || null;
    } catch (error) {
      logger.error(`Failed to get model by ID: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 모델 슬러그로 단일 모델 조회
   */
  static async getModelBySlug(modelSlug: string): Promise<AiModel | null> {
    try {
      const sql = `
        SELECT
          am.*,
          mc.creator_name,
          mc.creator_slug
        FROM ai_models am
        INNER JOIN model_creators mc ON am.creator_id = mc.creator_id
        WHERE am.model_slug = ?
      `;
      const result = await executeQuery<AiModel>(sql, [modelSlug]);

      return result[0] || null;
    } catch (error) {
      logger.error(`Failed to get model by slug: ${modelSlug}`, error);
      throw error;
    }
  }

  /**
   * 모델의 벤치마크 평가 조회
   */
  static async getModelEvaluations(modelId: string): Promise<ModelEvaluation[]> {
    try {
      const sql = `
        SELECT *
        FROM model_evaluations
        WHERE model_id = ?
        ORDER BY benchmark_name ASC
      `;
      const evaluations = await executeQuery<ModelEvaluation>(sql, [modelId]);

      return evaluations;
    } catch (error) {
      logger.error(`Failed to get model evaluations for model: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 모델의 종합 점수 조회 (최신 버전 또는 특정 버전)
   */
  static async getModelOverallScores(
    modelId: string,
    version?: number
  ): Promise<ModelOverallScore[]> {
    try {
      let sql: string;
      let params: any[];

      if (version !== undefined) {
        // 특정 버전 조회
        sql = `
          SELECT *
          FROM model_overall_scores
          WHERE model_id = ? AND version = ?
        `;
        params = [modelId, version];
      } else {
        // 모든 버전 조회 (최신순)
        sql = `
          SELECT *
          FROM model_overall_scores
          WHERE model_id = ?
          ORDER BY calculated_at DESC
        `;
        params = [modelId];
      }

      const scores = await executeQuery<ModelOverallScore>(sql, params);

      return scores;
    } catch (error) {
      logger.error(`Failed to get model overall scores for model: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 모델의 가격 정보 조회 (현재 가격 또는 전체 이력)
   */
  static async getModelPricing(
    modelId: string,
    currentOnly: boolean = true
  ): Promise<ModelPricing[]> {
    try {
      let sql: string;

      if (currentOnly) {
        sql = `
          SELECT *
          FROM model_pricing
          WHERE model_id = ? AND is_current = TRUE
          ORDER BY effective_date DESC
        `;
      } else {
        sql = `
          SELECT *
          FROM model_pricing
          WHERE model_id = ?
          ORDER BY effective_date DESC
        `;
      }

      const pricing = await executeQuery<ModelPricing>(sql, [modelId]);

      return pricing;
    } catch (error) {
      logger.error(`Failed to get model pricing for model: ${modelId}`, error);
      throw error;
    }
  }

  /**
   * 모델의 성능 지표 조회 (최신 또는 전체 이력)
   */
  static async getModelPerformance(
    modelId: string,
    latest: boolean = true
  ): Promise<ModelPerformance[]> {
    try {
      let sql: string;

      if (latest) {
        sql = `
          SELECT *
          FROM model_performance
          WHERE model_id = ?
          ORDER BY measured_at DESC
          LIMIT 1
        `;
      } else {
        sql = `
          SELECT *
          FROM model_performance
          WHERE model_id = ?
          ORDER BY measured_at DESC
        `;
      }

      const performance = await executeQuery<ModelPerformance>(sql, [modelId]);

      return performance;
    } catch (error) {
      logger.error(`Failed to get model performance for model: ${modelId}`, error);
      throw error;
    }
  }
}
