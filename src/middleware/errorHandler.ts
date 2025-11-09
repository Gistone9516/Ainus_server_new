/**
 * Express 에러 핸들링 미들웨어 (TASK-1-19)
 * 모든 예외를 캡처하고 표준화된 응답 형식으로 변환
 * 에러 코드 매핑을 사용한 HTTP 상태 코드 결정
 */

import { Request, Response, NextFunction } from 'express';
import {
  AgentException,
  ValidationException,
  AuthenticationException,
  determineSeverity,
  determineAction,
  formatErrorLog
} from '../exceptions';
import { ERROR_CODES, getErrorDefinition } from '../constants/errorCodes';
import { Logger } from '../database/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('ErrorHandler');

/**
 * 에러 메시지에서 에러 코드 추출
 * 형식: "메시지 (ERROR_XXXX)" 또는 "메시지 (XXXX)"
 */
function extractErrorCode(message: string): string | undefined {
  const match = message.match(/\((?:ERROR_)?(\d{4})\)/);
  return match ? match[1] : undefined;
}

/**
 * 예외를 표준화된 API 응답으로 변환 (TASK-1-19)
 */
function formatErrorResponse(exception: AgentException, workflowId: string) {
  const severity = determineSeverity(exception);
  const action = determineAction(exception);

  // 에러 메시지에서 코드 추출
  const extractedCode = extractErrorCode(exception.message);
  const errorDefinition = extractedCode ? getErrorDefinition(extractedCode) : undefined;

  // HTTP 상태 코드 결정 (에러 정의 > 예외 타입 > 기본값)
  let statusCode = 500;
  if (errorDefinition) {
    statusCode = errorDefinition.httpStatus;
  } else if (exception instanceof ValidationException) {
    statusCode = 400;
  } else if (exception instanceof AuthenticationException) {
    statusCode = 401;
  } else if (exception.code === 'RATE_LIMIT_ERROR') {
    statusCode = 429;
  }

  const apiErrorCode = extractedCode || exception.code;

  return {
    success: false,
    workflow_id: workflowId,
    error: {
      code: apiErrorCode,
      message: exception.message,
      status: statusCode,
      category: errorDefinition?.category,
      failed_method: exception.method,
      retry_possible: exception.retry_able,
      severity,
      action_required: action
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Express 에러 핸들러 미들웨어
 * 모든 라우트 핸들러의 에러를 이곳에서 처리
 * TASK-1-19: 에러 코드 매핑 적용
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const workflowId = (req as any).workflowId || uuidv4();

  // AgentException 인 경우
  if (error instanceof AgentException) {
    const logEntry = formatErrorLog(error, workflowId);
    logger.error(`AgentException: ${JSON.stringify(logEntry)}`, error);

    // formatErrorResponse에서 상태 코드를 결정함
    const errorResponse = formatErrorResponse(error, workflowId);
    const statusCode = (errorResponse.error as any).status || 500;

    res.status(statusCode).json(errorResponse);
    return;
  }

  // 일반 Error 인 경우
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : '';

  logger.error(`Unexpected error: ${errorMessage}`, { stack: errorStack, workflowId });

  res.status(500).json({
    success: false,
    workflow_id: workflowId,
    error: {
      code: '9999',
      message: 'An unexpected error occurred',
      status: 500,
      category: '서버 에러',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 비동기 라우트 핸들러 래퍼
 * try-catch 없이도 에러를 자동으로 처리
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
