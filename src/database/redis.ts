/**
 * Redis 캐싱 레이어
 * 모델 점수, 비교 결과, 캐시, 실시간 통계 저장
 */

import Redis from 'ioredis';
import { getConfig } from '../config/environment';
import { Logger } from './logger';

const logger = new Logger('Redis');

class RedisCache {
  private redis: Redis | null = null;
  private isInitialized = false;

  /**
   * Redis 연결 초기화
   * 연결 실패 시 경고만 출력하고 계속 진행 (선택적 캐싱)
   */
  async initialize(): Promise<void> {
    const methodName = 'initialize';

    try {
      if (this.isInitialized) {
        logger.info('Redis already initialized');
        return;
      }

      const config = getConfig();

      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy: (times) => {
          // 3회 재시도 후 포기
          if (times > 3) {
            return null;
          }
          return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true // 지연 연결
      });

      // 연결 테스트 (타임아웃 5초)
      await Promise.race([
        this.redis.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
      ]);

      await this.redis.ping();

      this.isInitialized = true;
      logger.info(`Redis connected: ${config.redis.host}:${config.redis.port}`);
    } catch (error) {
      logger.warn('Redis initialization failed - continuing without cache', error);
      // Redis 연결 실패해도 계속 진행 (캐싱 없이 작동)
      this.redis = null;
      this.isInitialized = false;
    }
  }

  /**
   * Redis 인스턴스 획득
   * Redis가 초기화되지 않았으면 null 반환 (캐싱 비활성화)
   */
  private getRedis(): Redis | null {
    return this.redis;
  }

  /**
   * Redis 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return this.redis !== null && this.isInitialized;
  }

  /**
   * 값 설정 (문자열)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return; // Redis 비활성화 시 무시
      }
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, value);
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      logger.warn(`Redis SET failed for key ${key}:`, error);
    }
  }

  /**
   * 값 조회 (문자열)
   */
  async get(key: string): Promise<string | null> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return null; // Redis 비활성화 시 null 반환
      }
      return await redis.get(key);
    } catch (error) {
      logger.warn(`Redis GET failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * JSON 객체 설정
   */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      logger.warn(`Redis SETJSON failed for key ${key}:`, error);
    }
  }

  /**
   * JSON 객체 조회
   */
  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn(`Redis GETJSON failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 키 삭제
   */
  async delete(key: string): Promise<boolean> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return false;
      }
      const result = await redis.del(key);
      return result > 0;
    } catch (error) {
      logger.warn(`Redis DELETE failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 여러 키 삭제
   */
  async deleteMany(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      const redis = this.getRedis();
      if (!redis) {
        return 0;
      }
      return await redis.del(...keys);
    } catch (error) {
      logger.warn(`Redis DELETEMANY failed:`, error);
      return 0;
    }
  }

  /**
   * 키 존재 여부
   */
  async exists(key: string): Promise<boolean> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return false;
      }
      const result = await redis.exists(key);
      return result > 0;
    } catch (error) {
      logger.warn(`Redis EXISTS failed for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 키 TTL 설정
   */
  async setTTL(key: string, ttlSeconds: number): Promise<void> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return;
      }
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      logger.warn(`Redis EXPIRE failed for key ${key}:`, error);
    }
  }

  /**
   * HASH 객체 설정
   */
  async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return;
      }
      await redis.hset(key, field, value);
    } catch (error) {
      logger.warn(`Redis HSET failed for key ${key}:`, error);
    }
  }

  /**
   * HASH 객체 조회
   */
  async hGet(key: string, field: string): Promise<string | null> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return null;
      }
      return await redis.hget(key, field);
    } catch (error) {
      logger.warn(`Redis HGET failed for key ${key}:`, error);
      return null;
    }
  }

  /**
   * HASH 전체 조회
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return {};
      }
      return await redis.hgetall(key);
    } catch (error) {
      logger.warn(`Redis HGETALL failed for key ${key}:`, error);
      return {};
    }
  }

  /**
   * 리스트에 값 추가
   */
  async lPush(key: string, values: string[], ttlSeconds?: number): Promise<void> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return;
      }
      if (values.length > 0) {
        await redis.lpush(key, ...values);
        if (ttlSeconds) {
          await redis.expire(key, ttlSeconds);
        }
      }
    } catch (error) {
      logger.warn(`Redis LPUSH failed for key ${key}:`, error);
    }
  }

  /**
   * 리스트 범위 조회
   */
  async lRange(key: string, start: number = 0, stop: number = -1): Promise<string[]> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return [];
      }
      return await redis.lrange(key, start, stop);
    } catch (error) {
      logger.warn(`Redis LRANGE failed for key ${key}:`, error);
      return [];
    }
  }

  /**
   * 패턴으로 키 조회
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      const redis = this.getRedis();
      if (!redis) {
        return [];
      }
      return await redis.keys(pattern);
    } catch (error) {
      logger.warn(`Redis KEYS failed for pattern ${pattern}:`, error);
      return [];
    }
  }

  /**
   * 연결 종료
   */
  async close(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
        this.isInitialized = false;
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.error('Redis close failed', error);
    }
  }

  /**
   * Redis 클라이언트 직접 접근 (Rate Limiting 등에서 사용)
   */
  getClient(): Redis | null {
    return this.getRedis();
  }
}

// 싱글톤 인스턴스
let redisCacheInstance: RedisCache | null = null;

export function getRedisCache(): RedisCache {
  if (!redisCacheInstance) {
    redisCacheInstance = new RedisCache();
  }
  return redisCacheInstance;
}
