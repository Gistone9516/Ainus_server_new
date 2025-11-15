import { queryOne, executeQuery, executeModify } from '../database/mysql';
import { ValidationException, DatabaseException } from '../exceptions';
import { Logger } from '../database/logger';

const logger = new Logger('ModelUpdateService');

export async function getUpdatesByModelId(modelId: number, limit: number, offset: number) {
  const methodName = 'getUpdatesByModelId';
  try {
    const updates = await executeQuery<any>(
      `SELECT
         u.update_id,
         u.version_before,
         u.version_after,
         u.update_date,
         u.summary,
         u.key_improvements,
         (SELECT
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'detail_id', d.detail_id,
                'benchmark_name', d.benchmark_name,
                'before_score', d.before_score,
                'after_score', d.after_score,
                'improvement_pct', d.improvement_pct
              )
            )
          FROM model_updates_details d
          WHERE d.update_id = u.update_id
         ) AS details
       FROM model_updates u
       WHERE u.model_id = ?
       ORDER BY u.update_date DESC
       LIMIT ? OFFSET ?`,
      [modelId, limit, offset]
    );

    const totalCount = await queryOne<any>(
      'SELECT COUNT(*) as count FROM model_updates WHERE model_id = ?',
      [modelId]
    );

    return {
      updates,
      total: totalCount.count
    };
  } catch (error) {
    throw new DatabaseException(`모델 업데이트 조회 실패: ${error}`, methodName);
  }
}

export async function getRecentUpdates(limit: number, offset: number) {
  const methodName = 'getRecentUpdates';
  try {
    const updates = await executeQuery<any>(
      `SELECT
         u.update_id,
         u.model_id,
         m.model_name,
         u.version_before,
         u.version_after,
         u.update_date,
         u.summary
       FROM model_updates u
       JOIN ai_models m ON u.model_id = m.model_id
       ORDER BY u.update_date DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const totalCount = await queryOne<any>('SELECT COUNT(*) as count FROM model_updates');

    return {
      updates,
      total: totalCount.count
    };
  } catch (error) {
    throw new DatabaseException(`최근 업데이트 조회 실패: ${error}`, methodName);
  }
}

export async function getUpdateDetails(updateId: number) {
  const methodName = 'getUpdateDetails';
  try {
    const details = await getUpdatesByModelId(0, 1, 0);
    const update = await queryOne<any>(
      `SELECT
         u.update_id,
         u.model_id,
         m.model_name,
         u.version_before,
         u.version_after,
         u.update_date,
         u.summary,
         u.key_improvements,
         (SELECT
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'detail_id', d.detail_id,
                'benchmark_name', d.benchmark_name,
                'before_score', d.before_score,
                'after_score', d.after_score,
                'improvement_pct', d.improvement_pct
              )
            )
          FROM model_updates_details d
          WHERE d.update_id = u.update_id
         ) AS details
       FROM model_updates u
       JOIN ai_models m ON u.model_id = m.model_id
       WHERE u.update_id = ?`,
      [updateId]
    );

    if (!update) {
      throw new ValidationException('업데이트 정보를 찾을 수 없습니다.', methodName);
    }
    return update;
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`업데이트 상세 조회 실패: ${error}`, methodName);
  }
}

export async function addInterestedModel(userId: number, modelId: number): Promise<any> {
  const methodName = 'addInterestedModel';
  try {
    const existing = await queryOne<any>(
      'SELECT interested_id FROM user_interested_models WHERE user_id = ? AND model_id = ?',
      [userId, modelId]
    );

    if (existing) {
      return { message: '이미 관심 모델로 등록되어 있습니다.', interested_id: existing.interested_id };
    }

    const result = await executeModify(
      'INSERT INTO user_interested_models (user_id, model_id, added_at) VALUES (?, ?, NOW())',
      [userId, modelId]
    );

    return {
      message: '관심 모델로 등록되었습니다.',
      interested_id: result.insertId
    };
  } catch (error) {
    throw new DatabaseException(`관심 모델 추가 실패: ${error}`, methodName);
  }
}

export async function removeInterestedModel(userId: number, modelId: number): Promise<any> {
  const methodName = 'removeInterestedModel';
  try {
    const result = await executeModify(
      'DELETE FROM user_interested_models WHERE user_id = ? AND model_id = ?',
      [userId, modelId]
    );

    if (result.affectedRows === 0) {
      throw new ValidationException('관심 모델 목록에 없는 모델입니다.', methodName);
    }

    return { message: '관심 모델에서 삭제되었습니다.' };
  } catch (error) {
    if (error instanceof ValidationException) throw error;
    throw new DatabaseException(`관심 모델 삭제 실패: ${error}`, methodName);
  }
}