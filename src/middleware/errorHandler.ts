/**
 * Express 에러 핸들링 미들웨어
 * 모든 예외를 캡처하고 표준화된 응답 형식으로 변환
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
import { Logger } from '../database/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('ErrorHandler');

/**
 * 예외를 표준화된 API 응답으로 변환
 */
function formatErrorResponse(exception: AgentException, workflowId: string) {
  const severity = determineSeverity(exception);
  const action = determineAction(exception);
  const logEntry = formatErrorLog(exception, workflowId);

  // 심각도에 따른 HTTP 상태 코드 결정
  let statusCode = 500;
  if (exception instanceof ValidationException) {
    statusCode = 400;
  } else if (exception instanceof AuthenticationException) {
    statusCode = 401;
  } else if (exception.code === 'RATE_LIMIT_ERROR') {
    statusCode = 429;
  }

  return {
    success: false,
    workflow_id: workflowId,
    error: {
      code: exception.code,
      message: exception.message,
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

    const statusCode = error instanceof ValidationException ? 400 :
                       error instanceof AuthenticationException ? 401 :
                       error.code === 'RATE_LIMIT_ERROR' ? 429 : 500;

    res.status(statusCode).json(
      formatErrorResponse(error, workflowId)
    );
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
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
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
