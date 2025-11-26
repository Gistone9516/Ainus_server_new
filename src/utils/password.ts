/**
 * 비밀번호 해싱 및 검증 유틸리티
 * bcryptjs를 사용한 안전한 비밀번호 관리
 */

import bcrypt from 'bcryptjs';
import { getConfig } from '../config/environment';

const config = getConfig();
const SALT_ROUNDS = config.security.bcryptRounds;

/**
 * 평문 비밀번호를 해시로 변환
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(plainPassword, salt);
    return hash;
  } catch (error) {
    throw new Error(`비밀번호 해싱 실패: ${error}`);
  }
}

/**
 * 평문 비밀번호와 해시 비교
 */
export async function verifyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hash);
  } catch (error) {
    throw new Error(`비밀번호 검증 실패: ${error}`);
  }
}
