/**
 * 인증 서비스
 * 회원가입, 로그인, 토큰 갱신 등의 비즈니스 로직
 * 예외 처리 가이드를 따릅니다
 */

import { executeQuery, queryOne, executeModify } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { generateToken, verifyToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  ValidationException,
  DatabaseException,
  AuthenticationException
} from '../exceptions';
import { User, JwtPayload } from '../types';

interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterResult {
  user_id: number;
  email: string;
  nickname: string;
  token: string;
}

interface LoginResult {
  user_id: number;
  email: string;
  nickname: string;
  token: string;
}

/**
 * 회원가입
 * 메서드 단위 예외 처리 패턴을 따릅니다
 */
export async function register(request: RegisterRequest): Promise<RegisterResult> {
  const methodName = 'register';

  // 1단계: 입력 검증
  try {
    if (!request.email || !request.email.includes('@')) {
      throw new ValidationException('유효한 이메일 형식이 아닙니다', methodName);
    }
    if (!request.password || request.password.length < 6) {
      throw new ValidationException('비밀번호는 최소 6자 이상이어야 합니다', methodName);
    }
    if (!request.nickname || request.nickname.length < 2) {
      throw new ValidationException('닉네임은 최소 2자 이상이어야 합니다', methodName);
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 2단계: 중복 확인
  try {
    const existingUser = await queryOne<any>(
      'SELECT user_id FROM users WHERE email = ? OR nickname = ?',
      [request.email, request.nickname]
    );

    if (existingUser) {
      if (existingUser.email === request.email) {
        throw new ValidationException('이미 사용 중인 이메일입니다', methodName);
      } else {
        throw new ValidationException('이미 사용 중인 닉네임입니다', methodName);
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
      'INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)',
      [request.email, passwordHash, request.nickname]
    );

    const userId = result.insertId;

    // 토큰 생성
    const token = generateToken(userId, request.email, request.nickname);

    return {
      user_id: userId,
      email: request.email,
      nickname: request.nickname,
      token
    };
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new DatabaseException(`사용자 생성 실패: ${error}`, methodName);
  }
}

/**
 * 로그인
 */
export async function login(request: LoginRequest): Promise<LoginResult> {
  const methodName = 'login';

  // 1단계: 입력 검증
  try {
    if (!request.email || !request.password) {
      throw new ValidationException('이메일과 비밀번호를 입력해주세요', methodName);
    }
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new ValidationException(`입력 검증 실패: ${error}`, methodName);
  }

  // 2단계: 사용자 조회
  let user: any;
  try {
    user = await queryOne<any>(
      'SELECT user_id, email, nickname, password_hash FROM users WHERE email = ?',
      [request.email]
    );

    if (!user) {
      throw new AuthenticationException('이메일 또는 비밀번호가 일치하지 않습니다', methodName);
    }
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new DatabaseException(`사용자 조회 실패: ${error}`, methodName);
  }

  // 3단계: 비밀번호 검증
  try {
    const isPasswordValid = await verifyPassword(request.password, user.password_hash);

    if (!isPasswordValid) {
      throw new AuthenticationException('이메일 또는 비밀번호가 일치하지 않습니다', methodName);
    }
  } catch (error) {
    if (error instanceof AuthenticationException) throw error;
    throw new AuthenticationException(`비밀번호 검증 실패: ${error}`, methodName);
  }

  // 4단계: 토큰 생성
  try {
    const token = generateToken(user.user_id, user.email, user.nickname);

    return {
      user_id: user.user_id,
      email: user.email,
      nickname: user.nickname,
      token
    };
  } catch (error) {
    throw new AuthenticationException(`토큰 생성 실패: ${error}`, methodName);
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
