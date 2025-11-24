/**
 * 모델 타임라인 API 라우터
 * 
 * GET /api/timeline/:series - 특정 시리즈 타임라인
 * GET /api/timeline/compare - 여러 시리즈 비교
 * GET /api/timeline/events - 주요 출시 이벤트
 * GET /api/timeline/benchmark/:series/:benchmark - 벤치마크별 발전 추이
 * GET /api/timeline/series - 사용 가능한 시리즈 목록
 */

import { Router, Request, Response } from 'express';
import { 
  getModelTimeline, 
  compareModelTimelines,
  getMajorReleaseEvents,
  getBenchmarkProgressionTimeline,
  getAvailableSeries
} from '../services/timeline/modelTimelineService_standalone';

const router = Router();

/**
 * GET /api/timeline/:series
 * 특정 모델 시리즈의 타임라인 조회
 * 
 * Path Parameters:
 * - series: 시리즈 이름 (예: GPT, Claude, Gemini)
 * 
 * Query Parameters:
 * - limit: 조회 개수 (기본: 20, 최대: 50)
 */
router.get('/:series', async (req: Request, res: Response): Promise<void> => {
  try {
    const { series } = req.params;
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const parsedLimit = limitParam ? parseInt(limitParam as string, 10) : 20;
    const limit = Math.max(1, Math.min(Number.isNaN(parsedLimit) ? 20 : parsedLimit, 50));

    const timeline = await getModelTimeline(series, limit);

    res.json({
      success: true,
      data: timeline
    });
    return;

  } catch (error: any) {
    console.error('타임라인 조회 오류:', error);
    
    if (typeof error.message === 'string' && error.message.includes('찾을 수 없습니다')) {
      res.status(404).json({
        success: false,
        error: error.message
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: '타임라인 조회 중 오류가 발생했습니다',
      details: error.message
    });
    return;
  }
});

/**
 * GET /api/timeline/compare
 * 여러 모델 시리즈 타임라인 비교
 * 
 * Query Parameters:
 * - series: 쉼표로 구분된 시리즈 이름 (예: GPT,Claude,Gemini)
 */
router.get('/compare', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesParamRaw = Array.isArray(req.query.series) ? req.query.series[0] : req.query.series;
    const seriesParam = seriesParamRaw as string | undefined;

    if (!seriesParam) {
      res.status(400).json({
        success: false,
        error: 'series 파라미터가 필요합니다',
        example: '/api/timeline/compare?series=GPT,Claude,Gemini'
      });
      return;
    }

    const seriesNames = seriesParam.split(',').map(s => s.trim()).filter(Boolean);

    if (seriesNames.length < 2) {
      res.status(400).json({
        success: false,
        error: '최소 2개 이상의 시리즈가 필요합니다'
      });
      return;
    }

    if (seriesNames.length > 5) {
      res.status(400).json({
        success: false,
        error: '최대 5개까지 비교 가능합니다'
      });
      return;
    }

    const comparison = await compareModelTimelines(seriesNames);

    res.json({
      success: true,
      data: comparison
    });
    return;

  } catch (error: any) {
    console.error('타임라인 비교 오류:', error);
    
    res.status(500).json({
      success: false,
      error: '타임라인 비교 중 오류가 발생했습니다',
      details: error.message
    });
    return;
  }
});

/**
 * GET /api/timeline/events
 * 특정 기간 내의 주요 모델 출시 이벤트 조회
 * 
 * Query Parameters:
 * - startDate: 시작일 (YYYY-MM-DD)
 * - endDate: 종료일 (YYYY-MM-DD)
 */
router.get('/events', async (req: Request, res: Response): Promise<void> => {
  try {
    const startDateStr = (Array.isArray(req.query.startDate) ? req.query.startDate[0] : req.query.startDate) as string | undefined;
    const endDateStr = (Array.isArray(req.query.endDate) ? req.query.endDate[0] : req.query.endDate) as string | undefined;

    if (!startDateStr || !endDateStr) {
      res.status(400).json({
        success: false,
        error: 'startDate와 endDate 파라미터가 필요합니다',
        example: '/api/timeline/events?startDate=2024-01-01&endDate=2024-12-31'
      });
      return;
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({
        success: false,
        error: '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)'
      });
      return;
    }

    if (startDate > endDate) {
      res.status(400).json({
        success: false,
        error: 'startDate는 endDate보다 이전이어야 합니다'
      });
      return;
    }

    const events = await getMajorReleaseEvents(startDate, endDate);

    res.json({
      success: true,
      count: events.length,
      data: events
    });
    return;

  } catch (error: any) {
    console.error('출시 이벤트 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: '출시 이벤트 조회 중 오류가 발생했습니다',
      details: error.message
    });
    return;
  }
});

/**
 * GET /api/timeline/benchmark/:series/:benchmark
 * 특정 벤치마크 기준 성능 발전 추이
 * 
 * Path Parameters:
 * - series: 시리즈 이름
 * - benchmark: 벤치마크 이름 (예: MMLU_PRO, LiveCodeBench)
 */
router.get('/benchmark/:series/:benchmark', async (req: Request, res: Response): Promise<void> => {
  try {
    const { series, benchmark } = req.params;

    const progression = await getBenchmarkProgressionTimeline(series, benchmark);

    if (progression.progression.length === 0) {
      res.status(404).json({
        success: false,
        error: `'${series}' 시리즈의 '${benchmark}' 벤치마크 데이터를 찾을 수 없습니다`
      });
      return;
    }

    res.json({
      success: true,
      data: progression
    });
    return;

  } catch (error: any) {
    console.error('벤치마크 발전 추이 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: '벤치마크 발전 추이 조회 중 오류가 발생했습니다',
      details: error.message
    });
    return;
  }
});

/**
 * GET /api/timeline/series
 * 사용 가능한 모델 시리즈 목록 조회
 */
router.get('/series', async (req: Request, res: Response): Promise<void> => {
  try {
    const series = await getAvailableSeries();

    res.json({
      success: true,
      count: series.length,
      data: series
    });
    return;

  } catch (error: any) {
    console.error('시리즈 목록 조회 오류:', error);
    
    res.status(500).json({
      success: false,
      error: '시리즈 목록 조회 중 오류가 발생했습니다',
      details: error.message
    });
    return;
  }
});

export default router;
