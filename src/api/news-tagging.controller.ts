/**
 * AI 뉴스 기사 태그 분류 API 컨트롤러
 */

import { Request, Response, NextFunction } from 'express';
import { runNewsTaggingPipeline } from '@/services/news/news-tagging-pipeline';
import { getUntaggedArticleCount } from '@/services/news/tagging-db-save';
import * as taggingService from '@/services/news/news-tagging-api.service';

// ============ Admin API ============

/**
 * POST /api/v1/news-tagging/admin/run
 * 파이프라인 수동 실행
 */
export async function runTaggingPipeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { collectedAt, limit, batchSize } = req.body;

    const result = await runNewsTaggingPipeline({
      collectedAt: collectedAt ? new Date(collectedAt) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      batchSize: batchSize ? parseInt(batchSize) : undefined,
    });

    const remainingUntagged = await getUntaggedArticleCount();

    res.json({
      status: 'success',
      message: result.message,
      data: {
        executedAt: result.executedAt,
        articlesProcessed: result.articlesProcessed,
        tagsMapped: result.tagsMapped,
        duration: result.duration,
        remainingUntagged,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/news-tagging/admin/status
 * 파이프라인 상태 조회
 */
export async function getPipelineStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const status = await taggingService.getPipelineStatus();

    res.json({
      status: 'success',
      data: {
        totalArticles: status.totalArticles,
        taggedArticles: status.taggedArticles,
        untaggedArticles: status.untaggedArticles,
        taggedPercentage: status.taggedPercentage,
        totalTagMappings: status.totalTagMappings,
        lastRunAt: status.lastRunAt,
        tagDistribution: status.topTags.reduce(
          (acc, tag) => {
            acc[tag.tag_name] = tag.count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/news-tagging/admin/untagged
 * 미분류 기사 목록 조회
 */
export async function getUntaggedArticles(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const collectedAt = req.query.collectedAt
      ? new Date(req.query.collectedAt as string)
      : undefined;

    const result = await taggingService.getUntaggedArticles({
      page,
      limit,
      collectedAt,
    });

    res.json({
      status: 'success',
      data: {
        articles: result.articles.map((article) => ({
          article_id: article.article_id,
          article_index: article.article_index,
          title: article.title,
          collected_at: article.collected_at,
          pub_date: article.pub_date,
        })),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ============ Article Tags API ============

/**
 * GET /api/v1/news-tagging/articles/:article_id/tags
 * 특정 기사의 태그 조회
 */
export async function getArticleTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const articleId = parseInt(req.params.article_id);

    if (isNaN(articleId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid article_id',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const result = await taggingService.getArticleTags(articleId);

    if (!result) {
      res.status(404).json({
        status: 'error',
        message: 'Article not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/v1/news-tagging/articles/tags/batch
 * 여러 기사의 태그 일괄 조회
 */
export async function getBatchArticleTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { article_ids } = req.body;

    if (!Array.isArray(article_ids)) {
      res.status(400).json({
        status: 'error',
        message: 'article_ids must be an array',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const result = await taggingService.getBatchArticleTags(article_ids);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============ Tags API ============

/**
 * GET /api/v1/news-tagging/tags
 * 전체 태그 목록 조회
 */
export async function getAllTags(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const category = req.query.category as string | undefined;

    const result = await taggingService.getAllTags(category);

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/news-tagging/tags/:tag_id
 * 특정 태그 상세 정보
 */
export async function getTagDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tagId = parseInt(req.params.tag_id);

    if (isNaN(tagId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid tag_id',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const result = await taggingService.getTagDetail(tagId);

    if (!result) {
      res.status(404).json({
        status: 'error',
        message: 'Tag not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/news-tagging/tags/:tag_id/articles
 * 특정 태그의 기사 목록
 */
export async function getArticlesByTag(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tagId = parseInt(req.params.tag_id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const sort = req.query.sort as string | undefined;
    const minConfidence = req.query.minConfidence
      ? parseFloat(req.query.minConfidence as string)
      : undefined;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    if (isNaN(tagId)) {
      res.status(400).json({
        status: 'error',
        message: 'Invalid tag_id',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    const result = await taggingService.getArticlesByTag({
      tagId,
      page,
      limit,
      sort,
      minConfidence,
      startDate,
      endDate,
    });

    if (!result.tag) {
      res.status(404).json({
        status: 'error',
        message: 'Tag not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// ============ Stats API ============

/**
 * GET /api/v1/news-tagging/stats/distribution
 * 태그 분포 통계
 */
export async function getTagDistribution(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

    const result = await taggingService.getTagDistribution({
      startDate,
      endDate,
      limit,
    });

    res.json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
