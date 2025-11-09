/**
 * Agent AI 메서드 단위 정규화된 예외 처리 전략
 * 각 메서드마다 독립적인 예외 처리로 문제 발생 지점 명확화
 */

export interface ExceptionDict {
  error_code: string;
  error_message: string;
  failed_method: string;
  retry_possible: boolean;
  timestamp: string;
}

/**
 * 모든 Agent 예외의 기본 클래스
 * 목표:
 *  - 각 메서드마다 명확한 예외 타입
 *  - 문제 발생 지점 명확화
 *  - 재시도 가능 여부 자동 판단
 */
export class AgentException extends Error {
  public readonly code: string;
  public readonly message: string;
  public readonly method: string;
  public readonly retry_able: boolean;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    method: string,
    retry_able: boolean = false
  ) {
    super(message);
    this.code = code;
    this.message = message;
    this.method = method;
    this.retry_able = retry_able;
    this.timestamp = new Date();

    // prototype chain 유지 (TypeScript)
    Object.setPrototypeOf(this, AgentException.prototype);
  }

  /**
   * 예외를 JSON 딕셔너리로 변환
   * API 응답 및 로깅에 사용
   */
  public toDict(): ExceptionDict {
    return {
      error_code: this.code,
      error_message: this.message,
      failed_method: this.method,
      retry_possible: this.retry_able,
      timestamp: this.timestamp.toISOString()
    };
  }
}

/**
 * 입력 검증 실패
 * 재시도 불가능: 사용자 입력 수정 필요
 */
export class ValidationException extends AgentException {
  constructor(message: string, method: string) {
    super("VALIDATION_ERROR", message, method, false);
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

/**
 * 외부 API 호출 실패
 * 재시도 가능: 일시적 오류일 수 있음
 */
export class ExternalAPIException extends AgentException {
  public readonly status_code?: number;

  constructor(message: string, method: string, status_code?: number) {
    super("API_ERROR", message, method, true);
    this.status_code = status_code;
    Object.setPrototypeOf(this, ExternalAPIException.prototype);
  }

  public toDict(): ExceptionDict & { status_code?: number } {
    const dict = super.toDict();
    if (this.status_code !== undefined) {
      return { ...dict, status_code: this.status_code };
    }
    return dict;
  }
}

/**
 * 데이터베이스 작업 실패
 * 재시도 가능: 연결 오류일 수 있음
 */
export class DatabaseException extends AgentException {
  constructor(message: string, method: string) {
    super("DB_ERROR", message, method, true);
    Object.setPrototypeOf(this, DatabaseException.prototype);
  }
}

/**
 * 인증/권한 오류
 * 재시도 불가능: 인증 정보 업데이트 필요
 */
export class AuthenticationException extends AgentException {
  constructor(message: string, method: string) {
    super("AUTH_ERROR", message, method, false);
    Object.setPrototypeOf(this, AuthenticationException.prototype);
  }
}

/**
 * 타임아웃 발생
 * 재시도 가능: 시간을 두고 다시 시도
 */
export class TimeoutException extends AgentException {
  constructor(message: string, method: string) {
    super("TIMEOUT_ERROR", message, method, true);
    Object.setPrototypeOf(this, TimeoutException.prototype);
  }
}

/**
 * Rate limit 초과
 * 재시도 가능: 대기 후 재시도
 */
export class RateLimitException extends AgentException {
  public readonly retry_after: number;

  constructor(message: string, method: string, retry_after: number = 30) {
    super("RATE_LIMIT_ERROR", message, method, true);
    this.retry_after = retry_after;
    Object.setPrototypeOf(this, RateLimitException.prototype);
  }

  public toDict(): ExceptionDict & { retry_after: number } {
    const dict = super.toDict();
    return { ...dict, retry_after: this.retry_after };
  }
}

/**
 * 로직 실행 실패
 * 재시도 여부는 상황에 따라 다름
 */
export class LogicException extends AgentException {
  constructor(message: string, method: string, retry_able: boolean = false) {
    super("LOGIC_ERROR", message, method, retry_able);
    Object.setPrototypeOf(this, LogicException.prototype);
  }
}
