/**
 * 보안 토큰 생성기
 * 암호화된 토큰 생성 및 해싱
 */

import crypto from 'crypto';
import { getConfig } from '../config/environment';

/**
 * 토큰 생성 결과
 */
export interface GeneratedToken {
  token: string; // 사용자에게 전달할 평문 토큰
  hash: string; // 데이터베이스에 저장할 해시 토큰
}

/**
 * 보안 토큰 생성
 * @param length 토큰 길이 (바이트)
 * @returns 생성된 토큰과 해시
 */
export function generateSecureToken(length: number = 32): GeneratedToken {
  const token = crypto.randomBytes(length).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  return {
    token,
    hash
  };
}

/**
 * 토큰 검증
 * @param plainToken 평문 토큰
 * @param storedHash 저장된 해시
 * @returns 토큰 유효 여부
 */
export function verifyToken(plainToken: string, storedHash: string): boolean {
  const computedHash = crypto.createHash('sha256').update(plainToken).digest('hex');
  return computedHash === storedHash;
}

/**
 * 토큰 해싱
 * @param token 토큰
 * @returns 해시된 토큰
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * 비밀번호 재설정 토큰 생성
 * @returns 생성된 토큰과 해시
 */
export function generatePasswordResetToken(): GeneratedToken {
  return generateSecureToken(32); // 256-bit 토큰
}

/**
 * 이메일 인증 토큰 생성
 * @returns 생성된 토큰과 해시
 */
export function generateEmailVerificationToken(): GeneratedToken {
  return generateSecureToken(32);
}

/**
 * 토큰 만료 시간 계산
 * @param minutes 분 단위 만료 시간
 * @returns Date 객체
 */
export function calculateExpiryTime(minutes: number): Date {
  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000);
}

/**
 * 토큰 만료 여부 확인
 * @param expiryDate 만료 날짜
 * @returns 만료 여부
 */
export function isTokenExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

/**
 * 남은 시간 계산 (초 단위)
 * @param expiryDate 만료 날짜
 * @returns 남은 시간 (초)
 */
export function getTimeRemaining(expiryDate: Date): number {
  const now = new Date();
  const remaining = (expiryDate.getTime() - now.getTime()) / 1000;
  return Math.max(0, Math.floor(remaining));
}
