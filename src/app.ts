/**
 * Express 애플리케이션 설정
 * 라우트, 미들웨어, 에러 핸들링 통합
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import { getConfig } from './config/environment';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { createGlobalRateLimiter } from './middleware/rateLimiter';
import { Logger } from './database/logger';
import { v4 as uuidv4 } from 'uuid';
import authRouter from './routes/auth';
import modelsRouter from './routes/models';

const logger = new Logger('App');

export function createApp(): Express {
  const app = express();
  const config = getConfig();

  // 요청 본문 파싱
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 전역 Rate Limiter (TASK-1-18)
  // 모든 API 요청에 대한 속도 제한: 15분 내 100회
  app.use(createGlobalRateLimiter());

  // 요청 ID 생성 및 설정
  app.use((req: Request, res: Response, next: NextFunction) => {
    const workflowId = uuidv4();
    (req as any).workflowId = workflowId;

    // 응답 헤더에 workflow ID 추가
    res.setHeader('X-Workflow-ID', workflowId);

    logger.info(`${req.method} ${req.path}`, {
      workflowId,
      userAgent: req.get('user-agent')
    });

    next();
  });

  // 헬스 체크 엔드포인트
  app.get('/health', asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    });
  }));

  // API 버전 정보 엔드포인트
  app.get('/api/version', asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      version: '1.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
    });
  }));

  // 라우트 마운트
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/models', modelsRouter);
  app.use('/api/v1/slm', modelsRouter);
  // app.use('/api/v1/community', communityRouter);
  // ...

  // 404 핸들러
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${req.method} ${req.path}`
      },
      timestamp: new Date().toISOString()
    });
  });

  // 에러 핸들러 (가장 마지막에 등록)
  app.use(errorHandler);

  return app;
}
