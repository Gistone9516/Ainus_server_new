/**
 * 모델 추천 서비스 유틸리티 함수
 * 입력 검증, 정규화, 점수 계산 등
 */

import { ValidationException } from '../exceptions';

/**
 * 사용자 입력 유효성 검증
 * - 길이: 10자 이상 150자 이하
 * - 문자: 한글, 영문, 숫자, 공백만 허용
 */
export function validateUserInput(input: string, methodName: string): void {
  // Null/Undefined 체크
  if (!input || typeof input !== 'string') {
    throw new ValidationException(
      '사용자 입력이 필수입니다 (ERROR_1006)',
      methodName
    );
  }

  // 길이 검증
  const trimmedInput = input.trim();
  if (trimmedInput.length < 10) {
    throw new ValidationException(
      '입력 텍스트가 너무 짧습니다 (최소 10자) (ERROR_6001)',
      methodName
    );
  }
  if (trimmedInput.length > 150) {
    throw new ValidationException(
      '입력 텍스트가 너무 깁니다 (최대 150자) (ERROR_6002)',
      methodName
    );
  }

  // 문자 유효성 검증 (한글, 영문, 숫자, 공백, 기본 구두점)
  // 허용: 한글(가-힣), 영문(a-zA-Z), 숫자(0-9), 공백, 마침표, 쉼표, 물음표, 감탄표
  const validPattern = /^[가-힣a-zA-Z0-9\s.,?!]*$/;
  if (!validPattern.test(trimmedInput)) {
    throw new ValidationException(
      '유효하지 않은 문자가 포함되어 있습니다 (ERROR_6003)',
      methodName
    );
  }
}

/**
 * 사용자 입력 정규화
 * - 앞뒤 공백 제거
 * - 연속 공백을 1개로 통일
 * - 소문자 변환 (영문만)
 */
export function normalizeUserInput(input: string): string {
  return input
    .trim()                              // 앞뒤 공백 제거
    .replace(/\s+/g, ' ')                // 연속 공백을 1개로
    .toLowerCase();                      // 소문자 변환 (영문만, 한글은 영향 없음)
}

/**
 * 카테고리 ID 유효성 검증
 * - 범위: 1 ~ 25
 */
export function validateCategoryId(categoryId: number, methodName: string): void {
  if (!Number.isInteger(categoryId) || categoryId < 1 || categoryId > 25) {
    throw new ValidationException(
      '유효하지 않은 카테고리 ID입니다 (ERROR_6005)',
      methodName
    );
  }
}

/**
 * Limit 파라미터 유효성 검증
 * - 범위: 1 ~ 10
 * - 기본값: 5
 */
export function validateAndNormalizeLimit(limit: number | undefined, methodName: string): number {
  const normalizedLimit = limit ?? 5;

  if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1 || normalizedLimit > 10) {
    throw new ValidationException(
      '유효하지 않은 limit 값입니다 (1~10) (ERROR_6008)',
      methodName
    );
  }

  return normalizedLimit;
}

/**
 * Top_k 파라미터 유효성 검증
 * - 범위: 1 ~ 5
 * - 기본값: 3
 */
export function validateAndNormalizeTopK(topK: number | undefined, methodName: string): number {
  const normalizedTopK = topK ?? 3;

  if (!Number.isInteger(normalizedTopK) || normalizedTopK < 1 || normalizedTopK > 5) {
    throw new ValidationException(
      '유효하지 않은 top_k 값입니다 (1~5) (ERROR_6008)',
      methodName
    );
  }

  return normalizedTopK;
}

/**
 * 신뢰도 기반 확신도 판단
 * - confidence >= 0.70: 확신 있음
 * - confidence < 0.70: 확신 없음
 */
export function isConfident(confidence: number): boolean {
  return confidence >= 0.70;
}

/**
 * 신뢰도를 퍼센트로 변환 (0.0~1.0 -> 0~100)
 */
export function normalizeConfidence(confidence: number): number {
  return Math.round(confidence * 100) / 100;
}

/**
 * 개인화 점수 계산
 * - 기본 점수 × 가중치
 * - 상한선: 100
 */
export function calculatePersonalizedScore(
  baseScore: number,
  boostWeight: number
): number {
  const personalized = baseScore * boostWeight;
  return Math.min(personalized, 100);
}

/**
 * 최종 점수 계산 (반올림)
 */
export function calculateFinalScore(
  baseScore: number,
  boostWeight?: number
): number {
  if (!boostWeight || boostWeight === 1.0) {
    return Math.round(baseScore * 100) / 100;
  }

  const personalized = baseScore * boostWeight;
  const final = Math.min(personalized, 100);
  return Math.round(final * 100) / 100;
}

/**
 * 캐시 키 생성 함수
 */
export function generateCacheKey(type: 'slm' | 'category' | 'recommend', input: string | number, userId?: string): string {
  if (type === 'slm') {
    return `slm:classify:${hashInput(input.toString())}`;
  } else if (type === 'category') {
    return `category:${input}:models`;
  } else {
    return `recommend:${userId || 'anonymous'}:${input}`;
  }
}

/**
 * 간단한 해시 함수 (캐시 키용)
 */
function hashInput(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * User ID 유효성 검증 (UUID 또는 숫자)
 */
export function validateUserId(userId: string | undefined, methodName: string): void {
  if (!userId) return; // 선택사항이므로 없으면 OK

  // UUID 패턴 (36자, 하이픈 포함)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 숫자 패턴
  const numPattern = /^\d+$/;

  if (!uuidPattern.test(userId) && !numPattern.test(userId)) {
    throw new ValidationException(
      '유효하지 않은 user_id 형식입니다 (ERROR_1006)',
      methodName
    );
  }
}

/**
 * 타임스탬프 생성
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
