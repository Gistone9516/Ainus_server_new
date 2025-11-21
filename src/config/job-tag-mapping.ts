/**
 * 직업 카테고리별 관련 태그 매핑
 *
 * 13개 직업 카테고리와 각각의 관련 AI 뉴스 태그를 매핑합니다.
 * 클러스터의 5개 태그 중 매칭되는 태그 수에 따라 직업별 관련도를 계산합니다.
 */

export const JOB_TAG_MAPPING: Record<string, string[]> = {
  '기술/개발': [
    'LLM',
    '컴퓨터비전',
    '자연어처리',
    '머신러닝',
    '코드생성',
    '모델경량화',
    '에지AI',
    '오픈소스',
  ],

  '창작/콘텐츠': [
    '콘텐츠생성',
    '이미지생성',
    '영상생성',
    '글쓰기지원',
    '마케팅자동화',
    '검색최적화',
  ],

  '분석/사무': [
    '데이터분석',
    '예측분석',
    '자동화',
    '업무효율화',
    '의사결정지원',
  ],

  '의료/과학': [
    '컴퓨터비전',
    '의료진단',
    '데이터분석',
    '머신러닝',
  ],

  '교육': [
    '채팅봇',
    '교육지원',
    '글쓰기지원',
    '자동화',
  ],

  '비즈니스': [
    '데이터분석',
    '예측분석',
    '의사결정지원',
    '자동화',
    '마케팅자동화',
    '가격결정',
  ],

  '제조/건설': [
    '컴퓨터비전',
    '자동화',
    '데이터분석',
    '모델경량화',
  ],

  '서비스': [
    '채팅봇',
    '감정분석',
    '자동화',
    '마케팅자동화',
  ],

  '창업/자영업': [
    '자동화',
    '업무효율화',
    '의사결정지원',
    '데이터분석',
    '비용절감',
  ],

  '농업/축산업': [
    '컴퓨터비전',
    '데이터분석',
    '자동화',
  ],

  '어업/해상업': [
    '데이터분석',
    '자동화',
    '예측분석',
  ],

  '학생': [
    '교육지원',
    '글쓰기지원',
    '코드생성',
    'LLM',
  ],

  '기타': [
    '기술트렌드',
    '자동화',
    '데이터분석',
  ],
};

/**
 * 모든 직업 카테고리 목록 (13개)
 */
export const JOB_CATEGORIES = Object.keys(JOB_TAG_MAPPING);

/**
 * 직업 카테고리 유효성 검증
 */
export function isValidJobCategory(category: string): boolean {
  return JOB_CATEGORIES.includes(category);
}

/**
 * 특정 직업의 관련 태그 조회
 */
export function getJobTags(jobCategory: string): string[] {
  return JOB_TAG_MAPPING[jobCategory] || [];
}

/**
 * 태그 매칭 계산
 * @param clusterTags 클러스터의 태그 (5개)
 * @param jobTags 직업의 관련 태그 목록
 * @returns 매칭된 태그와 매칭 비율
 */
export function calculateTagMatch(
  clusterTags: string[],
  jobTags: string[]
): {
  matchedTags: string[];
  matchRatio: number;
} {
  // 교집합 계산
  const matchedTags = clusterTags.filter((tag) => jobTags.includes(tag));

  // 매칭 비율 (0.0 ~ 1.0)
  const matchRatio = clusterTags.length > 0 ? matchedTags.length / clusterTags.length : 0;

  return {
    matchedTags,
    matchRatio,
  };
}
