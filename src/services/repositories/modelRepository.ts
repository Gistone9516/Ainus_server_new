import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface ModelCreator {
  creator_id: string;
  creator_name: string;
  creator_slug: string;
}

export interface ModelData {
  model_id: string;
  model_name: string;
  model_slug: string;
  creator_id: string;
  release_date: string;
  raw_data: any;
}

export interface ModelEvaluation {
  model_id: string;
  benchmark_name: string;
  score: number | null;
  normalized_score: number | null;
}

export interface ModelPricing {
  model_id: string;
  price_input_1m: number | null;
  price_output_1m: number | null;
  price_blended_3to1: number | null;
  effective_date: string;
}

export interface ModelPerformance {
  model_id: string;
  median_output_tokens_per_second: number | null;
  median_time_to_first_token: number | null;
  median_time_to_first_answer: number | null;
  measured_at: string;
}

export class ModelRepository {
  private connection: mysql.Connection | null = null;

  async connect(): Promise<void> {
    if (this.connection) return;

    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'ainus_user',
      password: process.env.DB_PASSWORD || 'qwer1234',
      database: process.env.DB_NAME || 'ai_model_app',
    });

    console.log('[ModelRepository] MySQL 연결 성공');
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('[ModelRepository] MySQL 연결 종료');
    }
  }

  /**
   * 모델 제공사 저장
   */
  async saveCreator(creator: ModelCreator): Promise<void> {
    if (!this.connection) await this.connect();

    const query = `
      INSERT INTO model_creators 
        (creator_id, creator_name, creator_slug)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        creator_name = VALUES(creator_name),
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.connection!.execute(query, [
      creator.creator_id,
      creator.creator_name,
      creator.creator_slug,
    ]);
  }

  /**
   * AI 모델 저장
   */
  async saveModel(model: ModelData): Promise<void> {
    if (!this.connection) await this.connect();

    const query = `
      INSERT INTO ai_models 
        (model_id, model_name, model_slug, creator_id, release_date, raw_data)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        model_name = VALUES(model_name),
        release_date = VALUES(release_date),
        raw_data = VALUES(raw_data),
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.connection!.execute(query, [
      model.model_id,
      model.model_name,
      model.model_slug,
      model.creator_id,
      model.release_date,
      JSON.stringify(model.raw_data),
    ]);
  }

  /**
   * 벤치마크 점수 저장
   */
  async saveEvaluations(evaluations: ModelEvaluation[]): Promise<void> {
    if (!this.connection) await this.connect();
    if (evaluations.length === 0) return;

    const query = `
      INSERT INTO model_evaluations 
        (model_id, benchmark_name, score, normalized_score, measured_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        score = VALUES(score),
        normalized_score = VALUES(normalized_score),
        updated_at = CURRENT_TIMESTAMP
    `;

    for (const evaluation of evaluations) {
      await this.connection!.execute(query, [
        evaluation.model_id,
        evaluation.benchmark_name,
        evaluation.score,
        evaluation.normalized_score,
      ]);
    }
  }

  /**
   * 가격 정보 저장
   */
  async savePricing(pricing: ModelPricing): Promise<void> {
    if (!this.connection) await this.connect();

    // 기존 가격을 is_current = FALSE로 업데이트
    await this.connection!.execute(
      'UPDATE model_pricing SET is_current = FALSE WHERE model_id = ?',
      [pricing.model_id]
    );

    // 새 가격 추가
    const query = `
      INSERT INTO model_pricing 
        (model_id, price_input_1m, price_output_1m, price_blended_3to1, 
         effective_date, is_current)
      VALUES (?, ?, ?, ?, ?, TRUE)
    `;

    await this.connection!.execute(query, [
      pricing.model_id,
      pricing.price_input_1m,
      pricing.price_output_1m,
      pricing.price_blended_3to1,
      pricing.effective_date,
    ]);
  }

  /**
   * 성능 지표 저장
   */
  async savePerformance(performance: ModelPerformance): Promise<void> {
    if (!this.connection) await this.connect();

    const query = `
      INSERT INTO model_performance 
        (model_id, median_output_tokens_per_second, 
         median_time_to_first_token, median_time_to_first_answer, 
         measured_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await this.connection!.execute(query, [
      performance.model_id,
      performance.median_output_tokens_per_second,
      performance.median_time_to_first_token,
      performance.median_time_to_first_answer,
      performance.measured_at,
    ]);
  }

  /**
   * 모델 ID 목록 조회
   */
  async getAllModelIds(): Promise<string[]> {
    if (!this.connection) await this.connect();

    const [rows] = await this.connection!.execute(
      'SELECT model_id FROM ai_models WHERE is_active = TRUE'
    );

    return (rows as any[]).map(row => row.model_id);
  }

  /**
   * 모델 정보 조회
   */
  async getModelById(modelId: string): Promise<any> {
    if (!this.connection) await this.connect();

    const [rows] = await this.connection!.execute(
      'SELECT * FROM ai_models WHERE model_id = ?',
      [modelId]
    );

    const models = rows as any[];
    return models.length > 0 ? models[0] : null;
  }

  /**
   * 통계 조회
   */
  async getStats(): Promise<any> {
    if (!this.connection) await this.connect();

    const [creatorCount] = await this.connection!.execute(
      'SELECT COUNT(*) as count FROM model_creators'
    );

    const [modelCount] = await this.connection!.execute(
      'SELECT COUNT(*) as count FROM ai_models WHERE is_active = TRUE'
    );

    const [evaluationCount] = await this.connection!.execute(
      'SELECT COUNT(*) as count FROM model_evaluations'
    );

    return {
      creators: (creatorCount as any[])[0].count,
      models: (modelCount as any[])[0].count,
      evaluations: (evaluationCount as any[])[0].count,
    };
  }
}