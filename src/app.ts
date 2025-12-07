/**
 * Express 애플리케이션 설정
 * 라우트, 미들웨어, 에러 핸들링 통합
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getConfig } from './config/environment';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { createGlobalRateLimiter } from './middleware/rateLimiter';
import { Logger } from './database/logger';
import { v4 as uuidv4 } from 'uuid';
import authRouter from './routes/auth';
import communityRouter from './routes/community';
import modelsRouter, { updateRouter, creatorRouter, jobCategoryRouter } from './routes/models';
import newsTaggingRouter from './routes/news-tagging';
import tasksRouter from './routes/tasks';
import newsRouter from './routes/news';
import jobNewsRouter from './routes/job-news';
import comparisonRouter from './routes/comparison.routes';
import timelineRouter from './routes/timeline.routes';

const logger = new Logger('App');

export function createApp(): Express {
  const app = express();
  const config = getConfig();

  // CORS 설정
  const allowedOrigins = [
    // localhost 기본
    'http://localhost',
    'https://localhost',
    // localhost 포트별
    'http://localhost:3000',
    'http://localhost:5173',  // Vite 기본 포트
    'http://localhost:8080',  // Vue CLI 등
    // 127.0.0.1 IP 접근
    'http://127.0.0.1',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    // Capacitor (모바일 앱)
    'capacitor://localhost'
  ];

  // 개발/테스트 환경 여부 확인
  const isDevOrTest = config.nodeEnv === 'development' || config.nodeEnv === 'test';
  
  // CORS origin 설정 함수
  const corsOriginHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 개발/테스트 환경에서는 모든 origin 허용
    if (isDevOrTest) {
      callback(null, true);
      return;
    }
    
    // origin이 없는 경우 (서버 간 요청, Postman 등) 허용
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // 허용된 origin 목록에 있는지 확인
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    
    // 그 외는 차단
    callback(new Error('CORS policy violation'));
  };

  app.use(cors({
    origin: corsOriginHandler,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workflow-ID']
  }));

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

  // 라우트 마운트 (v1 제거하여 /api/... 로 통일)
  app.use('/api/auth', authRouter);
  app.use('/api/community', communityRouter);
  app.use('/api/models', modelsRouter);
  app.use('/api/updates', updateRouter);
  app.use('/api/creators', creatorRouter);
  app.use('/api/job-categories', jobCategoryRouter);
  app.use('/api/news-tagging', newsTaggingRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/issue-index', newsRouter);
  app.use('/api/issue-index', jobNewsRouter);
  app.use('/api/comparison', comparisonRouter);
  app.use('/api/timeline', timelineRouter);

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
