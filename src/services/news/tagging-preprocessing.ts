/**
 * AI 뉴스 기사 태그 분류 - 전처리
 *
 * 역할:
 * - DB에서 조회한 기사 데이터를 GPT API 입력 형식으로 변환
 * - HTML 태그 제거
 * - article_id 매핑 생성
 */

import {
  NewsArticleFromDB,
  PreprocessedArticleForTagging,
  TaggingGPTInput,
  PreprocessingResult,
} from '@/types/news-tagging';

/**
 * HTML 태그 및 특수문자 제거
 *
 * @param text - 원본 텍스트
 * @returns 정제된 텍스트
 */
export function removeHtmlTags(text: string): string {
  if (!text) return '';

  return text
    .replace(/<\/?b>/g, '') // <b>, </b> 제거
    .replace(/<\/?[^>]+(>|$)/g, '') // 모든 HTML 태그 제거
    .replace(/&nbsp;/g, ' ') // &nbsp; → 공백
    .replace(/&lt;/g, '<') // &lt; → <
    .replace(/&gt;/g, '>') // &gt; → >
    .replace(/&amp;/g, '&') // &amp; → &
    .replace(/&quot;/g, '"') // &quot; → "
    .replace(/&#39;/g, "'") // &#39; → '
    .replace(/\s+/g, ' ') // 연속 공백 → 단일 공백
    .trim();
}

/**
 * DB 조회 데이터를 GPT 입력 형식으로 변환
 *
 * 변환 내용:
 * - HTML 태그 제거
 * - title과 description을 별도 필드로 유지
 * - article_index → article_id 매핑 생성
 *
 * @param articles - DB에서 조회한 기사 배열
 * @returns GPT 입력 데이터 + article_id 매핑
 */
export function preprocessForTagging(
  articles: NewsArticleFromDB[]
): PreprocessingResult {
  console.log('⚙️  Preprocessing articles for tagging...');
  console.log(`   - Total articles: ${articles.length}`);

  const articleIdMap = new Map<number, number>();

  const preprocessed: PreprocessedArticleForTagging[] = articles.map(
    (article) => {
      // article_index → article_id 매핑 저장 (나중에 DB 저장 시 필요)
      articleIdMap.set(article.article_index, article.article_id);

      return {
        index: article.article_index,
        title: removeHtmlTags(article.title),
        description: removeHtmlTags(article.description || ''),
      };
    }
  );

  console.log('   ✅ Preprocessing completed\n');

  return {
    gptInput: {
      articles: preprocessed,
    },
    articleIdMap,
  };
}

/**
 * 전처리 통계 출력 (디버깅용)
 */
export function logPreprocessingStats(
  articles: NewsArticleFromDB[]
): void {
  if (articles.length === 0) {
    console.log('   ⚠️  No articles to preprocess');
    return;
  }

  const titleLengths = articles.map((a) => a.title.length);
  const descLengths = articles.map((a) => (a.description || '').length);

  const avgTitleLength = Math.round(
    titleLengths.reduce((sum, len) => sum + len, 0) / titleLengths.length
  );
  const avgDescLength = Math.round(
    descLengths.reduce((sum, len) => sum + len, 0) / descLengths.length
  );

  console.log('   📊 Preprocessing Statistics:');
  console.log(`      - Avg title length: ${avgTitleLength} chars`);
  console.log(`      - Avg description length: ${avgDescLength} chars`);
  console.log(
    `      - Estimated tokens: ~${Math.round((avgTitleLength + avgDescLength) / 4 * articles.length)} tokens\n`
  );
}
