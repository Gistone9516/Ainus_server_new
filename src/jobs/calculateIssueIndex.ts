import cron from 'node-cron';
import { executeQuery, queryOne, executeModify } from '../database/mysql';
import { getRedisCache } from '../database/redis';
import { Logger } from '../database/logger';
import * as NotificationService from '../services/NotificationService';
import { getConfig } from '../config/environment';

const logger = new Logger('IssueIndexJob');
const config = getConfig();

async function mockFetchNaverNewsCount(keyword: string): Promise<number> {
  return Math.floor(Math.random() * (keyword === 'AI' ? 500 : 100)) + 50;
}

async function mockFetchGoogleTrend(keyword: string): Promise<number> {
  return Math.floor(Math.random() * 50) + 50;
}

async function calculateIssueIndex() {
  logger.info('Running calculateIssueIndex job...');
  const methodName = 'calculateIssueIndex';
  const today = new Date().toISOString().split('T')[0];

  try {
    const existing = await queryOne<any>('SELECT index_id FROM issue_index_daily WHERE index_date = ?', [today]);
    if (existing) {
      logger.info(`Issue index for ${today} already exists. Skipping.`);
      return;
    }

    const newsCount = await mockFetchNaverNewsCount('AI');
    const trendScore = await mockFetchGoogleTrend('AI');

    const prevWeekScoreResult = await queryOne<any>(
      'SELECT score FROM issue_index_daily WHERE index_date = CURDATE() - INTERVAL 7 DAY'
    );
    const prevWeekScore = prevWeekScoreResult?.score || 50;
    
    const growth = ((newsCount + trendScore) - (prevWeekScore * 2)) / (prevWeekScore * 2 + 1) * 100;
    const growthScore = Math.max(0, Math.min(100, 50 + growth * 2));

    const finalScore = Math.round(
      (newsCount / 500 * 100) * 0.4 +
      trendScore * 0.4 +
      growthScore * 0.2
    );

    const comparison = ((finalScore - prevWeekScore) / prevWeekScore) * 100;

    let mainKeyword = '일반';
    let highestCategoryScore = 0;

    const categories = await executeQuery<any>('SELECT category_id, category_name FROM ai_categories');
    let categoryResults = [];

    for (const category of categories) {
      const catNews = await mockFetchNaverNewsCount(category.category_name);
      const catTrend = await mockFetchGoogleTrend(category.category_name);
      const catScore = Math.round(((catNews / 100 * 100) * 0.5 + catTrend * 0.5));

      await executeModify(
        `INSERT INTO issue_index_by_category
         (index_date, category_id, score, article_count)
         VALUES (?, ?, ?, ?)`,
        [today, category.category_id, catScore, catNews]
      );
      
      categoryResults.push({ category_name: category.category_name, score: catScore });

      if (catScore > highestCategoryScore) {
        highestCategoryScore = catScore;
        mainKeyword = category.category_name;
      }
    }

    await executeModify(
      `INSERT INTO issue_index_daily
       (index_date, score, comparison_previous_week, main_keyword, trend, article_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        today,
        finalScore,
        comparison.toFixed(2),
        mainKeyword,
        comparison > 5 ? '상승' : comparison < -5 ? '하강' : '유지',
        newsCount
      ]
    );

    logger.info(`Successfully calculated issue index for ${today}. Score: ${finalScore}`);

    const redisCache = getRedisCache();
    await redisCache.delete('issue:index:latest');
    await redisCache.delete('issue:index:by_category');
    logger.info('Cache cleared for issue index');

    if (comparison > 15) {
      logger.info(`Issue index spiked! (${comparison.toFixed(2)}%) Sending alert.`);
      await NotificationService.sendIssueIndexAlert(finalScore, comparison.toFixed(2));
    }

  } catch (error) {
    logger.error('Failed to run calculateIssueIndex job', error);
  }
}

export function startIssueIndexScheduler() {
  if (config.features.enableBatchJobs) {
    logger.info('Starting issue index scheduler (every day at midnight)...');
    cron.schedule('0 0 * * *', () => {
      calculateIssueIndex();
    }, {
      scheduled: true,
      timezone: "Asia/Seoul"
    });

    calculateIssueIndex();
  } else {
    logger.warn('Batch jobs are disabled. Issue index scheduler not started.');
  }
}