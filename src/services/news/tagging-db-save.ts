/**
 * AI 뉴스 기사 태그 분류 - DB 저장
 *
 * 역할:
 * - 분류 결과를 article_to_tags 테이블에 저장
 * - Bulk INSERT 최적화
 * - 트랜잭션 보장
 */

import { executeQuery, executeModify, getDatabasePool } from '@/database/mysql';
import { SaveTaggingInput, TagMappingInfo } from '@/types/news-tagging';

/**
 * interest_tags 테이블에서 태그 정보 조회
 *
 * @returns tag_name → tag 정보 매핑
 */
async function getTagMapping(): Promise<Map<string, TagMappingInfo>> {
  const tags = await executeQuery<
    { interest_tag_id: number; tag_name: string; tag_code: string }
  >('SELECT interest_tag_id, tag_name, tag_code FROM interest_tags');

  const mapping = new Map<string, TagMappingInfo>();
  tags.forEach((tag) => {
    mapping.set(tag.tag_name, {
      tag_id: tag.interest_tag_id,
      tag_name: tag.tag_name,
      tag_code: tag.tag_code,
    });
  });

  return mapping;
}

/**
 * 태그 분류 결과를 article_to_tags 테이블에 저장
 *
 * 프로세스:
 * 1. interest_tags에서 태그 매핑 조회
 * 2. article_to_tags에 Bulk INSERT
 * 3. 트랜잭션으로 원자성 보장
 *
 * @param input - 저장할 데이터 (전처리 결과 + GPT 분류 결과 + article_id 매핑)
 */
export async function saveTaggingResults(
  input: SaveTaggingInput
): Promise<void> {
  console.log('💾 Saving tagging results to MySQL...');

  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: 태그 매핑 조회
    console.log('   📚 Fetching tag mapping...');
    const tagMapping = await getTagMapping();
    console.log(`      - Found ${tagMapping.size} tags\n`);

    // Step 2: Bulk INSERT 데이터 준비
    console.log('   🔧 Preparing bulk insert data...');
    const insertSql = `
      INSERT INTO article_to_tags
      (article_id, interest_tag_id, classification_status, confidence_score)
      VALUES ?
    `;

    const values: any[] = [];

    input.taggingResult.classifications.forEach((classification) => {
      const articleId = input.articleIdMap.get(classification.article_index);

      if (!articleId) {
        throw new Error(
          `Article ID not found for index ${classification.article_index}`
        );
      }

      classification.tags.forEach((tagName, tagIdx) => {
        const tagInfo = tagMapping.get(tagName);

        if (!tagInfo) {
          throw new Error(`Tag not found: ${tagName}`);
        }

        const confidence = classification.confidence_scores[tagIdx];

        values.push([
          articleId,
          tagInfo.tag_id,
          'confirmed',
          confidence,
        ]);
      });
    });

    console.log(`      - Prepared ${values.length} tag mappings\n`);

    // Step 3: Bulk INSERT 실행
    console.log('   💿 Executing bulk insert...');
    const startTime = Date.now();

    await connection.query(insertSql, [values]);

    const duration = Date.now() - startTime;
    console.log(`      - Inserted ${values.length} rows in ${duration}ms\n`);

    // Step 4: 커밋
    await connection.commit();
    console.log('   ✅ Transaction committed successfully\n');

    // 통계
    console.log('   📊 Save Statistics:');
    console.log(`      - Articles processed: ${input.taggingResult.classifications.length}`);
    console.log(`      - Tag mappings saved: ${values.length}`);
    console.log(`      - Avg tags per article: 5`);
    console.log(`      - Save duration: ${duration}ms\n`);

  } catch (error) {
    await connection.rollback();
    console.error('   ❌ Error saving to DB, rolled back\n');
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 특정 기사의 태그 조회 (검증용)
 *
 * @param articleId - 기사 ID
 * @returns 태그 목록
 */
export async function getArticleTags(
  articleId: number
): Promise<
  Array<{
    tag_name: string;
    tag_code: string;
    confidence_score: number;
  }>
> {
  const sql = `
    SELECT it.tag_name, it.tag_code, att.confidence_score
    FROM article_to_tags att
    JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
    WHERE att.article_id = ?
    ORDER BY att.confidence_score DESC
  `;

  const tags = await executeQuery<
    { tag_name: string; tag_code: string; confidence_score: number }
  >(sql, [articleId]);

  return tags;
}

/**
 * 저장된 태그 통계 조회
 *
 * @param collectedAt - 특정 수집 시간 (옵션)
 * @returns 태그 분포 통계
 */
export async function getTaggingStats(collectedAt?: Date): Promise<
  Array<{
    tag_name: string;
    tag_count: number;
    avg_confidence: number;
  }>
> {
  let sql = `
    SELECT
      it.tag_name,
      COUNT(*) as tag_count,
      AVG(att.confidence_score) as avg_confidence
    FROM article_to_tags att
    JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
  `;

  const params: any[] = [];

  if (collectedAt) {
    sql += `
      JOIN news_articles na ON att.article_id = na.article_id
      WHERE na.collected_at = ?
    `;
    params.push(collectedAt);
  }

  sql += `
    GROUP BY it.tag_name
    ORDER BY tag_count DESC
  `;

  const stats = await executeQuery<
    { tag_name: string; tag_count: number; avg_confidence: number }
  >(sql, params);

  return stats;
}

/**
 * 아직 태그되지 않은 기사 수 조회
 *
 * @returns 태그 안 된 기사 수
 */
export async function getUntaggedArticleCount(): Promise<number> {
  const sql = `
    SELECT COUNT(*) as count
    FROM news_articles na
    LEFT JOIN article_to_tags att ON na.article_id = att.article_id
    WHERE att.article_id IS NULL
  `;

  const result = await executeQuery<{ count: number }>(sql);
  return result[0].count;
}
