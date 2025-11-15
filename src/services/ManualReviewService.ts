/**
 * 수동 검토 서비스 (Feature #9)
 * 신뢰도 70% 미만의 분류 결과 검토 및 확정
 */

import { executeQuery, executeModify } from '../database/mysql';
import { Logger } from '../database/logger';
import {
  ManualReviewListResponse,
  ManualReviewItem,
  ManualReviewConfirmResponse,
  ManualReviewConfirmRequest,
  ClassifiedTag,
} from '../types';

const logger = new Logger('ManualReviewService');

/**
 * 수동 검토 대기 항목 조회
 */
export async function getManualReviewQueue(
  limit: number = 20,
  offset: number = 0,
  sortBy: 'created_at' | 'confidence' = 'created_at',
  confidenceMin: number = 0
): Promise<ManualReviewListResponse> {
  try {
    // 파라미터 검증
    if (limit < 1 || limit > 100) {
      throw new Error('limit은 1-100 범위여야 합니다');
    }

    if (confidenceMin < 0 || confidenceMin > 1) {
      throw new Error('신뢰도는 0-1 범위여야 합니다');
    }

    // 전체 대기 항목 수 조회
    const countSql = `
      SELECT COUNT(*) as total
      FROM manual_review_queue
      WHERE status = 'pending'
    `;
    const countResult = await executeQuery(countSql) as Array<{ total: number }> | null;
    const totalPending = countResult && countResult.length > 0 ? countResult[0].total : 0;

    // 대기 항목 조회
    const orderBy = sortBy === 'created_at' ? 'submitted_at DESC' : 'confidence DESC';
    const sql = `
      SELECT
        review_id,
        article_id,
        article_title as title,
        article_source as source,
        published_at,
        suggested_tags,
        submitted_at,
        0 as processing_time_ms
      FROM manual_review_queue
      WHERE status = 'pending'
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const result = await executeQuery(sql, [limit, offset]) as Array<any> | null;

    if (!result) {
      return {
        total_pending: totalPending,
        items: [],
      };
    }

    const items: ManualReviewItem[] = result.map((row: any) => {
      let suggestedTags: ClassifiedTag[] = [];
      try {
        suggestedTags = typeof row.suggested_tags === 'string'
          ? JSON.parse(row.suggested_tags)
          : row.suggested_tags || [];
      } catch (e) {
        logger.warn('태그 파싱 실패:', e);
      }

      return {
        review_id: String(row.review_id),
        article_id: row.article_id,
        title: row.title,
        source: row.source || '',
        published_at: row.published_at ? new Date(row.published_at).toISOString() : '',
        suggested_tags: suggestedTags,
        submitted_at: new Date(row.submitted_at).toISOString(),
        processing_time_ms: row.processing_time_ms,
      };
    });

    return {
      total_pending: totalPending,
      items,
    };
  } catch (error) {
    logger.error('수동 검토 큐 조회 실패', error);
    throw error;
  }
}

/**
 * 수동 검토 항목 상세 조회
 */
export async function getManualReviewItem(reviewId: string): Promise<ManualReviewItem | null> {
  try {
    const sql = `
      SELECT
        review_id,
        article_id,
        article_title as title,
        article_source as source,
        published_at,
        suggested_tags,
        submitted_at,
        0 as processing_time_ms
      FROM manual_review_queue
      WHERE review_id = ?
    `;

    const result = await executeQuery(sql, [reviewId]) as Array<any> | null;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0] as any;

    let suggestedTags: ClassifiedTag[] = [];
    try {
      suggestedTags = typeof row.suggested_tags === 'string'
        ? JSON.parse(row.suggested_tags)
        : row.suggested_tags || [];
    } catch (e) {
      logger.warn('태그 파싱 실패:', e);
    }

    return {
      review_id: String(row.review_id),
      article_id: row.article_id,
      title: row.title,
      source: row.source || '',
      published_at: row.published_at ? new Date(row.published_at).toISOString() : '',
      suggested_tags: suggestedTags,
      submitted_at: new Date(row.submitted_at).toISOString(),
      processing_time_ms: row.processing_time_ms,
    };
  } catch (error) {
    logger.error('수동 검토 항목 조회 실패', error);
    throw error;
  }
}

/**
 * 수동 검토 결과 저장 및 확정
 */
export async function confirmManualReview(
  reviewId: string,
  request: ManualReviewConfirmRequest
): Promise<ManualReviewConfirmResponse> {
  try {
    // 1. 검토 항목 조회
    const reviewResult = await executeQuery(
      `SELECT
        classification_id,
        article_id
      FROM manual_review_queue
      WHERE review_id = ?`,
      [reviewId]
    ) as Array<{ classification_id: bigint; article_id: number }> | null;

    if (!reviewResult || reviewResult.length === 0) {
      throw new Error('검토 항목을 찾을 수 없습니다');
    }

    const { classification_id, article_id } = reviewResult[0];
    const now = new Date();

    // 2. manual_review_queue 업데이트
    const updateReviewSql = `
      UPDATE manual_review_queue
      SET status = 'confirmed',
          reviewed_at = ?,
          assigned_to = ?,
          notes = ?
      WHERE review_id = ?
    `;

    await executeModify(updateReviewSql, [
      now,
      request.reviewer_id,
      request.notes || null,
      reviewId,
    ]);

    // 3. news_classifications 업데이트
    const updateClassificationSql = `
      UPDATE news_classifications
      SET status = 'confirmed',
          confirmed_at = ?,
          confirmed_by = ?
      WHERE classification_id = ?
    `;

    await executeModify(updateClassificationSql, [now, request.reviewer_id, classification_id]);

    // 4. article_to_tags에 확정된 태그 저장
    for (const tagId of request.confirmed_tags) {
      const insertSql = `
        INSERT INTO article_to_tags
        (article_id, interest_tag_id, classification_status, confidence_score)
        VALUES (?, ?, 'confirmed', 1.0)
        ON DUPLICATE KEY UPDATE
          classification_status = 'confirmed',
          confidence_score = 1.0
      `;
      await executeModify(insertSql, [article_id, tagId]);
    }

    // 5. 거절된 태그 제거
    if (request.rejected_tags && request.rejected_tags.length > 0) {
      const deleteSql = `
        DELETE FROM article_to_tags
        WHERE article_id = ? AND interest_tag_id IN (${request.rejected_tags.map(() => '?').join(',')})
      `;
      await executeModify(deleteSql, [article_id, ...request.rejected_tags]);
    }

    // 6. news_articles 상태 업데이트
    const updateArticleSql = `
      UPDATE news_articles
      SET classification_status = 'confirmed',
          classification_confidence = 1.0
      WHERE article_id = ?
    `;
    await executeModify(updateArticleSql, [article_id]);

    logger.info(`수동 검토 완료: Review ${reviewId}, Confirmed tags: ${request.confirmed_tags.join(',')}`);

    return {
      review_id: reviewId,
      article_id,
      confirmed_tags: request.confirmed_tags,
      status: 'confirmed',
      confirmed_at: now.toISOString(),
      confirmed_by: request.reviewer_id,
    };
  } catch (error) {
    logger.error('수동 검토 결과 저장 실패', error);
    throw error;
  }
}

/**
 * 수동 검토 거절
 */
export async function rejectManualReview(
  reviewId: string,
  reason: string,
  reviewerId: string
): Promise<ManualReviewConfirmResponse> {
  try {
    // 1. 검토 항목 조회
    const reviewResult = await executeQuery(
      `SELECT
        classification_id,
        article_id
      FROM manual_review_queue
      WHERE review_id = ?`,
      [reviewId]
    ) as Array<{ classification_id: bigint; article_id: number }> | null;

    if (!reviewResult || reviewResult.length === 0) {
      throw new Error('검토 항목을 찾을 수 없습니다');
    }

    const { classification_id, article_id } = reviewResult[0];
    const now = new Date();

    // 2. manual_review_queue 업데이트
    const updateReviewSql = `
      UPDATE manual_review_queue
      SET status = 'rejected',
          reviewed_at = ?,
          assigned_to = ?,
          notes = ?
      WHERE review_id = ?
    `;

    await executeModify(updateReviewSql, [
      now,
      reviewerId,
      reason || null,
      reviewId,
    ]);

    // 3. news_classifications 업데이트
    const updateClassificationSql = `
      UPDATE news_classifications
      SET status = 'rejected',
          confirmed_at = ?,
          confirmed_by = ?
      WHERE classification_id = ?
    `;

    await executeModify(updateClassificationSql, [now, reviewerId, classification_id]);

    // 4. news_articles 상태 업데이트
    const updateArticleSql = `
      UPDATE news_articles
      SET classification_status = 'pending'
      WHERE article_id = ?
    `;
    await executeModify(updateArticleSql, [article_id]);

    logger.info(`수동 검토 거절: Review ${reviewId}`);

    return {
      review_id: reviewId,
      article_id,
      confirmed_tags: [],
      status: 'rejected',
      confirmed_at: now.toISOString(),
      confirmed_by: reviewerId,
    };
  } catch (error) {
    logger.error('수동 검토 거절 실패', error);
    throw error;
  }
}

/**
 * 검토자에게 항목 할당
 */
export async function assignReviewToUser(
  reviewId: string,
  reviewerId: string
): Promise<void> {
  try {
    const sql = `
      UPDATE manual_review_queue
      SET assigned_to = ?,
          status = 'in_review'
      WHERE review_id = ?
    `;

    await executeModify(sql, [reviewerId, reviewId]);

    logger.info(`검토자 할당: Review ${reviewId} → ${reviewerId}`);
  } catch (error) {
    logger.error('검토자 할당 실패', error);
    throw error;
  }
}

/**
 * 통계 조회
 */
export async function getManualReviewStats(): Promise<{
  pending: number;
  in_review: number;
  confirmed: number;
  rejected: number;
  average_confidence: number;
}> {
  try {
    const sql = `
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) as in_review,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM manual_review_queue
    `;

    const result = await executeQuery(sql) as Array<{
      pending: number;
      in_review: number;
      confirmed: number;
      rejected: number;
    }> | null;

    return {
      pending: result?.[0]?.pending || 0,
      in_review: result?.[0]?.in_review || 0,
      confirmed: result?.[0]?.confirmed || 0,
      rejected: result?.[0]?.rejected || 0,
      average_confidence: 0, // TODO: 평균 신뢰도 계산
    };
  } catch (error) {
    logger.error('통계 조회 실패', error);
    throw error;
  }
}
