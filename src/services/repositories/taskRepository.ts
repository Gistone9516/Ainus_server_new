/**
 * 작업 카테고리 Repository
 *
 * task_categories 및 task_benchmark_mapping 테이블에 대한 CRUD 작업
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  TaskCategory,
  TaskBenchmarkMapping,
} from '@/types/task.types';

dotenv.config();

export class TaskRepository {
  private connection: mysql.Connection | null = null;

  /**
   * MySQL 연결
   */
  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'ainus_user',
      password: process.env.DB_PASSWORD || 'qwer1234',
      database: process.env.DB_NAME || 'ai_model_app',
    });

    console.log('[TaskRepository] MySQL 연결 성공');
  }

  /**
   * MySQL 연결 종료
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('[TaskRepository] MySQL 연결 종료');
    }
  }

  // ============ 작업 카테고리 조회 ============

  /**
   * 모든 작업 카테고리 조회 (활성화된 것만)
   */
  async getAllCategories(includeInactive: boolean = false): Promise<TaskCategory[]> {
    if (!this.connection) await this.connect();

    const query = includeInactive
      ? 'SELECT * FROM task_categories ORDER BY task_category_id'
      : 'SELECT * FROM task_categories WHERE is_active = true ORDER BY task_category_id';

    const [rows] = await this.connection!.execute(query);

    return rows as TaskCategory[];
  }

  /**
   * 카테고리 코드로 작업 카테고리 조회
   */
  async getCategoryByCode(categoryCode: string): Promise<TaskCategory | null> {
    if (!this.connection) await this.connect();

    const query = `
      SELECT * FROM task_categories
      WHERE category_code = ? AND is_active = true
      LIMIT 1
    `;

    const [rows] = await this.connection!.execute(query, [categoryCode]);
    const categories = rows as TaskCategory[];

    return categories.length > 0 ? categories[0] : null;
  }

  /**
   * 카테고리 ID로 작업 카테고리 조회
   */
  async getCategoryById(taskCategoryId: number): Promise<TaskCategory | null> {
    if (!this.connection) await this.connect();

    const query = `
      SELECT * FROM task_categories
      WHERE task_category_id = ? AND is_active = true
      LIMIT 1
    `;

    const [rows] = await this.connection!.execute(query, [taskCategoryId]);
    const categories = rows as TaskCategory[];

    return categories.length > 0 ? categories[0] : null;
  }

  // ============ 벤치마크 매핑 조회 ============

  /**
   * 작업 카테고리 ID로 벤치마크 매핑 조회
   */
  async getBenchmarkMappingByTaskId(
    taskCategoryId: number
  ): Promise<TaskBenchmarkMapping | null> {
    if (!this.connection) await this.connect();

    const query = `
      SELECT * FROM task_benchmark_mapping
      WHERE task_category_id = ?
      LIMIT 1
    `;

    const [rows] = await this.connection!.execute(query, [taskCategoryId]);
    const mappings = rows as TaskBenchmarkMapping[];

    return mappings.length > 0 ? mappings[0] : null;
  }

  /**
   * 카테고리 코드로 벤치마크 매핑 조회
   */
  async getBenchmarkMappingByCode(
    categoryCode: string
  ): Promise<TaskBenchmarkMapping | null> {
    if (!this.connection) await this.connect();

    const query = `
      SELECT tbm.*
      FROM task_benchmark_mapping tbm
      INNER JOIN task_categories tc ON tc.task_category_id = tbm.task_category_id
      WHERE tc.category_code = ? AND tc.is_active = true
      LIMIT 1
    `;

    const [rows] = await this.connection!.execute(query, [categoryCode]);
    const mappings = rows as TaskBenchmarkMapping[];

    return mappings.length > 0 ? mappings[0] : null;
  }

  /**
   * 모든 벤치마크 매핑 조회
   */
  async getAllBenchmarkMappings(): Promise<TaskBenchmarkMapping[]> {
    if (!this.connection) await this.connect();

    const query = `
      SELECT tbm.*
      FROM task_benchmark_mapping tbm
      INNER JOIN task_categories tc ON tc.task_category_id = tbm.task_category_id
      WHERE tc.is_active = true
      ORDER BY tbm.task_category_id
    `;

    const [rows] = await this.connection!.execute(query);

    return rows as TaskBenchmarkMapping[];
  }

  // ============ 카테고리 + 매핑 조인 조회 ============

  /**
   * 카테고리와 벤치마크 매핑을 함께 조회
   */
  async getCategoryWithMapping(
    categoryCode: string
  ): Promise<{
    category: TaskCategory;
    mapping: TaskBenchmarkMapping;
  } | null> {
    const category = await this.getCategoryByCode(categoryCode);
    if (!category) return null;

    const mapping = await this.getBenchmarkMappingByTaskId(
      category.task_category_id
    );
    if (!mapping) return null;

    return { category, mapping };
  }

  // ============ 통계 ============

  /**
   * 작업 카테고리 통계
   */
  async getStats(): Promise<{
    total_categories: number;
    active_categories: number;
    inactive_categories: number;
  }> {
    if (!this.connection) await this.connect();

    const query = `
      SELECT
        COUNT(*) as total_categories,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_categories,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_categories
      FROM task_categories
    `;

    const [rows] = await this.connection!.execute(query);
    const stats = rows as any[];

    return stats[0];
  }
}

// 싱글톤 인스턴스
export const taskRepository = new TaskRepository();
