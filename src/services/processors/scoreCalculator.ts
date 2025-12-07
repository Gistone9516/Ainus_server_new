/**
 * AI 모델 종합 성능 점수 계산기
 * Artificial Analysis 데이터를 기반으로 가중치 적용 점수 계산
 */

export interface ModelEvaluations {
  artificial_analysis_intelligence_index?: number;
  artificial_analysis_coding_index?: number;
  artificial_analysis_math_index?: number;
  mmlu_pro?: number;
  gpqa?: number;
  hle?: number;
  livecodebench?: number;
  scicode?: number;
  math_500?: number | null;
  aime?: number | null;
  aime_25?: number;
  ifbench?: number;
  lcr?: number;
  terminalbench_hard?: number;
  tau2?: number;
  [key: string]: number | null | undefined;
}

export interface ScoreConfig {
  weight: number;
  max: number;
  type: 'normal' | 'inverse';
}

export interface WeightedScore {
  [key: string]: number;
}

export interface CalculatedScore {
  overall_score: number;
  intelligence_index: number;
  coding_index: number;
  math_index: number;
  reasoning_index: number;
  language_index: number;
  weighted_scores: WeightedScore;
}

export class ScoreCalculator {
  private static readonly WEIGHTS_AND_MAX_SCORES: { [key: string]: ScoreConfig } = {
    // 핵심 능력 (총 0.55)
    artificial_analysis_intelligence_index: { weight: 0.25, max: 100, type: 'normal' },
    artificial_analysis_coding_index: { weight: 0.15, max: 100, type: 'normal' },
    artificial_analysis_math_index: { weight: 0.15, max: 100, type: 'normal' },

    // 지식 및 실용성 (총 0.35)
    mmlu_pro: { weight: 0.10, max: 1.0, type: 'normal' },
    gpqa: { weight: 0.08, max: 1.0, type: 'normal' },
    livecodebench: { weight: 0.07, max: 1.0, type: 'normal' },
    lcr: { weight: 0.05, max: 1.0, type: 'normal' },
    tau2: { weight: 0.05, max: 1.0, type: 'normal' },
    
    // 안전성 및 특수 능력 (총 0.10)
    hle: { weight: 0.04, max: 1.0, type: 'inverse' },
    aime_25: { weight: 0.03, max: 1.0, type: 'normal' },
    scicode: { weight: 0.02, max: 1.0, type: 'normal' },
    terminalbench_hard: { weight: 0.01, max: 1.0, type: 'normal' },
  };

  /**
   * 모델의 종합 성능 점수 계산
   */
  static calculatePerformanceScore(
    evaluations: ModelEvaluations,
    modelName: string = 'Unknown'
  ): CalculatedScore {
    let totalWeightedScore = 0;
    const weightedScores: WeightedScore = {};

    // 각 지표별 점수 계산
    for (const key in this.WEIGHTS_AND_MAX_SCORES) {
      const config = this.WEIGHTS_AND_MAX_SCORES[key];
      const score = evaluations[key];

      if (score === null || score === undefined) {
        console.warn(
          `[ScoreCalculator] ${modelName}: ${key} is null/undefined. Treating as 0.`
        );
        continue;
      }

      let normalizedScore: number;

      // 정규화 또는 역정규화
      if (config.type === 'inverse') {
        // HLE: 낮을수록 좋음
        normalizedScore = 1.0 - (score / config.max);
      } else {
        // 일반: 높을수록 좋음
        normalizedScore = score / config.max;
      }

      // 0-1 범위로 클리핑
      normalizedScore = Math.max(0, Math.min(1, normalizedScore));

      // 가중치 적용
      const weightedScore = normalizedScore * config.weight;
      totalWeightedScore += weightedScore;
      weightedScores[key] = parseFloat(weightedScore.toFixed(4));
    }

    // 최종 점수 (100점 만점)
    const overall_score = parseFloat((totalWeightedScore * 100).toFixed(2));

    // 세부 지수 계산
    const intelligence_index = this.calculateIndexScore(
      evaluations,
      ['artificial_analysis_intelligence_index', 'mmlu_pro', 'gpqa']
    );

    const coding_index = this.calculateIndexScore(
      evaluations,
      ['artificial_analysis_coding_index', 'livecodebench', 'lcr']
    );

    const math_index = this.calculateIndexScore(
      evaluations,
      ['artificial_analysis_math_index', 'aime_25', 'scicode']
    );

    const reasoning_index = this.calculateIndexScore(
      evaluations,
      ['tau2', 'gpqa', 'terminalbench_hard']
    );

    const language_index = this.calculateIndexScore(
      evaluations,
      ['mmlu_pro', 'hle']
    );

    return {
      overall_score,
      intelligence_index,
      coding_index,
      math_index,
      reasoning_index,
      language_index,
      weighted_scores: weightedScores,
    };
  }

  /**
   * 특정 지표들의 평균으로 세부 지수 계산
   */
  private static calculateIndexScore(
    evaluations: ModelEvaluations,
    metricKeys: string[]
  ): number {
    let sum = 0;
    let count = 0;

    for (const key of metricKeys) {
      const score = evaluations[key];
      if (score !== null && score !== undefined) {
        const config = this.WEIGHTS_AND_MAX_SCORES[key];
        
        if (config) {
          let normalized = config.type === 'inverse' 
            ? 1.0 - (score / config.max)
            : score / config.max;
          
          normalized = Math.max(0, Math.min(1, normalized));
          sum += normalized;
          count++;
        } else {
          // 가중치가 없는 지표는 기본 정규화
          const normalized = Math.min(score, 1.0);
          sum += normalized;
          count++;
        }
      }
    }

    if (count === 0) return 0;
    return parseFloat(((sum / count) * 100).toFixed(2));
  }

  /**
   * 여러 모델의 점수를 일괄 계산
   */
  static calculateBatchScores(
    models: Array<{ id: string; name: string; evaluations: ModelEvaluations }>
  ): Array<{ model_id: string; scores: CalculatedScore }> {
    return models.map(model => ({
      model_id: model.id,
      scores: this.calculatePerformanceScore(model.evaluations, model.name)
    }));
  }

  /**
   * 점수 유효성 검증
   */
  static validateScore(score: CalculatedScore): boolean {
    return (
      score.overall_score >= 0 &&
      score.overall_score <= 100 &&
      score.intelligence_index >= 0 &&
      score.intelligence_index <= 100 &&
      score.coding_index >= 0 &&
      score.coding_index <= 100
    );
  }
}