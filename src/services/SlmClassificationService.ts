/**
 * SLM (Small Language Model) 분류 서비스
 * 사용자 입력을 25개 표준 카테고리로 분류
 *
 * 현재: 모의 구현 (SageMaker 준비 전)
 * 향후: AWS SageMaker 엔드포인트로 교체 가능
 */

import { ExternalAPIException, ValidationException } from '../exceptions';
import { validateUserInput, normalizeUserInput, validateAndNormalizeTopK } from '../utils/modelRecommendationUtils';
import { SLMClassificationResult } from '../types';
import { getRedisCache } from '../database/redis';
import { generateCacheKey } from '../utils/modelRecommendationUtils';

/**
 * 카테고리 기본 데이터 (모의용)
 */
const MOCK_CATEGORIES = [
  { id: 1, name: '글쓰기', name_en: 'Writing', description: '블로그, 이메일, 보고서 등 텍스트 작성' },
  { id: 2, name: '이미지 작업', name_en: 'Image', description: '이미지 편집, 생성, 분석' },
  { id: 3, name: '코딩/개발', name_en: 'Coding', description: '코드 작성, 디버깅, 리팩토링' },
  { id: 4, name: '번역', name_en: 'Translation', description: '다국어 번역, 현지화' },
  { id: 5, name: '요약/분석', name_en: 'Summary', description: '텍스트 요약, 데이터 분석' },
  { id: 6, name: '마케팅', name_en: 'Marketing', description: '광고 카피, 캠페인 기획' },
  { id: 7, name: '교육/튜토리얼', name_en: 'Education', description: '학습 자료, 설명, 가이드' },
  { id: 8, name: '창작/아이디어', name_en: 'Creativity', description: '스토리, 아이디어 생성' },
  { id: 9, name: '법률/계약', name_en: 'Legal', description: '계약서, 법률 문서 분석' },
  { id: 10, name: '재무/회계', name_en: 'Finance', description: '재무 분석, 회계, 예산' },
  { id: 11, name: '과학/수학', name_en: 'Science', description: '과학, 수학 문제 풀이' },
  { id: 12, name: '비즈니스/경영', name_en: 'Business', description: '전략, 의사결정, 조직 관리' },
  { id: 13, name: '건강/의료', name_en: 'Health', description: '건강 정보, 의료 조언' },
  { id: 14, name: '여행/문화', name_en: 'Travel', description: '여행 계획, 문화 정보' },
  { id: 15, name: '요리/음식', name_en: 'Food', description: '레시피, 요리법, 음식 정보' },
  { id: 16, name: '음악/오디오', name_en: 'Audio', description: '음악 작곡, 오디오 편집' },
  { id: 17, name: '비디오/영상', name_en: 'Video', description: '영상 편집, 스크립트 작성' },
  { id: 18, name: '게임 개발', name_en: 'Gaming', description: '게임 디자인, 개발' },
  { id: 19, name: '데이터 분석', name_en: 'Data Analysis', description: '통계, 데이터 시각화' },
  { id: 20, name: '인공지능/ML', name_en: 'AI/ML', description: '머신러닝, AI 모델 개발' },
  { id: 21, name: '고객 서비스', name_en: 'Support', description: '고객 응답, 지원, 불만 해결' },
  { id: 22, name: '인사/HR', name_en: 'HR', description: '채용, 성과 평가, 교육' },
  { id: 23, name: '운영/물류', name_en: 'Operations', description: '운영 최적화, 공급망 관리' },
  { id: 24, name: '환경/지속가능', name_en: 'Sustainability', description: '환경 이슈, ESG 관련' },
  { id: 25, name: '기타', name_en: 'Other', description: '분류되지 않은 기타 주제' }
];

/**
 * 모의 SLM 분류 (키워드 기반 매칭)
 * 실제 SageMaker 준비 후 교체 가능하도록 설계
 */
function mockSLMClassify(input: string): { categoryId: number; confidence: number } {
  const lowerInput = input.toLowerCase();

  // 키워드 매핑 (간단한 규칙 기반)
  const keywordMap: Record<string, { categoryId: number; weight: number }[]> = {
    // 글쓰기
    '글': [{ categoryId: 1, weight: 0.9 }],
    '쓰': [{ categoryId: 1, weight: 0.85 }],
    '블로그': [{ categoryId: 1, weight: 0.95 }],
    'write': [{ categoryId: 1, weight: 0.9 }],
    'email': [{ categoryId: 1, weight: 0.85 }],
    'report': [{ categoryId: 1, weight: 0.9 }],
    'content': [{ categoryId: 1, weight: 0.8 }],

    // 이미지
    '이미지': [{ categoryId: 2, weight: 0.95 }],
    '그림': [{ categoryId: 2, weight: 0.9 }],
    '편집': [{ categoryId: 2, weight: 0.85 }],
    'image': [{ categoryId: 2, weight: 0.95 }],
    'photo': [{ categoryId: 2, weight: 0.9 }],
    'design': [{ categoryId: 2, weight: 0.8 }],

    // 코딩
    '코딩': [{ categoryId: 3, weight: 0.95 }],
    '개발': [{ categoryId: 3, weight: 0.9 }],
    '프로그래밍': [{ categoryId: 3, weight: 0.95 }],
    'code': [{ categoryId: 3, weight: 0.95 }],
    'programming': [{ categoryId: 3, weight: 0.95 }],
    'javascript': [{ categoryId: 3, weight: 0.98 }],
    'python': [{ categoryId: 3, weight: 0.98 }],
    'debug': [{ categoryId: 3, weight: 0.9 }],

    // 번역
    '번역': [{ categoryId: 4, weight: 0.98 }],
    '영문': [{ categoryId: 4, weight: 0.8 }],
    'translate': [{ categoryId: 4, weight: 0.98 }],
    'english': [{ categoryId: 4, weight: 0.7 }],

    // 요약
    '요약': [{ categoryId: 5, weight: 0.95 }],
    '분석': [{ categoryId: 5, weight: 0.85 }],
    'summary': [{ categoryId: 5, weight: 0.95 }],
    'analyze': [{ categoryId: 5, weight: 0.85 }],

    // 마케팅
    '마케팅': [{ categoryId: 6, weight: 0.98 }],
    '광고': [{ categoryId: 6, weight: 0.9 }],
    '캠페인': [{ categoryId: 6, weight: 0.9 }],
    'marketing': [{ categoryId: 6, weight: 0.98 }],

    // 교육
    '교육': [{ categoryId: 7, weight: 0.9 }],
    '튜토리얼': [{ categoryId: 7, weight: 0.95 }],
    '가이드': [{ categoryId: 7, weight: 0.85 }],
    'tutorial': [{ categoryId: 7, weight: 0.95 }],

    // 창작
    '스토리': [{ categoryId: 8, weight: 0.9 }],
    '아이디어': [{ categoryId: 8, weight: 0.85 }],
    '창작': [{ categoryId: 8, weight: 0.95 }],
    'story': [{ categoryId: 8, weight: 0.9 }],
    'creative': [{ categoryId: 8, weight: 0.85 }],

    // 요리
    '요리': [{ categoryId: 15, weight: 0.98 }],
    '음식': [{ categoryId: 15, weight: 0.9 }],
    '레시피': [{ categoryId: 15, weight: 0.98 }],
    'recipe': [{ categoryId: 15, weight: 0.98 }],
    'cooking': [{ categoryId: 15, weight: 0.98 }],

    // 비즈니스
    '비즈니스': [{ categoryId: 12, weight: 0.95 }],
    '경영': [{ categoryId: 12, weight: 0.9 }],
    '전략': [{ categoryId: 12, weight: 0.85 }],
    'business': [{ categoryId: 12, weight: 0.95 }],

    // 데이터
    '데이터': [{ categoryId: 19, weight: 0.9 }],
    '통계': [{ categoryId: 19, weight: 0.9 }],
    'data': [{ categoryId: 19, weight: 0.9 }],
  };

  // 키워드 매칭 및 점수 계산
  let bestMatch = { categoryId: 25, confidence: 0.3 }; // 기본값: 기타 (낮은 신뢰도)
  let maxScore = 0.3;

  for (const [keyword, matches] of Object.entries(keywordMap)) {
    if (lowerInput.includes(keyword)) {
      const match = matches[0];
      if (match.weight > maxScore) {
        maxScore = match.weight;
        bestMatch = { categoryId: match.categoryId, confidence: match.weight };
      }
    }
  }

  // 키워드 매칭 없으면 기본값으로 약간 높인 신뢰도 반환
  if (maxScore === 0.3) {
    bestMatch.confidence = 0.5;
  }

  return bestMatch;
}

/**
 * SLM으로 사용자 입력 분류
 */
export async function classifyUserInput(
  userInput: string,
  methodName: string
): Promise<SLMClassificationResult> {
  // 입력 검증
  try {
    validateUserInput(userInput, methodName);
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 입력 정규화
  const normalizedInput = normalizeUserInput(userInput);

  // 캐시 조회
  try {
    const cacheKey = generateCacheKey('slm', normalizedInput);
    const cachedResult = await getRedisCache().getJson<SLMClassificationResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
  } catch (error) {
    // 캐시 실패는 무시하고 계속 진행
  }

  // SLM 분류 실행
  let classification: SLMClassificationResult;
  try {
    // TODO: SageMaker 엔드포인트 준비 시 다음 코드로 교체
    // const response = await callSageMakerEndpoint(normalizedInput);
    // const result = response.prediction;

    // 현재: 모의 구현
    const mockResult = mockSLMClassify(normalizedInput);
    const category = MOCK_CATEGORIES[mockResult.categoryId - 1];

    classification = {
      category_id: mockResult.categoryId,
      category_name: category.name,
      category_en: category.name_en,
      confidence: mockResult.confidence,
      is_confident: mockResult.confidence >= 0.70,
      reasoning: `"${userInput}" 입력으로부터 추출된 키워드를 기반으로 분류`
    };
  } catch (error) {
    throw new ExternalAPIException(
      `SLM 분류 중 오류가 발생했습니다 (ERROR_6004): ${error}`,
      methodName
    );
  }

  // 캐시에 저장
  try {
    const cacheKey = generateCacheKey('slm', normalizedInput);
    await getRedisCache().setJson(cacheKey, classification, 6 * 3600); // 6시간 TTL
  } catch (error) {
    // 캐시 저장 실패는 무시
  }

  return classification;
}

/**
 * SLM으로 사용자 입력을 분류하고 대체 옵션 제공
 * (신뢰도 < 0.70일 때)
 */
export async function classifyWithAlternatives(
  userInput: string,
  topK: number = 3,
  methodName: string = 'classifyWithAlternatives'
): Promise<SLMClassificationResult> {
  // Normalize topK
  try {
    topK = validateAndNormalizeTopK(topK, methodName);
  } catch (error) {
    topK = 3;
  }

  // 기본 분류 수행
  const primaryClassification = await classifyUserInput(userInput, methodName);

  // 신뢰도가 높으면 그대로 반환
  if (primaryClassification.is_confident) {
    return primaryClassification;
  }

  // 신뢰도가 낮으면 대체 옵션 생성 (모의 구현)
  const alternatives = MOCK_CATEGORIES
    .slice(0, topK)
    .map((cat, index) => ({
      rank: index + 1,
      category_id: cat.id,
      category_name: cat.name,
      confidence: 0.6 - index * 0.05, // 감소하는 신뢰도
      description: cat.description
    }));

  return {
    ...primaryClassification,
    alternatives
  };
}

/**
 * 모든 카테고리 조회
 */
export function getAllCategories() {
  return MOCK_CATEGORIES.map(cat => ({
    id: cat.id,
    code: String(cat.id).padStart(3, '0'),
    name: cat.name,
    name_en: cat.name_en,
    description: cat.description
  }));
}

/**
 * 특정 카테고리 조회
 */
export function getCategoryById(categoryId: number) {
  const category = MOCK_CATEGORIES.find(cat => cat.id === categoryId);
  if (!category) return null;

  return {
    id: category.id,
    code: String(category.id).padStart(3, '0'),
    name: category.name,
    name_en: category.name_en,
    description: category.description
  };
}

/**
 * NOTE: SageMaker 엔드포인트 준비 시 다음 함수 구현
 * async function callSageMakerEndpoint(input: string) {
 *   const endpoint = process.env.SLM_ENDPOINT;
 *   if (!endpoint) {
 *     throw new Error('SLM_ENDPOINT not configured');
 *   }
 *
 *   const response = await fetch(endpoint, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ user_input: input }),
 *     timeout: 5000
 *   });
 *
 *   if (!response.ok) {
 *     throw new Error(`SageMaker API error: ${response.statusCode}`);
 *   }
 *
 *   return await response.json();
 * }
 */
