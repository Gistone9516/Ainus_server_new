/**
 * 인증 서비스
 * 회원가입, 로그인, 토큰 갱신 등의 비즈니스 로직
 * 예외 처리 가이드를 따릅니다
 */

import { executeQuery, queryOne, executeModify } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { generateToken, verifyToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { isStrongPassword } from '../utils/passwordValidator';
import {
  ValidationException,
  DatabaseException,
  AuthenticationException
} from '../exceptions';
import {
  isAccountLocked,
  incrementLoginFailures,
  resetLoginFailures,
  recordLoginAudit
} from './LoginAuditService';
import { User, JwtPayload } from '../types';

interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  marketing_agreed?: boolean;
  terms_agreed: boolean;
  privacy_agreed: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
  ip_address: string;
  user_agent: string;
  device_type?: string;
}

interface RegisterResult {
  user_id: number;
  email: string;
  nickname: string;
  auth_provider: string;
  token: string;
}

interface LoginResult {
  user: {
    user_id: number;
    email: string;
    nickname: string;
    auth_provider: string;
  };
  tokens: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

/**
 * 회원가입 (TASK-1-7)
 * 비밀번호 강도 검증, 약관 동의 포함
 * 메서드 단위 예외 처리 패턴을 따릅니다
 */
export async function register(request: RegisterRequest): Promise<RegisterResult> {
  const methodName = 'register';

  // 1단계: 입력 검증
  try {
    // 필수 필드 검증
    if (!request.email || !request.email.includes('@')) {
      throw new ValidationException(
        '유효한 이메일 형식이 아닙니다 (ERROR_1004)',
        methodName
      );
    }
    if (!request.password) {
      throw new ValidationException(
        '비밀번호를 입력해주세요 (ERROR_1006)',
        methodName
      );
    }
    if (!request.nickname || request.nickname.length < 2 || request.nickname.length > 50) {
      throw new ValidationException(
        '닉네임은 2자 이상 50자 이하여야 합니다 (ERROR_1006)',
        methodName
      );
    }

    // 약관 동의 검증 (필수)
    if (request.terms_agreed !== true) {
      throw new ValidationException(
        '이용약관에 동의해주세요 (ERROR_1006)',
        methodName
      );
    }
    if (request.privacy_agreed !== true) {
      throw new ValidationException(
        '개인정보 처리방침에 동의해주세요 (ERROR_1006)',
        methodName
      );
    }

    // 비밀번호 강도 검증
    if (!isStrongPassword(request.password)) {
      throw new ValidationException(
        '비밀번호는 최소 8자 이상이며 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다 (ERROR_1003)',
        methodName
      );
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 2단계: 중복 확인
  try {
    const existingUser = await queryOne<any>(
      'SELECT user_id, email, nickname FROM users WHERE email = ? OR nickname = ?',
      [request.email, request.nickname]
    );

    if (existingUser) {
      if (existingUser.email === request.email) {
        throw new ValidationException(
          '이미 사용 중인 이메일입니다 (ERROR_1001)',
          methodName
        );
      } else {
        throw new ValidationException(
          '이미 사용 중인 닉네임입니다 (ERROR_1002)',
          methodName
        );
      }
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`중복 확인 실패: ${error}`, methodName);
  }

  // 3단계: 비밀번호 해싱
  let passwordHash: string;
  try {
    passwordHash = await hashPassword(request.password);
  } catch (error) {
    throw new AuthenticationException(`비밀번호 해싱 실패: ${error}`, methodName);
  }

  // 4단계: 사용자 생성
  try {
    const result = await executeModify(
      `INSERT INTO users
       (email, password_hash, nickname, auth_provider, marketing_agreed, terms_agreed, privacy_agreed, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        request.email,
        passwordHash,
        request.nickname,
        'local',
        request.marketing_agreed ?? false,
        request.terms_agreed,
        request.privacy_agreed,
        true
      ]
    );

    const userId = result.insertId;

    // 토큰 생성
    const token = generateToken(userId, request.email, request.nickname);

    return {
      user_id: userId,
      email: request.email,
      nickname: request.nickname,
      auth_provider: 'local',
      token
    };
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new DatabaseException(`사용자 생성 실패: ${error}`, methodName);
  }
}

/**
 * 로그인 (TASK-1-10)
 * 계정 잠금 확인, 실패 추적, 감사 로그 포함
 */
export async function login(request: LoginRequest): Promise<LoginResult> {
  const methodName = 'login';

  // 1단계: 입력 검증
  try {
    if (!request.email || !request.password) {
      throw new ValidationException(
        '이메일과 비밀번호를 입력해주세요 (ERROR_1006)',
        methodName
      );
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 2단계: 계정 잠금 여부 확인
  try {
    const lockStatus = await isAccountLocked(request.email);

    if (lockStatus.isLocked) {
      // 감사 로그: 계정 잠금 상태로 차단
      try {
        await recordLoginAudit({
          email: request.email,
          status: 'blocked',
          failure_reason: 'Account locked due to too many failed attempts',
          ip_address: request.ip_address,
          user_agent: request.user_agent,
          device_type: request.device_type
        });
      } catch (auditError) {
        // 감사 로그 실패는 로그인 차단을 막지 않음
        console.error(`감사 로그 기록 실패: ${auditError}`);
      }

      throw new AuthenticationException(
        `계정이 일시적으로 잠금되었습니다. ${lockStatus.remainingSeconds}초 후 다시 시도해주세요 (ERROR_2003)`,
        methodName
      );
    }
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new DatabaseException(`계정 잠금 상태 확인 실패: ${error}`, methodName);
  }

  // 3단계: 사용자 조회
  let user: any;
  try {
    user = await queryOne<any>(
      'SELECT user_id, email, nickname, password_hash, auth_provider, is_active FROM users WHERE email = ?',
      [request.email]
    );

    if (!user) {
      // 사용자 없음 - 로그인 실패
      try {
        await recordLoginAudit({
          email: request.email,
          status: 'failed',
          failure_reason: 'User not found',
          ip_address: request.ip_address,
          user_agent: request.user_agent,
          device_type: request.device_type
        });
      } catch (auditError) {
        console.error(`감사 로그 기록 실패: ${auditError}`);
      }

      // 실패 횟수 증가
      try {
        await incrementLoginFailures(request.email);
      } catch (incrementError) {
        console.error(`실패 횟수 증가 실패: ${incrementError}`);
      }

      throw new AuthenticationException(
        '이메일 또는 비밀번호가 일치하지 않습니다 (ERROR_2001)',
        methodName
      );
    }

    // 계정 활성 여부 확인
    if (!user.is_active) {
      try {
        await recordLoginAudit({
          user_id: user.user_id,
          email: request.email,
          status: 'blocked',
          failure_reason: 'Account disabled',
          ip_address: request.ip_address,
          user_agent: request.user_agent,
          device_type: request.device_type
        });
      } catch (auditError) {
        console.error(`감사 로그 기록 실패: ${auditError}`);
      }

      throw new AuthenticationException(
        '비활성화된 계정입니다 (ERROR_2004)',
        methodName
      );
    }
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new DatabaseException(`사용자 조회 실패: ${error}`, methodName);
  }

  // 4단계: 비밀번호 검증
  try {
    const isPasswordValid = await verifyPassword(request.password, user.password_hash);

    if (!isPasswordValid) {
      // 비밀번호 불일치 - 로그인 실패
      try {
        await recordLoginAudit({
          user_id: user.user_id,
          email: request.email,
          status: 'failed',
          failure_reason: 'Invalid password',
          ip_address: request.ip_address,
          user_agent: request.user_agent,
          device_type: request.device_type
        });
      } catch (auditError) {
        console.error(`감사 로그 기록 실패: ${auditError}`);
      }

      // 실패 횟수 증가
      try {
        const failureResult = await incrementLoginFailures(request.email);

        if (failureResult.isLocked) {
          throw new AuthenticationException(
            `로그인 실패. 계정이 ${failureResult.remainingAttempts === 0 ? '잠금 처리 되었습니다' : `${failureResult.remainingAttempts}회 더 시도 가능합니다`} (ERROR_2001)`,
            methodName
          );
        }

        throw new AuthenticationException(
          `이메일 또는 비밀번호가 일치하지 않습니다. ${failureResult.remainingAttempts}회 더 시도 가능합니다 (ERROR_2001)`,
          methodName
        );
      } catch (error) {
        if (error instanceof AuthenticationException) throw error;
        throw new AuthenticationException(
          `비밀번호 검증 실패: ${error}`,
          methodName
        );
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new AuthenticationException(`비밀번호 검증 중 오류: ${error}`, methodName);
  }

  // 5단계: 로그인 성공
  try {
    // 실패 횟수 초기화
    try {
      await resetLoginFailures(request.email);
    } catch (resetError) {
      console.error(`실패 횟수 초기화 실패: ${resetError}`);
    }

    // 성공 감사 로그 기록
    try {
      await recordLoginAudit({
        user_id: user.user_id,
        email: request.email,
        status: 'success',
        ip_address: request.ip_address,
        user_agent: request.user_agent,
        device_type: request.device_type
      });
    } catch (auditError) {
      console.error(`감사 로그 기록 실패: ${auditError}`);
    }

    // 토큰 생성
    const access_token = generateToken(user.user_id, user.email, user.nickname);
    const expires_in = 900; // 15분 (초 단위)

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        nickname: user.nickname,
        auth_provider: user.auth_provider
      },
      tokens: {
        access_token,
        token_type: 'Bearer',
        expires_in
      }
    };
  } catch (error) {
    throw new AuthenticationException(`로그인 완료 중 오류: ${error}`, methodName);
  }
}

/**
 * 토큰 유효성 검증
 */
export async function validateToken(token: string): Promise<JwtPayload> {
  const methodName = 'validateToken';

  try {
    const payload = verifyToken(token);

    // Redis 캐시에 토큰 상태 확인 (선택적 - 로그아웃 처리 시 사용)
    const redisCache = getRedisCache();
    const isBlacklisted = await redisCache.exists(`blacklist:${token}`);

    if (isBlacklisted) {
      throw new AuthenticationException('로그아웃된 토큰입니다', methodName);
    }

    return payload;
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new AuthenticationException(`토큰 검증 실패: ${error}`, methodName);
  }
}

/**
 * 사용자 정보 조회
 */
export async function getUserInfo(userId: number): Promise<User> {
  const methodName = 'getUserInfo';

  try {
    const user = await queryOne<User>(
      `SELECT user_id, email, nickname, profile_image_url, job_category_id, created_at, updated_at
       FROM users WHERE user_id = ?`,
      [userId]
    );

    if (!user) {
      throw new ValidationException('사용자를 찾을 수 없습니다', methodName);
    }

    return user;
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`사용자 정보 조회 실패: ${error}`, methodName);
  }
}

/**
 * 이메일 중복 확인 (TASK-1-9)
 * Redis 캐싱 사용 (TTL: 24시간)
 */
export async function checkEmailAvailability(email: string): Promise<{
  available: boolean;
  message: string;
}> {
  const methodName = 'checkEmailAvailability';

  try {
    // 입력 검증
    if (!email || !email.includes('@')) {
      throw new ValidationException(
        '유효한 이메일 형식이 아닙니다 (ERROR_1004)',
        methodName
      );
    }

    const redisCache = getRedisCache();
    const cacheKey = `email:${email}:exists`;
    const cacheTTL = 86400; // 24시간

    // Redis 캐시 확인
    const cachedResult = await redisCache.get(cacheKey);
    if (cachedResult !== null) {
      const exists = cachedResult === 'true';
      return {
        available: !exists,
        message: exists ? '이미 사용 중인 이메일입니다' : '사용 가능한 이메일입니다'
      };
    }

    // DB에서 조회
    const existingUser = await queryOne<any>(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    const exists = !!existingUser;

    // Redis 캐시에 저장
    try {
      await redisCache.set(cacheKey, exists ? 'true' : 'false', cacheTTL);
    } catch (cacheError) {
      console.error(`Redis 캐시 저장 실패: ${cacheError}`);
      // 캐시 실패는 응답을 막지 않음
    }

    return {
      available: !exists,
      message: exists ? '이미 사용 중인 이메일입니다' : '사용 가능한 이메일입니다'
    };
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`이메일 확인 중 오류: ${error}`, methodName);
  }
}

/**
 * 로그아웃 (토큰 블랙리스트 처리)
 */
export async function logout(token: string): Promise<void> {
  const methodName = 'logout';

  try {
    const payload = verifyToken(token);
    const redisCache = getRedisCache();

    // 토큰을 블랙리스트에 추가 (만료 시간까지 보유)
    const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
    if (ttl > 0) {
      await redisCache.set(`blacklist:${token}`, 'true', ttl);
    }
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new AuthenticationException(`로그아웃 처리 실패: ${error}`, methodName);
  }
}
