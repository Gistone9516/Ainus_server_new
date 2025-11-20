/**
 * AI 뉴스 기사 태그 분류 파이프라인
 *
 * 전체 프로세스:
 * 1. DB에서 기사 조회 (아직 태그 안 달린 기사)
 * 2. 전처리 (HTML 태그 제거)
 * 3. GPT 분류 (각 기사당 5개 태그)
 * 4. 검증 (태그 유효성, 신뢰도 체크)
 * 5. DB 저장 (article_to_tags 테이블)
 */

import { executeQuery } from '@/database/mysql';
import {
  NewsArticleFromDB,
  TaggingPipelineOptions,
  TaggingPipelineResult,
} from '@/types/news-tagging';
import {
  preprocessForTagging,
  logPreprocessingStats,
} from './tagging-preprocessing';
import { classifyArticlesInBatches } from './gpt-tagging-classifier';
import {
  validateTaggingResult,
  logValidationStats,
} from './tagging-validation';
import {
  saveTaggingResults,
  getUntaggedArticleCount,
} from './tagging-db-save';

// ============ DB 조회 함수 ============

/**
 * DB에서 아직 태그가 분류되지 않은 기사 조회
 *
 * @param collectedAt - 특정 시간대 필터 (옵션)
 * @param limit - 최대 조회 개수 (옵션)
 * @returns 태그되지 않은 기사 배열
 */
async function fetchUntaggedArticles(
  collectedAt?: Date,
  limit?: number
): Promise<NewsArticleFromDB[]> {
  console.log('📰 Fetching untagged articles from DB...');

  let sql = `
    SELECT
      na.article_id,
      na.article_index,
      na.title,
      na.link,
      na.description,
      na.pub_date,
      na.collected_at
    FROM news_articles na
    LEFT JOIN article_to_tags att ON na.article_id = att.article_id
    WHERE att.article_id IS NULL
  `;

  const params: any[] = [];

  if (collectedAt) {
    sql += ' AND na.collected_at = ?';
    params.push(collectedAt);
  }

  sql += ' ORDER BY na.collected_at DESC, na.article_index ASC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  const articles = await executeQuery<NewsArticleFromDB>(sql, params);

  console.log(`   ✅ Found ${articles.length} untagged articles\n`);

  return articles;
}

/**
 * 특정 시간대의 모든 기사 조회 (태그 여부 무관)
 *
 * @param collectedAt - 수집 시간
 * @returns 기사 배열
 */
async function fetchArticlesByCollectedAt(
  collectedAt: Date
): Promise<NewsArticleFromDB[]> {
  console.log(
    `📰 Fetching articles for ${collectedAt.toISOString()}...`
  );

  const sql = `
    SELECT
      article_id,
      article_index,
      title,
      link,
      description,
      pub_date,
      collected_at
    FROM news_articles
    WHERE collected_at = ?
    ORDER BY article_index ASC
  `;

  const articles = await executeQuery<NewsArticleFromDB>(sql, [
    collectedAt,
  ]);

  console.log(`   ✅ Found ${articles.length} articles\n`);

  return articles;
}

// ============ 메인 파이프라인 ============

/**
 * 뉴스 기사 태그 분류 파이프라인 실행
 *
 * @param options - 파이프라인 옵션
 * @returns 실행 결과
 */
export async function runNewsTaggingPipeline(
  options: TaggingPipelineOptions = {}
): Promise<TaggingPipelineResult> {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 News Tagging Pipeline Started');
  console.log('='.repeat(70));
  console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);

  const { collectedAt, limit, batchSize = 1000 } = options;
  const startTime = Date.now();

  try {
    // ========== Step 1: DB 조회 ==========
    console.log('📋 [Step 1/5] Fetching Articles from DB...\n');

    const articles = collectedAt
      ? await fetchArticlesByCollectedAt(collectedAt)
      : await fetchUntaggedArticles(undefined, limit);

    if (articles.length === 0) {
      console.log('ℹ️  No articles to tag. Pipeline terminated.\n');

      return {
        status: 'success',
        message: 'No articles to process',
        executedAt: new Date().toISOString(),
        articlesProcessed: 0,
        tagsMapped: 0,
        duration: Date.now() - startTime,
      };
    }

    console.log(`📊 Pipeline will process ${articles.length} articles\n`);

    // ========== Step 2: 전처리 ==========
    console.log('⚙️  [Step 2/5] Preprocessing...\n');

    logPreprocessingStats(articles);
    const { gptInput, articleIdMap } = preprocessForTagging(articles);

    console.log('✅ Preprocessing complete\n');

    // ========== Step 3: GPT 분류 ==========
    console.log('🤖 [Step 3/5] GPT Classification...\n');

    const taggingResult = await classifyArticlesInBatches(
      gptInput,
      batchSize
    );

    console.log('✅ Classification complete\n');

    // ========== Step 4: 검증 ==========
    console.log('🔍 [Step 4/5] Validation...\n');

    const validation = validateTaggingResult(taggingResult, articles.length);

    if (!validation.isValid) {
      throw new Error(
        `Validation failed: ${validation.errors.slice(0, 5).join(', ')}`
      );
    }

    logValidationStats(taggingResult);

    console.log('✅ Validation passed\n');

    // ========== Step 5: DB 저장 ==========
    console.log('💾 [Step 5/5] Saving to Database...\n');

    await saveTaggingResults({
      preprocessedArticles: gptInput.articles,
      taggingResult,
      articleIdMap,
    });

    console.log('✅ DB save complete\n');

    // ========== 완료 로그 ==========
    const duration = Date.now() - startTime;

    console.log('='.repeat(70));
    console.log('✅ Pipeline Completed Successfully');
    console.log('='.repeat(70));
    console.log(`⏱️  Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`📊 Summary:`);
    console.log(`   - Articles processed: ${articles.length}`);
    console.log(`   - Tag mappings saved: ${articles.length * 5}`);
    console.log(
      `   - Remaining untagged: ${await getUntaggedArticleCount()}\n`
    );

    return {
      status: 'success',
      message: 'Pipeline executed successfully',
      executedAt: new Date().toISOString(),
      articlesProcessed: articles.length,
      tagsMapped: articles.length * 5,
      duration,
    };
  } catch (error) {
    console.error('\n❌ Pipeline Error:', error);

    const duration = Date.now() - startTime;

    const result: TaggingPipelineResult = {
      status: 'failure',
      message: 'Pipeline failed',
      executedAt: new Date().toISOString(),
      articlesProcessed: 0,
      tagsMapped: 0,
      duration,
      error: error instanceof Error ? error.message : String(error),
    };

    console.log('='.repeat(70));
    console.log('❌ Pipeline Failed');
    console.log('='.repeat(70));
    console.log(`Error: ${result.error}\n`);

    throw error;
  }
}

/**
 * 파이프라인 수동 실행 (기본 옵션)
 */
export async function runTaggingPipelineManually(): Promise<TaggingPipelineResult> {
  return runNewsTaggingPipeline();
}

// ============ Export ============

export { fetchUntaggedArticles, fetchArticlesByCollectedAt };
