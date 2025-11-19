/**
 * TASK-1-12, TASK-1-11: 로그인 감사 로그 및 계정 잠금 서비스
 * agent_exception_handling_guide.md 규칙 준수
 */

import { executeModify, queryOne } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { DatabaseException, ValidationException } from '../exceptions';

/**
 * 로그인 감사 로그 요청
 */
export interface LoginAuditRequest {
  user_id?: number;
  email: string;
  status: 'success' | 'failed' | 'blocked';
  failure_reason?: string;
  ip_address: string;
  user_agent: string;
  device_type?: string;
  location_info?: Record<string, any>;
}

/**
 * TASK-1-12: 로그인 감사 로그 기록
 * 모든 로그인 시도(성공/실패)를 기록
 */
export async function recordLoginAudit(request: LoginAuditRequest): Promise<void> {
  const methodName = 'recordLoginAudit';

  try {
    const locationJson = request.location_info ? JSON.stringify(request.location_info) : null;

    await executeModify(
      `INSERT INTO login_audit_logs
       (user_id, email, status, failure_reason, ip_address, user_agent, device_type, location_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.user_id || null,
        request.email,
        request.status,
        request.failure_reason || null,
        request.ip_address,
        request.user_agent,
        request.device_type || 'unknown',
        locationJson
      ]
    );
  } catch (error) {
    throw new DatabaseException(
      `로그인 감사 로그 기록 실패: ${error}`,
      methodName
    );
  }
}

/**
 * TASK-1-11: 로그인 실패 횟수 증가 및 계정 잠금 확인
 *
 * 규칙:
 * - 15분 내 5회 실패 → 계정 잠금
 * - 잠금 시간: 30분
 * - Redis 키: login:${email}:attempts
 */
export async function incrementLoginFailures(email: string): Promise<{
  attempts: number;
  isLocked: boolean;
  lockedUntil?: Date;
  remainingAttempts: number;
}> {
  const methodName = 'incrementLoginFailures';

  try {
    const redisCache = getRedisCache();
    const failureKey = `login:${email}:attempts`;
    const lockKey = `login:${email}:locked`;

    // 현재 실패 횟수 조회
    const attemptsStr = await redisCache.get(failureKey);
    let attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    // 실패 횟수 증가
    attempts += 1;
    await redisCache.set(failureKey, String(attempts), 900); // 15분 (900초) TTL

    const maxAttempts = 5;
    const remainingAttempts = Math.max(0, maxAttempts - attempts);
    let isLocked = false;
    let lockedUntil: Date | undefined;

    // 5회 실패 시 계정 잠금
    if (attempts >= maxAttempts) {
      isLocked = true;
      const lockDurationSeconds = 1800; // 30분
      lockedUntil = new Date(Date.now() + lockDurationSeconds * 1000);

      // Redis에 잠금 기록
      await redisCache.set(lockKey, lockedUntil.toISOString(), lockDurationSeconds);
    }

    return {
      attempts,
      isLocked,
      lockedUntil,
      remainingAttempts
    };
  } catch (error) {
    if (error instanceof DatabaseException) throw error;
    throw new DatabaseException(
      `로그인 실패 처리 중 오류: ${error}`,
      methodName
    );
  }
}

/**
 * 계정이 잠금 상태인지 확인
 */
export async function isAccountLocked(email: string): Promise<{
  isLocked: boolean;
  lockedUntil?: Date;
  remainingSeconds?: number;
}> {
  const methodName = 'isAccountLocked';

  try {
    const redisCache = getRedisCache();
    const lockKey = `login:${email}:locked`;

    // Redis에서 잠금 확인
    const lockedUntilStr = await redisCache.get(lockKey);

    if (lockedUntilStr) {
      const lockedUntil = new Date(lockedUntilStr);
      const now = new Date();

      // 잠금 시간이 지났는지 확인
      if (now >= lockedUntil) {
        // 잠금 해제
        await redisCache.delete(lockKey);
        return { isLocked: false };
      }

      // 아직 잠금 상태
      const remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
      return {
        isLocked: true,
        lockedUntil,
        remainingSeconds
      };
    }

    return { isLocked: false };
  } catch (error) {
    if (error instanceof DatabaseException) throw error;
    throw new DatabaseException(
      `계정 잠금 상태 확인 실패: ${error}`,
      methodName
    );
  }
}

/**
 * 로그인 성공 시 실패 횟수 초기화
 */
export async function resetLoginFailures(email: string): Promise<void> {
  const methodName = 'resetLoginFailures';

  try {
    const redisCache = getRedisCache();
    const failureKey = `login:${email}:attempts`;
    const lockKey = `login:${email}:locked`;

    // Redis 초기화
    await redisCache.delete(failureKey);
    await redisCache.delete(lockKey);
  } catch (error) {
    throw new DatabaseException(
      `로그인 실패 횟수 초기화 실패: ${error}`,
      methodName
    );
  }
}
