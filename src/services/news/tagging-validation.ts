/**
 * AI 뉴스 기사 태그 분류 - 검증
 *
 * 역할:
 * - GPT 응답 검증
 * - 태그 유효성 체크
 * - 데이터 무결성 검증
 */

import {
  GPTTaggingResponse,
  ValidationResult,
  VALID_TAGS,
} from '@/types/news-tagging';

/**
 * GPT 응답 검증
 *
 * 검증 항목:
 * 1. 기사 수 일치
 * 2. 각 기사당 정확히 5개 태그
 * 3. 태그 유효성 (40개 표준 태그 중)
 * 4. 신뢰도 점수 개수 및 범위 (0.00-1.00)
 *
 * @param result - GPT 분류 결과
 * @param expectedArticleCount - 예상 기사 개수 (DB 조회 결과)
 * @returns 검증 결과
 */
export function validateTaggingResult(
  result: GPTTaggingResponse,
  expectedArticleCount: number
): ValidationResult {
  console.log('🔍 Validating tagging result...');
  console.log(`   - Expected articles: ${expectedArticleCount}`);
  console.log(`   - Received classifications: ${result.classifications.length}`);

  const errors: string[] = [];

  // 1. 기사 수 체크
  if (result.classifications.length !== expectedArticleCount) {
    errors.push(
      `Expected ${expectedArticleCount} articles, got ${result.classifications.length}`
    );
  }

  // 2. 각 분류 결과 검증
  const seenIndices = new Set<number>();

  result.classifications.forEach((classification, idx) => {
    const articleIndex = classification.article_index;

    // 2-1. 중복 인덱스 체크
    if (seenIndices.has(articleIndex)) {
      errors.push(`[Article ${articleIndex}] Duplicate article_index`);
    }
    seenIndices.add(articleIndex);

    // 2-2. 태그 수 체크
    if (classification.tags.length !== 5) {
      errors.push(
        `[Article ${articleIndex}] Expected 5 tags, got ${classification.tags.length}`
      );
    }

    // 2-3. 태그 유효성 체크
    classification.tags.forEach((tag, tagIdx) => {
      if (!VALID_TAGS.includes(tag as any)) {
        errors.push(`[Article ${articleIndex}] Invalid tag at position ${tagIdx}: "${tag}"`);
      }
    });

    // 2-4. 태그 중복 체크 (같은 기사에 동일 태그 중복)
    const uniqueTags = new Set(classification.tags);
    if (uniqueTags.size !== classification.tags.length) {
      errors.push(`[Article ${articleIndex}] Duplicate tags found`);
    }

    // 2-5. 신뢰도 점수 개수 체크
    if (classification.confidence_scores.length !== 5) {
      errors.push(
        `[Article ${articleIndex}] Expected 5 confidence scores, got ${classification.confidence_scores.length}`
      );
    }

    // 2-6. 신뢰도 점수 범위 체크
    classification.confidence_scores.forEach((score, scoreIdx) => {
      if (typeof score !== 'number' || score < 0 || score > 1) {
        errors.push(
          `[Article ${articleIndex}] Invalid confidence score at position ${scoreIdx}: ${score} (must be 0.00-1.00)`
        );
      }
    });

    // 2-7. 신뢰도 점수 내림차순 체크 (권장사항)
    for (let i = 0; i < classification.confidence_scores.length - 1; i++) {
      if (
        classification.confidence_scores[i] <
        classification.confidence_scores[i + 1]
      ) {
        // Warning만 출력 (에러로 처리하지 않음)
        console.log(
          `   ⚠️  [Article ${articleIndex}] Confidence scores not in descending order`
        );
        break;
      }
    }
  });

  const isValid = errors.length === 0;

  if (isValid) {
    console.log('   ✅ All validations passed\n');
  } else {
    console.log(`   ❌ ${errors.length} validation errors found\n`);
    errors.slice(0, 10).forEach((error) => console.log(`      - ${error}`));
    if (errors.length > 10) {
      console.log(`      ... and ${errors.length - 10} more errors\n`);
    }
  }

  return { isValid, errors };
}

/**
 * 검증 통계 출력 (디버깅용)
 *
 * @param result - GPT 분류 결과
 */
export function logValidationStats(result: GPTTaggingResponse): void {
  if (result.classifications.length === 0) {
    console.log('   ⚠️  No classifications to analyze');
    return;
  }

  // 태그 빈도 분석
  const tagCounts = new Map<string, number>();
  result.classifications.forEach((classification) => {
    classification.tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });

  // 가장 많이 사용된 태그 Top 10
  const sortedTags = Array.from(tagCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  console.log('   📊 Validation Statistics:');
  console.log(`      - Total classifications: ${result.classifications.length}`);
  console.log(`      - Total tag mappings: ${result.classifications.length * 5}`);
  console.log(`      - Unique tags used: ${tagCounts.size}`);
  console.log(`\n      Top 10 most used tags:`);
  sortedTags.slice(0, 10).forEach(([tag, count], idx) => {
    console.log(`        ${idx + 1}. ${tag}: ${count} times`);
  });
  console.log('');

  // 평균 신뢰도
  let totalConfidence = 0;
  let confidenceCount = 0;

  result.classifications.forEach((classification) => {
    classification.confidence_scores.forEach((score) => {
      totalConfidence += score;
      confidenceCount++;
    });
  });

  const avgConfidence = totalConfidence / confidenceCount;
  console.log(`      - Average confidence score: ${avgConfidence.toFixed(4)}\n`);
}
