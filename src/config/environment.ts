/**
 * 환경 변수 관리 및 검증
 */

import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface AppConfig {
  // Server
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // JWT
  jwt: {
    secret: string;
    expiry: string;
  };

  // Encryption (Phase 2)
  encryption: {
    key: string;
  };

  // Database
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    waitForConnections: boolean;
    connectionLimit: number;
    queueLimit: number;
  };

  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };

  // OAuth 2.0 Configuration (Phase 2)
  oauth: {
    google: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    kakao: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    naver: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };

  // Email Configuration (Phase 3)
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
    name: string;
  };

  // External APIs
  externalApis: {
    artificialAnalysisApiKey: string;
    naverNewsApiKey: string;
  };

  // Features
  features: {
    enableBatchJobs: boolean;
    enableNotifications: boolean;
    googleTrendsEnabled: boolean;
  };
}

/**
 * 필수 환경 변수 검증
 */
function validateRequiredEnv(): void {
  const required = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`필수 환경 변수 누락: ${missing.join(', ')}`);
  }
}

/**
 * 환경 설정 로드
 */
export function loadConfig(): AppConfig {
  validateRequiredEnv();

  return {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: (process.env.LOG_LEVEL as any) || 'info',

    jwt: {
      secret: process.env.JWT_SECRET!,
      expiry: process.env.JWT_EXPIRY || '30d'
    },

    encryption: {
      key: process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here!'
    },

    database: {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER!,
      password: process.env.DB_PASSWORD!,
      name: process.env.DB_NAME!,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    },

    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: 0
    },

    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/google/callback'
      },
      kakao: {
        clientId: process.env.KAKAO_CLIENT_ID || '',
        clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
        redirectUri: process.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/kakao/callback'
      },
      naver: {
        clientId: process.env.NAVER_CLIENT_ID || '',
        clientSecret: process.env.NAVER_CLIENT_SECRET || '',
        redirectUri: process.env.NAVER_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/naver/callback'
      }
    },

    email: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      password: process.env.EMAIL_PASSWORD || 'your-password',
      from: process.env.EMAIL_FROM || 'noreply@ainus.example.com',
      name: process.env.EMAIL_FROM_NAME || 'Ainus'
    },

    externalApis: {
      artificialAnalysisApiKey: process.env.ARTIFICIAL_ANALYSIS_API_KEY || '',
      naverNewsApiKey: process.env.NAVER_NEWS_API_KEY || ''
    },

    features: {
      enableBatchJobs: process.env.ENABLE_BATCH_JOBS !== 'false',
      enableNotifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
      googleTrendsEnabled: process.env.GOOGLE_TRENDS_ENABLED !== 'false'
    }
  };
}

// 싱글톤 설정 인스턴스
let configInstance: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}
