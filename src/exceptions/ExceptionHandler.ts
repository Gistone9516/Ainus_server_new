/**
 * 예외 처리 및 로깅 통합 유틸리티
 * - 메서드별 독립적인 예외 처리
 * - 자동 재시도 로직
 * - 구조화된 로깅
 */

import {
  AgentException,
  ValidationException,
  AuthenticationException,
  DatabaseException,
  ExternalAPIException,
  TimeoutException,
  RateLimitException
} from './AgentException';

export type RetryableException =
  | ExternalAPIException
  | DatabaseException
  | TimeoutException
  | RateLimitException;

/**
 * 예외 심각도 판단
 */
export function determineSeverity(exception: AgentException): 'critical' | 'high' | 'medium' | 'low' {
  if (exception instanceof AuthenticationException) {
    return 'critical'; // 즉시 조치 필요
  } else if (exception instanceof DatabaseException) {
    return 'high'; // 운영팀 확인 필요
  } else if (exception instanceof ExternalAPIException) {
    return 'medium'; // 재시도 대기
  } else if (exception instanceof ValidationException) {
    return 'low'; // 사용자 입력 재요청
  }
  return 'medium';
}

/**
 * 필요한 조치 판단
 */
export function determineAction(exception: AgentException):
  | 'fix_input'
  | 'retry'
  | 'update_credentials'
  | 'check_db_connection'
  | 'investigate' {

  if (exception instanceof ValidationException) {
    return 'fix_input'; // 입력 데이터 수정
  } else if (exception.retry_able) {
    return 'retry'; // 자동 재시도
  } else if (exception instanceof AuthenticationException) {
    return 'update_credentials'; // 인증 정보 업데이트
  } else if (exception instanceof DatabaseException) {
    return 'check_db_connection'; // DB 연결 확인
  }
  return 'investigate';
}

/**
 * 재시도 가능 여부 판단
 */
export function isRetryable(exception: AgentException): exception is RetryableException {
  return exception.retry_able &&
    (exception instanceof ExternalAPIException ||
     exception instanceof DatabaseException ||
     exception instanceof TimeoutException ||
     exception instanceof RateLimitException);
}

/**
 * 재시도 대기 시간 계산 (지수 백오프)
 */
export function calculateWaitTime(
  retryCount: number,
  exception?: RateLimitException
): number {
  // Rate limit 예외인 경우 지정된 대기 시간 사용
  if (exception && exception instanceof RateLimitException) {
    return exception.retry_after * 1000;
  }

  // 일반적인 지수 백오프: 5s, 10s, 20s, ...
  const baseWaitMs = 5000;
  const waitTime = baseWaitMs * Math.pow(2, retryCount - 1);

  // 최대 대기 시간: 60초
  return Math.min(waitTime, 60000);
}

/**
 * 자동 재시도 래퍼
 * 메서드 단위 재시도 로직
 */
export async function executeWithRetry<T>(
  func: () => Promise<T>,
  options: {
    maxRetries?: number;
    methodName?: string;
    onRetry?: (attemptNumber: number, waitTime: number, error: AgentException) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const methodName = options.methodName ?? 'unknown';
  const onRetry = options.onRetry;

  let lastException: AgentException | null = null;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      return await func();
    } catch (error) {
      // AgentException 인지 확인
      if (!(error instanceof AgentException)) {
        // 예상 밖의 오류
        throw new Error(`[${methodName}] 예상 밖의 오류: ${error}`);
      }

      // 재시도 불가능한 예외는 즉시 발생
      if (!isRetryable(error)) {
        throw error;
      }

      lastException = error;
      retryCount++;

      // 모든 재시도를 소진한 경우
      if (retryCount >= maxRetries) {
        break;
      }

      // 대기 시간 계산
      const waitTime = calculateWaitTime(
        retryCount,
        error instanceof RateLimitException ? error : undefined
      );

      // 콜백 실행
      if (onRetry) {
        onRetry(retryCount, waitTime, error);
      }

      // 대기
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // 모든 재시도 실패
  if (lastException) {
    throw lastException;
  }

  throw new Error(`[${methodName}] 재시도 실패: 알 수 없는 오류`);
}

/**
 * 예외를 구조화된 로그 엔트리로 변환
 */
export interface LogEntry {
  workflow_id: string;
  timestamp: string;
  error_code: string;
  error_message: string;
  failed_method: string;
  retry_possible: boolean;
  severity: string;
  action_required: string;
}

export function formatErrorLog(
  exception: AgentException,
  workflowId: string
): LogEntry {
  return {
    workflow_id: workflowId,
    timestamp: new Date().toISOString(),
    error_code: exception.code,
    error_message: exception.message,
    failed_method: exception.method,
    retry_possible: exception.retry_able,
    severity: determineSeverity(exception),
    action_required: determineAction(exception)
  };
}
