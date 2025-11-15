import cron from 'node-cron';
import axios from 'axios';
import { executeQuery, queryOne, executeModify } from '../database/mysql';
import { Logger } from '../database/logger';
import * as NotificationService from '../services/NotificationService';
import { getConfig } from '../config/environment';

const logger = new Logger('ModelUpdateJob');
const config = getConfig();

async function mockFetchFromExternalAPI(): Promise<any[]> {
  logger.info('Mock-fetching data from external API...');
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        {
          model_name: 'GPT-4o',
          version_after: `v${new Date().getDate()}`,
          version_before: 'v1.0',
          update_date: new Date().toISOString().split('T')[0],
          summary: '컨텍스트 윈도우 확대, 추론 속도 2배 개선',
          key_improvements: JSON.stringify(['Context Window 128k', '2x speed']),
          benchmarks: [
            { name: 'MMLU', before: 85.2, after: 90.1, pct: 5.7 },
            { name: 'GSM8K', before: 90.0, after: 92.5, pct: 2.8 }
          ]
        },
        {
          model_name: 'Claude 3.5',
          version_after: 'v2.0',
          version_before: 'v1.5',
          update_date: '2025-11-13',
          summary: '시각적 추론 능력 향상 및 코딩 능력 개선',
          key_improvements: JSON.stringify(['Vision reasoning', 'Coding improvement']),
          benchmarks: [
            { name: 'MMLU', before: 84.0, after: 88.0, pct: 4.8 }
          ]
        }
      ]);
    }, 1000);
  });
}


async function fetchAndStoreUpdates() {
  logger.info('Running fetchAndStoreUpdates job...');
  let updatesFound = 0;

  try {
    const externalUpdates = await mockFetchFromExternalAPI();

    for (const update of externalUpdates) {
      const model = await queryOne<any>('SELECT model_id FROM ai_models WHERE model_name = ?', [update.model_name]);

      if (!model) {
        logger.warn(`Model not found in DB: ${update.model_name}. Skipping.`);
        continue;
      }

      const existingUpdate = await queryOne<any>(
        'SELECT update_id FROM model_updates WHERE model_id = ? AND version_after = ?',
        [model.model_id, update.version_after]
      );

      if (existingUpdate) {
        logger.info(`Update ${update.model_name} ${update.version_after} already exists. Skipping.`);
        continue;
      }

      logger.info(`New update found: ${update.model_name} ${update.version_after}`);
      updatesFound++;

      const result = await executeModify(
        `INSERT INTO model_updates
         (model_id, version_before, version_after, update_date, summary, key_improvements, performance_improvement)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          model.model_id,
          update.version_before,
          update.version_after,
          update.update_date,
          update.summary,
          update.key_improvements,
          update.benchmarks[0]?.pct || 0
        ]
      );

      const newUpdateId = result.insertId;

      for (const detail of update.benchmarks) {
        await executeModify(
          `INSERT INTO model_updates_details
           (update_id, benchmark_name, before_score, after_score, improvement_pct)
           VALUES (?, ?, ?, ?, ?)`,
          [
            newUpdateId,
            detail.name,
            detail.before,
            detail.after,
            detail.pct
          ]
        );
      }

      await NotificationService.sendModelUpdateNotification(
        model.model_id,
        update.model_name,
        update.version_after,
        update.summary
      );
    }

    logger.info(`Job finished. ${updatesFound} new updates processed.`);

  } catch (error) {
    logger.error('Failed to run fetchAndStoreUpdates job', error);
  }
}

export function startUpdateScheduler() {
  if (config.features.enableBatchJobs) {
    logger.info('Starting model update scheduler (every 3 days)...');
    cron.schedule('0 0 */3 * *', () => {
      fetchAndStoreUpdates();
    }, {
      scheduled: true,
      timezone: "Asia/Seoul"
    });

    fetchAndStoreUpdates();
  } else {
    logger.warn('Batch jobs are disabled. Scheduler not started.');
  }
}