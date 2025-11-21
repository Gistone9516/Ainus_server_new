/**
 * 작업 기반 AI 모델 추천 서비스
 * 작업 카테고리 기반으로 사용자에게 최적의 모델을 추천합니다.
 */

import { executeQuery } from '../../database/mysql';
import { Logger } from '../../database/logger';
import { taskRepository } from '../repositories/taskRepository';
import {
  TaskRecommendationResult,
  RecommendedModel,
  RecommendationCriteria,
} from '@/types/task.types';

const logger = new Logger('TaskRecommendationService');

interface ModelScore {
  model_id: string;
  model_name: string;
  model_slug: string;
  creator_name: string;
  creator_slug: string;
  primary_score: number | null;
  secondary_score: number | null;
  weighted_score: number;
  overall_score?: number;
  price_input_1m?: number;
  price_output_1m?: number;
}

export class TaskRecommendationService {
  /**
   * 작업 카테고리 ID로 모델 추천
   */
  static async recommendByTaskCategoryId(
    taskCategoryId: number,
    limit: number = 3
  ): Promise<TaskRecommendationResult> {
    try {
      logger.info(
        `Recommending models for task_category_id: ${taskCategoryId}`
      );

      // 1. 작업 카테고리 정보 조회
      const category = await taskRepository.getCategoryById(taskCategoryId);
      if (!category) {
        throw new Error(`Task category not found: ${taskCategoryId}`);
      }

      // 2. 벤치마크 매핑 조회
      const mapping = await taskRepository.getBenchmarkMappingByTaskId(
        taskCategoryId
      );
      if (!mapping) {
        throw new Error(
          `Benchmark mapping not found for task category: ${taskCategoryId}`
        );
      }

      // 3. 모델 추천 계산
      const recommendations = await this.calculateRecommendations(
        mapping.primary_benchmark,
        mapping.secondary_benchmark,
        mapping.primary_weight,
        mapping.secondary_weight,
        limit
      );

      // 4. 응답 구성
      return {
        task_category: {
          task_category_id: category.task_category_id,
          category_code: category.category_code,
          category_name_ko: category.category_name_ko,
          category_name_en: category.category_name_en,
        },
        criteria: {
          primary_benchmark: mapping.primary_benchmark,
          secondary_benchmark: mapping.secondary_benchmark,
          weights: {
            primary: mapping.primary_weight,
            secondary: mapping.secondary_weight,
          },
        },
        recommended_models: recommendations,
      };
    } catch (error) {
      logger.error(
        `Failed to recommend models for task_category_id: ${taskCategoryId}`,
        error
      );
      throw error;
    }
  }

  /**
   * 작업 카테고리 코드로 모델 추천
   */
  static async recommendByTaskCategoryCode(
    categoryCode: string,
    limit: number = 3
  ): Promise<TaskRecommendationResult> {
    try {
      logger.info(`Recommending models for category_code: ${categoryCode}`);

      // 1. 작업 카테고리 정보 조회
      const category = await taskRepository.getCategoryByCode(categoryCode);
      if (!category) {
        throw new Error(`Task category not found: ${categoryCode}`);
      }

      // 2. ID로 추천 실행 (재사용)
      return await this.recommendByTaskCategoryId(
        category.task_category_id,
        limit
      );
    } catch (error) {
      logger.error(
        `Failed to recommend models for category_code: ${categoryCode}`,
        error
      );
      throw error;
    }
  }

  /**
   * 벤치마크 점수 기반 모델 추천 계산
   */
  private static async calculateRecommendations(
    primaryBenchmark: string,
    secondaryBenchmark: string,
    primaryWeight: number,
    secondaryWeight: number,
    limit: number
  ): Promise<RecommendedModel[]> {
    try {
      logger.info(
        `Calculating recommendations with benchmarks: ${primaryBenchmark}, ${secondaryBenchmark}`
      );

      // 복잡한 쿼리: 각 모델별로 primary, secondary 점수를 JOIN하여 가져옴
      // 추가로 종합 점수 및 가격 정보도 함께 조회
      const sql = `
        SELECT
          m.model_id,
          m.model_name,
          m.model_slug,
          mc.creator_name,
          mc.creator_slug,
          e1.normalized_score as primary_score,
          e2.normalized_score as secondary_score,
          mos.overall_score,
          mp.price_input_1m,
          mp.price_output_1m
        FROM ai_models m
        INNER JOIN model_creators mc ON m.creator_id = mc.creator_id
        LEFT JOIN model_evaluations e1 ON m.model_id = e1.model_id
          AND e1.benchmark_name = ?
        LEFT JOIN model_evaluations e2 ON m.model_id = e2.model_id
          AND e2.benchmark_name = ?
        LEFT JOIN (
          SELECT model_id, overall_score
          FROM model_overall_scores
          WHERE (model_id, version) IN (
            SELECT model_id, MAX(version)
            FROM model_overall_scores
            GROUP BY model_id
          )
        ) mos ON m.model_id = mos.model_id
        LEFT JOIN (
          SELECT model_id, price_input_1m, price_output_1m
          FROM model_pricing
          WHERE is_current = TRUE
        ) mp ON m.model_id = mp.model_id
        WHERE m.is_active = TRUE
        HAVING primary_score IS NOT NULL OR secondary_score IS NOT NULL
        ORDER BY m.model_id
      `;

      const rows = await executeQuery<ModelScore>(sql, [
        primaryBenchmark,
        secondaryBenchmark,
      ]);

      if (rows.length === 0) {
        logger.warn('No models found with the specified benchmarks');
        return [];
      }

      // 가중 점수 계산 및 정렬
      const scoredModels = rows
        .map((row) => {
          const primary = row.primary_score ?? 0;
          const secondary = row.secondary_score ?? 0;
          const weightedScore =
            primary * primaryWeight + secondary * secondaryWeight;

          return {
            ...row,
            primary_score: primary,
            secondary_score: secondary,
            weighted_score: parseFloat(weightedScore.toFixed(2)),
          };
        })
        .filter((model) => model.weighted_score > 0) // 0점인 모델 제외
        .sort((a, b) => b.weighted_score - a.weighted_score) // 내림차순 정렬
        .slice(0, limit); // 상위 N개

      // 응답 형식으로 변환
      const recommendations: RecommendedModel[] = scoredModels.map(
        (model, index) => {
          const primaryContribution = model.primary_score * primaryWeight;
          const secondaryContribution = model.secondary_score * secondaryWeight;

          const rec: RecommendedModel = {
            rank: index + 1,
            model_id: model.model_id,
            model_name: model.model_name,
            creator_name: model.creator_name,
            weighted_score: model.weighted_score,
            benchmark_scores: {
              primary: {
                name: primaryBenchmark,
                score: model.primary_score,
                weight: primaryWeight,
                contribution: parseFloat(primaryContribution.toFixed(2)),
              },
              secondary: {
                name: secondaryBenchmark,
                score: model.secondary_score,
                weight: secondaryWeight,
                contribution: parseFloat(secondaryContribution.toFixed(2)),
              },
            },
          };

          // 선택적 필드 추가
          if (model.overall_score !== null && model.overall_score !== undefined) {
            rec.overall_score = model.overall_score;
          }

          if (model.price_input_1m && model.price_output_1m) {
            rec.pricing = {
              input_price: model.price_input_1m,
              output_price: model.price_output_1m,
            };
          }

          return rec;
        }
      );

      logger.info(`Found ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      logger.error('Failed to calculate recommendations', error);
      throw error;
    }
  }

  /**
   * 모든 작업 카테고리 목록 조회
   */
  static async getAllTaskCategories() {
    try {
      const categories = await taskRepository.getAllCategories();
      logger.info(`Retrieved ${categories.length} task categories`);
      return categories;
    } catch (error) {
      logger.error('Failed to get all task categories', error);
      throw error;
    }
  }
}
