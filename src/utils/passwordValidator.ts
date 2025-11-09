/**
 * TASK-1-8: 비밀번호 강도 검증 유틸리티
 * agent_exception_handling_guide.md 규칙 준수
 */

import { ValidationException } from '../exceptions';

/**
 * 비밀번호 강도 등급
 */
export enum PasswordStrength {
  VERY_WEAK = 0,  // 0-1개 조건 충족
  WEAK = 1,       // 2개 조건 충족
  FAIR = 2,       // 3개 조건 충족
  STRONG = 3,     // 모든 조건 충족
  VERY_STRONG = 4 // 모든 조건 + 12자 이상
}

/**
 * 비밀번호 강도 검증 결과
 */
export interface PasswordValidationResult {
  strength: PasswordStrength;
  isValid: boolean;
  score: number;
  feedback: string[];
  requirements: {
    lowercase: boolean;      // a-z 포함
    uppercase: boolean;      // A-Z 포함
    numbers: boolean;        // 0-9 포함
    specialChars: boolean;   // !@#$%^&*()_+-=[]{}|;:,.<>? 포함
    minLength: boolean;      // 최소 8자
    maxLength: boolean;      // 최대 72자
  };
}

/**
 * TASK-1-8: 비밀번호 강도 검증
 * 정규식: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,72}$/
 *
 * @param password 검증할 비밀번호
 * @returns 검증 결과
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const methodName = 'validatePasswordStrength';

  // 1단계: 입력 검증
  if (!password || typeof password !== 'string') {
    throw new ValidationException(
      '비밀번호는 문자열이어야 합니다',
      methodName
    );
  }

  // 2단계: 길이 검증
  const requirements = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    specialChars: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
    minLength: password.length >= 8,
    maxLength: password.length <= 72
  };

  // 길이 검증 실패
  if (!requirements.minLength) {
    return {
      strength: PasswordStrength.VERY_WEAK,
      isValid: false,
      score: 0,
      feedback: ['비밀번호는 최소 8자 이상이어야 합니다'],
      requirements
    };
  }

  if (!requirements.maxLength) {
    return {
      strength: PasswordStrength.VERY_WEAK,
      isValid: false,
      score: 0,
      feedback: ['비밀번호는 최대 72자 이하여야 합니다'],
      requirements
    };
  }

  // 3단계: 강도 계산
  const conditionsMet = Object.values(requirements).filter(v => v).length;
  let strength: PasswordStrength;
  let isValid = false;
  let score = 0;
  const feedback: string[] = [];

  // 강도 등급 판정
  switch (conditionsMet) {
    case 6:
      strength = password.length >= 12
        ? PasswordStrength.VERY_STRONG
        : PasswordStrength.STRONG;
      isValid = true;
      score = strength === PasswordStrength.VERY_STRONG ? 100 : 90;
      break;
    case 5:
      strength = PasswordStrength.STRONG;
      isValid = true;
      score = 85;
      break;
    case 4:
      strength = PasswordStrength.FAIR;
      isValid = true;
      score = 70;
      break;
    case 3:
      strength = PasswordStrength.WEAK;
      isValid = false;
      score = 50;
      break;
    default:
      strength = PasswordStrength.VERY_WEAK;
      isValid = false;
      score = 25;
  }

  // 4단계: 피드백 생성
  if (!requirements.lowercase) {
    feedback.push('소문자(a-z)를 포함해주세요');
  }
  if (!requirements.uppercase) {
    feedback.push('대문자(A-Z)를 포함해주세요');
  }
  if (!requirements.numbers) {
    feedback.push('숫자(0-9)를 포함해주세요');
  }
  if (!requirements.specialChars) {
    feedback.push('특수문자(!@#$%^&* 등)를 포함해주세요');
  }

  if (isValid && feedback.length === 0) {
    feedback.push('강력한 비밀번호입니다');
  }

  return {
    strength,
    isValid,
    score,
    feedback,
    requirements
  };
}

/**
 * 강력한 비밀번호인지 확인 (정책: STRONG 이상)
 */
export function isStrongPassword(password: string): boolean {
  const result = validatePasswordStrength(password);
  return result.strength >= PasswordStrength.STRONG;
}

/**
 * 비밀번호 강도 라벨 반환
 */
export function getPasswordStrengthLabel(strength: PasswordStrength): string {
  const labels: Record<PasswordStrength, string> = {
    [PasswordStrength.VERY_WEAK]: '매우 약함',
    [PasswordStrength.WEAK]: '약함',
    [PasswordStrength.FAIR]: '보통',
    [PasswordStrength.STRONG]: '강함',
    [PasswordStrength.VERY_STRONG]: '매우 강함'
  };
  return labels[strength];
}
