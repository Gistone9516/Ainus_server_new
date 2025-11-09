/**
 * MySQL 데이터베이스 연결 및 풀 관리
 */

import mysql from 'mysql2/promise';
import { Pool, PoolConnection } from 'mysql2/promise';
import { getConfig } from '../config/environment';
import { DatabaseException } from '../exceptions';
import { Logger } from './logger';

const logger = new Logger('MySQL');

class DatabasePool {
  private pool: Pool | null = null;
  private isInitialized = false;

  /**
   * DB 풀 초기화
   */
  async initialize(): Promise<void> {
    const methodName = 'initialize';

    try {
      if (this.isInitialized) {
        logger.info('Database pool already initialized');
        return;
      }

      const config = getConfig();

      this.pool = mysql.createPool({
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.name,
        waitForConnections: config.database.waitForConnections,
        connectionLimit: config.database.connectionLimit,
        queueLimit: config.database.queueLimit
      });

      // 연결 테스트
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isInitialized = true;
      logger.info(`Database connected: ${config.database.name}@${config.database.host}`);
    } catch (error) {
      throw new DatabaseException(
        `DB 연결 초기화 실패: ${error}`,
        methodName
      );
    }
  }

  /**
   * 데이터베이스 연결 획득
   */
  async getConnection(): Promise<PoolConnection> {
    const methodName = 'getConnection';

    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }

      return await this.pool.getConnection();
    } catch (error) {
      throw new DatabaseException(
        `연결 획득 실패: ${error}`,
        methodName
      );
    }
  }

  /**
   * 데이터베이스 종료
   */
  async close(): Promise<void> {
    const methodName = 'close';

    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isInitialized = false;
        logger.info('Database pool closed');
      }
    } catch (error) {
      throw new DatabaseException(
        `DB 종료 실패: ${error}`,
        methodName
      );
    }
  }
}

// 싱글톤 인스턴스
let dbPoolInstance: DatabasePool | null = null;

export function getDatabasePool(): DatabasePool {
  if (!dbPoolInstance) {
    dbPoolInstance = new DatabasePool();
  }
  return dbPoolInstance;
}

/**
 * 편의 함수: 쿼리 실행
 */
export async function executeQuery<T>(
  query: string,
  values?: any[]
): Promise<T[]> {
  const methodName = 'executeQuery';
  const pool = getDatabasePool();

  let connection: PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(query, values);
    return rows as T[];
  } catch (error) {
    throw new DatabaseException(
      `쿼리 실행 실패: ${error}`,
      methodName
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * 편의 함수: 단일 행 조회
 */
export async function queryOne<T>(
  query: string,
  values?: any[]
): Promise<T | null> {
  const rows = await executeQuery<T>(query, values);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 편의 함수: 단일 값 조회
 */
export async function queryValue<T>(
  query: string,
  values?: any[]
): Promise<T | null> {
  const rows = await executeQuery<any>(query, values);
  if (rows.length === 0) return null;

  // 첫 번째 행의 첫 번째 값 반환
  const firstRow = rows[0];
  return Object.values(firstRow)[0] as T;
}

/**
 * 편의 함수: INSERT/UPDATE/DELETE 실행
 */
export async function executeModify(
  query: string,
  values?: any[]
): Promise<{ affectedRows: number; insertId: number }> {
  const methodName = 'executeModify';
  const pool = getDatabasePool();

  let connection: PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute(query, values) as any;
    return {
      affectedRows: result.affectedRows || 0,
      insertId: result.insertId || 0
    };
  } catch (error) {
    throw new DatabaseException(
      `수정 쿼리 실행 실패: ${error}`,
      methodName
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
