/**
 * 데이터베이스 마이그레이션 스크립트
 * 필요한 모든 테이블을 생성합니다
 */

import { executeQuery, executeModify } from './mysql';
import { Logger } from './logger';

const logger = new Logger('Migrations');

/**
 * 모든 마이그레이션 실행
 */
export async function runMigrations(): Promise<void> {
  logger.info('Starting database migrations...');

  try {
    // 1. 사용자 및 인증 테이블
    await createUsersTable();
    await createUserProfilesTable();
    await createUserSessionsTable();

    // 2. AI 모델 정보 테이블
    await createAiModelsTable();
    await createModelBenchmarksTable();
    await createModelUpdatesTable();
    await createModelUpdatesDetailsTable();

    // 3. 카테고리 및 태그 테이블
    await createAiCategoriesTable();
    await createJobCategoriesTable();
    await createJobOccupationsTable();
    await createInterestTagsTable();

    // 4. 이슈 지수 테이블
    await createIssueIndexDailyTable();
    await createIssueIndexByCategoryTable();

    // 5. 뉴스 및 분류 테이블
    await createNewsArticlesTable();
    await createArticleToTagsTable();

    // 6. 커뮤니티 테이블
    await createCommunityPostsTable();
    await createCommunityCommentsTable();
    await createCommunityPostLikesTable();
    await createCommunityPostTagsTable();

    // 7. 관심 모델 및 알림 테이블
    await createUserInterestedModelsTable();
    await createFcmTokensTable();
    await createUserPushNotificationsTable();

    // 8. 매핑 및 캐시 테이블
    await createJobOccupationToTasksTable();
    await createModelComparisonCacheTable();

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migrations failed', error);
    throw error;
  }
}

// ==================== 테이블 생성 함수들 ====================

async function createUsersTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nickname VARCHAR(50) UNIQUE NOT NULL,
      job_category_id INT,
      profile_image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id),
      INDEX idx_email (email),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "users" created');
}

async function createUserProfilesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_profiles (
      profile_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT UNIQUE NOT NULL,
      job_occupation_id INT,
      bio TEXT,
      preferences JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (job_occupation_id) REFERENCES job_occupations(job_occupation_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "user_profiles" created');
}

async function createUserSessionsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      token_hash VARCHAR(255) UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "user_sessions" created');
}

async function createAiModelsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS ai_models (
      model_id INT PRIMARY KEY AUTO_INCREMENT,
      model_name VARCHAR(100) NOT NULL UNIQUE,
      series_name VARCHAR(50),
      developer VARCHAR(100),
      release_date DATE,
      overall_score DECIMAL(5, 2),
      performance_data_ref VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_developer (developer),
      INDEX idx_release_date (release_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "ai_models" created');
}

async function createModelBenchmarksTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_benchmarks (
      benchmark_id INT PRIMARY KEY AUTO_INCREMENT,
      model_id INT NOT NULL,
      benchmark_name VARCHAR(100),
      raw_score DECIMAL(8, 4),
      min_val DECIMAL(8, 4),
      max_val DECIMAL(8, 4),
      normalized_score DECIMAL(5, 2),
      collected_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      UNIQUE KEY uk_model_benchmark (model_id, benchmark_name),
      INDEX idx_model_id (model_id),
      INDEX idx_collected_at (collected_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "model_benchmarks" created');
}

async function createModelUpdatesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_updates (
      update_id INT PRIMARY KEY AUTO_INCREMENT,
      model_id INT NOT NULL,
      version_before VARCHAR(50),
      version_after VARCHAR(50),
      update_date DATE NOT NULL,
      summary TEXT,
      key_improvements JSON,
      performance_improvement DECIMAL(5, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      UNIQUE KEY uk_model_version (model_id, version_after),
      INDEX idx_model_id (model_id),
      INDEX idx_update_date (update_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "model_updates" created');
}

async function createModelUpdatesDetailsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_updates_details (
      detail_id INT PRIMARY KEY AUTO_INCREMENT,
      update_id INT NOT NULL,
      benchmark_name VARCHAR(100),
      before_score DECIMAL(8, 4),
      after_score DECIMAL(8, 4),
      improvement_pct DECIMAL(5, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (update_id) REFERENCES model_updates(update_id) ON DELETE CASCADE,
      INDEX idx_update_id (update_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "model_updates_details" created');
}

async function createAiCategoriesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS ai_categories (
      category_id INT PRIMARY KEY AUTO_INCREMENT,
      category_name VARCHAR(100) NOT NULL,
      category_code VARCHAR(20) UNIQUE NOT NULL,
      description TEXT,
      weight DECIMAL(3, 2) DEFAULT 1.0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category_code (category_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "ai_categories" created');
}

async function createJobCategoriesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS job_categories (
      job_category_id INT PRIMARY KEY AUTO_INCREMENT,
      job_name VARCHAR(100) NOT NULL,
      category_code VARCHAR(20) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_category_code (category_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "job_categories" created');
}

async function createJobOccupationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS job_occupations (
      job_occupation_id INT PRIMARY KEY AUTO_INCREMENT,
      job_category_id INT NOT NULL,
      occupation_name VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id),
      INDEX idx_job_category_id (job_category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "job_occupations" created');
}

async function createInterestTagsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS interest_tags (
      interest_tag_id INT PRIMARY KEY AUTO_INCREMENT,
      tag_name VARCHAR(50) NOT NULL,
      tag_code VARCHAR(20) UNIQUE NOT NULL,
      category_id INT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES ai_categories(category_id),
      INDEX idx_tag_code (tag_code),
      INDEX idx_category_id (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "interest_tags" created');
}

async function createIssueIndexDailyTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS issue_index_daily (
      index_id INT PRIMARY KEY AUTO_INCREMENT,
      index_date DATE UNIQUE NOT NULL,
      score INT CHECK (score >= 0 AND score <= 100),
      comparison_previous_week DECIMAL(5, 2),
      main_keyword VARCHAR(100),
      trend VARCHAR(20),
      article_count INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_index_date (index_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "issue_index_daily" created');
}

async function createIssueIndexByCategoryTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS issue_index_by_category (
      category_index_id INT PRIMARY KEY AUTO_INCREMENT,
      index_date DATE NOT NULL,
      category_id INT NOT NULL,
      score INT CHECK (score >= 0 AND score <= 100),
      comparison_previous_week DECIMAL(5, 2),
      weight DECIMAL(3, 2),
      article_count INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES ai_categories(category_id),
      UNIQUE KEY uk_date_category (index_date, category_id),
      INDEX idx_date_category (index_date, category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "issue_index_by_category" created');
}

async function createNewsArticlesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS news_articles (
      article_id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(500) NOT NULL,
      url VARCHAR(500) UNIQUE NOT NULL,
      source VARCHAR(100),
      published_at DATETIME,
      collected_at DATETIME,
      summary TEXT,
      impact_score INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_source (source),
      INDEX idx_published_at (published_at),
      INDEX idx_impact_score (impact_score)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "news_articles" created');
}

async function createArticleToTagsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS article_to_tags (
      mapping_id INT PRIMARY KEY AUTO_INCREMENT,
      article_id INT NOT NULL,
      interest_tag_id INT NOT NULL,
      classification_status ENUM('confirmed', 'pending_review', 'rejected') DEFAULT 'confirmed',
      confidence_score DECIMAL(3, 2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES news_articles(article_id) ON DELETE CASCADE,
      FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
      INDEX idx_article_id (article_id),
      INDEX idx_tag_id (interest_tag_id),
      INDEX idx_status (classification_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "article_to_tags" created');
}

async function createCommunityPostsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_posts (
      post_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      likes_count INT DEFAULT 0,
      comments_count INT DEFAULT 0,
      views_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "community_posts" created');
}

async function createCommunityCommentsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_comments (
      comment_id INT PRIMARY KEY AUTO_INCREMENT,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      likes_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_post_id (post_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "community_comments" created');
}

async function createCommunityPostLikesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_post_likes (
      like_id INT PRIMARY KEY AUTO_INCREMENT,
      post_id INT NOT NULL,
      user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      UNIQUE KEY uk_post_user (post_id, user_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "community_post_likes" created');
}

async function createCommunityPostTagsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_post_tags (
      tag_id INT PRIMARY KEY AUTO_INCREMENT,
      post_id INT NOT NULL,
      interest_tag_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
      INDEX idx_post_id (post_id),
      INDEX idx_tag_id (interest_tag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "community_post_tags" created');
}

async function createUserInterestedModelsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_interested_models (
      interested_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      model_id INT NOT NULL,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      UNIQUE KEY uk_user_model (user_id, model_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "user_interested_models" created');
}

async function createFcmTokensTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      token_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      fcm_token VARCHAR(500) NOT NULL,
      device_type VARCHAR(20),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "fcm_tokens" created');
}

async function createUserPushNotificationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_push_notifications (
      notification_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      model_update_id INT,
      issue_index_id INT,
      notification_type ENUM('model_update', 'issue_alert', 'digest') NOT NULL,
      title VARCHAR(255),
      body TEXT,
      sent_at DATETIME,
      read_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (model_update_id) REFERENCES model_updates(update_id) ON DELETE SET NULL,
      FOREIGN KEY (issue_index_id) REFERENCES issue_index_daily(index_id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_sent_at (sent_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "user_push_notifications" created');
}

async function createJobOccupationToTasksTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS job_occupation_to_tasks (
      mapping_id INT PRIMARY KEY AUTO_INCREMENT,
      job_occupation_id INT NOT NULL,
      interest_tag_id INT NOT NULL,
      boost_weight DECIMAL(3, 2) DEFAULT 1.0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_occupation_id) REFERENCES job_occupations(job_occupation_id),
      FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
      UNIQUE KEY uk_job_tag (job_occupation_id, interest_tag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "job_occupation_to_tasks" created');
}

async function createModelComparisonCacheTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_comparison_cache (
      cache_id INT PRIMARY KEY AUTO_INCREMENT,
      model_id_1 INT NOT NULL,
      model_id_2 INT NOT NULL,
      comparison_data JSON,
      cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (model_id_1) REFERENCES ai_models(model_id),
      FOREIGN KEY (model_id_2) REFERENCES ai_models(model_id),
      UNIQUE KEY uk_model_pair (model_id_1, model_id_2),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "model_comparison_cache" created');
}
