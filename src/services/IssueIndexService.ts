/**
 * 이슈 지수 서비스 (기능 #7)
 * 이슈 지수 근거 데이터 조회 비즈니스 로직
 */

import { executeQuery, queryOne } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { ValidationException, DatabaseException } from '../exceptions';
import { GetIssueIndexSourcesParams } from '../types';

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 */
function validateDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * 이슈 지수 근거 데이터 조회 (TASK-7-1)
 * GET /api/v1/issue-index/{date}/sources
 * Redis 캐싱 (3시간 TTL)
 */
export async function getIssueIndexSources(params: GetIssueIndexSourcesParams) {
  const methodName = 'getIssueIndexSources';

  try {
    // 1단계: 입력 검증
    if (!params.date || !validateDateFormat(params.date)) {
      throw new ValidationException(
        '날짜 형식이 유효하지 않습니다. YYYY-MM-DD 형식을 사용해주세요.',
        methodName
      );
    }

    const limit = params.limit || 3;
    const offset = params.offset || 0;
    const category = params.category || 'all';
    const sortBy = params.sort_by || 'impact';

    // limit 검증 (1-10 범위)
    if (limit < 1 || limit > 10) {
      throw new ValidationException('limit은 1-10 범위여야 합니다.', methodName);
    }

    // offset 검증 (0 이상)
    if (offset < 0) {
      throw new ValidationException('offset은 0 이상이어야 합니다.', methodName);
    }

    // category 검증
    const validCategories = ['all', 'tech', 'policy', 'market'];
    if (!validCategories.includes(category)) {
      throw new ValidationException('유효한 카테고리를 선택하세요.', methodName);
    }

    // sort_by 검증
    const validSortOptions = ['impact', 'published_date'];
    if (!validSortOptions.includes(sortBy)) {
      throw new ValidationException('유효한 정렬 기준을 선택하세요.', methodName);
    }

    // 2단계: Redis 캐시 확인
    const redis = getRedisCache();
    const cacheKey = `issue_sources:${params.date}:${category}:${sortBy}:${limit}:${offset}`;

    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    } catch (cacheError) {
      // 캐시 조회 실패는 무시하고 계속 진행
      console.warn('Cache read failed:', cacheError);
    }

    // 3단계: DB에서 이슈 지수 조회
    const issueIndexQuery = `
      SELECT
        index_id,
        score as value,
        comparison_previous_week as previous_value,
        trend as change_direction
      FROM issue_index_daily
      WHERE index_date = ?
      LIMIT 1
    `;

    const issueIndexRow = await queryOne<any>(issueIndexQuery, [params.date]);

    if (!issueIndexRow) {
      throw new ValidationException(
        '해당 날짜의 이슈 지수 데이터를 찾을 수 없습니다.',
        methodName
      );
    }

    // 이슈 지수 정보 구성
    const issueIndex = {
      value: issueIndexRow.value,
      previous_value: issueIndexRow.previous_value,
      change_percentage: issueIndexRow.previous_value
        ? ((issueIndexRow.value - issueIndexRow.previous_value) / issueIndexRow.previous_value) * 100
        : undefined,
      change_direction: issueIndexRow.change_direction || 'same'
    };

    // 4단계: 근거 뉴스 조회
    let sourcesQuery = `
      SELECT
        iis.id as source_id,
        iis.news_id,
        iis.\`rank\`,
        iis.impact_score,
        na.title,
        na.summary,
        na.source,
        na.url as source_url,
        na.published_at,
        na.impact_score as article_impact_score
      FROM issue_index_sources iis
      INNER JOIN news_articles na ON iis.news_id = na.article_id
      WHERE iis.date = ?
    `;

    const queryParams: any[] = [params.date];

    // 카테고리 필터 (all이 아닌 경우)
    if (category !== 'all') {
      // category 정보는 article_to_tags를 통해 가져와야 함
      // 여기서는 간단히 처리하고, 필요시 조인 추가
    }

    // 정렬
    if (sortBy === 'impact') {
      sourcesQuery += ' ORDER BY iis.impact_score DESC';
    } else if (sortBy === 'published_date') {
      sourcesQuery += ' ORDER BY na.published_at DESC';
    }

    // 페이지네이션
    sourcesQuery += ' LIMIT ? OFFSET ?';
    queryParams.push(limit, offset);

    const sourcesRows = await executeQuery<any>(sourcesQuery, queryParams);

    // 5단계: 각 뉴스의 태그 조회
    const sources = [];
    for (const row of sourcesRows) {
      const tagsQuery = `
        SELECT nt.tag_name
        FROM news_tags nt
        WHERE nt.news_id = ?
      `;
      const tagsRows = await executeQuery<any>(tagsQuery, [row.news_id]);
      const tags = tagsRows.map((tag: any) => tag.tag_name);

      sources.push({
        source_id: row.source_id,
        news_id: row.news_id,
        rank: row.rank,
        title: row.title,
        summary: row.summary,
        source: row.source,
        source_url: row.source_url,
        published_at: row.published_at ? new Date(row.published_at).toISOString() : '',
        impact_score: row.impact_score,
        tags: tags,
        content_snippet: row.summary ? row.summary.substring(0, 200) : undefined,
        image_url: undefined // 이미지는 추후 추가 가능
      });
    }

    // 6단계: 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM issue_index_sources
      WHERE date = ?
    `;
    const countRow = await queryOne<any>(countQuery, [params.date]);
    const totalCount = countRow ? countRow.total : 0;

    // 7단계: 응답 구성
    const response = {
      date: params.date,
      issue_index: issueIndex,
      sources: sources,
      total_count: totalCount,
      timestamp: new Date().toISOString()
    };

    // 8단계: Redis 캐시 저장 (3시간 TTL)
    try {
      await redis.set(cacheKey, JSON.stringify(response), 3 * 60 * 60);
    } catch (cacheError) {
      // 캐시 저장 실패는 무시
      console.warn('Cache write failed:', cacheError);
    }

    return response;
  } catch (error) {
    if (error instanceof ValidationException) {
      throw error;
    }
    console.error('이슈 지수 근거 데이터 조회 오류:', error);
    throw new DatabaseException('이슈 지수 근거 데이터 조회 중 오류가 발생했습니다.', methodName);
  }
}

/**
 * 뉴스 기사 추가 조회 (TASK-7-2)
 * GET /api/v1/issue-index/{date}/articles
 */
export async function getNewsArticles(
  date: string,
  limit: number = 10,
  offset: number = 0,
  minImpactScore: number = 50
) {
  const methodName = 'getNewsArticles';

  try {
    // 1단계: 입력 검증
    if (!date || !validateDateFormat(date)) {
      throw new ValidationException(
        '날짜 형식이 유효하지 않습니다. YYYY-MM-DD 형식을 사용해주세요.',
        methodName
      );
    }

    // limit 검증 (1-20 범위)
    if (limit < 1 || limit > 20) {
      throw new ValidationException('limit은 1-20 범위여야 합니다.', methodName);
    }

    // offset 검증 (0 이상)
    if (offset < 0) {
      throw new ValidationException('offset은 0 이상이어야 합니다.', methodName);
    }

    // minImpactScore 검증 (0-100 범위)
    if (minImpactScore < 0 || minImpactScore > 100) {
      throw new ValidationException('min_impact_score는 0-100 범위여야 합니다.', methodName);
    }

    // 2단계: 뉴스 기사 조회
    const articlesQuery = `
      SELECT
        na.article_id as news_id,
        na.title,
        na.summary,
        na.source,
        na.url as source_url,
        na.published_at,
        na.impact_score
      FROM news_articles na
      WHERE DATE(na.published_at) = ?
        AND na.impact_score >= ?
      ORDER BY na.impact_score DESC
      LIMIT ? OFFSET ?
    `;

    const articlesRows = await executeQuery<any>(articlesQuery, [date, minImpactScore, limit, offset]);

    // 3단계: 각 뉴스의 태그 조회
    const articles = [];
    for (const row of articlesRows) {
      const tagsQuery = `
        SELECT nt.tag_name
        FROM news_tags nt
        WHERE nt.news_id = ?
      `;
      const tagsRows = await executeQuery<any>(tagsQuery, [row.news_id]);
      const tags = tagsRows.map((tag: any) => tag.tag_name);

      articles.push({
        news_id: row.news_id,
        title: row.title,
        summary: row.summary,
        source: row.source,
        source_url: row.source_url,
        published_at: row.published_at ? new Date(row.published_at).toISOString() : '',
        impact_score: row.impact_score,
        tags: tags
      });
    }

    // 4단계: 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM news_articles
      WHERE DATE(published_at) = ?
        AND impact_score >= ?
    `;
    const countRow = await queryOne<any>(countQuery, [date, minImpactScore]);
    const totalCount = countRow ? countRow.total : 0;

    // 5단계: 응답 구성
    const response = {
      date: date,
      articles: articles,
      total_count: totalCount,
      has_more: (offset + limit) < totalCount
    };

    return response;
  } catch (error) {
    if (error instanceof ValidationException) {
      throw error;
    }
    console.error('뉴스 기사 조회 오류:', error);
    throw new DatabaseException('뉴스 기사 조회 중 오류가 발생했습니다.', methodName);
  }
}
