/**
 * 작업 카테고리별 벤치마크 매핑 설정
 *
 * 각 작업 카테고리마다 중요한 벤치마크 2개를 지정하고 가중치를 부여합니다.
 * - primary: 1순위 벤치마크 (가중치 70%)
 * - secondary: 2순위 벤치마크 (가중치 30%)
 *
 * 벤치마크 이름은 model_evaluations 테이블의 benchmark_name 컬럼과 일치해야 합니다.
 */

export interface BenchmarkConfig {
  benchmark: string;
  weight: number;
}

export interface TaskBenchmarkMapping {
  primary: BenchmarkConfig;
  secondary: BenchmarkConfig;
}

/**
 * 작업 카테고리 코드별 벤치마크 매핑
 */
export const TASK_BENCHMARK_MAPPING: Record<string, TaskBenchmarkMapping> = {
  /**
   * 글쓰기 (WRITING)
   * - 종합 지능과 언어 능력
   * - 다양한 분야 지식
   */
  WRITING: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 이미지 작업 (IMAGE_GEN)
   * - 창의적 사고
   * - 안전한 콘텐츠 생성
   */
  IMAGE_GEN: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'hle',
      weight: 0.3,
    },
  },

  /**
   * 코딩/개발 (CODING)
   * - 코딩 능력이 가장 중요
   * - 실전 코딩 테스트 성능
   */
  CODING: {
    primary: {
      benchmark: 'artificial_analysis_coding_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'livecodebench',
      weight: 0.3,
    },
  },

  /**
   * 영상 제작 (VIDEO_PROD)
   * - 창의적 기획 능력
   * - 다양한 지식
   */
  VIDEO_PROD: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 음악/오디오 (AUDIO_MUSIC)
   * - 창의적 사고
   * - 종합 지능
   */
  AUDIO_MUSIC: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 번역 (TRANSLATION)
   * - 언어 능력
   * - 안전한 번역
   */
  TRANSLATION: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'hle',
      weight: 0.3,
    },
  },

  /**
   * 요약/정리 (SUMMARIZATION)
   * - 언어 이해 능력
   * - 핵심 파악
   */
  SUMMARIZATION: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 연구/조사 (RESEARCH)
   * - 전문 지식 추론
   * - 복잡한 추론 능력
   */
  RESEARCH: {
    primary: {
      benchmark: 'gpqa',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'tau2',
      weight: 0.3,
    },
  },

  /**
   * 학습/교육 (LEARNING)
   * - 다양한 분야 지식
   * - 종합 지능
   */
  LEARNING: {
    primary: {
      benchmark: 'mmlu_pro',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.3,
    },
  },

  /**
   * 창작/아이디어 (BRAINSTORMING)
   * - 창의적 사고
   * - 복잡한 추론
   */
  BRAINSTORMING: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'tau2',
      weight: 0.3,
    },
  },

  /**
   * 분석 (ANALYSIS)
   * - 수학적 분석 능력
   * - 전문 지식
   */
  ANALYSIS: {
    primary: {
      benchmark: 'artificial_analysis_math_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'gpqa',
      weight: 0.3,
    },
  },

  /**
   * 고객 응대 (CUSTOMER_SERVICE)
   * - 언어 능력
   * - 안전한 응대
   */
  CUSTOMER_SERVICE: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'hle',
      weight: 0.3,
    },
  },

  /**
   * 디자인/UI-UX (DESIGN_UI_UX)
   * - 창의적 사고
   * - 안전한 디자인
   */
  DESIGN_UI_UX: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'hle',
      weight: 0.3,
    },
  },

  /**
   * 마케팅 (MARKETING)
   * - 종합 지능
   * - 다양한 지식
   */
  MARKETING: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 요리 (COOKING)
   * - 종합 지능
   * - 다양한 지식
   */
  COOKING: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 운동/피트니스 (FITNESS)
   * - 종합 지능
   * - 다양한 지식
   */
  FITNESS: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 여행 계획 (TRAVEL)
   * - 종합 지능
   * - 다양한 지식
   */
  TRAVEL: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 일정 관리 (PLANNING)
   * - 종합 지능
   * - 추론 능력
   */
  PLANNING: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'tau2',
      weight: 0.3,
    },
  },

  /**
   * 수학/과학 (MATH_SCIENCE)
   * - 수학 능력
   * - 고급 수학 문제
   */
  MATH_SCIENCE: {
    primary: {
      benchmark: 'artificial_analysis_math_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'aime_25',
      weight: 0.3,
    },
  },

  /**
   * 법률/계약 (LEGAL)
   * - 전문 지식
   * - 종합 지능
   */
  LEGAL: {
    primary: {
      benchmark: 'mmlu_pro',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.3,
    },
  },

  /**
   * 재무/회계 (FINANCE)
   * - 수학 능력
   * - 다양한 지식
   */
  FINANCE: {
    primary: {
      benchmark: 'artificial_analysis_math_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 인적자원/채용 (HR_RECRUITMENT)
   * - 종합 지능
   * - 다양한 지식
   */
  HR_RECRUITMENT: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 프레젠테이션 (PRESENTATION)
   * - 종합 지능
   * - 다양한 지식
   */
  PRESENTATION: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'mmlu_pro',
      weight: 0.3,
    },
  },

  /**
   * 게임 (GAMING)
   * - 종합 지능
   * - 코딩 능력
   */
  GAMING: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'livecodebench',
      weight: 0.3,
    },
  },

  /**
   * 음성 명령/작업 (VOICE_ACTION)
   * - 종합 지능
   * - 터미널/실행 능력
   */
  VOICE_ACTION: {
    primary: {
      benchmark: 'artificial_analysis_intelligence_index',
      weight: 0.7,
    },
    secondary: {
      benchmark: 'terminalbench_hard',
      weight: 0.3,
    },
  },
};

/**
 * 작업 카테고리 코드로 벤치마크 매핑 조회
 */
export function getTaskBenchmarkMapping(
  categoryCode: string
): TaskBenchmarkMapping | null {
  return TASK_BENCHMARK_MAPPING[categoryCode] || null;
}

/**
 * 모든 벤치마크 이름 목록 조회 (중복 제거)
 */
export function getAllTaskBenchmarkNames(): string[] {
  const benchmarks = new Set<string>();

  Object.values(TASK_BENCHMARK_MAPPING).forEach((mapping) => {
    benchmarks.add(mapping.primary.benchmark);
    benchmarks.add(mapping.secondary.benchmark);
  });

  return Array.from(benchmarks);
}

/**
 * 작업 카테고리 코드 목록 조회
 */
export function getTaskCategoryCodes(): string[] {
  return Object.keys(TASK_BENCHMARK_MAPPING);
}
