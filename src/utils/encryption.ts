/**
 * 암호화/복호화 유틸리티 (TASK-2-15)
 * AES-256-CBC 암호화 사용 (소셜 로그인 토큰 저장용)
 */

import crypto from 'crypto';
import { getConfig } from '../config/environment';

const config = getConfig();

/**
 * 평문을 암호화합니다
 * @param plaintext 암호화할 텍스트
 * @returns 암호화된 텍스트 (iv:encryptedData 형식)
 */
export function encrypt(plaintext: string): string {
  try {
    // 환경 변수에서 암호화 키 가져오기
    const encryptionKey = config.encryption.key;

    // IV (Initialization Vector) 생성
    const iv = crypto.randomBytes(16);

    // 암호화
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    let encrypted = cipher.update(plaintext);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // IV와 암호화된 데이터를 16진수로 변환하여 합침
    const result = iv.toString('hex') + ':' + encrypted.toString('hex');
    return result;
  } catch (error) {
    throw new Error(`암호화 실패: ${error}`);
  }
}

/**
 * 암호화된 텍스트를 복호화합니다
 * @param encryptedText 암호화된 텍스트 (iv:encryptedData 형식)
 * @returns 복호화된 텍스트
 */
export function decrypt(encryptedText: string): string {
  try {
    // 환경 변수에서 암호화 키 가져오기
    const encryptionKey = config.encryption.key;

    // IV와 암호화된 데이터 분리
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('유효하지 않은 암호화 형식');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');

    // 복호화
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    throw new Error(`복호화 실패: ${error}`);
  }
}

/**
 * 토큰을 해싱합니다 (중복 체크 및 저장용)
 * @param token 해싱할 토큰
 * @returns SHA-256 해시값
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * 무작위 토큰을 생성합니다
 * @param length 토큰 길이 (기본값: 32)
 * @returns 무작위 토큰
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
