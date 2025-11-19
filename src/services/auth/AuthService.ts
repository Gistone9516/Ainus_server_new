/**
 * 인증 서비스
 * 회원가입, 로그인, 토큰 갱신 등의 비즈니스 로직
 * 예외 처리 가이드를 따릅니다
 */

import { executeQuery, queryOne, executeModify } from '../../database/mysql';
import { getRedisCache } from '../../database/redis';
import { generateToken, verifyToken, generateAccessToken, generateRefreshToken, decodeToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import { isStrongPassword } from '../../utils/passwordValidator';
import {
  ValidationException,
  DatabaseException,
  AuthenticationException
} from '../../exceptions';
import {
  isAccountLocked,
  incrementLoginFailures,
  resetLoginFailures,
  recordLoginAudit
} from './LoginAuditService';
import { User, JwtPayload } from '../../types';

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
    refresh_token: string;
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
       (email, password_hash, nickname)
       VALUES (?, ?, ?)`,
      [
        request.email,
        passwordHash,
        request.nickname
      ]
    );

    const userId = result.insertId;

    // 사용자 프로필 생성 (약관 동의 정보 저장)
    const preferences = {
      marketing_agreed: request.marketing_agreed ?? false,
      terms_agreed: request.terms_agreed,
      privacy_agreed: request.privacy_agreed
    };

    await executeModify(
      `INSERT INTO user_profiles (user_id, preferences) VALUES (?, ?)`,
      [userId, JSON.stringify(preferences)]
    );

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
      'SELECT user_id, email, nickname, password_hash FROM users WHERE email = ?',
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

    // 토큰 생성 (TASK-1-13, 1-15: Refresh Token 추가)
    const access_token = generateAccessToken(
      user.user_id,
      user.email,
      user.nickname,
      'local'
    );
    const refresh_token = generateRefreshToken(
      user.user_id,
      user.email,
      user.nickname,
      'local'
    );

    // Refresh Token을 Redis에 저장 (토큰 갱신 시 검증용)
    try {
      const redisCache = getRedisCache();
      const decodedRefresh = decodeToken(refresh_token);
      if (decodedRefresh?.jti) {
        const refreshTokenKey = `refresh:${user.user_id}:${decodedRefresh.jti}`;
        const refreshTokenTTL = 7 * 24 * 60 * 60; // 7일
        await redisCache.set(refreshTokenKey, refresh_token, refreshTokenTTL);
      }
    } catch (redisError) {
      console.error(`Refresh Token Redis 저장 실패: ${redisError}`);
      // Redis 실패는 로그인을 막지 않음
    }

    const expires_in = 900; // 15분 (초 단위)

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        nickname: user.nickname,
        auth_provider: 'local'
      },
      tokens: {
        access_token,
        refresh_token,
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
 * 토큰 갱신 (TASK-1-15)
 * Refresh Token으로 새로운 Access Token 발급
 * 선택: 새로운 Refresh Token도 발급 (토큰 로테이션)
 */
export async function refreshAccessToken(
  refreshToken: string,
  issueNewRefreshToken: boolean = true
): Promise<{
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}> {
  const methodName = 'refreshAccessToken';

  try {
    // 1단계: Refresh Token 검증
    let payload: any;
    try {
      payload = verifyToken(refreshToken);
    } catch (error) {
      throw new AuthenticationException(
        `유효하지 않은 Refresh Token입니다 (ERROR_3001)`,
        methodName
      );
    }

    // 토큰이 Refresh Token인지 확인
    if (payload.token_type !== 'refresh') {
      throw new AuthenticationException(
        `유효하지 않은 토큰 타입입니다 (ERROR_3001)`,
        methodName
      );
    }

    // 2단계: Redis에서 토큰 검증 (블랙리스트 확인)
    const redisCache = getRedisCache();
    const refreshTokenKey = `refresh:${payload.user_id}:${payload.jti}`;
    const storedToken = await redisCache.get(refreshTokenKey);

    if (!storedToken) {
      throw new AuthenticationException(
        `Refresh Token이 무효화되었습니다 (ERROR_3003)`,
        methodName
      );
    }

    // 3단계: 새로운 Access Token 발급
    const newAccessToken = generateAccessToken(
      payload.user_id,
      payload.email,
      payload.nickname,
      payload.auth_provider
    );

    let newRefreshToken: string | undefined;
    if (issueNewRefreshToken) {
      // 토큰 로테이션: 기존 Refresh Token 무효화, 새로운 발급
      newRefreshToken = generateRefreshToken(
        payload.user_id,
        payload.email,
        payload.nickname,
        payload.auth_provider
      );

      // 새로운 Refresh Token을 Redis에 저장
      const decodedNew = decodeToken(newRefreshToken);
      if (decodedNew?.jti) {
        const newRefreshTokenKey = `refresh:${payload.user_id}:${decodedNew.jti}`;
        const refreshTokenTTL = 7 * 24 * 60 * 60;
        await redisCache.set(newRefreshTokenKey, newRefreshToken, refreshTokenTTL);
      }

      // 기존 Refresh Token 무효화
      await redisCache.delete(refreshTokenKey);
    }

    const expires_in = 900; // 15분

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in
    };
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new AuthenticationException(`토큰 갱신 실패: ${error}`, methodName);
  }
}

/**
 * 로그아웃 (토큰 블랙리스트 처리)
 * TASK-1-16: Refresh Token 무효화
 */
export async function logout(
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  const methodName = 'logout';

  try {
    const redisCache = getRedisCache();

    // Access Token을 블랙리스트에 추가
    try {
      const payload = verifyToken(accessToken);
      const ttl = Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
      if (ttl > 0) {
        await redisCache.set(`blacklist:${accessToken}`, 'true', ttl);
      }
    } catch (error) {
      console.error(`Access Token 블랙리스트 저장 실패: ${error}`);
    }

    // Refresh Token을 블랙리스트에 추가
    if (refreshToken) {
      try {
        const payload = verifyToken(refreshToken);
        if (payload.token_type === 'refresh') {
          const refreshTokenKey = `refresh:${payload.user_id}:${payload.jti}`;
          await redisCache.delete(refreshTokenKey);

          // 모든 세션 토큰 무효화 (선택사항)
          // const sessionsKey = `sessions:${payload.user_id}:*`;
          // await redisCache.deletePattern(sessionsKey);
        }
      } catch (error) {
        console.error(`Refresh Token 무효화 실패: ${error}`);
      }
    }
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new AuthenticationException(`로그아웃 처리 실패: ${error}`, methodName);
  }
}

// ===== Phase 3: Email & Password Reset Functions =====

/**
 * 비밀번호 재설정 요청 (TASK-3-3)
 * 이메일로 비밀번호 재설정 토큰 전송
 */
export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  const methodName = 'forgotPassword';

  try {
    // 1단계: 사용자 존재 확인
    const user = await queryOne<any>(
      'SELECT user_id, nickname, email FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      // 보안: 사용자 존재 여부를 숨기기 위해 일반적인 메시지 반환
      throw new ValidationException(
        '입력하신 이메일로 발송되었습니다. 메일함을 확인해주세요.',
        methodName
      );
    }

    // 2단계: 비밀번호 재설정 토큰 생성
    const { generatePasswordResetToken, calculateExpiryTime } = await import('../../utils/tokenGenerator');
    const { token, hash } = generatePasswordResetToken();
    const expiryTime = calculateExpiryTime(60); // 1시간 유효

    // 3단계: 토큰을 데이터베이스에 저장
    try {
      await executeModify(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, NOW())`,
        [user.user_id, hash, expiryTime]
      );
    } catch (error) {
      throw new DatabaseException(
        `비밀번호 재설정 토큰 저장 실패: ${error}`,
        methodName
      );
    }

    // 4단계: 비밀번호 재설정 이메일 전송
    try {
      const { sendPasswordResetEmail } = await import('../common/EmailService');
      const resetLink = `http://localhost:3000/auth/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, token, resetLink);
    } catch (error) {
      console.error(`비밀번호 재설정 이메일 전송 실패: ${error}`);
      // 이메일 전송 실패해도 계속 진행 (사용자는 이미 토큰을 받았을 수 있음)
    }

    return {
      success: true,
      message: '입력하신 이메일로 비밀번호 재설정 링크가 발송되었습니다.'
    };
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`비밀번호 재설정 요청 실패: ${error}`, methodName);
  }
}

/**
 * 비밀번호 재설정 (TASK-3-4)
 * 비밀번호 재설정 토큰으로 새로운 비밀번호 설정
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const methodName = 'resetPassword';

  try {
    // 1단계: 입력 검증
    if (!token) {
      throw new ValidationException('재설정 토큰이 필요합니다 (ERROR_4003)', methodName);
    }
    if (!newPassword) {
      throw new ValidationException('새로운 비밀번호를 입력해주세요 (ERROR_1006)', methodName);
    }

    if (!isStrongPassword(newPassword)) {
      throw new ValidationException(
        '비밀번호는 최소 8자 이상이며 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다 (ERROR_1003)',
        methodName
      );
    }

    // 2단계: 토큰 검증
    const { verifyToken: verifyTokenFunc, hashToken: hashTokenFunc } = await import('../../utils/tokenGenerator');
    const tokenHash = hashTokenFunc(token);

    const resetTokenRecord = await queryOne<any>(
      `SELECT token_id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = ?`,
      [tokenHash]
    );

    if (!resetTokenRecord) {
      throw new ValidationException('유효하지 않은 재설정 토큰입니다 (ERROR_4003)', methodName);
    }

    // 토큰 만료 확인
    if (new Date() > new Date(resetTokenRecord.expires_at)) {
      throw new ValidationException('비밀번호 재설정 토큰이 만료되었습니다 (ERROR_4002)', methodName);
    }

    // 토큰 사용 여부 확인
    if (resetTokenRecord.used_at) {
      throw new ValidationException('이미 사용된 비밀번호 재설정 토큰입니다 (ERROR_4004)', methodName);
    }

    // 3단계: 새로운 비밀번호 해싱
    const newPasswordHash = await hashPassword(newPassword);

    // 4단계: 비밀번호 업데이트 및 토큰 마크
    try {
      await executeModify(
        `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?`,
        [newPasswordHash, resetTokenRecord.user_id]
      );

      await executeModify(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE token_id = ?`,
        [resetTokenRecord.token_id]
      );
    } catch (error) {
      throw new DatabaseException(`비밀번호 업데이트 실패: ${error}`, methodName);
    }

    // 5단계: 모든 세션 로그아웃 처리 (보안)
    // 주의: 현재 RedisCache는 패턴 매칭 삭제를 지원하지 않음
    // 실제 프로덕션에서는 Redis SCAN 명령어를 사용하여 구현 필요
    // const redisCache = getRedisCache();
    // await redisCache.deletePattern(`refresh:${resetTokenRecord.user_id}:*`);

    return {
      success: true,
      message: '비밀번호가 성공적으로 재설정되었습니다. 새로운 비밀번호로 로그인해주세요.'
    };
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`비밀번호 재설정 실패: ${error}`, methodName);
  }
}

/**
 * 비밀번호 변경 (TASK-3-5)
 * 로그인된 사용자가 현재 비밀번호를 입력하여 새로운 비밀번호로 변경
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const methodName = 'changePassword';

  try {
    // 1단계: 입력 검증
    if (!currentPassword) {
      throw new ValidationException('현재 비밀번호를 입력해주세요', methodName);
    }
    if (!newPassword) {
      throw new ValidationException('새로운 비밀번호를 입력해주세요', methodName);
    }
    if (currentPassword === newPassword) {
      throw new ValidationException('새로운 비밀번호는 현재 비밀번호와 달라야 합니다', methodName);
    }

    if (!isStrongPassword(newPassword)) {
      throw new ValidationException(
        '비밀번호는 최소 8자 이상이며 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다 (ERROR_1003)',
        methodName
      );
    }

    // 2단계: 사용자 확인
    const user = await queryOne<any>(
      'SELECT user_id, password_hash FROM users WHERE user_id = ?',
      [userId]
    );

    if (!user) {
      throw new ValidationException('사용자를 찾을 수 없습니다', methodName);
    }

    // 3단계: 현재 비밀번호 확인
    const isPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationException(
        '현재 비밀번호가 일치하지 않습니다',
        methodName
      );
    }

    // 4단계: 새로운 비밀번호 해싱
    const newPasswordHash = await hashPassword(newPassword);

    // 5단계: 비밀번호 업데이트
    try {
      await executeModify(
        `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE user_id = ?`,
        [newPasswordHash, userId]
      );
    } catch (error) {
      throw new DatabaseException(`비밀번호 업데이트 실패: ${error}`, methodName);
    }

    return {
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다.'
    };
  } catch (error) {
    if (error instanceof ValidationException || error instanceof AuthenticationException) throw error;
    throw new DatabaseException(`비밀번호 변경 실패: ${error}`, methodName);
  }
}

/**
 * 이메일 인증 (TASK-3-2)
 * 이메일 인증 토큰으로 이메일 인증 완료
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
  const methodName = 'verifyEmail';

  try {
    // 1단계: 입력 검증
    if (!token) {
      throw new ValidationException('인증 토큰이 필요합니다', methodName);
    }

    // 2단계: 토큰 검증 (현재는 Redis 또는 DB에서 확인)
    // 실제 구현은 email_verification_tokens 테이블이 필요함
    // 여기서는 간단히 처리
    const { hashToken: hashTokenFunc } = await import('../../utils/tokenGenerator');
    const tokenHash = hashTokenFunc(token);

    // 데이터베이스에서 토큰 확인 (email_verification_tokens 테이블 가정)
    // 이 테이블이 없으면 생성이 필요함
    try {
      const verificationRecord = await queryOne<any>(
        `SELECT token_id, user_id, expires_at
         FROM email_verification_tokens
         WHERE token_hash = ? AND verified_at IS NULL`,
        [tokenHash]
      );

      if (!verificationRecord) {
        throw new ValidationException('유효하지 않거나 이미 사용된 인증 토큰입니다', methodName);
      }

      // 토큰 만료 확인
      if (new Date() > new Date(verificationRecord.expires_at)) {
        throw new ValidationException('이메일 인증 토큰이 만료되었습니다', methodName);
      }

      // 3단계: 사용자 이메일 인증 처리
      await executeModify(
        `UPDATE users SET email_verified = 1, email_verified_at = NOW() WHERE user_id = ?`,
        [verificationRecord.user_id]
      );

      // 4단계: 토큰 마크 처리
      await executeModify(
        `UPDATE email_verification_tokens SET verified_at = NOW() WHERE token_id = ?`,
        [verificationRecord.token_id]
      );

      return {
        success: true,
        message: '이메일이 성공적으로 인증되었습니다.'
      };
    } catch (error) {
      if (error instanceof ValidationException) throw error;
      throw new DatabaseException(`이메일 인증 처리 실패: ${error}`, methodName);
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`이메일 인증 실패: ${error}`, methodName);
  }
}
