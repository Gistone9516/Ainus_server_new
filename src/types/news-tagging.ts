/**
 * AI 뉴스 기사 태그 분류 시스템 타입 정의
 */

// ============ DB 조회 타입 ============

/**
 * news_articles 테이블에서 조회한 기사 데이터
 */
export interface NewsArticleFromDB {
  article_id: number;
  article_index: number;
  title: string;
  link: string;
  description: string;
  pub_date: Date;
  collected_at: Date;
}

// ============ 전처리 타입 ============

/**
 * GPT API 입력용 전처리된 기사 데이터
 */
export interface PreprocessedArticleForTagging {
  index: number;
  title: string;
  description: string;
}

/**
 * GPT API 입력 형식
 */
export interface TaggingGPTInput {
  articles: PreprocessedArticleForTagging[];
}

/**
 * 전처리 결과 (GPT 입력 + article_id 매핑)
 */
export interface PreprocessingResult {
  gptInput: TaggingGPTInput;
  articleIdMap: Map<number, number>; // article_index → article_id
}

// ============ GPT 응답 타입 ============

/**
 * GPT가 반환하는 단일 기사 분류 결과
 */
export interface TaggingResult {
  article_index: number;
  tags: string[]; // 정확히 5개
  confidence_scores: number[]; // 정확히 5개 (0.00-1.00)
}

/**
 * GPT Assistant API 전체 응답
 */
export interface GPTTaggingResponse {
  classifications: TaggingResult[];
  raw_response: string;
  processed_at: string;
}

// ============ 검증 타입 ============

/**
 * 검증 결과
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============ DB 저장 타입 ============

/**
 * DB 저장 입력 데이터
 */
export interface SaveTaggingInput {
  preprocessedArticles: PreprocessedArticleForTagging[];
  taggingResult: GPTTaggingResponse;
  articleIdMap: Map<number, number>;
}

/**
 * interest_tags 테이블 매핑 정보
 */
export interface TagMappingInfo {
  tag_id: number;
  tag_name: string;
  tag_code: string;
}

// ============ 파이프라인 타입 ============

/**
 * 태그 분류 파이프라인 옵션
 */
export interface TaggingPipelineOptions {
  collectedAt?: Date;      // 특정 시간대 필터
  limit?: number;          // 최대 처리 개수
  batchSize?: number;      // 배치 크기 (기본 1000)
}

/**
 * 파이프라인 실행 결과
 */
export interface TaggingPipelineResult {
  status: 'success' | 'failure';
  message: string;
  executedAt: string;
  articlesProcessed: number;
  tagsMapped: number;
  duration: number;
  error?: string;
}

// ============ 상수 ============

/**
 * 40개 표준 태그 목록
 */
export const VALID_TAGS = [
  // 기술 중심 (12개)
  'LLM',
  '컴퓨터비전',
  '자연어처리',
  '머신러닝',
  '강화학습',
  '연합학습',
  '모델경량화',
  '프롬프트엔지니어링',
  '에지AI',
  '윤리AI',
  'AI보안',
  '개인화추천',

  // 산업/응용 중심 (18개)
  '콘텐츠생성',
  '이미지생성',
  '영상생성',
  '코드생성',
  '글쓰기지원',
  '번역',
  '음성합성',
  '음성인식',
  '채팅봇',
  '감정분석',
  '데이터분석',
  '예측분석',
  '자동화',
  '업무효율화',
  '의사결정지원',
  '마케팅자동화',
  '검색최적화',
  '가격결정',

  // 트렌드/산업이슈 중심 (10개)
  'AI일자리',
  'AI윤리',
  'AI규제',
  'AI성능',
  '모델출시',
  '오픈소스',
  '의료진단',
  '교육지원',
  '비용절감',
  '기술트렌드',
] as const;

/**
 * 태그 타입 (타입 체크용)
 */
export type ValidTag = typeof VALID_TAGS[number];
