/**
 * 뉴스 분류 서비스 (Feature #9)
 * SLM 모델을 통한 자동 분류 및 신뢰도 기반 처리
 */

import { executeQuery, executeModify } from '../database/mysql';
import { Logger } from '../database/logger';
import {
  ClassifyNewsRequest,
  ClassifyNewsResponse,
  BatchClassifyRequest,
  BatchClassifyResponse,
  ClassificationDetailResponse,
  SLMModelResponse,
  ClassifiedTag,
} from '../types';
import { generateId } from '../utils/tokenGenerator';

const logger = new Logger('NewsClassificationService');

/**
 * SLM 모델 호출을 위한 설정
 * 나중에 실제 클라우드 엔드포인트로 변경
 */
const SLM_CONFIG = {
  ENDPOINT: process.env.SLM_ENDPOINT || 'https://api.slm-service.example.com/classify',
  TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
};

const CONFIDENCE_THRESHOLDS = {
  AUTO_SAVE: 0.7, // 70% 이상 자동 저장
  REVIEW: 0.5, // 50-70% 수동 검토
  // 50% 미만은 거절 권장
};

/**
 * 뉴스 제목 검증
 */
function validateTitle(title: string): { valid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: '뉴스 제목을 입력해주세요' };
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) {
    return { valid: false, error: '뉴스 제목을 입력해주세요' };
  }

  if (trimmedTitle.length > 500) {
    return { valid: false, error: '제목은 500자 이하여야 합니다' };
  }

  return { valid: true };
}

/**
 * 제목 정규화
 */
function normalizeTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, ' ') // 여러 공백을 단일 공백으로
    .replace(/\n/g, ' '); // 개행문자를 공백으로
}

/**
 * SLM 모델 호출 (실제 구현)
 * 아직 SLM이 준비되지 않았으므로 모의 응답 반환
 */
async function callSLMModel(
  title: string,
  context?: { source?: string; published_at?: string }
): Promise<SLMModelResponse> {
  const startTime = Date.now();

  try {
    // TODO: 실제 SLM 엔드포인트 호출
    // const response = await fetch(SLM_CONFIG.ENDPOINT, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ title, context }),
    //   timeout: SLM_CONFIG.TIMEOUT_MS
    // });

    // 임시: 모의 응답 반환 (테스트용)
    const mockResponse: SLMModelResponse = {
      tags: [
        {
          tag_id: 4,
          tag_name: '머신러닝',
          confidence: 0.85,
          reasoning: '제목에 AI 관련 기술이 언급됨',
        },
        {
          tag_id: 35,
          tag_name: '모델출시',
          confidence: 0.72,
          reasoning: '새 버전이나 모델 출시 관련',
        },
      ],
      max_tags: 5,
      processing_time_ms: Date.now() - startTime,
    };

    return mockResponse;
  } catch (error) {
    logger.error('SLM 모델 호출 실패', error);
    throw new Error('분류 모델 실행 중 오류가 발생했습니다');
  }
}

/**
 * 관심 태그 정보 조회
 */
async function getInterestTagInfo(tagId: number): Promise<{ tag_id: number; tag_name_ko: string; tag_name_en: string } | null> {
  const sql = `
    SELECT
      interest_tag_id as tag_id,
      tag_name as tag_name_ko,
      tag_name as tag_name_en
    FROM interest_tags
    WHERE interest_tag_id = ?
  `;
  const result = await executeQuery(sql, [tagId]) as Array<{ tag_id: number; tag_name_ko: string; tag_name_en: string }> | null;
  return result && result.length > 0 ? result[0] : null;
}

/**
 * 단일 뉴스 분류
 */
export async function classifyNews(request: ClassifyNewsRequest): Promise<ClassifyNewsResponse> {
  // 1. 입력 검증
  const validation = validateTitle(request.news_title);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const normalizedTitle = normalizeTitle(request.news_title);
  const startTime = Date.now();

  try {
    // 2. SLM 모델 호출
    const slmResponse = await callSLMModel(normalizedTitle, {
      source: request.news_source,
      published_at: request.published_at,
    });

    // 3. 태그 정보 조회 및 응답 형식 변환
    const classifiedTags: ClassifiedTag[] = [];
    for (let i = 0; i < slmResponse.tags.length; i++) {
      const tag = slmResponse.tags[i];
      const tagInfo = await getInterestTagInfo(tag.tag_id);

      if (tagInfo) {
        classifiedTags.push({
          tag_id: tag.tag_id,
          tag_name_ko: tagInfo.tag_name_ko,
          tag_name_en: tagInfo.tag_name_en,
          confidence: tag.confidence,
          rank: i + 1,
        });
      }
    }

    // 4. 분류 ID 생성
    const classificationId = `clf_${generateId()}`;
    const processingTime = Date.now() - startTime;

    // 5. 신뢰도 기반 상태 결정
    const maxConfidence = classifiedTags.length > 0 ? classifiedTags[0].confidence : 0;
    let status: 'confirmed' | 'pending_review' | 'rejected';
    let reason: string;

    if (maxConfidence >= CONFIDENCE_THRESHOLDS.AUTO_SAVE) {
      status = 'confirmed';
      reason = '신뢰도 70% 이상 자동 저장';
    } else if (maxConfidence >= CONFIDENCE_THRESHOLDS.REVIEW) {
      status = 'pending_review';
      reason = '신뢰도 50-70% 수동 검토 필요';
    } else {
      status = 'rejected';
      reason = '신뢰도 50% 미만 검토 거절 권장';
    }

    // 6. 응답 반환
    return {
      classification_id: classificationId,
      input_title: normalizedTitle,
      classified_tags: classifiedTags,
      recommendation: { status, reason },
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('뉴스 분류 실패', error);
    throw error;
  }
}

/**
 * 배치 뉴스 분류
 */
export async function classifyNewsBatch(request: BatchClassifyRequest): Promise<BatchClassifyResponse> {
  if (!request.articles || request.articles.length === 0) {
    throw new Error('분류할 기사가 없습니다');
  }

  if (request.articles.length > 500) {
    throw new Error('배치는 최대 500개 기사까지 처리 가능합니다');
  }

  const batchId = `batch_${generateId()}`;
  const startTime = Date.now();
  const results = [];
  let processed = 0;
  let failed = 0;

  for (const article of request.articles) {
    try {
      const response = await classifyNews({
        news_title: article.title,
        news_source: article.source,
        published_at: article.published_at,
      });

      results.push({
        article_id: article.article_id,
        status: response.recommendation.status,
        classified_tags: response.classified_tags,
        processing_time_ms: response.processing_time_ms,
      });

      processed++;
    } catch (error) {
      logger.warn(`Article ${article.article_id} 분류 실패:`, error);
      failed++;
    }

    // 진행 상황 로깅
    if ((processed + failed) % 10 === 0) {
      logger.info(`배치 처리 진행 중: ${processed + failed}/${request.articles.length}`);
    }
  }

  const batchProcessingTime = Date.now() - startTime;

  return {
    batch_id: batchId,
    total_articles: request.articles.length,
    processed,
    failed,
    results,
    batch_processing_time_ms: batchProcessingTime,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 분류 결과 저장 (데이터베이스)
 */
export async function saveClassification(
  classificationId: string,
  articleId: number,
  tags: ClassifiedTag[],
  status: 'confirmed' | 'pending_review' | 'rejected',
  modelVersion?: string
): Promise<void> {
  try {
    // 1. news_classifications 저장
    const sql = `
      INSERT INTO news_classifications
      (article_id, input_title, model_version, status)
      SELECT
        ?,
        title,
        ?,
        ?
      FROM news_articles
      WHERE article_id = ?
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        updated_at = NOW()
    `;

    await executeModify(sql, [articleId, modelVersion || 'mistral-7b-v0.3', status, articleId]);

    // 2. 상태별 처리
    if (status === 'confirmed') {
      // confirmed: article_to_tags에 저장
      for (const tag of tags) {
        const insertSql = `
          INSERT INTO article_to_tags
          (article_id, interest_tag_id, classification_status, confidence_score)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            confidence_score = VALUES(confidence_score)
        `;
        await executeModify(insertSql, [
          articleId,
          tag.tag_id,
          'confirmed',
          tag.confidence,
        ]);
      }

      // news_articles 상태 업데이트
      const updateSql = `
        UPDATE news_articles
        SET classification_status = 'confirmed',
            classification_confidence = ?
        WHERE article_id = ?
      `;
      await executeModify(updateSql, [
        tags.length > 0 ? tags[0].confidence : 0,
        articleId,
      ]);
    } else if (status === 'pending_review') {
      // pending_review: manual_review_queue에 저장
      const reviewSql = `
        INSERT INTO manual_review_queue
        (classification_id, article_id, article_title, article_source, published_at, suggested_tags, status)
        SELECT
          ?,
          na.article_id,
          na.title,
          na.source,
          na.published_at,
          ?,
          'pending'
        FROM news_articles na
        WHERE na.article_id = ?
      `;

      const tagsJson = JSON.stringify(
        tags.map(t => ({
          tag_id: t.tag_id,
          tag_name_ko: t.tag_name_ko,
          tag_name_en: t.tag_name_en,
          confidence: t.confidence,
        }))
      );

      // classification_id 를 먼저 조회해야 함
      const classResult = await executeQuery(
        'SELECT classification_id FROM news_classifications WHERE article_id = ? LIMIT 1',
        [articleId]
      ) as Array<{ classification_id: bigint }> | null;

      if (classResult && classResult.length > 0) {
        await executeModify(reviewSql, [
          classResult[0].classification_id,
          tagsJson,
          articleId,
        ]);
      }

      // news_articles 상태 업데이트
      const updateSql = `
        UPDATE news_articles
        SET classification_status = 'processing'
        WHERE article_id = ?
      `;
      await executeModify(updateSql, [articleId]);
    }

    logger.info(`분류 저장 완료: Article ${articleId}, Status: ${status}`);
  } catch (error) {
    logger.error('분류 저장 실패', error);
    throw error;
  }
}

/**
 * 분류 결과 조회
 */
export async function getClassification(classificationId: string): Promise<ClassificationDetailResponse | null> {
  try {
    const sql = `
      SELECT
        nc.classification_id,
        nc.article_id,
        na.title,
        nc.status,
        nc.created_at,
        nc.confirmed_at
      FROM news_classifications nc
      JOIN news_articles na ON nc.article_id = na.article_id
      WHERE nc.classification_id = ?
    `;

    const result = await executeQuery(sql, [classificationId]) as Array<any> | null;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0] as any;

    // 태그 조회
    const tagsSql = `
      SELECT
        att.interest_tag_id as tag_id,
        it.tag_name as tag_name_ko,
        it.tag_name as tag_name_en,
        att.confidence_score as confidence,
        ROW_NUMBER() OVER (ORDER BY att.confidence_score DESC) as rank
      FROM article_to_tags att
      JOIN interest_tags it ON att.interest_tag_id = it.interest_tag_id
      WHERE att.article_id = ?
      ORDER BY att.confidence_score DESC
    `;

    const tagsResult = await executeQuery(tagsSql, [row.article_id]) as Array<any> | null;

    return {
      classification_id: row.classification_id,
      article_id: row.article_id,
      title: row.title,
      status: row.status,
      classified_tags: tagsResult || [],
      created_at: new Date(row.created_at).toISOString(),
      confirmed_at: row.confirmed_at ? new Date(row.confirmed_at).toISOString() : undefined,
    };
  } catch (error) {
    logger.error('분류 결과 조회 실패', error);
    throw error;
  }
}

/**
 * 수동 검토 큐에 추가
 */
export async function addToManualReviewQueue(
  classificationId: bigint,
  articleId: number,
  suggestedTags: ClassifiedTag[]
): Promise<void> {
  try {
    const sql = `
      INSERT INTO manual_review_queue
      (classification_id, article_id, article_title, article_source, published_at, suggested_tags, status)
      SELECT
        ?,
        na.article_id,
        na.title,
        na.source,
        na.published_at,
        ?,
        'pending'
      FROM news_articles na
      WHERE na.article_id = ?
    `;

    const tagsJson = JSON.stringify(
      suggestedTags.map(t => ({
        tag_id: t.tag_id,
        tag_name_ko: t.tag_name_ko,
        tag_name_en: t.tag_name_en,
        confidence: t.confidence,
      }))
    );

    await executeModify(sql, [classificationId, tagsJson, articleId]);

    logger.info(`수동 검토 큐 추가: Article ${articleId}`);
  } catch (error) {
    logger.error('수동 검토 큐 추가 실패', error);
    throw error;
  }
}
