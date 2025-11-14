/**
 * XSS 필터링 및 마크다운 파싱 유틸리티
 * 명세서 요구사항에 따라 DOMPurify와 marked.js 사용
 */

import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * 마크다운 허용 태그 화이트리스트
 */
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'strong', 'b', 'em', 'i', 'u',
  'ul', 'ol', 'li',
  'code', 'pre', 'blockquote',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
];

/**
 * 마크다운 허용 속성
 */
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class'];

/**
 * XSS 필터링 (순수 텍스트)
 * HTML 태그 및 스크립트 제거
 */
export function sanitizeText(text: string): string {
  if (!text) return '';

  // DOMPurify를 사용하여 XSS 공격 방지
  const sanitized = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  return sanitized.trim();
}

/**
 * 마크다운을 안전한 HTML로 변환
 * XSS 필터링 적용
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  try {
    // 마크다운을 HTML로 변환
    const html = marked.parse(markdown, {
      breaks: true,
      gfm: true
    }) as string;

    // XSS 필터링 적용
    const sanitized = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false
    });

    return sanitized;
  } catch (error) {
    // 마크다운 파싱 실패 시 원본 텍스트를 HTML 이스케이프하여 반환
    return DOMPurify.sanitize(markdown, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }
}

/**
 * HTML에서 순수 텍스트 추출 (미리보기용)
 */
export function htmlToText(html: string): string {
  if (!html) return '';

  // HTML 태그 제거
  const text = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });

  // 연속 공백 및 줄바꿈 정규화
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * 콘텐츠 미리보기 생성 (첫 150자)
 * 마크다운 제거 후 순수 텍스트로 변환
 */
export function generatePreview(content: string, maxLength: number = 150): string {
  if (!content) return '';

  // 마크다운 마크업 제거
  let text = content
    // 코드 블록 제거
    .replace(/```[\s\S]*?```/g, '')
    // 인라인 코드 제거
    .replace(/`[^`]+`/g, '')
    // 헤더 마크업 제거
    .replace(/^#+\s+/gm, '')
    // 볼드/이탤릭 마크업 제거
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // 링크 제거
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // 이미지 제거
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
    // 리스트 마크업 제거
    .replace(/^[\*\-\+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 인용구 제거
    .replace(/^>\s+/gm, '')
    // 줄바꿈을 공백으로
    .replace(/\n+/g, ' ')
    // 연속 공백 제거
    .replace(/\s+/g, ' ')
    .trim();

  // 길이 제한
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
    // 마지막 단어가 잘리지 않도록 처리
    const lastSpace = text.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      text = text.substring(0, lastSpace);
    }
    text += '...';
  }

  return text;
}

/**
 * 제목/본문 정규화 (앞뒤 공백 제거, 줄바꿈 정규화)
 */
export function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

