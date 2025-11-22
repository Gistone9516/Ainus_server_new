/**
 * 모델 비교 API 라우터
 * 
 * GET /api/comparison/compare?modelA=xxx&modelB=xxx - 두 모델 비교
 * GET /api/comparison/top/:category - 카테고리별 상위 모델
 */

import { Router, Request, Response } from 'express';
import { compareModels, getTopModelsByCategory } from '../services/comparison/modelComparisonService';

const router = Router();

/**
 * GET /api/comparison/compare
 * 두 모델 비교
 * 
 * Query Parameters:
 * - modelA: 첫 번째 모델 ID
 * - modelB: 두 번째 모델 ID
 * 
 * Response:
 * {
 *   model_a: {...},
 *   model_b: {...},
 *   comparison_summary: {...},
 *   visual_data: {...}
 * }
 */
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const { modelA, modelB } = req.query;

    // 파라미터 검증
    if (!modelA || !modelB) {
      return res.status(400).json({
        success: false,
        error: 'modelA와 modelB 파라미터가 필요합니다',
        example: '/api/comparison/compare?modelA=xxx&modelB=yyy'
      });
    }

    if (typeof modelA !== 'string' || typeof modelB !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'modelA와 modelB는 문자열이어야 합니다'
      });
    }

    if (modelA === modelB) {
      return res.status(400).json({
        success: false,
        error: '동일한 모델을 비교할 수 없습니다'
      });
    }

    // 비교 실행
    const comparison = await compareModels(modelA, modelB);

    res.json({
      success: true,
      data: comparison
    });

  } catch (error: any) {
    console.error('모델 비교 오류:', error);
    
    if (error.message.includes('찾을 수 없습니다')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: '모델 비교 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * GET /api/comparison/top/:category
 * 카테고리별 상위 모델 조회
 * 
 * Path Parameters:
 * - category: 'overall' | 'intelligence' | 'coding' | 'math'
 * 
 * Query Parameters:
 * - limit: 조회 개수 (기본: 10, 최대: 50)
 * 
 * Response:
 * {
 *   success: true,
 *   category: "coding",
 *   count: 10,
 *   data: [
 *     {
 *       model_id: "xxx",
 *       model_name: "GPT-4",
 *       creator_name: "OpenAI",
 *       score: 95.5,
 *       rank: 1
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/top/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // 카테고리 검증
    const validCategories = ['overall', 'intelligence', 'coding', 'math'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `유효하지 않은 카테고리입니다. 사용 가능: ${validCategories.join(', ')}`,
        valid_categories: validCategories
      });
    }

    // 상위 모델 조회
    const topModels = await getTopModelsByCategory(
      category as 'overall' | 'intelligence' | 'coding' | 'math',
      limit
    );

    res.json({
      success: true,
      category,
      count: topModels.length,
      data: topModels
    });

  } catch (error: any) {
    console.error('상위 모델 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: '상위 모델 조회 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

/**
 * GET /api/comparison/quick-compare
 * 간편 비교 (모델명으로 검색 후 비교)
 * 
 * Query Parameters:
 * - nameA: 첫 번째 모델명 (부분 일치)
 * - nameB: 두 번째 모델명 (부분 일치)
 * 
 * Response: compare와 동일
 */
router.get('/quick-compare', async (req: Request, res: Response) => {
  try {
    const { nameA, nameB } = req.query;

    if (!nameA || !nameB) {
      return res.status(400).json({
        success: false,
        error: 'nameA와 nameB 파라미터가 필요합니다',
        example: '/api/comparison/quick-compare?nameA=GPT-4&nameB=Claude'
      });
    }

    // 모델명으로 ID 검색
    const { mysqlPool } = await import('../config/database');
    
    const [modelsA] = await mysqlPool.query<any[]>(
      `SELECT model_id, model_name FROM ai_models 
       WHERE model_name LIKE ? AND is_active = TRUE LIMIT 1`,
      [`%${nameA}%`]
    );

    const [modelsB] = await mysqlPool.query<any[]>(
      `SELECT model_id, model_name FROM ai_models 
       WHERE model_name LIKE ? AND is_active = TRUE LIMIT 1`,
      [`%${nameB}%`]
    );

    if (modelsA.length === 0) {
      return res.status(404).json({
        success: false,
        error: `'${nameA}'와 일치하는 모델을 찾을 수 없습니다`
      });
    }

    if (modelsB.length === 0) {
      return res.status(404).json({
        success: false,
        error: `'${nameB}'와 일치하는 모델을 찾을 수 없습니다`
      });
    }

    // 비교 실행
    const comparison = await compareModels(modelsA[0].model_id, modelsB[0].model_id);

    res.json({
      success: true,
      matched: {
        model_a: modelsA[0].model_name,
        model_b: modelsB[0].model_name
      },
      data: comparison
    });

  } catch (error: any) {
    console.error('간편 비교 오류:', error);
    
    res.status(500).json({
      success: false,
      error: '간편 비교 중 오류가 발생했습니다',
      details: error.message
    });
  }
});

export default router;
