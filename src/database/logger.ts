/**
 * 간단한 로거 유틸리티
 * Winston을 사용할 수도 있지만, 기본 구현으로 시작
 */

import { getConfig } from '@config/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private shouldLog(level: LogLevel): boolean {
    const config = getConfig();
    const currentLevel = LOG_LEVELS[config.logLevel];
    const messageLevel = LOG_LEVELS[level];
    return messageLevel >= currentLevel;
  }

  private formatLog(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.module}] ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message), data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message), data || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message), data || '');
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message), error || '');
    }
  }
}
