/**
 * AI 모델 추천 서비스
 * 직업 카테고리 기반으로 사용자에게 최적의 모델을 추천합니다.
 */

import { executeQuery } from '../../database/mysql';
import { Logger } from '../../database/logger';
import { getBenchmarkMapping } from '../../config/job-benchmark-mapping';
import { ModelRecommendation, RecommendationResponse, JobCategory } from '../../types';

const logger = new Logger('RecommendationService');

interface ModelScore {
  model_id: string;
  model_name: string;
  model_slug: string;
  creator_name: string;
  creator_slug: string;
  primary_score: number | null;
  secondary_score: number | null;
  weighted_score: number;
}

export class RecommendationService {
  /**
   * 직업 카테고리 ID로 모델 추천
   */
  static async recommendByJobCategoryId(
    jobCategoryId: number,
    limit: number = 3
  ): Promise<RecommendationResponse> {
    try {
      logger.info(`Recommending models for job_category_id: ${jobCategoryId}`);

      // 1. 직업 카테고리 정보 조회
      const categoryInfo = await this.getJobCategoryById(jobCategoryId);
      if (!categoryInfo) {
        throw new Error(`Job category not found: ${jobCategoryId}`);
      }

      // 2. 카테고리 코드로 벤치마크 매핑 조회
      const mapping = getBenchmarkMapping(categoryInfo.category_code);
      if (!mapping) {
        throw new Error(`Benchmark mapping not found for category: ${categoryInfo.category_code}`);
      }

      // 3. 모델 추천 계산
      const recommendations = await this.calculateRecommendations(
        mapping.primary.benchmark,
        mapping.secondary.benchmark,
        mapping.primary.weight,
        mapping.secondary.weight,
        limit
      );

      // 4. 응답 구성
      return {
        job_category: {
          job_category_id: categoryInfo.job_category_id,
          job_name: categoryInfo.job_name,
          category_code: categoryInfo.category_code,
        },
        criteria: {
          primary_benchmark: mapping.primary.benchmark,
          secondary_benchmark: mapping.secondary.benchmark,
          weights: {
            primary: mapping.primary.weight,
            secondary: mapping.secondary.weight,
          },
        },
        recommended_models: recommendations,
      };
    } catch (error) {
      logger.error(`Failed to recommend models for job_category_id: ${jobCategoryId}`, error);
      throw error;
    }
  }

  /**
   * 직업 카테고리 코드로 모델 추천
   */
  static async recommendByJobCategoryCode(
    categoryCode: string,
    limit: number = 3
  ): Promise<RecommendationResponse> {
    try {
      logger.info(`Recommending models for category_code: ${categoryCode}`);

      // 1. 직업 카테고리 정보 조회
      const categoryInfo = await this.getJobCategoryByCode(categoryCode);
      if (!categoryInfo) {
        throw new Error(`Job category not found: ${categoryCode}`);
      }

      // 2. ID로 추천 실행 (재사용)
      return await this.recommendByJobCategoryId(categoryInfo.job_category_id, limit);
    } catch (error) {
      logger.error(`Failed to recommend models for category_code: ${categoryCode}`, error);
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
  ): Promise<ModelRecommendation[]> {
    try {
      logger.info(`Calculating recommendations with benchmarks: ${primaryBenchmark}, ${secondaryBenchmark}`);

      // 복잡한 쿼리: 각 모델별로 primary, secondary 점수를 JOIN하여 가져옴
      const sql = `
        SELECT
          m.model_id,
          m.model_name,
          m.model_slug,
          mc.creator_name,
          mc.creator_slug,
          e1.normalized_score as primary_score,
          e2.normalized_score as secondary_score
        FROM ai_models m
        INNER JOIN model_creators mc ON m.creator_id = mc.creator_id
        LEFT JOIN model_evaluations e1 ON m.model_id = e1.model_id
          AND e1.benchmark_name = ?
        LEFT JOIN model_evaluations e2 ON m.model_id = e2.model_id
          AND e2.benchmark_name = ?
        WHERE m.is_active = TRUE
        HAVING primary_score IS NOT NULL OR secondary_score IS NOT NULL
        ORDER BY m.model_id
      `;

      const rows = await executeQuery<ModelScore>(sql, [primaryBenchmark, secondaryBenchmark]);

      if (rows.length === 0) {
        logger.warn('No models found with the specified benchmarks');
        return [];
      }

      // 가중 점수 계산 및 정렬
      const scoredModels = rows
        .map(row => {
          const primary = row.primary_score ?? 0;
          const secondary = row.secondary_score ?? 0;
          const weightedScore = (primary * primaryWeight) + (secondary * secondaryWeight);

          return {
            ...row,
            primary_score: primary,
            secondary_score: secondary,
            weighted_score: parseFloat(weightedScore.toFixed(2)),
          };
        })
        .filter(model => model.weighted_score > 0)  // 0점인 모델 제외
        .sort((a, b) => b.weighted_score - a.weighted_score)  // 내림차순 정렬
        .slice(0, limit);  // 상위 N개

      // 응답 형식으로 변환
      const recommendations: ModelRecommendation[] = scoredModels.map((model, index) => ({
        rank: index + 1,
        model_id: model.model_id,
        model_name: model.model_name,
        model_slug: model.model_slug,
        creator_name: model.creator_name,
        creator_slug: model.creator_slug,
        weighted_score: model.weighted_score,
        benchmark_scores: {
          primary: {
            name: primaryBenchmark,
            score: model.primary_score,
            weight: primaryWeight,
          },
          secondary: {
            name: secondaryBenchmark,
            score: model.secondary_score,
            weight: secondaryWeight,
          },
        },
      }));

      logger.info(`Found ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      logger.error('Failed to calculate recommendations', error);
      throw error;
    }
  }

  /**
   * 직업 카테고리 ID로 카테고리 정보 조회
   */
  private static async getJobCategoryById(jobCategoryId: number): Promise<JobCategory | null> {
    try {
      const sql = `
        SELECT job_category_id, job_name, category_code, description
        FROM job_categories
        WHERE job_category_id = ?
      `;
      const result = await executeQuery<JobCategory>(sql, [jobCategoryId]);
      return result[0] || null;
    } catch (error) {
      logger.error(`Failed to get job category by ID: ${jobCategoryId}`, error);
      throw error;
    }
  }

  /**
   * 직업 카테고리 코드로 카테고리 정보 조회
   */
  private static async getJobCategoryByCode(categoryCode: string): Promise<JobCategory | null> {
    try {
      const sql = `
        SELECT job_category_id, job_name, category_code, description
        FROM job_categories
        WHERE category_code = ?
      `;
      const result = await executeQuery<JobCategory>(sql, [categoryCode]);
      return result[0] || null;
    } catch (error) {
      logger.error(`Failed to get job category by code: ${categoryCode}`, error);
      throw error;
    }
  }

  /**
   * 모든 직업 카테고리 목록 조회
   */
  static async getAllJobCategories(): Promise<JobCategory[]> {
    try {
      const sql = `
        SELECT job_category_id, job_name, category_code, description, created_at
        FROM job_categories
        ORDER BY job_category_id ASC
      `;
      const categories = await executeQuery<JobCategory>(sql);
      logger.info(`Retrieved ${categories.length} job categories`);
      return categories;
    } catch (error) {
      logger.error('Failed to get all job categories', error);
      throw error;
    }
  }
}
