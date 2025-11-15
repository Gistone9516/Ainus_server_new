import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getConfig } from './config/environment';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { createGlobalRateLimiter } from './middleware/rateLimiter';
import { Logger } from './database/logger';
import { v4 as uuidv4 } from 'uuid';
import authRouter from './routes/auth';
import communityRouter from './routes/community';
import modelsRouter from './routes/models';
import issueIndexRouter from './routes/issueIndex';
import trendMonitoringRouter from './routes/trendMonitoring';
import newsRouter from './routes/news';

const logger = new Logger('App');

export function createApp(): Express {
  const app = express();
  const config = getConfig();

  // CORS 설정 - React Native 앱 지원
  app.use(cors({
    origin: config.nodeEnv === 'production'
      ? ['https://your-production-domain.com'] // 프로덕션 도메인으로 변경
      : true, // 개발 환경에서는 모든 origin 허용
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workflow-ID'],
    exposedHeaders: ['X-Workflow-ID']
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(createGlobalRateLimiter());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const workflowId = uuidv4();
    (req as any).workflowId = workflowId;

    res.setHeader('X-Workflow-ID', workflowId);

    logger.info(`${req.method} ${req.path}`, {
      workflowId,
      userAgent: req.get('user-agent')
    });

    next();
  });

  app.get('/health', asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    });
  }));

  app.get('/api/version', asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      version: '1.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
    });
  }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/models', modelsRouter);
  app.use('/api/v1/slm', modelsRouter);
  app.use('/api/v1/community', communityRouter);
  app.use('/api/v1/issue-index', issueIndexRouter);
  app.use('/api/v1/jobs', trendMonitoringRouter);
  app.use('/api/v1/users/profile', trendMonitoringRouter);
  app.use('/api/v1/news', newsRouter);

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

  app.use(errorHandler);

  return app;
}