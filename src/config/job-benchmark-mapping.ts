/**
 * 직업 카테고리별 벤치마크 매핑 설정
 *
 * 각 직업 카테고리마다 중요한 벤치마크 2개를 지정하고 가중치를 부여합니다.
 * - primary: 1순위 벤치마크 (가중치 70%)
 * - secondary: 2순위 벤치마크 (가중치 30%)
 *
 * 벤치마크 이름은 model_evaluations 테이블의 benchmark_name 컬럼과 일치해야 합니다.
 */

export interface BenchmarkConfig {
  benchmark: string;
  weight: number;
}

export interface JobBenchmarkMapping {
  primary: BenchmarkConfig;
  secondary: BenchmarkConfig;
}

/**
 * 직업 카테고리 코드별 벤치마크 매핑
 */
export const JOB_BENCHMARK_MAPPING: Record<string, JobBenchmarkMapping> = {
  /**
   * 기술/개발 (TECH_DEV)
   * - 코딩 능력이 가장 중요
   * - 실전 코딩 테스트 성능 중시
   */
  TECH_DEV: {
    primary: {
      benchmark: 'artificial_analysis_coding_index',
      weight: 0.7
    },
    secondary: {
      benchmark: 'livecodebench',  // HumanEval 대체 (AA API에 없음)
      weight: 0.3
    },
  },

  /**
   * 창작/콘텐츠 (CREATIVE)
   * - 종합 지능과 언어 이해 능력 중시
   * - 안전하고 유해하지 않은 콘텐츠 생성 중요
   */
  CREATIVE: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7
    },
    secondary: {
      benchmark: 'hle',  // Harmful Language Evasion (낮을수록 좋음)
      weight: 0.3
    },
  },

  /**
   * 분석/사무 (OFFICE)
   * - 전문 지식 추론 능력
   * - 다양한 분야 지식 활용
   */
  OFFICE: {
    primary: {
      benchmark: 'gpqa',  // Graduate-level Professional QA
      weight: 0.7
    },
    secondary: {
      benchmark: 'mmlu_pro',  // Massive Multitask Language Understanding
      weight: 0.3
    },
  },

  /**
   * 의료/과학 (MEDICAL)
   * - 과학적 코드 및 연구 능력
   * - 전문 지식 추론
   */
  MEDICAL: {
    primary: {
      benchmark: 'scicode',  // Scientific Code
      weight: 0.7
    },
    secondary: {
      benchmark: 'gpqa',
      weight: 0.3
    },
  },

  /**
   * 교육 (EDUCATION)
   * - 다양한 분야 지식
   * - 명확한 설명 능력
   */
  EDUCATION: {
    primary: {
      benchmark: 'mmlu_pro',
      weight: 0.7
    },
    secondary: {
      benchmark: 'hle',
      weight: 0.3
    },
  },

  /**
   * 비즈니스 (BUSINESS)
   * - 종합 지능 및 의사결정 능력
   * - 복잡한 수학적 계산
   */
  BUSINESS: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7
    },
    secondary: {
      benchmark: 'math_500',  // MATH-500
      weight: 0.3
    },
  },

  /**
   * 제조/건설 (MANUFACTURING)
   * - 수학적 최적화 능력
   * - 코딩 및 자동화
   */
  MANUFACTURING: {
    primary: {
      benchmark: 'math_500',
      weight: 0.7
    },
    secondary: {
      benchmark: 'livecodebench',
      weight: 0.3
    },
  },

  /**
   * 서비스 (SERVICE)
   * - 언어 이해 및 응대 능력
   * - 종합 지능
   */
  SERVICE: {
    primary: {
      benchmark: 'hle',
      weight: 0.7
    },
    secondary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.3
    },
  },

  /**
   * 창업/자영업 (STARTUP)
   * - 종합 능력
   * - 다양한 분야 지식
   */
  STARTUP: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3
    },
  },

  /**
   * 농업/축산업 (AGRICULTURE)
   * - 분석 및 데이터 처리
   * - 수학적 계산
   */
  AGRICULTURE: {
    primary: {
      benchmark: 'mmlu_pro',
      weight: 0.7
    },
    secondary: {
      benchmark: 'artificial_analysis_math_index',
      weight: 0.3
    },
  },

  /**
   * 어업/해상업 (FISHERY)
   * - 분석 및 예측
   * - 수학적 모델링
   */
  FISHERY: {
    primary: {
      benchmark: 'math_500',
      weight: 0.7
    },
    secondary: {
      benchmark: 'aime_25',  // AIME (American Invitational Mathematics Examination)
      weight: 0.3
    },
  },

  /**
   * 학생 (STUDENT)
   * - 학습 지원
   * - 코딩 학습
   */
  STUDENT: {
    primary: {
      benchmark: 'mmlu_pro',
      weight: 0.7
    },
    secondary: {
      benchmark: 'livecodebench',  // HumanEval 대체
      weight: 0.3
    },
  },

  /**
   * 기타 (OTHER)
   * - 종합 평가
   * - 범용성
   */
  OTHER: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7
    },
    secondary: {
      benchmark: 'livecodebench',
      weight: 0.3
    },
  },
};

/**
 * 직업 카테고리 코드로 벤치마크 매핑 조회
 */
export function getBenchmarkMapping(categoryCode: string): JobBenchmarkMapping | null {
  return JOB_BENCHMARK_MAPPING[categoryCode] || null;
}

/**
 * 모든 벤치마크 이름 목록 조회 (중복 제거)
 */
export function getAllBenchmarkNames(): string[] {
  const benchmarks = new Set<string>();

  Object.values(JOB_BENCHMARK_MAPPING).forEach(mapping => {
    benchmarks.add(mapping.primary.benchmark);
    benchmarks.add(mapping.secondary.benchmark);
  });

  return Array.from(benchmarks);
}

/**
 * 직업 카테고리 코드 목록 조회
 */
export function getJobCategoryCodes(): string[] {
  return Object.keys(JOB_BENCHMARK_MAPPING);
}
