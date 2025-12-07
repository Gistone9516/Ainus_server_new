import { 
  ModelRepository, 
  ModelCreator, 
  ModelData, 
  ModelEvaluation,
  ModelPricing,
  ModelPerformance 
} from '../repositories/modelRepository';

export interface ArtificialAnalysisModel {
  id: string;
  name: string;
  slug: string;
  release_date: string;
  model_creator: {
    id: string;
    name: string;
    slug: string;
  };
  evaluations: {
    [key: string]: number | null;
  };
  pricing: {
    price_1m_blended_3_to_1?: number;
    price_1m_input_tokens?: number;
    price_1m_output_tokens?: number;
  };
  median_output_tokens_per_second?: number;
  median_time_to_first_token_seconds?: number;
  median_time_to_first_answer_token?: number;
}

export class ModelDataProcessor {
  private repository: ModelRepository;

  constructor(repository: ModelRepository) {
    this.repository = repository;
  }

  /**
   * ISO 날짜를 MySQL DATETIME 형식으로 변환
   */
  private toMySQLDateTime(date: Date = new Date()): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * Artificial Analysis API 응답을 MySQL에 저장
   */
  async processAndSave(apiResponse: any): Promise<void> {
    console.log('\n[ModelDataProcessor] 데이터 처리 시작');

    if (!apiResponse.data || !Array.isArray(apiResponse.data)) {
      throw new Error('Invalid API response format');
    }

    const models = apiResponse.data as ArtificialAnalysisModel[];
    console.log(`총 ${models.length}개 모델 처리 중...`);

    let successCount = 0;
    let errorCount = 0;

    for (const model of models) {
      try {
        await this.processModel(model);
        successCount++;

        if (successCount % 50 === 0) {
          console.log(`  진행: ${successCount}/${models.length}...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ${model.name} 처리 실패:`, error);
      }
    }

    console.log(`\n[ModelDataProcessor] 처리 완료`);
    console.log(`  성공: ${successCount}개`);
    console.log(`  실패: ${errorCount}개`);
  }

  /**
   * 단일 모델 처리
   * 각 단계가 순차적으로 성공해야 다음 단계로 진행
   */
  private async processModel(model: ArtificialAnalysisModel): Promise<void> {
    // 1. 제공사 저장 (필수 - 실패 시 모델 저장 불가)
    try {
      await this.saveCreator(model);
    } catch (error) {
      throw new Error(`제공사 저장 실패 (${model.model_creator.name}): ${error}`);
    }

    // 2. 모델 기본 정보 저장 (필수 - 실패 시 후속 작업 불가)
    try {
      await this.saveModelInfo(model);
    } catch (error) {
      throw new Error(`모델 저장 실패 (${model.name}): ${error}`);
    }

    // 3. 벤치마크 점수 저장 (모델이 존재해야 함)
    try {
      await this.saveEvaluations(model);
    } catch (error) {
      console.warn(`  벤치마크 저장 실패 (${model.name}):`, error);
      // 벤치마크 실패는 치명적이지 않으므로 계속 진행
    }

    // 4. 가격 정보 저장
    try {
      await this.savePricing(model);
    } catch (error) {
      console.warn(`  가격 저장 실패 (${model.name}):`, error);
    }

    // 5. 성능 지표 저장
    try {
      await this.savePerformance(model);
    } catch (error) {
      console.warn(`  성능 저장 실패 (${model.name}):`, error);
    }
  }

  /**
   * 제공사 저장
   */
  private async saveCreator(model: ArtificialAnalysisModel): Promise<void> {
    const creator: ModelCreator = {
      creator_id: model.model_creator.id,
      creator_name: model.model_creator.name,
      creator_slug: model.model_creator.slug,
    };

    await this.repository.saveCreator(creator);
  }

  /**
   * 모델 기본 정보 저장
   */
  private async saveModelInfo(model: ArtificialAnalysisModel): Promise<void> {
    const modelData: ModelData = {
      model_id: model.id,
      model_name: model.name,
      model_slug: model.slug,
      creator_id: model.model_creator.id,
      release_date: model.release_date,
      raw_data: model,
    };

    await this.repository.saveModel(modelData);
  }

  /**
   * 벤치마크 점수 저장
   */
  private async saveEvaluations(model: ArtificialAnalysisModel): Promise<void> {
    const evaluations: ModelEvaluation[] = [];

    for (const [benchmarkName, score] of Object.entries(model.evaluations)) {
      if (score !== null && score !== undefined) {
        let normalizedScore = this.normalizeScore(benchmarkName, score);

        evaluations.push({
          model_id: model.id,
          benchmark_name: benchmarkName,
          score: score,
          normalized_score: normalizedScore,
        });
      }
    }

    await this.repository.saveEvaluations(evaluations);
  }

  /**
   * 점수 정규화 (0-100 스케일)
   */
  private normalizeScore(benchmarkName: string, score: number): number {
    // Intelligence/Coding/Math Index는 이미 0-100
    if (benchmarkName.includes('_index')) {
      return score;
    }

    // HLE (Harmful Language Evasion)는 역정규화
    if (benchmarkName === 'hle') {
      return (1.0 - score) * 100;
    }

    // 대부분의 벤치마크는 0-1 범위
    return score * 100;
  }

  /**
   * 가격 정보 저장
   */
  private async savePricing(model: ArtificialAnalysisModel): Promise<void> {
    if (!model.pricing) return;

    const pricing: ModelPricing = {
      model_id: model.id,
      price_input_1m: model.pricing.price_1m_input_tokens || null,
      price_output_1m: model.pricing.price_1m_output_tokens || null,
      price_blended_3to1: model.pricing.price_1m_blended_3_to_1 || null,
      effective_date: new Date().toISOString().split('T')[0],  // YYYY-MM-DD
    };

    await this.repository.savePricing(pricing);
  }

  /**
   * 성능 지표 저장
   */
  private async savePerformance(model: ArtificialAnalysisModel): Promise<void> {
    const performance: ModelPerformance = {
      model_id: model.id,
      median_output_tokens_per_second: model.median_output_tokens_per_second || null,
      median_time_to_first_token: model.median_time_to_first_token_seconds || null,
      median_time_to_first_answer: model.median_time_to_first_answer_token || null,
      measured_at: this.toMySQLDateTime(),  // ← MySQL DATETIME 형식
    };

    await this.repository.savePerformance(performance);
  }

  /**
   * 통계 조회
   */
  async getStats(): Promise<any> {
    return await this.repository.getStats();
  }
}