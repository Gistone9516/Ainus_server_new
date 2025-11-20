import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export interface OverallScore {
  model_id: string;
  overall_score: number;
  intelligence_index: number;
  coding_index: number;
  math_index: number;
  reasoning_index: number;
  language_index: number;
  calculated_at: string;
  version: number;
}

export class ScoreRepository {
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

    console.log('[ScoreRepository] MySQL 연결 성공');
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
      console.log('[ScoreRepository] MySQL 연결 종료');
    }
  }

  async saveOverallScore(score: OverallScore): Promise<void> {
    if (!this.connection) await this.connect();

    const [rows] = await this.connection!.execute(
      'SELECT MAX(version) as max_version FROM model_overall_scores WHERE model_id = ?',
      [score.model_id]
    );

    const maxVersion = (rows as any[])[0].max_version || 0;
    const newVersion = maxVersion + 1;

    const query = `
      INSERT INTO model_overall_scores 
        (model_id, overall_score, intelligence_index, coding_index, 
         math_index, reasoning_index, language_index, 
         calculated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.connection!.execute(query, [
      score.model_id,
      score.overall_score,
      score.intelligence_index,
      score.coding_index,
      score.math_index,
      score.reasoning_index,
      score.language_index,
      score.calculated_at,
      newVersion,
    ]);

    console.log(
      `[ScoreRepository] ${score.model_id} 점수 저장 완료 (버전: ${newVersion}, 점수: ${score.overall_score})`
    );
  }

  async saveMultipleScores(scores: OverallScore[]): Promise<void> {
    for (const score of scores) {
      await this.saveOverallScore(score);
    }
  }

  async getLatestScore(modelId: string): Promise<OverallScore | null> {
    if (!this.connection) await this.connect();

    const [rows] = await this.connection!.execute(
      `SELECT * FROM model_overall_scores 
       WHERE model_id = ? 
       ORDER BY version DESC 
       LIMIT 1`,
      [modelId]
    );

    const scores = rows as any[];
    return scores.length > 0 ? scores[0] : null;
  }

  /**
   * 전체 모델 순위 조회 (수정됨)
   */
  async getTopModels(limit: number = 10): Promise<any[]> {
    if (!this.connection) await this.connect();

    // LIMIT를 직접 쿼리에 포함 (prepared statement 파라미터 문제 회피)
    const query = `
      SELECT 
        m.model_id,
        m.model_name,
        mc.creator_name,
        s.overall_score,
        s.intelligence_index,
        s.coding_index,
        s.calculated_at
      FROM model_overall_scores s
      JOIN ai_models m ON s.model_id = m.model_id
      JOIN model_creators mc ON m.creator_id = mc.creator_id
      WHERE s.version = (
        SELECT MAX(version) 
        FROM model_overall_scores 
        WHERE model_id = s.model_id
      )
      AND m.is_active = TRUE
      ORDER BY s.overall_score DESC
      LIMIT ${parseInt(String(limit))}
    `;

    const [rows] = await this.connection!.query(query);
    return rows as any[];
  }

  async getScoreStats(): Promise<any> {
    if (!this.connection) await this.connect();

    const [rows] = await this.connection!.execute(`
      SELECT 
        COUNT(*) as total_models,
        AVG(overall_score) as avg_score,
        MAX(overall_score) as max_score,
        MIN(overall_score) as min_score
      FROM model_overall_scores
      WHERE version = (
        SELECT MAX(version) 
        FROM model_overall_scores s2 
        WHERE s2.model_id = model_overall_scores.model_id
      )
    `);

    return (rows as any[])[0];
  }

  async getScoreHistory(modelId: string): Promise<any[]> {
    if (!this.connection) await this.connect();

    const [rows] = await this.connection!.execute(
      `SELECT * FROM model_overall_scores 
       WHERE model_id = ? 
       ORDER BY version DESC`,
      [modelId]
    );

    return rows as any[];
  }
}