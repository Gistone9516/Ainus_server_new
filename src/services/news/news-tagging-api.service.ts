/**
 * AI 뉴스 기사 태그 분류 API 서비스
 *
 * 역할:
 * - API 엔드포인트를 위한 비즈니스 로직
 * - DB 조회 및 데이터 가공
 */

import { executeQuery } from '@/database/mysql';
import { NewsArticleFromDB } from '@/types/news-tagging';

// ============ Admin API ============

/**
 * 파이프라인 상태 조회
 */
export async function getPipelineStatus(): Promise<{
  totalArticles: number;
  taggedArticles: number;
  untaggedArticles: number;
  taggedPercentage: number;
  totalTagMappings: number;
  lastRunAt: string | null;
  topTags: Array<{ tag_name: string; count: number }>;
}> {
  // 총 기사 수
  const totalResult = await executeQuery<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM news_articles'
  );
  const totalArticles = totalResult[0].count;

  // 태그된 기사 수 (DISTINCT article_id)
  const taggedResult = await executeQuery<{ count: number }[]>(
    'SELECT COUNT(DISTINCT article_id) as count FROM article_to_tags'
  );
  const taggedArticles = taggedResult[0].count;

  const untaggedArticles = totalArticles - taggedArticles;
  const taggedPercentage =
    totalArticles > 0 ? (taggedArticles / totalArticles) * 100 : 0;

  // 총 태그 매핑 수
  const mappingsResult = await executeQuery<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM article_to_tags'
  );
  const totalTagMappings = mappingsResult[0].count;

  // 마지막 실행 시간 (가장 최근 태그 생성 시간)
  const lastRunResult = await executeQuery<{ created_at: Date }[]>(
    'SELECT created_at FROM article_to_tags ORDER BY created_at DESC LIMIT 1'
  );
  const lastRunAt = lastRunResult[0]?.created_at
    ? new Date(lastRunResult[0].created_at).toISOString()
    : null;

  // 상위 10개 태그
  const topTags = await executeQuery<{ tag_name: string; count: number }[]>(
    `SELECT it.tag_name, COUNT(*) as count
     FROM article_to_tags att
     JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
     GROUP BY it.tag_name
     ORDER BY count DESC
     LIMIT 10`
  );

  return {
    totalArticles,
    taggedArticles,
    untaggedArticles,
    taggedPercentage: parseFloat(taggedPercentage.toFixed(2)),
    totalTagMappings,
    lastRunAt,
    topTags,
  };
}

/**
 * 미분류 기사 목록 조회 (페이지네이션)
 */
export async function getUntaggedArticles(params: {
  page: number;
  limit: number;
  collectedAt?: Date;
}): Promise<{
  articles: NewsArticleFromDB[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { page, limit, collectedAt } = params;
  const offset = (page - 1) * limit;

  let countSql = `
    SELECT COUNT(*) as count
    FROM news_articles na
    LEFT JOIN article_to_tags att ON na.article_id = att.article_id
    WHERE att.article_id IS NULL
  `;

  let dataSql = `
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

  const params_array: any[] = [];

  if (collectedAt) {
    countSql += ' AND na.collected_at = ?';
    dataSql += ' AND na.collected_at = ?';
    params_array.push(collectedAt);
  }

  dataSql += ' ORDER BY na.collected_at DESC, na.article_index ASC LIMIT ? OFFSET ?';

  // 총 개수 조회
  const countResult = await executeQuery<{ count: number }[]>(
    countSql,
    params_array
  );
  const total = countResult[0].count;

  // 데이터 조회
  const articles = await executeQuery<NewsArticleFromDB[]>(dataSql, [
    ...params_array,
    limit,
    offset,
  ]);

  return {
    articles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============ Article Tags API ============

/**
 * 특정 기사의 태그 조회
 */
export async function getArticleTags(articleId: number): Promise<{
  article_id: number;
  title: string;
  tags: Array<{
    tag_id: number;
    tag_name: string;
    tag_code: string;
    confidence_score: number;
  }>;
} | null> {
  // 기사 정보 조회
  const articleResult = await executeQuery<{ article_id: number; title: string }[]>(
    'SELECT article_id, title FROM news_articles WHERE article_id = ?',
    [articleId]
  );

  if (articleResult.length === 0) {
    return null;
  }

  // 태그 조회
  const tags = await executeQuery<
    {
      tag_id: number;
      tag_name: string;
      tag_code: string;
      confidence_score: number;
    }[]
  >(
    `SELECT
       it.interest_tag_id as tag_id,
       it.tag_name,
       it.tag_code,
       att.confidence_score
     FROM article_to_tags att
     JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
     WHERE att.article_id = ?
     ORDER BY att.confidence_score DESC`,
    [articleId]
  );

  return {
    article_id: articleResult[0].article_id,
    title: articleResult[0].title,
    tags,
  };
}

/**
 * 여러 기사의 태그 일괄 조회
 */
export async function getBatchArticleTags(
  articleIds: number[]
): Promise<Record<number, Array<{ tag_name: string; confidence_score: number }>>> {
  if (articleIds.length === 0) {
    return {};
  }

  const placeholders = articleIds.map(() => '?').join(',');

  const results = await executeQuery<
    {
      article_id: number;
      tag_name: string;
      confidence_score: number;
    }[]
  >(
    `SELECT
       att.article_id,
       it.tag_name,
       att.confidence_score
     FROM article_to_tags att
     JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
     WHERE att.article_id IN (${placeholders})
     ORDER BY att.article_id, att.confidence_score DESC`,
    articleIds
  );

  const grouped: Record<
    number,
    Array<{ tag_name: string; confidence_score: number }>
  > = {};

  results.forEach((row) => {
    if (!grouped[row.article_id]) {
      grouped[row.article_id] = [];
    }
    grouped[row.article_id].push({
      tag_name: row.tag_name,
      confidence_score: row.confidence_score,
    });
  });

  return grouped;
}

// ============ Tags API ============

/**
 * 전체 태그 목록 조회
 */
export async function getAllTags(category?: string): Promise<{
  tags: Array<{
    tag_id: number;
    tag_name: string;
    tag_code: string;
    description: string;
    article_count: number;
  }>;
  categories: {
    tech: number;
    industry: number;
    trend: number;
  };
}> {
  let sql = `
    SELECT
      it.interest_tag_id as tag_id,
      it.tag_name,
      it.tag_code,
      it.description,
      COUNT(att.article_id) as article_count
    FROM interest_tags it
    LEFT JOIN article_to_tags att ON it.interest_tag_id = att.interest_tag_id
  `;

  const params: any[] = [];

  // TODO: interest_tags에 category 컬럼 추가 시 필터링 활성화
  // if (category) {
  //   sql += ' WHERE it.category = ?';
  //   params.push(category);
  // }

  sql += ' GROUP BY it.interest_tag_id ORDER BY it.interest_tag_id ASC';

  const tags = await executeQuery<
    {
      tag_id: number;
      tag_name: string;
      tag_code: string;
      description: string;
      article_count: number;
    }[]
  >(sql, params);

  // 카테고리별 개수 (하드코딩 - 나중에 DB 컬럼 추가 시 수정)
  const categories = {
    tech: 12,
    industry: 18,
    trend: 10,
  };

  return { tags, categories };
}

/**
 * 특정 태그 상세 정보
 */
export async function getTagDetail(tagId: number): Promise<{
  tag_id: number;
  tag_name: string;
  tag_code: string;
  description: string;
  stats: {
    article_count: number;
    avg_confidence: number;
    first_used_at: string | null;
    last_used_at: string | null;
  };
} | null> {
  // 태그 정보 조회
  const tagResult = await executeQuery<
    {
      tag_id: number;
      tag_name: string;
      tag_code: string;
      description: string;
    }[]
  >(
    'SELECT interest_tag_id as tag_id, tag_name, tag_code, description FROM interest_tags WHERE interest_tag_id = ?',
    [tagId]
  );

  if (tagResult.length === 0) {
    return null;
  }

  // 통계 조회
  const statsResult = await executeQuery<
    {
      article_count: number;
      avg_confidence: number;
      first_used_at: Date | null;
      last_used_at: Date | null;
    }[]
  >(
    `SELECT
       COUNT(*) as article_count,
       AVG(confidence_score) as avg_confidence,
       MIN(created_at) as first_used_at,
       MAX(created_at) as last_used_at
     FROM article_to_tags
     WHERE interest_tag_id = ?`,
    [tagId]
  );

  const stats = statsResult[0] || {
    article_count: 0,
    avg_confidence: 0,
    first_used_at: null,
    last_used_at: null,
  };

  return {
    ...tagResult[0],
    stats: {
      article_count: stats.article_count,
      avg_confidence: parseFloat((stats.avg_confidence || 0).toFixed(4)),
      first_used_at: stats.first_used_at
        ? new Date(stats.first_used_at).toISOString()
        : null,
      last_used_at: stats.last_used_at
        ? new Date(stats.last_used_at).toISOString()
        : null,
    },
  };
}

/**
 * 특정 태그의 기사 목록 (페이지네이션)
 */
export async function getArticlesByTag(params: {
  tagId: number;
  page: number;
  limit: number;
  sort?: string;
  minConfidence?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  tag: { tag_id: number; tag_name: string; tag_code: string } | null;
  articles: Array<{
    article_id: number;
    title: string;
    description: string;
    link: string;
    pub_date: string;
    confidence_score: number;
    other_tags: string[];
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { tagId, page, limit, sort, minConfidence, startDate, endDate } = params;
  const offset = (page - 1) * limit;

  // 태그 정보 조회
  const tagResult = await executeQuery<
    { tag_id: number; tag_name: string; tag_code: string }[]
  >(
    'SELECT interest_tag_id as tag_id, tag_name, tag_code FROM interest_tags WHERE interest_tag_id = ?',
    [tagId]
  );

  if (tagResult.length === 0) {
    return {
      tag: null,
      articles: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  // 쿼리 빌드
  let countSql = `
    SELECT COUNT(*) as count
    FROM article_to_tags att
    JOIN news_articles na ON att.article_id = na.article_id
    WHERE att.interest_tag_id = ?
  `;

  let dataSql = `
    SELECT
      na.article_id,
      na.title,
      na.description,
      na.link,
      na.pub_date,
      att.confidence_score
    FROM article_to_tags att
    JOIN news_articles na ON att.article_id = na.article_id
    WHERE att.interest_tag_id = ?
  `;

  const queryParams: any[] = [tagId];

  // 필터 추가
  if (minConfidence !== undefined) {
    countSql += ' AND att.confidence_score >= ?';
    dataSql += ' AND att.confidence_score >= ?';
    queryParams.push(minConfidence);
  }

  if (startDate) {
    countSql += ' AND na.pub_date >= ?';
    dataSql += ' AND na.pub_date >= ?';
    queryParams.push(startDate);
  }

  if (endDate) {
    countSql += ' AND na.pub_date <= ?';
    dataSql += ' AND na.pub_date <= ?';
    queryParams.push(endDate);
  }

  // 정렬
  switch (sort) {
    case 'confidence_desc':
      dataSql += ' ORDER BY att.confidence_score DESC';
      break;
    case 'pub_date_desc':
      dataSql += ' ORDER BY na.pub_date DESC';
      break;
    case 'collected_at_desc':
      dataSql += ' ORDER BY na.collected_at DESC';
      break;
    default:
      dataSql += ' ORDER BY att.confidence_score DESC';
  }

  dataSql += ' LIMIT ? OFFSET ?';

  // 총 개수 조회
  const countResult = await executeQuery<{ count: number }[]>(
    countSql,
    queryParams
  );
  const total = countResult[0].count;

  // 데이터 조회
  const articles = await executeQuery<
    {
      article_id: number;
      title: string;
      description: string;
      link: string;
      pub_date: Date;
      confidence_score: number;
    }[]
  >(dataSql, [...queryParams, limit, offset]);

  // 각 기사의 다른 태그 조회
  const articleIds = articles.map((a) => a.article_id);
  const otherTagsMap: Record<number, string[]> = {};

  if (articleIds.length > 0) {
    const placeholders = articleIds.map(() => '?').join(',');
    const otherTagsResult = await executeQuery<
      { article_id: number; tag_name: string }[]
    >(
      `SELECT att.article_id, it.tag_name
       FROM article_to_tags att
       JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
       WHERE att.article_id IN (${placeholders}) AND att.interest_tag_id != ?
       ORDER BY att.article_id, att.confidence_score DESC`,
      [...articleIds, tagId]
    );

    otherTagsResult.forEach((row) => {
      if (!otherTagsMap[row.article_id]) {
        otherTagsMap[row.article_id] = [];
      }
      otherTagsMap[row.article_id].push(row.tag_name);
    });
  }

  const enrichedArticles = articles.map((article) => ({
    ...article,
    pub_date: new Date(article.pub_date).toISOString(),
    other_tags: otherTagsMap[article.article_id] || [],
  }));

  return {
    tag: tagResult[0],
    articles: enrichedArticles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============ Stats API ============

/**
 * 태그 분포 통계
 */
export async function getTagDistribution(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<{
  period: { start: string | null; end: string | null };
  distribution: Array<{
    tag_id: number;
    tag_name: string;
    article_count: number;
    percentage: number;
    avg_confidence: number;
  }>;
  totalArticles: number;
  totalTagMappings: number;
}> {
  const { startDate, endDate, limit = 10 } = params;

  let sql = `
    SELECT
      it.interest_tag_id as tag_id,
      it.tag_name,
      COUNT(*) as article_count,
      AVG(att.confidence_score) as avg_confidence
    FROM article_to_tags att
    JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
  `;

  const queryParams: any[] = [];

  if (startDate || endDate) {
    sql += ' JOIN news_articles na ON att.article_id = na.article_id WHERE 1=1';

    if (startDate) {
      sql += ' AND na.pub_date >= ?';
      queryParams.push(startDate);
    }

    if (endDate) {
      sql += ' AND na.pub_date <= ?';
      queryParams.push(endDate);
    }
  }

  sql += ' GROUP BY it.interest_tag_id ORDER BY article_count DESC LIMIT ?';
  queryParams.push(limit);

  const distribution = await executeQuery<
    {
      tag_id: number;
      tag_name: string;
      article_count: number;
      avg_confidence: number;
    }[]
  >(sql, queryParams);

  // 총 기사 수 및 태그 매핑 수
  let totalSql = `
    SELECT
      COUNT(DISTINCT att.article_id) as totalArticles,
      COUNT(*) as totalTagMappings
    FROM article_to_tags att
  `;

  if (startDate || endDate) {
    totalSql += ' JOIN news_articles na ON att.article_id = na.article_id WHERE 1=1';
    const totalParams: any[] = [];

    if (startDate) {
      totalSql += ' AND na.pub_date >= ?';
      totalParams.push(startDate);
    }

    if (endDate) {
      totalSql += ' AND na.pub_date <= ?';
      totalParams.push(endDate);
    }

    const totalResult = await executeQuery<
      { totalArticles: number; totalTagMappings: number }[]
    >(totalSql, totalParams);

    const { totalArticles, totalTagMappings } = totalResult[0];

    const enrichedDistribution = distribution.map((item) => ({
      ...item,
      percentage: parseFloat(((item.article_count / totalArticles) * 100).toFixed(2)),
      avg_confidence: parseFloat(item.avg_confidence.toFixed(4)),
    }));

    return {
      period: {
        start: startDate ? startDate.toISOString() : null,
        end: endDate ? endDate.toISOString() : null,
      },
      distribution: enrichedDistribution,
      totalArticles,
      totalTagMappings,
    };
  } else {
    const totalResult = await executeQuery<
      { totalArticles: number; totalTagMappings: number }[]
    >(totalSql);

    const { totalArticles, totalTagMappings } = totalResult[0];

    const enrichedDistribution = distribution.map((item) => ({
      ...item,
      percentage: parseFloat(((item.article_count / totalArticles) * 100).toFixed(2)),
      avg_confidence: parseFloat(item.avg_confidence.toFixed(4)),
    }));

    return {
      period: { start: null, end: null },
      distribution: enrichedDistribution,
      totalArticles,
      totalTagMappings,
    };
  }
}
