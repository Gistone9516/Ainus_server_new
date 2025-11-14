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