/**
 * 표준화된 에러 코드 정의 (TASK-1-19)
 * 3자리 숫자 코드 + HTTP 상태 코드 매핑
 * 포맷: XYYY
 * X: 카테고리 (1=회원가입, 2=로그인, 3=토큰, 4=기타, 5=소셜)
 * YYY: 세부 에러
 */

export interface ErrorCodeDefinition {
  code: string; // 에러 코드 (예: "1001")
  message: string; // 기본 에러 메시지
  httpStatus: number; // HTTP 상태 코드
  category: string; // 에러 카테고리
  description: string; // 상세 설명
}

// 에러 코드 매핑 테이블
export const ERROR_CODES: Record<string, ErrorCodeDefinition> = {
  // ===== 1000번대: 회원가입 관련 =====
  '1001': {
    code: '1001',
    message: '이미 사용 중인 이메일입니다',
    httpStatus: 409, // Conflict
    category: '회원가입',
    description: 'Email already registered'
  },
  '1002': {
    code: '1002',
    message: '이미 사용 중인 닉네임입니다',
    httpStatus: 409,
    category: '회원가입',
    description: 'Nickname already taken'
  },
  '1003': {
    code: '1003',
    message: '비밀번호가 보안 정책을 충족하지 않습니다',
    httpStatus: 400, // Bad Request
    category: '회원가입',
    description: 'Password does not meet strength requirements'
  },
  '1004': {
    code: '1004',
    message: '유효한 이메일 형식이 아닙니다',
    httpStatus: 400,
    category: '회원가입',
    description: 'Invalid email format'
  },
  '1005': {
    code: '1005',
    message: '비밀번호 확인이 일치하지 않습니다',
    httpStatus: 400,
    category: '회원가입',
    description: 'Password confirmation mismatch'
  },
  '1006': {
    code: '1006',
    message: '필수 필드가 누락되었습니다',
    httpStatus: 400,
    category: '회원가입',
    description: 'Missing required field'
  },

  // ===== 2000번대: 로그인 관련 =====
  '2001': {
    code: '2001',
    message: '이메일 또는 비밀번호가 일치하지 않습니다',
    httpStatus: 401, // Unauthorized
    category: '로그인',
    description: 'Invalid email or password'
  },
  '2002': {
    code: '2002',
    message: '등록되지 않은 계정입니다',
    httpStatus: 404, // Not Found
    category: '로그인',
    description: 'Account not found'
  },
  '2003': {
    code: '2003',
    message: '계정이 일시적으로 잠금 처리되었습니다',
    httpStatus: 423, // Locked
    category: '로그인',
    description: 'Account temporarily locked due to multiple failed attempts'
  },
  '2004': {
    code: '2004',
    message: '비활성화된 계정입니다',
    httpStatus: 403, // Forbidden
    category: '로그인',
    description: 'Account is disabled'
  },
  '2005': {
    code: '2005',
    message: '의심스러운 로그인 시도입니다',
    httpStatus: 403,
    category: '로그인',
    description: 'Suspicious login attempt detected'
  },

  // ===== 3000번대: 토큰 관련 =====
  '3001': {
    code: '3001',
    message: '유효하지 않은 토큰입니다',
    httpStatus: 401,
    category: '토큰',
    description: 'Invalid or malformed token'
  },
  '3002': {
    code: '3002',
    message: '토큰이 만료되었습니다',
    httpStatus: 401,
    category: '토큰',
    description: 'Token has expired'
  },
  '3003': {
    code: '3003',
    message: '무효화된 토큰입니다',
    httpStatus: 401,
    category: '토큰',
    description: 'Token has been revoked or blacklisted'
  },

  // ===== 4000번대: Rate Limiting 및 기타 =====
  '4001': {
    code: '4001',
    message: '요청 횟수를 초과했습니다',
    httpStatus: 429, // Too Many Requests
    category: 'Rate Limiting',
    description: 'Rate limit exceeded'
  },
  '4002': {
    code: '4002',
    message: '비밀번호 재설정 토큰이 만료되었습니다',
    httpStatus: 401,
    category: '비밀번호 재설정',
    description: 'Password reset token has expired'
  },
  '4003': {
    code: '4003',
    message: '유효하지 않은 비밀번호 재설정 토큰입니다',
    httpStatus: 400,
    category: '비밀번호 재설정',
    description: 'Invalid password reset token'
  },
  '4004': {
    code: '4004',
    message: '이미 사용된 비밀번호 재설정 토큰입니다',
    httpStatus: 400,
    category: '비밀번호 재설정',
    description: 'Password reset token already used'
  },

  // ===== 5000번대: 소셜 로그인 (Phase 2) =====
  '5001': {
    code: '5001',
    message: 'Google 인증이 실패했습니다',
    httpStatus: 401,
    category: '소셜 로그인',
    description: 'Google OAuth authentication failed'
  },
  '5002': {
    code: '5002',
    message: '유효하지 않은 OAuth 상태입니다',
    httpStatus: 401,
    category: '소셜 로그인',
    description: 'Invalid OAuth state parameter'
  },
  '5003': {
    code: '5003',
    message: 'Kakao 인증이 실패했습니다',
    httpStatus: 401,
    category: '소셜 로그인',
    description: 'Kakao OAuth authentication failed'
  },
  '5004': {
    code: '5004',
    message: 'Naver 인증이 실패했습니다',
    httpStatus: 401,
    category: '소셜 로그인',
    description: 'Naver OAuth authentication failed'
  },
  '5005': {
    code: '5005',
    message: '이미 연동된 소셜 계정입니다',
    httpStatus: 409,
    category: '소셜 로그인',
    description: 'Social account already linked'
  },

  // ===== 6000번대: 모델 추천 (기능 #4) =====
  '6001': {
    code: '6001',
    message: '입력 텍스트가 너무 짧습니다 (최소 10자)',
    httpStatus: 400,
    category: '모델 추천',
    description: 'Input text is too short (minimum 10 characters)'
  },
  '6002': {
    code: '6002',
    message: '입력 텍스트가 너무 깁니다 (최대 150자)',
    httpStatus: 400,
    category: '모델 추천',
    description: 'Input text is too long (maximum 150 characters)'
  },
  '6003': {
    code: '6003',
    message: '유효하지 않은 문자가 포함되어 있습니다',
    httpStatus: 400,
    category: '모델 추천',
    description: 'Input contains invalid characters'
  },
  '6004': {
    code: '6004',
    message: 'SLM 분류 중 오류가 발생했습니다',
    httpStatus: 503,
    category: '모델 추천',
    description: 'SLM classification error'
  },
  '6005': {
    code: '6005',
    message: '유효하지 않은 카테고리 ID입니다',
    httpStatus: 400,
    category: '모델 추천',
    description: 'Invalid category ID (must be between 1 and 25)'
  },
  '6006': {
    code: '6006',
    message: '모델 데이터를 조회하는 중 오류가 발생했습니다',
    httpStatus: 500,
    category: '모델 추천',
    description: 'Failed to retrieve model data'
  },
  '6007': {
    code: '6007',
    message: '이 카테고리의 모델 정보가 아직 준비 중입니다',
    httpStatus: 404,
    category: '모델 추천',
    description: 'No models found for this category'
  },
  '6008': {
    code: '6008',
    message: '유효하지 않은 limit 값입니다 (1~10)',
    httpStatus: 400,
    category: '모델 추천',
    description: 'Invalid limit value (must be between 1 and 10)'
  },
  '6009': {
    code: '6009',
    message: 'SLM 신뢰도가 낮아 대체 옵션을 제시합니다',
    httpStatus: 200,
    category: '모델 추천',
    description: 'SLM confidence is low, showing alternatives'
  },

  // ===== 9000번대: 서버 에러 =====
  '9001': {
    code: '9001',
    message: '데이터베이스 오류가 발생했습니다',
    httpStatus: 500, // Internal Server Error
    category: '서버 에러',
    description: 'Database operation failed'
  },
  '9002': {
    code: '9002',
    message: '외부 API 요청이 실패했습니다',
    httpStatus: 502, // Bad Gateway
    category: '서버 에러',
    description: 'External API request failed'
  },
  '9003': {
    code: '9003',
    message: '요청 처리 중 타임아웃이 발생했습니다',
    httpStatus: 504, // Gateway Timeout
    category: '서버 에러',
    description: 'Request processing timeout'
  },
  '9999': {
    code: '9999',
    message: '알 수 없는 오류가 발생했습니다',
    httpStatus: 500,
    category: '서버 에러',
    description: 'Unknown error occurred'
  }
};

/**
 * 에러 코드로부터 에러 정의 조회
 */
export function getErrorDefinition(code: string): ErrorCodeDefinition | undefined {
  return ERROR_CODES[code];
}

/**
 * 에러 코드 유효성 검증
 */
export function isValidErrorCode(code: string): boolean {
  return code in ERROR_CODES;
}

/**
 * 에러 코드 목록 조회
 */
export function getErrorCodesByCategory(category: string): ErrorCodeDefinition[] {
  return Object.values(ERROR_CODES).filter(err => err.category === category);
}

/**
 * 모든 카테고리 조회
 */
export function getAllCategories(): string[] {
  const categories = new Set(Object.values(ERROR_CODES).map(err => err.category));
  return Array.from(categories).sort();
}
