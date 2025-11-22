/**
 * 모델 간단 비교 기능 서비스 (v3 - 직접 Pool 생성)
 * 
 * getDatabasePool() 의존성 제거하고 직접 mysql2 사용
 */

import { RowDataPacket, Pool } from 'mysql2/promise';
import mysql from 'mysql2/promise';

// 직접 연결 풀 생성 (싱글톤)
let mysqlPool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'qwer1234',
      database: process.env.DB_NAME || 'ai_model_app',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // 연결 테스트
    await mysqlPool.query('SELECT 1');
  }
  return mysqlPool;
}

// 비교 결과 타입 정의
export interface ModelComparison {
  model_a: ModelComparisonData;
  model_b: ModelComparisonData;
  comparison_summary: ComparisonSummary;
  visual_data: VisualComparisonData;
}

export interface ModelComparisonData {
  model_id: string;
  model_name: string;
  model_slug: string;
  creator_name: string;
  release_date: Date;
  parameter_size: string | null;
  context_length: number | null;
  is_open_source: boolean;
  pricing: PricingInfo | null;
  overall_score: number;
  scores: {
    intelligence: number;
    coding: number;
    math: number;
    reasoning: number;
    language: number;
  };
  key_benchmarks: KeyBenchmark[];
  strengths: string[];
  weaknesses: string[];
}

export interface PricingInfo {
  price_input_1m: number;
  price_output_1m: number;
  price_blended_3to1: number;
  currency: string;
}

export interface KeyBenchmark {
  name: string;
  display_name: string;
  score: number;
  normalized_score: number;
  category: string;
}

export interface ComparisonSummary {
  winner_overall: string;
  winner_intelligence: string;
  winner_coding: string;
  winner_math: string;
  winner_reasoning: string;
  winner_language: string;
  score_differences: {
    overall: number;
    intelligence: number;
    coding: number;
    math: number;
    reasoning: number;
    language: number;
  };
  price_comparison?: {
    model_a_price: number | null;
    model_b_price: number | null;
    cheaper_model: string | null;
  };
  recommendation: string;
}

export interface VisualComparisonData {
  bar_chart_data: BarChartData[];
  radar_chart_data: RadarChartData;
  performance_gap: number;
}

export interface BarChartData {
  category: string;
  display_name: string;
  model_a_score: number;
  model_b_score: number;
  difference: number;
  winner: string;
}

export interface RadarChartData {
  categories: string[];
  model_a_values: number[];
  model_b_values: number[];
}

/**
 * 두 모델 비교
 */
export async function compareModels(
  modelIdA: string,
  modelIdB: string
): Promise<ModelComparison> {
  try {
    const modelA = await getModelComparisonData(modelIdA);
    const modelB = await getModelComparisonData(modelIdB);

    if (!modelA) {
      throw new Error(`모델 '${modelIdA}'를 찾을 수 없습니다.`);
    }
    if (!modelB) {
      throw new Error(`모델 '${modelIdB}'를 찾을 수 없습니다.`);
    }

    const comparison_summary = generateComparisonSummary(modelA, modelB);
    const visual_data = generateVisualData(modelA, modelB);

    return {
      model_a: modelA,
      model_b: modelB,
      comparison_summary,
      visual_data
    };

  } catch (error) {
    console.error('모델 비교 오류:', error);
    throw error;
  }
}

async function getModelComparisonData(
  modelId: string
): Promise<ModelComparisonData | null> {
  try {
    const pool = await getPool();
    
    const [modelInfo] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        m.model_id,
        m.model_name,
        m.model_slug,
        mc.creator_name,
        m.release_date,
        m.parameter_size,
        m.context_length,
        m.is_open_source,
        mos.overall_score,
        mos.intelligence_index,
        mos.coding_index,
        mos.math_index,
        mos.reasoning_index,
        mos.language_index
      FROM ai_models m
      INNER JOIN model_creators mc ON m.creator_id = mc.creator_id
      LEFT JOIN model_overall_scores mos ON m.model_id = mos.model_id
      WHERE m.model_id = ?
        AND m.is_active = TRUE
      `,
      [modelId]
    );

    if (modelInfo.length === 0) {
      return null;
    }

    const model = modelInfo[0];

    const [pricingInfo] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        price_input_1m,
        price_output_1m,
        price_blended_3to1,
        currency
      FROM model_pricing
      WHERE model_id = ?
        AND is_current = TRUE
      ORDER BY effective_date DESC
      LIMIT 1
      `,
      [modelId]
    );

    const [benchmarks] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        me.benchmark_name AS name,
        CASE 
          WHEN me.benchmark_name = 'MMLU_PRO' THEN '일반 지능'
          WHEN me.benchmark_name = 'GPQA' THEN '대학원 수준 문제'
          WHEN me.benchmark_name = 'LiveCodeBench' THEN '실전 코딩'
          WHEN me.benchmark_name = 'AIME' THEN '고급 수학'
          WHEN me.benchmark_name = 'MATH_500' THEN '수학 문제'
          WHEN me.benchmark_name = 'HLE' THEN '긴 맥락 이해'
          ELSE me.benchmark_name
        END AS display_name,
        me.score,
        me.normalized_score,
        CASE 
          WHEN me.benchmark_name IN ('MMLU_PRO', 'GPQA', 'TAU2') THEN 'Intelligence'
          WHEN me.benchmark_name IN ('LiveCodeBench', 'LCR') THEN 'Coding'
          WHEN me.benchmark_name IN ('AIME', 'MATH_500') THEN 'Math'
          WHEN me.benchmark_name IN ('HLE') THEN 'Reasoning'
          ELSE 'Other'
        END AS category
      FROM model_evaluations me
      WHERE me.model_id = ?
      ORDER BY me.normalized_score DESC
      LIMIT 10
      `,
      [modelId]
    );

    const { strengths, weaknesses } = analyzeStrengthsWeaknesses(
      model,
      benchmarks as KeyBenchmark[]
    );

    return {
      model_id: model.model_id,
      model_name: model.model_name,
      model_slug: model.model_slug,
      creator_name: model.creator_name,
      release_date: model.release_date,
      parameter_size: model.parameter_size,
      context_length: model.context_length,
      is_open_source: model.is_open_source,
      pricing: pricingInfo.length > 0 ? pricingInfo[0] as PricingInfo : null,
      overall_score: model.overall_score || 0,
      scores: {
        intelligence: model.intelligence_index || 0,
        coding: model.coding_index || 0,
        math: model.math_index || 0,
        reasoning: model.reasoning_index || 0,
        language: model.language_index || 0
      },
      key_benchmarks: benchmarks as KeyBenchmark[],
      strengths,
      weaknesses
    };

  } catch (error) {
    console.error('모델 데이터 조회 오류:', error);
    return null;
  }
}

function analyzeStrengthsWeaknesses(
  model: any,
  benchmarks: KeyBenchmark[]
): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (model.overall_score >= 85) {
    strengths.push('전반적으로 매우 우수한 성능');
  } else if (model.overall_score < 70) {
    weaknesses.push('전반적인 성능 개선 필요');
  }

  if (model.intelligence_index >= 85) {
    strengths.push('뛰어난 일반 지능 및 이해력');
  } else if (model.intelligence_index < 70) {
    weaknesses.push('일반 지능 개선 필요');
  }

  if (model.coding_index >= 85) {
    strengths.push('탁월한 코드 생성 및 디버깅 능력');
  } else if (model.coding_index < 70) {
    weaknesses.push('코딩 능력 향상 필요');
  }

  if (model.math_index >= 85) {
    strengths.push('높은 수학적 추론 능력');
  } else if (model.math_index < 70) {
    weaknesses.push('수학 문제 해결 능력 개선 필요');
  }

  if (model.context_length >= 100000) {
    strengths.push('매우 긴 문맥 처리 가능');
  }

  if (model.is_open_source) {
    strengths.push('오픈소스로 커스터마이징 가능');
  }

  return { strengths, weaknesses };
}

function generateComparisonSummary(
  modelA: ModelComparisonData,
  modelB: ModelComparisonData
): ComparisonSummary {
  const score_differences = {
    overall: Number((modelA.overall_score - modelB.overall_score).toFixed(2)),
    intelligence: Number((modelA.scores.intelligence - modelB.scores.intelligence).toFixed(2)),
    coding: Number((modelA.scores.coding - modelB.scores.coding).toFixed(2)),
    math: Number((modelA.scores.math - modelB.scores.math).toFixed(2)),
    reasoning: Number((modelA.scores.reasoning - modelB.scores.reasoning).toFixed(2)),
    language: Number((modelA.scores.language - modelB.scores.language).toFixed(2))
  };

  const winner_overall = score_differences.overall === 0 ? '동점' :
    score_differences.overall > 0 ? modelA.model_name : modelB.model_name;
  const winner_intelligence = score_differences.intelligence === 0 ? '동점' :
    score_differences.intelligence > 0 ? modelA.model_name : modelB.model_name;
  const winner_coding = score_differences.coding === 0 ? '동점' :
    score_differences.coding > 0 ? modelA.model_name : modelB.model_name;
  const winner_math = score_differences.math === 0 ? '동점' :
    score_differences.math > 0 ? modelA.model_name : modelB.model_name;
  const winner_reasoning = score_differences.reasoning === 0 ? '동점' :
    score_differences.reasoning > 0 ? modelA.model_name : modelB.model_name;
  const winner_language = score_differences.language === 0 ? '동점' :
    score_differences.language > 0 ? modelA.model_name : modelB.model_name;

  let price_comparison = undefined;
  if (modelA.pricing && modelB.pricing) {
    const priceA = modelA.pricing.price_blended_3to1;
    const priceB = modelB.pricing.price_blended_3to1;
    const cheaper_model = priceA < priceB ? modelA.model_name :
                         priceA > priceB ? modelB.model_name : '동일';
    
    price_comparison = {
      model_a_price: priceA,
      model_b_price: priceB,
      cheaper_model
    };
  }

  let recommendation = '';
  const absOverallDiff = Math.abs(score_differences.overall);

  if (absOverallDiff < 3) {
    recommendation = '두 모델의 전반적인 성능이 유사합니다. 특정 작업이나 가격을 고려하여 선택하세요.';
  } else if (score_differences.overall > 0) {
    recommendation = `${modelA.model_name}이(가) 전반적으로 더 우수합니다.`;
  } else {
    recommendation = `${modelB.model_name}이(가) 전반적으로 더 우수합니다.`;
  }

  return {
    winner_overall,
    winner_intelligence,
    winner_coding,
    winner_math,
    winner_reasoning,
    winner_language,
    score_differences,
    price_comparison,
    recommendation
  };
}

function generateVisualData(
  modelA: ModelComparisonData,
  modelB: ModelComparisonData
): VisualComparisonData {
  const bar_chart_data: BarChartData[] = [
    {
      category: 'overall',
      display_name: '종합 점수',
      model_a_score: modelA.overall_score,
      model_b_score: modelB.overall_score,
      difference: Number((modelA.overall_score - modelB.overall_score).toFixed(2)),
      winner: modelA.overall_score === modelB.overall_score ? '동점' :
              modelA.overall_score > modelB.overall_score ? modelA.model_name : modelB.model_name
    },
    {
      category: 'intelligence',
      display_name: '일반 지능',
      model_a_score: modelA.scores.intelligence,
      model_b_score: modelB.scores.intelligence,
      difference: Number((modelA.scores.intelligence - modelB.scores.intelligence).toFixed(2)),
      winner: modelA.scores.intelligence === modelB.scores.intelligence ? '동점' :
              modelA.scores.intelligence > modelB.scores.intelligence ? modelA.model_name : modelB.model_name
    },
    {
      category: 'coding',
      display_name: '코딩 능력',
      model_a_score: modelA.scores.coding,
      model_b_score: modelB.scores.coding,
      difference: Number((modelA.scores.coding - modelB.scores.coding).toFixed(2)),
      winner: modelA.scores.coding === modelB.scores.coding ? '동점' :
              modelA.scores.coding > modelB.scores.coding ? modelA.model_name : modelB.model_name
    },
    {
      category: 'math',
      display_name: '수학 능력',
      model_a_score: modelA.scores.math,
      model_b_score: modelB.scores.math,
      difference: Number((modelA.scores.math - modelB.scores.math).toFixed(2)),
      winner: modelA.scores.math === modelB.scores.math ? '동점' :
              modelA.scores.math > modelB.scores.math ? modelA.model_name : modelB.model_name
    },
    {
      category: 'reasoning',
      display_name: '추론 능력',
      model_a_score: modelA.scores.reasoning,
      model_b_score: modelB.scores.reasoning,
      difference: Number((modelA.scores.reasoning - modelB.scores.reasoning).toFixed(2)),
      winner: modelA.scores.reasoning === modelB.scores.reasoning ? '동점' :
              modelA.scores.reasoning > modelB.scores.reasoning ? modelA.model_name : modelB.model_name
    },
    {
      category: 'language',
      display_name: '언어 능력',
      model_a_score: modelA.scores.language,
      model_b_score: modelB.scores.language,
      difference: Number((modelA.scores.language - modelB.scores.language).toFixed(2)),
      winner: modelA.scores.language === modelB.scores.language ? '동점' :
              modelA.scores.language > modelB.scores.language ? modelA.model_name : modelB.model_name
    }
  ];

  const radar_chart_data: RadarChartData = {
    categories: [
      '일반 지능',
      '코딩 능력',
      '수학 능력',
      '추론 능력',
      '언어 능력'
    ],
    model_a_values: [
      modelA.scores.intelligence,
      modelA.scores.coding,
      modelA.scores.math,
      modelA.scores.reasoning,
      modelA.scores.language
    ],
    model_b_values: [
      modelB.scores.intelligence,
      modelB.scores.coding,
      modelB.scores.math,
      modelB.scores.reasoning,
      modelB.scores.language
    ]
  };

  const performance_gap = Math.abs(modelA.overall_score - modelB.overall_score);

  return {
    bar_chart_data,
    radar_chart_data,
    performance_gap
  };
}

export async function getTopModelsByCategory(
  category: 'coding' | 'intelligence' | 'math' | 'overall',
  limit: number = 10
): Promise<Array<{
  model_id: string;
  model_name: string;
  creator_name: string;
  score: number;
  rank: number;
}>> {
  try {
    const pool = await getPool();
    
    const scoreColumn = category === 'overall' ? 'overall_score' :
                       category === 'coding' ? 'coding_index' :
                       category === 'intelligence' ? 'intelligence_index' :
                       'math_index';

    const [results] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        m.model_id,
        m.model_name,
        mc.creator_name,
        mos.${scoreColumn} AS score,
        RANK() OVER (ORDER BY mos.${scoreColumn} DESC) AS \`rank\`
      FROM ai_models m
      INNER JOIN model_creators mc ON m.creator_id = mc.creator_id
      INNER JOIN model_overall_scores mos ON m.model_id = mos.model_id
      WHERE m.is_active = TRUE
        AND mos.${scoreColumn} IS NOT NULL
      ORDER BY mos.${scoreColumn} DESC
      LIMIT ?
      `,
      [limit]
    );

    return results as any;
  } catch (error) {
    console.error('카테고리별 상위 모델 조회 오류:', error);
    throw error;
  }
}

export default {
  compareModels,
  getTopModelsByCategory
};