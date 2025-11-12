/**
 * Feature #8: 개인화된 AI 트렌드 모니터링 서비스
 * 메서드 단위 예외처리 전략 준수
 * 각 메서드마다 독립적인 예외 처리로 문제 발생 지점 명확화
 */

import { executeQuery, executeModify, queryOne } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { Logger } from '../database/logger';
import { ValidationException, DatabaseException } from '../exceptions';

const logger = new Logger('TrendMonitoringService');

/**
 * 직업 정보 인터페이스
 */
export interface JobInfo {
  job_id: number;
  job_code: string;
  job_name_ko: string;
  job_name_en: string;
  description: string;
  icon_url: string | null;
  recommended_tags: RecommendedTag[];
}

/**
 * 추천 태그 인터페이스
 */
export interface RecommendedTag {
  tag_id: number;
  tag_name_ko: string;
  tag_name_en: string;
  recommendation_rank: number;
}

/**
 * 사용자 프로필 인터페이스
 */
export interface UserProfile {
  user_id: bigint;
  job_category: {
    job_id: number;
    job_name_ko: string;
    job_name_en: string;
  };
  interest_tags: {
    tag_id: number;
    tag_name_ko: string;
    tag_name_en: string;
  }[];
  profile_updated_at: string;
}

/**
 * 이슈 지수 응답 인터페이스
 */
export interface JobIssueIndexResponse {
  job_category: {
    job_id: number;
    job_name_ko: string;
    job_name_en: string;
  };
  current_index: {
    date: string;
    value: number;
    previous_value: number;
    change_percentage: number;
    change_direction: string;
    last_updated_at: string;
  };
  trend_data: Array<{
    date: string;
    value: number;
  }>;
  source_articles: Array<any>;
}

/**
 * Method 1: 직업 목록 및 자동 추천 태그 조회
 *
 * Raises:
 *   DatabaseException: DB 조회 실패
 *   ValidationException: 데이터 유효성 검사 실패
 */
export async function getJobs(): Promise<{
  jobs: JobInfo[];
  total_jobs: number;
  timestamp: string;
}> {
  const methodName = 'getJobs';
  const redis = getRedisCache();
  const cacheKey = 'jobs:all';

  try {
    // Step 1: Redis 캐시 확인 (TTL: 24시간)
    try {
      const cachedJobs = await redis.get(cacheKey);
      if (cachedJobs) {
        logger.info(`${methodName}: Cache hit`, { cacheKey });
        return JSON.parse(cachedJobs);
      }
    } catch (cacheError) {
      logger.warn(`${methodName}: Cache miss, proceeding with DB query`, { cacheKey });
    }

    // Step 2: 표준 13개 직업 목록 조회
    let jobs: any[] = [];
    try {
      jobs = await executeQuery(
        `SELECT id as job_id, job_code, job_name_ko, job_name_en, description, icon_url
         FROM jobs
         WHERE is_active = TRUE
         ORDER BY sort_order ASC`
      );

      if (!jobs || jobs.length === 0) {
        throw new ValidationException('활성화된 직업 데이터 없음', methodName);
      }

      // 표준 13개 직업이 모두 조회되는지 검증
      if (jobs.length !== 13) {
        logger.warn(`${methodName}: Expected 13 jobs but found ${jobs.length}`, { count: jobs.length });
      }
    } catch (dbError) {
      if (dbError instanceof ValidationException) throw dbError;
      throw new DatabaseException(
        `직업 목록 조회 실패: ${dbError}`,
        methodName
      );
    }

    // Step 3: 각 직업별 추천 태그 조회
    const jobsWithTags: JobInfo[] = [];
    const recommendedTagsErrors: any[] = [];

    for (const job of jobs) {
      try {
        const tags = await executeQuery(
          `SELECT it.id as tag_id, it.tag_name_ko, it.tag_name_en, jti.recommendation_rank
           FROM job_to_interest_tags jti
           JOIN interest_tags it ON jti.interest_tag_id = it.id
           WHERE jti.job_category_id = ? AND it.is_active = TRUE
           ORDER BY jti.recommendation_rank ASC
           LIMIT 10`,
          [job.job_id]
        );

        jobsWithTags.push({
          ...job,
          recommended_tags: tags || []
        });
      } catch (tagError) {
        recommendedTagsErrors.push({
          job_id: job.job_id,
          error: `태그 조회 실패: ${tagError}`
        });
        // 태그 조회 실패 시에도 직업 정보는 반환
        jobsWithTags.push({
          ...job,
          recommended_tags: []
        });
      }
    }

    // Step 4: 응답 구성
    const response = {
      jobs: jobsWithTags,
      total_jobs: jobsWithTags.length,
      timestamp: new Date().toISOString()
    };

    // Step 5: Redis 캐시 저장
    try {
      await redis.set(cacheKey, JSON.stringify(response), 86400); // 24시간
    } catch (cacheError) {
      logger.warn(`${methodName}: Failed to cache results`, { cacheKey });
    }

    logger.info(`${methodName}: Success`, {
      total_jobs: jobsWithTags.length,
      errors: recommendedTagsErrors.length
    });

    return response;

  } catch (error) {
    if (error instanceof DatabaseException || error instanceof ValidationException) {
      throw error;
    }
    throw new DatabaseException(
      `직업 목록 조회 중 예상 밖의 오류: ${error}`,
      methodName
    );
  }
}

/**
 * Method 2: 사용자 직업 및 관심 태그 저장
 *
 * Args:
 *   userId: 사용자 ID
 *   jobCategoryId: 직업 카테고리 ID (1-13)
 *   interestTagIds: 관심 태그 ID 배열 (1-40개)
 *
 * Raises:
 *   ValidationException: 입력 검증 실패
 *   DatabaseException: DB 작업 실패
 */
export async function saveUserJobAndTags(
  userId: bigint,
  jobCategoryId: number,
  interestTagIds: number[]
): Promise<UserProfile> {
  const methodName = 'saveUserJobAndTags';
  const redis = getRedisCache();

  // Step 1: 입력 검증
  try {
    if (!userId || userId <= 0) {
      throw new ValidationException('유효한 사용자 ID가 필요합니다', methodName);
    }

    if (jobCategoryId < 1 || jobCategoryId > 13) {
      throw new ValidationException(
        '직업 ID는 1-13 범위여야 합니다',
        methodName
      );
    }

    if (!Array.isArray(interestTagIds) || interestTagIds.length === 0) {
      throw new ValidationException(
        '최소 1개 이상의 태그를 선택하세요',
        methodName
      );
    }

    if (interestTagIds.length > 40) {
      throw new ValidationException(
        '최대 40개까지만 선택할 수 있습니다',
        methodName
      );
    }

    // 중복 제거
    const uniqueTagIds = [...new Set(interestTagIds)];

    // 모든 태그가 유효한지 확인
    const validTagIds = await executeQuery(
      `SELECT id FROM interest_tags WHERE id IN (${uniqueTagIds.map(() => '?').join(',')}) AND is_active = TRUE`,
      uniqueTagIds
    );

    if (validTagIds.length !== uniqueTagIds.length) {
      throw new ValidationException(
        '유효하지 않은 태그 ID가 포함되어 있습니다',
        methodName
      );
    }
  } catch (validationError) {
    if (validationError instanceof ValidationException) throw validationError;
    throw new ValidationException(
      `입력 검증 중 오류: ${validationError}`,
      methodName
    );
  }

  // Step 2: 사용자 프로필 업데이트 또는 생성
  try {
    const existingProfile = await queryOne(
      `SELECT profile_id FROM user_profiles WHERE user_id = ?`,
      [userId]
    );

    if (existingProfile) {
      // 기존 프로필 업데이트
      await executeModify(
        `UPDATE user_profiles SET job_category_id = ?, updated_at = NOW() WHERE user_id = ?`,
        [jobCategoryId, userId]
      );
    } else {
      // 새 프로필 생성
      await executeModify(
        `INSERT INTO user_profiles (user_id, job_category_id, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [userId, jobCategoryId]
      );
    }
  } catch (error) {
    throw new DatabaseException(
      `프로필 저장 중 오류: ${error}`,
      methodName
    );
  }

  // Step 3: 기존 태그 삭제 및 새 태그 삽입
  try {
    // 기존 태그 삭제
    await executeModify(
      `DELETE FROM user_interest_tags WHERE user_id = ?`,
      [userId]
    );

    // 새 태그 삽입
    if (interestTagIds.length > 0) {
      const values = interestTagIds.map(tagId => [userId, tagId]);
      const placeholders = values.map(() => '(?, ?)').join(',');
      const flatValues = values.flat();

      await executeModify(
        `INSERT INTO user_interest_tags (user_id, tag_id, selected_at)
         VALUES ${placeholders}`,
        flatValues
      );
    }
  } catch (error) {
    throw new DatabaseException(
      `태그 저장 중 오류: ${error}`,
      methodName
    );
  }

  // Step 4: 업데이트된 프로필 조회
  let userProfile: UserProfile;
  try {
    const job = await queryOne(
      `SELECT j.id as job_id, j.job_name_ko, j.job_name_en
       FROM jobs j
       WHERE j.id = ?`,
      [jobCategoryId]
    );

    const tags = await executeQuery(
      `SELECT it.id as tag_id, it.tag_name_ko, it.tag_name_en
       FROM user_interest_tags uit
       JOIN interest_tags it ON uit.tag_id = it.id
       WHERE uit.user_id = ?
       ORDER BY uit.selected_at ASC`,
      [userId]
    );

    userProfile = {
      user_id: userId,
      job_category: job as any,
      interest_tags: tags as any,
      profile_updated_at: new Date().toISOString()
    };
  } catch (error) {
    throw new DatabaseException(
      `프로필 조회 중 오류: ${error}`,
      methodName
    );
  }

  // Step 5: 캐시 무효화
  try {
    await redis.delete(`user_profile:${userId}`);
    await redis.delete(`news:user:${userId}`);
  } catch (cacheError) {
    logger.warn(`${methodName}: Failed to invalidate cache`, { userId });
  }

  logger.info(`${methodName}: Success`, {
    userId,
    jobCategoryId,
    tagCount: interestTagIds.length
  });

  return userProfile;
}

/**
 * Method 3: 직업별 AI 이슈 지수 조회
 *
 * Args:
 *   jobCategoryId: 직업 카테고리 ID (1-13)
 *   days: 조회 기간 (기본값: 30일)
 *
 * Raises:
 *   ValidationException: 입력 검증 실패
 *   DatabaseException: DB 조회 실패
 */
export async function getJobIssueIndex(
  jobCategoryId: number,
  days: number = 30
): Promise<JobIssueIndexResponse> {
  const methodName = 'getJobIssueIndex';
  const redis = getRedisCache();
  const cacheKey = `job_index:${jobCategoryId}:${new Date().toISOString().split('T')[0]}`;

  // Step 1: 입력 검증
  try {
    if (jobCategoryId < 1 || jobCategoryId > 13) {
      throw new ValidationException(
        '직업 ID는 1-13 범위여야 합니다',
        methodName
      );
    }

    if (days < 1 || days > 365) {
      throw new ValidationException(
        '조회 기간은 1-365일 범위여야 합니다',
        methodName
      );
    }
  } catch (validationError) {
    if (validationError instanceof ValidationException) throw validationError;
    throw new ValidationException(
      `입력 검증 중 오류: ${validationError}`,
      methodName
    );
  }

  try {
    // Step 2: Redis 캐시 확인 (TTL: 6시간)
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`${methodName}: Cache hit`, { cacheKey });
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.warn(`${methodName}: Cache miss`, { cacheKey });
    }

    // Step 3: 직업 정보 확인
    const job = await queryOne(
      `SELECT id as job_id, job_name_ko, job_name_en FROM jobs WHERE id = ? AND is_active = TRUE`,
      [jobCategoryId]
    );

    if (!job) {
      throw new ValidationException(
        `직업 ID ${jobCategoryId}를 찾을 수 없습니다`,
        methodName
      );
    }

    // Step 4: 이슈 지수 조회
    interface CurrentIndexResult {
      date: string;
      value: string | number;
      last_updated_at: string;
    }

    const currentIndex = await queryOne<CurrentIndexResult>(
      `SELECT date, index_value as value, created_at as last_updated_at
       FROM issue_index_by_category
       WHERE job_category_id = ? AND date = CURDATE()
       ORDER BY date DESC LIMIT 1`,
      [jobCategoryId]
    );

    if (!currentIndex) {
      // 더미 데이터 반환 (실제로는 배치 작업에서 계산)
      const response: JobIssueIndexResponse = {
        job_category: job as any,
        current_index: {
          date: new Date().toISOString().split('T')[0],
          value: 75,
          previous_value: 72,
          change_percentage: 4.2,
          change_direction: 'up',
          last_updated_at: new Date().toISOString()
        },
        trend_data: [],
        source_articles: []
      };

      // 캐시 저장
      try {
        await redis.set(cacheKey, JSON.stringify(response), 21600); // 6시간
      } catch (cacheError) {
        logger.warn(`${methodName}: Failed to cache`, { cacheKey });
      }

      return response;
    }

    // Step 5: 트렌드 데이터 조회
    const trendData = await executeQuery(
      `SELECT date, index_value as value
       FROM issue_index_by_category
       WHERE job_category_id = ? AND date BETWEEN DATE_SUB(CURDATE(), INTERVAL ? DAY) AND CURDATE()
       ORDER BY date DESC LIMIT ?`,
      [jobCategoryId, days, days]
    );

    // Step 6: 관련 뉴스 조회 (더미)
    const sourceArticles: any[] = [];

    // Step 7: 이전값 조회
    interface PreviousIndexResult {
      value: string | number;
    }

    const previousIndex = await queryOne<PreviousIndexResult>(
      `SELECT index_value as value
       FROM issue_index_by_category
       WHERE job_category_id = ? AND date < CURDATE()
       ORDER BY date DESC LIMIT 1`,
      [jobCategoryId]
    );

    const previousValue = previousIndex?.value || currentIndex.value;
    const currentValueNum = typeof currentIndex.value === 'string' ? parseFloat(currentIndex.value) : Number(currentIndex.value);
    const previousValueNum = typeof previousValue === 'string' ? parseFloat(previousValue) : Number(previousValue);
    const changePercentage = previousValueNum !== 0
      ? ((currentValueNum - previousValueNum) / previousValueNum) * 100
      : 0;

    const response: JobIssueIndexResponse = {
      job_category: job as any,
      current_index: {
        date: currentIndex.date,
        value: currentValueNum,
        previous_value: previousValueNum,
        change_percentage: parseFloat(changePercentage.toFixed(2)),
        change_direction: changePercentage >= 0 ? 'up' : 'down',
        last_updated_at: currentIndex.last_updated_at
      },
      trend_data: trendData as any,
      source_articles: sourceArticles
    };

    // Step 8: 캐시 저장
    try {
      await redis.set(cacheKey, JSON.stringify(response), 21600); // 6시간
    } catch (cacheError) {
      logger.warn(`${methodName}: Failed to cache`, { cacheKey });
    }

    logger.info(`${methodName}: Success`, { jobCategoryId, days });
    return response;

  } catch (error) {
    if (error instanceof DatabaseException || error instanceof ValidationException) {
      throw error;
    }
    throw new DatabaseException(
      `이슈 지수 조회 중 오류: ${error}`,
      methodName
    );
  }
}

/**
 * Method 4: 관심사 태그 기반 뉴스 피드 조회
 *
 * Args:
 *   userId: 사용자 ID
 *   limit: 반환할 뉴스 개수 (1-50, 기본값: 10)
 *   offset: 페이지네이션 오프셋
 *   sortBy: 정렬 기준 (published_at 또는 relevance)
 *
 * Raises:
 *   ValidationException: 입력 검증 실패
 *   DatabaseException: DB 조회 실패
 */
export async function getNewsByTags(
  userId: bigint,
  limit: number = 10,
  offset: number = 0,
  sortBy: string = 'published_at',
  days: number = 7
): Promise<{
  total_count: number;
  articles: any[];
  timestamp: string;
}> {
  const methodName = 'getNewsByTags';
  const redis = getRedisCache();
  const cacheKey = `news:user:${userId}`;

  // Step 1: 입력 검증
  try {
    if (!userId || userId <= 0) {
      throw new ValidationException('유효한 사용자 ID가 필요합니다', methodName);
    }

    if (limit < 1 || limit > 50) {
      throw new ValidationException(
        'limit은 1-50 범위여야 합니다',
        methodName
      );
    }

    if (offset < 0) {
      throw new ValidationException(
        'offset은 0 이상이어야 합니다',
        methodName
      );
    }

    if (!['published_at', 'relevance'].includes(sortBy)) {
      throw new ValidationException(
        'sort_by는 published_at 또는 relevance여야 합니다',
        methodName
      );
    }

    if (days < 1 || days > 90) {
      throw new ValidationException(
        '조회 기간은 1-90일 범위여야 합니다',
        methodName
      );
    }
  } catch (validationError) {
    if (validationError instanceof ValidationException) throw validationError;
    throw new ValidationException(
      `입력 검증 중 오류: ${validationError}`,
      methodName
    );
  }

  try {
    // Step 2: Redis 캐시 확인
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // 페이지네이션 적용
        const articles = data.articles.slice(offset, offset + limit);
        logger.info(`${methodName}: Cache hit`, { userId });
        return {
          total_count: data.total_count,
          articles,
          timestamp: new Date().toISOString()
        };
      }
    } catch (cacheError) {
      logger.warn(`${methodName}: Cache miss`, { userId });
    }

    // Step 3: 사용자의 관심 태그 조회
    const userTags = await executeQuery(
      `SELECT tag_id FROM user_interest_tags WHERE user_id = ?`,
      [userId]
    );

    if (userTags.length === 0) {
      logger.warn(`${methodName}: User has no interest tags`, { userId });
      return {
        total_count: 0,
        articles: [],
        timestamp: new Date().toISOString()
      };
    }

    const tagIds = userTags.map((t: any) => t.tag_id);

    // Step 4: 뉴스 조회 (태그 매칭)
    // 실제 구현에서는 news_articles, news_tags 테이블 사용
    // 여기서는 구조만 구현
    const articles: any[] = [];
    const totalCount = 0;

    const response = {
      total_count: totalCount,
      articles,
      timestamp: new Date().toISOString()
    };

    // Step 5: 캐시 저장
    try {
      await redis.set(cacheKey, JSON.stringify(response), 3600); // 1시간
    } catch (cacheError) {
      logger.warn(`${methodName}: Failed to cache`, { userId });
    }

    logger.info(`${methodName}: Success`, { userId, articles: articles.length });
    return response;

  } catch (error) {
    if (error instanceof DatabaseException || error instanceof ValidationException) {
      throw error;
    }
    throw new DatabaseException(
      `뉴스 조회 중 오류: ${error}`,
      methodName
    );
  }
}

/**
 * Method 5: 직업별 추천 도구 조회
 *
 * Args:
 *   jobCategoryId: 직업 카테고리 ID (1-13)
 *
 * Raises:
 *   ValidationException: 입력 검증 실패
 *   DatabaseException: DB 조회 실패
 */
export async function getRecommendedTools(
  jobCategoryId: number
): Promise<{
  job_category: {
    job_id: number;
    job_name_ko: string;
    job_name_en: string;
  };
  tool_categories: any[];
}> {
  const methodName = 'getRecommendedTools';
  const redis = getRedisCache();
  const cacheKey = `job_tools:${jobCategoryId}`;

  // Step 1: 입력 검증
  try {
    if (jobCategoryId < 1 || jobCategoryId > 13) {
      throw new ValidationException(
        '직업 ID는 1-13 범위여야 합니다',
        methodName
      );
    }
  } catch (validationError) {
    if (validationError instanceof ValidationException) throw validationError;
    throw new ValidationException(
      `입력 검증 중 오류: ${validationError}`,
      methodName
    );
  }

  try {
    // Step 2: Redis 캐시 확인 (TTL: 24시간)
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info(`${methodName}: Cache hit`, { cacheKey });
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.warn(`${methodName}: Cache miss`, { cacheKey });
    }

    // Step 3: 직업 정보 조회
    interface JobCategoryResult {
      job_id: number;
      job_name_ko: string;
      job_name_en: string;
    }

    const job = await queryOne<JobCategoryResult>(
      `SELECT id as job_id, job_name_ko, job_name_en FROM jobs WHERE id = ? AND is_active = TRUE`,
      [jobCategoryId]
    );

    if (!job) {
      throw new ValidationException(
        `직업 ID ${jobCategoryId}를 찾을 수 없습니다`,
        methodName
      );
    }

    // Step 4: 도구 정보 조회 (더미 데이터)
    const response = {
      job_category: job,
      tool_categories: [
        {
          category_name: '코드 생성',
          description: '자동 코드 작성 및 개발 효율화',
          tools: []
        }
      ]
    };

    // Step 5: 캐시 저장
    try {
      await redis.set(cacheKey, JSON.stringify(response), 86400); // 24시간
    } catch (cacheError) {
      logger.warn(`${methodName}: Failed to cache`, { cacheKey });
    }

    logger.info(`${methodName}: Success`, { jobCategoryId });
    return response;

  } catch (error) {
    if (error instanceof DatabaseException || error instanceof ValidationException) {
      throw error;
    }
    throw new DatabaseException(
      `추천 도구 조회 중 오류: ${error}`,
      methodName
    );
  }
}
