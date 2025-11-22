/**
 * 모델 성능 발전사 (타임라인) 서비스 (v3 - 독립 실행)
 * 
 * GPT, Claude, Gemini 등 주요 AI 모델 시리즈의 버전별 출시일,
 * 핵심 성능 지표, 주요 개선점을 시각적 타임라인 형태로 제공
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

// 타임라인 아이템 타입 정의
export interface TimelineItem {
  model_id: string;
  model_name: string;
  model_slug: string;
  series_name: string;
  creator_name: string;
  release_date: Date;
  parameter_size: string | null;
  context_length: number | null;
  overall_score: number;
  intelligence_index: number;
  coding_index: number;
  math_index: number;
  benchmarks: BenchmarkScore[];
  key_improvements: string[];
  is_major_release: boolean;
}

export interface BenchmarkScore {
  benchmark_name: string;
  score: number;
  normalized_score: number;
  category: string;
}

export interface TimelineResponse {
  series_name: string;
  creator_name: string;
  total_versions: number;
  timeline: TimelineItem[];
  performance_trend: PerformanceTrend;
}

export interface PerformanceTrend {
  overall_improvement: number;
  intelligence_improvement: number;
  coding_improvement: number;
  math_improvement: number;
  development_speed: string;
}

/**
 * 모델 이름에서 시리즈 추출
 */
function extractSeriesFromModelName(modelName: string): string {
  if (modelName.includes('GPT')) return 'GPT';
  if (modelName.includes('Claude')) return 'Claude';
  if (modelName.includes('Gemini')) return 'Gemini';
  if (modelName.includes('Llama')) return 'Llama';
  if (modelName.includes('Mistral')) return 'Mistral';
  
  return modelName.split(/[\s-]/)[0];
}

/**
 * 특정 모델 시리즈의 발전사 타임라인 조회
 */
export async function getModelTimeline(
  seriesName: string,
  limit: number = 20
): Promise<TimelineResponse> {
  try {
    const pool = await getPool();
    
    // 1. 모델 시리즈의 모든 버전 조회
    const [versions] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        m.model_id,
        m.model_name,
        m.model_slug,
        mc.creator_name,
        m.release_date,
        m.parameter_size,
        m.context_length,
        mos.overall_score,
        mos.intelligence_index,
        mos.coding_index,
        mos.math_index,
        mos.reasoning_index,
        CASE 
          WHEN m.model_name LIKE '%Pro%' OR m.model_name LIKE '%Ultra%' OR m.model_name LIKE '%Opus%'
          THEN TRUE 
          ELSE FALSE 
        END AS is_major_release
      FROM ai_models m
      INNER JOIN model_creators mc ON m.creator_id = mc.creator_id
      LEFT JOIN model_overall_scores mos ON m.model_id = mos.model_id
      WHERE m.model_name LIKE ?
        AND m.is_active = TRUE
        AND m.release_date IS NOT NULL
      ORDER BY m.release_date ASC
      LIMIT ?
      `,
      [`%${seriesName}%`, limit]
    );

    if (versions.length === 0) {
      throw new Error(`모델 시리즈 '${seriesName}'를 찾을 수 없습니다.`);
    }

    // 2. 각 버전의 벤치마크 점수 조회
    const timelineItems: TimelineItem[] = [];
    
    for (const version of versions) {
      const [benchmarks] = await pool.query<RowDataPacket[]>(
        `
        SELECT 
          me.benchmark_name,
          me.score,
          me.normalized_score,
          CASE 
            WHEN me.benchmark_name IN ('MMLU_PRO', 'GPQA', 'TAU2') THEN 'Intelligence'
            WHEN me.benchmark_name IN ('LiveCodeBench', 'LCR') THEN 'Coding'
            WHEN me.benchmark_name IN ('AIME', 'MATH_500') THEN 'Math'
            ELSE 'Other'
          END AS category
        FROM model_evaluations me
        WHERE me.model_id = ?
        ORDER BY me.normalized_score DESC
        `,
        [version.model_id]
      );

      const key_improvements = await extractKeyImprovements(pool, version.model_id);

      timelineItems.push({
        model_id: version.model_id,
        model_name: version.model_name,
        model_slug: version.model_slug,
        series_name: extractSeriesFromModelName(version.model_name),
        creator_name: version.creator_name,
        release_date: version.release_date,
        parameter_size: version.parameter_size,
        context_length: version.context_length,
        overall_score: version.overall_score || 0,
        intelligence_index: version.intelligence_index || 0,
        coding_index: version.coding_index || 0,
        math_index: version.math_index || 0,
        benchmarks: benchmarks as BenchmarkScore[],
        key_improvements,
        is_major_release: version.is_major_release === 1
      });
    }

    // 3. 성능 향상 트렌드 계산
    const performanceTrend = calculatePerformanceTrend(timelineItems);

    return {
      series_name: seriesName,
      creator_name: timelineItems[0].creator_name,
      total_versions: timelineItems.length,
      timeline: timelineItems,
      performance_trend: performanceTrend
    };

  } catch (error) {
    console.error('타임라인 조회 오류:', error);
    throw error;
  }
}

/**
 * 주요 개선점 추출
 */
async function extractKeyImprovements(pool: Pool, modelId: string): Promise<string[]> {
  try {
    const [updates] = await pool.query<RowDataPacket[]>(
      `
      SELECT summary
      FROM model_updates
      WHERE model_id = ?
        AND summary IS NOT NULL
        AND summary != ''
      ORDER BY update_date DESC
      LIMIT 3
      `,
      [modelId]
    );

    return updates.map(u => u.summary).filter(s => s && s.trim() !== '');
  } catch (error) {
    console.error('개선점 추출 오류:', error);
    return [];
  }
}

/**
 * 성능 향상 트렌드 계산
 */
function calculatePerformanceTrend(versions: TimelineItem[]): PerformanceTrend {
  if (versions.length < 2) {
    return {
      overall_improvement: 0,
      intelligence_improvement: 0,
      coding_improvement: 0,
      math_improvement: 0,
      development_speed: 'N/A'
    };
  }

  const first = versions[0];
  const last = versions[versions.length - 1];

  const overall_improvement = calculateImprovement(
    first.overall_score, 
    last.overall_score
  );
  const intelligence_improvement = calculateImprovement(
    first.intelligence_index, 
    last.intelligence_index
  );
  const coding_improvement = calculateImprovement(
    first.coding_index, 
    last.coding_index
  );
  const math_improvement = calculateImprovement(
    first.math_index, 
    last.math_index
  );

  const firstDate = new Date(first.release_date);
  const lastDate = new Date(last.release_date);
  const daysDiff = Math.floor(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const avgDaysPerVersion = Math.floor(daysDiff / (versions.length - 1));

  let development_speed = 'Slow';
  if (avgDaysPerVersion < 30) development_speed = 'Very Fast';
  else if (avgDaysPerVersion < 60) development_speed = 'Fast';
  else if (avgDaysPerVersion < 90) development_speed = 'Moderate';

  return {
    overall_improvement,
    intelligence_improvement,
    coding_improvement,
    math_improvement,
    development_speed: `${development_speed} (평균 ${avgDaysPerVersion}일/버전)`
  };
}

/**
 * 향상률 계산 (%)
 */
function calculateImprovement(before: number, after: number): number {
  if (!before || before === 0) return 0;
  return Number((((after - before) / before) * 100).toFixed(2));
}

/**
 * 여러 모델 시리즈의 타임라인 비교
 */
export async function compareModelTimelines(
  seriesNames: string[]
): Promise<{ [key: string]: TimelineResponse | null }> {
  const results: { [key: string]: TimelineResponse | null } = {};

  for (const seriesName of seriesNames) {
    try {
      results[seriesName] = await getModelTimeline(seriesName);
    } catch (error) {
      console.error(`${seriesName} 타임라인 조회 실패:`, error);
      results[seriesName] = null;
    }
  }

  return results;
}

/**
 * 특정 기간 내의 주요 모델 출시 이벤트 조회
 */
export async function getMajorReleaseEvents(
  startDate: Date,
  endDate: Date
): Promise<TimelineItem[]> {
  try {
    const pool = await getPool();
    
    const [events] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        m.model_id,
        m.model_name,
        m.model_slug,
        mc.creator_name,
        m.release_date,
        m.parameter_size,
        m.context_length,
        mos.overall_score,
        mos.intelligence_index,
        mos.coding_index,
        mos.math_index
      FROM ai_models m
      INNER JOIN model_creators mc ON m.creator_id = mc.creator_id
      LEFT JOIN model_overall_scores mos ON m.model_id = mos.model_id
      WHERE m.release_date BETWEEN ? AND ?
        AND m.is_active = TRUE
        AND (
          m.model_name LIKE '%Pro%' 
          OR m.model_name LIKE '%Ultra%'
          OR m.model_name LIKE '%Opus%'
          OR mos.overall_score >= 80
        )
      ORDER BY m.release_date DESC
      `,
      [
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ]
    );

    const timelineItems: TimelineItem[] = [];

    for (const event of events) {
      const [benchmarks] = await pool.query<RowDataPacket[]>(
        `
        SELECT 
          me.benchmark_name,
          me.score,
          me.normalized_score,
          CASE 
            WHEN me.benchmark_name IN ('MMLU_PRO', 'GPQA', 'TAU2') THEN 'Intelligence'
            WHEN me.benchmark_name IN ('LiveCodeBench', 'LCR') THEN 'Coding'
            WHEN me.benchmark_name IN ('AIME', 'MATH_500') THEN 'Math'
            ELSE 'Other'
          END AS category
        FROM model_evaluations me
        WHERE me.model_id = ?
        ORDER BY me.normalized_score DESC
        LIMIT 5
        `,
        [event.model_id]
      );

      timelineItems.push({
        model_id: event.model_id,
        model_name: event.model_name,
        model_slug: event.model_slug,
        series_name: extractSeriesFromModelName(event.model_name),
        creator_name: event.creator_name,
        release_date: event.release_date,
        parameter_size: event.parameter_size,
        context_length: event.context_length,
        overall_score: event.overall_score || 0,
        intelligence_index: event.intelligence_index || 0,
        coding_index: event.coding_index || 0,
        math_index: event.math_index || 0,
        benchmarks: benchmarks as BenchmarkScore[],
        key_improvements: [],
        is_major_release: true
      });
    }

    return timelineItems;
  } catch (error) {
    console.error('주요 출시 이벤트 조회 오류:', error);
    throw error;
  }
}

/**
 * 특정 벤치마크 기준 성능 발전 추이
 */
export async function getBenchmarkProgressionTimeline(
  seriesName: string,
  benchmarkName: string
): Promise<{
  series_name: string;
  benchmark_name: string;
  progression: Array<{
    model_name: string;
    release_date: Date;
    score: number;
    normalized_score: number;
    improvement_from_previous: number;
  }>;
}> {
  try {
    const pool = await getPool();
    
    const [progression] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        m.model_name,
        m.release_date,
        me.score,
        me.normalized_score,
        LAG(me.normalized_score) OVER (ORDER BY m.release_date) AS previous_score
      FROM ai_models m
      INNER JOIN model_evaluations me ON m.model_id = me.model_id
      WHERE m.model_name LIKE ?
        AND me.benchmark_name = ?
        AND m.is_active = TRUE
        AND m.release_date IS NOT NULL
      ORDER BY m.release_date ASC
      `,
      [`%${seriesName}%`, benchmarkName]
    );

    const progressionData = progression.map((item, index) => ({
      model_name: item.model_name,
      release_date: item.release_date,
      score: item.score,
      normalized_score: item.normalized_score,
      improvement_from_previous: index === 0 ? 0 : 
        calculateImprovement(item.previous_score, item.normalized_score)
    }));

    return {
      series_name: seriesName,
      benchmark_name: benchmarkName,
      progression: progressionData
    };
  } catch (error) {
    console.error('벤치마크 발전 추이 조회 오류:', error);
    throw error;
  }
}

/**
 * 모든 주요 시리즈 목록 조회
 */
export async function getAvailableSeries(): Promise<Array<{
  series_name: string;
  creator_name: string;
  model_count: number;
  latest_release: Date;
}>> {
  try {
    const pool = await getPool();
    
    const [series] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        CASE 
          WHEN m.model_name LIKE '%GPT%' THEN 'GPT'
          WHEN m.model_name LIKE '%Claude%' THEN 'Claude'
          WHEN m.model_name LIKE '%Gemini%' THEN 'Gemini'
          WHEN m.model_name LIKE '%Llama%' THEN 'Llama'
          WHEN m.model_name LIKE '%Mistral%' THEN 'Mistral'
          ELSE SUBSTRING_INDEX(m.model_name, ' ', 1)
        END AS series_name,
        mc.creator_name,
        COUNT(*) AS model_count,
        MAX(m.release_date) AS latest_release
      FROM ai_models m
      INNER JOIN model_creators mc ON m.creator_id = mc.creator_id
      WHERE m.is_active = TRUE
        AND m.release_date IS NOT NULL
      GROUP BY series_name, mc.creator_name
      HAVING model_count >= 2
      ORDER BY latest_release DESC, model_count DESC
      `
    );

    return series as any;
  } catch (error) {
    console.error('시리즈 목록 조회 오류:', error);
    throw error;
  }
}

export default {
  getModelTimeline,
  compareModelTimelines,
  getMajorReleaseEvents,
  getBenchmarkProgressionTimeline,
  getAvailableSeries
};
