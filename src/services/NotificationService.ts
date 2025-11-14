import { executeQuery } from '../database/mysql';
import { sendEmail } from './EmailService';
import { Logger } from '../database/logger';

const logger = new Logger('NotificationService');

export async function sendModelUpdateNotification(
  modelId: number,
  modelName: string,
  versionAfter: string,
  updateSummary: string
): Promise<void> {
  const methodName = 'sendModelUpdateNotification';

  try {
    logger.info(`Sending notifications for model update: ${modelName} ${versionAfter}`);

    const interestedUsers = await executeQuery<any>(
      `SELECT u.user_id, u.email, u.email_verified
       FROM user_interested_models i
       JOIN users u ON i.user_id = u.user_id
       WHERE i.model_id = ? AND u.is_active = 1`,
      [modelId]
    );

    if (interestedUsers.length === 0) {
      logger.info('No interested users found.');
      return;
    }

    const fcmTokens = await executeQuery<any>(
      'SELECT fcm_token FROM fcm_tokens WHERE user_id IN (?) AND is_active = 1',
      [interestedUsers.map(u => u.user_id)]
    );

    if (fcmTokens.length > 0) {
      const tokens = fcmTokens.map(t => t.fcm_token);
      logger.info(`Sending FCM to ${tokens.length} devices.`);
    }

    for (const user of interestedUsers) {
      if (user.email && user.email_verified) {
        try {
          await sendEmail({
            to: user.email,
            subject: `[Ainus] 관심 모델 업데이트: ${modelName}`,
            template: 'model-update-alert',
            context: {
              appName: 'Ainus',
              modelName,
              versionAfter,
              updateSummary,
              manageLink: 'http://localhost:3000/settings/notifications'
            }
          });
        } catch (emailError) {
          logger.error(`Failed to send email to ${user.email}`, emailError);
        }
      }
    }

    logger.info(`Notifications sent for ${modelName}.`);

  } catch (error) {
    logger.error('Failed to send notifications', error);
  }
}

export async function sendIssueIndexAlert(score: number, trendPercent: string): Promise<void> {
  const methodName = 'sendIssueIndexAlert';
  try {
    logger.info(`Sending issue index spike alert. Score: ${score}, Trend: ${trendPercent}%`);

    const adminUsers = await executeQuery<any>(
      `SELECT email FROM users WHERE email_verified = 1 AND (nickname = 'admin' OR email = 'admin@ainus.example.com')`,
      []
    );
    
    if (adminUsers.length === 0) {
      logger.warn('No admin users found to send issue index alert.');
      return;
    }

    for (const user of adminUsers) {
      await sendEmail({
        to: user.email,
        subject: `[Ainus] AI 이슈 지수 급상승 알림: ${score}점 (${trendPercent}%)`,
        template: 'issue-index-alert',
        context: {
          appName: 'Ainus',
          score: score,
          trendPercent: trendPercent,
          mainKeyword: 'AI 안전성',
          appLink: 'http://localhost:3000/dashboard'
        }
      });
    }

  } catch (error) {
    logger.error('Failed to send issue index alert', error);
  }
}