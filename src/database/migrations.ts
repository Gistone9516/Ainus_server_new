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

    // 1. 직업 카테고리 및 직업 테이블
    await createJobCategoriesTable();
    await createJobOccupationsTable();

    // 2. 사용자 및 인증 테이블
    await createUsersTable();
    await createUserProfilesTable();
    await createUserSessionsTable();

    // 3. AI 모델 정보 테이블
    await createModelCreatorsTable();
    await createAiModelsTable();
    await createModelEvaluationsTable();
    await createModelOverallScoresTable();
    await createModelPricingTable();
    await createModelPerformanceTable();

    // 4. AI 모델 업데이트 추적 테이블
    await createModelUpdatesTable();
    await createModelUpdatesDetailsTable();

    // 5. 이슈 지수 테이블
    await createClustersTable();
    await createClusterHistoryTable();
    await createClusterSnapshotsTable();
    await createIssueIndexTable();


    // 6. 뉴스 및 태그그 테이블
    await createUserInterestTagsTable();
    await createNewsArticlesTable();
    await createArticleToTagsTable();

    // 7. 커뮤니티 테이블
    await createCommunityPostsTable();
    await createCommunityCommentsTable();
    await createCommunityPostLikesTable();
    await createCommunityPostTagsTable();

    // 8. 관심 모델 및 알림 테이블
    await createUserInterestedModelsTable();
    await createUserInterestTagsTable();
    await createUserPushNotificationsTable();
    await createFcmTokensTable();

    // 8. 매핑 및 캐시 테이블
    await createJobOccupationToTasksTable();
    await createModelComparisonCacheTable();

    // 9. 커뮤니티 기능 마이그레이션 (Phase 4)
    await migrateCommunityTables();

    // 10. 데이터 수집 로그 테이블
    await createDataCollectionLogsTable();

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migrations failed', error);
    throw error;
  }
}

//-- ============================================
//-- SECTION 1: 직업 카테고리 (선행 필요) 
//-- ============================================

async function createJobCategoriesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS job_categories (
      job_category_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '직업 카테고리 ID',
      job_name VARCHAR(100) NOT NULL COMMENT '직업 카테고리명',
      category_code VARCHAR(20) UNIQUE NOT NULL COMMENT '카테고리 코드',
      description TEXT COMMENT '카테고리 설명',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      INDEX idx_category_code (category_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "job_categories" created');
}

async function createJobOccupationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS job_occupations (
      job_occupation_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '직업 ID',
      job_category_id INT NOT NULL COMMENT '직업 카테고리 ID (FK)',
      occupation_name VARCHAR(100) NOT NULL COMMENT '직업명',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id),
      INDEX idx_job_category (job_category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "job_occupations" created');
}


//-- ============================================
//-- SECTION 2: 사용자 및 인증 
//-- ============================================



async function createUsersTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      user_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자 ID',
      email VARCHAR(255) UNIQUE NOT NULL COMMENT '이메일 (로그인 ID)',
      password_hash VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
      nickname VARCHAR(50) UNIQUE NOT NULL COMMENT '닉네임',
      job_category_id INT COMMENT '직업 카테고리 ID (FK)',
      profile_image_url VARCHAR(500) COMMENT '프로필 이미지 URL',
      is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일시',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id),
      INDEX idx_email (email),
      INDEX idx_nickname (nickname),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "users" created');
}

async function createUserProfilesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_profiles (
      profile_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '프로필 ID',
      user_id INT UNIQUE NOT NULL COMMENT '사용자 ID (FK)',
      job_occupation_id INT COMMENT '구체적 직업 ID (FK)',
      bio TEXT COMMENT '자기소개',
      preferences JSON COMMENT '사용자 설정 (JSON)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (job_occupation_id) REFERENCES job_occupations(job_occupation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "user_profiles" created');
}

async function createUserSessionsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '세션 ID',
      user_id INT NOT NULL COMMENT '사용자 ID (FK)',
      token_hash VARCHAR(255) UNIQUE NOT NULL COMMENT '토큰 해시',
      expires_at DATETIME NOT NULL COMMENT '만료일시',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at),
      INDEX idx_token_hash (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "user_sessions" created');
}


// -- ============================================
// -- SECTION 3: AI 모델 (Artificial Analysis 구조 유지)
// -- ============================================

async function createModelCreatorsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_creators (
      creator_id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
      creator_name VARCHAR(100) NOT NULL COMMENT '제공사명',
      creator_slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL 슬러그',
      website_url VARCHAR(255) COMMENT '웹사이트 URL',
      description TEXT COMMENT '설명',
      country VARCHAR(50) COMMENT '국가',
      founded_year YEAR COMMENT '설립년도',
      is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      INDEX idx_creator_slug (creator_slug),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_creators" created');
}

async function createAiModelsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS ai_models (
      model_id VARCHAR(36) PRIMARY KEY COMMENT 'Artificial Analysis API ID',
      model_name VARCHAR(150) NOT NULL COMMENT '모델명',
      model_slug VARCHAR(150) NOT NULL UNIQUE COMMENT 'URL 슬러그',
      creator_id VARCHAR(36) NOT NULL COMMENT '제공사 ID (FK)',
      release_date DATE COMMENT '출시일',
      model_type VARCHAR(50) COMMENT '모델 타입 (LLM, Vision 등)',
      parameter_size VARCHAR(50) COMMENT '파라미터 크기',
      context_length INT COMMENT '컨텍스트 길이',
      is_open_source BOOLEAN DEFAULT FALSE COMMENT '오픈소스 여부',
      is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
      raw_data JSON COMMENT '원본 API 데이터 (JSON)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (creator_id) REFERENCES model_creators(creator_id) ON DELETE CASCADE,
      INDEX idx_model_slug (model_slug),
      INDEX idx_creator_id (creator_id),
      INDEX idx_release_date (release_date),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "ai_models" created');
}

async function createModelEvaluationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_evaluations (
      evaluation_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '평가 ID',
      model_id VARCHAR(36) NOT NULL COMMENT '모델 ID (FK)',
      benchmark_name VARCHAR(100) NOT NULL COMMENT '벤치마크명',
      score DECIMAL(10,4) COMMENT '원본 점수',
      max_score DECIMAL(10,4) COMMENT '최대 점수',
      normalized_score DECIMAL(5,2) COMMENT '정규화 점수 (0-100)',
      model_rank INT COMMENT '모델 순위',
      measured_at DATE COMMENT '측정일',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      UNIQUE KEY uk_model_benchmark (model_id, benchmark_name),
      INDEX idx_benchmark_name (benchmark_name),
      INDEX idx_normalized_score (normalized_score DESC),
      INDEX idx_measured_at (measured_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_evaluations" created');
}

async function createModelOverallScoresTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_overall_scores (
      score_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '점수 ID',
      model_id VARCHAR(36) NOT NULL COMMENT '모델 ID (FK)',
      overall_score DECIMAL(5,2) NOT NULL COMMENT '종합 점수 (0-100)',
      intelligence_index DECIMAL(5,2) COMMENT '지능 지수',
      coding_index DECIMAL(5,2) COMMENT '코딩 지수',
      math_index DECIMAL(5,2) COMMENT '수학 지수',
      reasoning_index DECIMAL(5,2) COMMENT '추론 지수',
      language_index DECIMAL(5,2) COMMENT '언어 지수',
      calculated_at DATETIME NOT NULL COMMENT '계산일시',
      version INT DEFAULT 1 COMMENT '버전',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      INDEX idx_overall_score (overall_score DESC),
      INDEX idx_calculated_at (calculated_at DESC),
      UNIQUE KEY uk_model_version (model_id, version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_overall_scores" created');
}

async function createModelPricingTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_pricing (
      pricing_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '가격 ID',
      model_id VARCHAR(36) NOT NULL COMMENT '모델 ID (FK)',
      price_input_1m DECIMAL(10,6) COMMENT '입력 토큰 가격 (100만 토큰당)',
      price_output_1m DECIMAL(10,6) COMMENT '출력 토큰 가격 (100만 토큰당)',
      price_blended_3to1 DECIMAL(10,6) COMMENT '혼합 가격 (3:1 비율)',
      currency VARCHAR(10) DEFAULT 'USD' COMMENT '통화',
      effective_date DATE COMMENT '적용일',
      is_current BOOLEAN DEFAULT TRUE COMMENT '현재 가격 여부',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      INDEX idx_model_id (model_id),
      INDEX idx_is_current (is_current),
      INDEX idx_effective_date (effective_date DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_pricing" created');
}

async function createModelPerformanceTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_performance (
      performance_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '성능 ID',
      model_id VARCHAR(36) NOT NULL COMMENT '모델 ID (FK)',
      median_output_tokens_per_second DECIMAL(10,2) COMMENT '초당 출력 토큰 (중간값)',
      median_time_to_first_token DECIMAL(10,4) COMMENT '첫 토큰까지 시간 (중간값)',
      median_time_to_first_answer DECIMAL(10,4) COMMENT '첫 답변까지 시간 (중간값)',
      latency_p50 DECIMAL(10,4) COMMENT '지연시간 50분위',
      latency_p95 DECIMAL(10,4) COMMENT '지연시간 95분위',
      latency_p99 DECIMAL(10,4) COMMENT '지연시간 99분위',
      measured_at DATETIME COMMENT '측정일시',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      INDEX idx_model_id (model_id),
      INDEX idx_measured_at (measured_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_performance" created');
}

//-- ============================================
//-- SECTION 4: 모델 업데이트 추적
//-- ============================================

async function createModelUpdatesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_updates (
      update_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '업데이트 ID',
      model_id VARCHAR(36) NOT NULL COMMENT '모델 ID (FK)',
      version_before VARCHAR(50) COMMENT '이전 버전',
      version_after VARCHAR(50) COMMENT '이후 버전',
      update_date DATE NOT NULL COMMENT '업데이트 일자',
      summary TEXT COMMENT '업데이트 요약',
      key_improvements JSON COMMENT '주요 개선사항 (JSON)',
      performance_improvement DECIMAL(5, 2) COMMENT '성능 개선률 (%)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      INDEX idx_model_id (model_id),
      INDEX idx_update_date (update_date DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_updates" created');
}

async function createModelUpdatesDetailsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_updates_details (
      detail_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '상세 ID',
      update_id INT NOT NULL COMMENT '업데이트 ID (FK)',
      benchmark_name VARCHAR(100) COMMENT '벤치마크명',
      before_score DECIMAL(8, 4) COMMENT '이전 점수',
      after_score DECIMAL(8, 4) COMMENT '이후 점수',
      improvement_pct DECIMAL(5, 2) COMMENT '개선률 (%)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (update_id) REFERENCES model_updates(update_id) ON DELETE CASCADE,
      INDEX idx_update_id (update_id),
      INDEX idx_benchmark_name (benchmark_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_updates_details" created');
}

//-- ============================================
//-- SECTION 5: AI 이슈 지수 (v3 신규 - 시간별)
//-- ============================================

async function createClustersTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS clusters (
      cluster_id VARCHAR(50) PRIMARY KEY COMMENT '클러스터 ID (cluster_001, cluster_002 등)',
      topic_name VARCHAR(200) NOT NULL COMMENT '토픽명',
      tags JSON NOT NULL COMMENT '태그 배열 (JSON) - 5개',
      appearance_count INT DEFAULT 1 COMMENT '재출현 횟수',
      status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '상태 (active/inactive)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '최초 생성일시',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최종 업데이트일시',
      INDEX idx_status (status),
      INDEX idx_updated_at (updated_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "clusters" created');
}

async function createClusterHistoryTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS cluster_history (
      history_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '이력 ID',
      cluster_id VARCHAR(50) NOT NULL COMMENT '클러스터 ID (FK)',
      collected_at DATETIME NOT NULL COMMENT '수집 시간 (1시간 단위)',
      article_indices JSON NOT NULL COMMENT '기사 인덱스 배열 (0-999)',
      article_count INT NOT NULL COMMENT '기사 개수',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (cluster_id) REFERENCES clusters(cluster_id) ON DELETE CASCADE,
      INDEX idx_cluster_collected (cluster_id, collected_at),
      INDEX idx_collected_at (collected_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "cluster_history" created');
}

async function createClusterSnapshotsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS cluster_snapshots (
      snapshot_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '스냅샷 ID',
      collected_at DATETIME NOT NULL COMMENT '수집 시간 (1시간 단위)',
      cluster_id VARCHAR(50) NOT NULL COMMENT '클러스터 ID',
      topic_name VARCHAR(200) NOT NULL COMMENT '토픽명',
      tags JSON NOT NULL COMMENT '태그 배열 (JSON) - 5개',
      appearance_count INT NOT NULL COMMENT '재출현 횟수',
      article_count INT NOT NULL COMMENT '해당 시간 기사 개수',
      article_indices JSON NOT NULL COMMENT '기사 인덱스 배열 (0-999)',
      status ENUM('active', 'inactive') NOT NULL COMMENT '상태',
      cluster_score DECIMAL(5,2) NOT NULL COMMENT '클러스터 점수 (0-100)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      INDEX idx_collected_at (collected_at DESC),
      INDEX idx_cluster_id (cluster_id),
      INDEX idx_collected_cluster (collected_at, cluster_id),
      INDEX idx_cluster_score (cluster_score DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "cluster_snapshots" created');
}


async function createIssueIndexTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS issue_index (
      collected_at DATETIME NOT NULL PRIMARY KEY COMMENT '수집 시간 (1시간 단위)',
      overall_index DECIMAL(5,1) NOT NULL COMMENT '통합 이슈 지수 (0-100)',
      active_clusters_count INT COMMENT 'active 클러스터 개수',
      inactive_clusters_count INT COMMENT 'inactive 클러스터 개수',
      total_articles_analyzed INT COMMENT '분석된 총 기사 개수',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      INDEX idx_collected_at_desc (collected_at DESC),
      INDEX idx_overall_index (overall_index DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "issue_index" created');
}


//-- ============================================
//-- SECTION 6: 뉴스 및 태그
//-- ============================================

async function createNewsArticlesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS news_articles (
      article_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '기사 ID',
      collected_at DATETIME NOT NULL COMMENT '수집 시간 (1시간 단위)',
      article_index INT NOT NULL COMMENT '기사 인덱스 (0-999, GPT 입력 순서)',
      source VARCHAR(50) NOT NULL DEFAULT 'naver' COMMENT '출처 (naver 등)',
      title TEXT NOT NULL COMMENT '기사 제목',
      link VARCHAR(500) NOT NULL COMMENT '기사 링크',
      description TEXT COMMENT '기사 요약',
      pub_date DATETIME NOT NULL COMMENT '발행일시',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      UNIQUE KEY uk_collected_index (collected_at, article_index),
      INDEX idx_collected_at (collected_at DESC),
      INDEX idx_article_index (article_index),
      INDEX idx_pub_date (pub_date DESC),
      INDEX idx_source (source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "news_articles" created');
}

async function createArticleToTagsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS article_to_tags (
      mapping_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '매핑 ID',
      article_id BIGINT NOT NULL COMMENT '기사 ID (FK)',
      interest_tag_id INT NOT NULL COMMENT '태그 ID (FK)',
      classification_status ENUM('confirmed', 'pending_review', 'rejected') DEFAULT 'confirmed' COMMENT '분류 상태',
      confidence_score DECIMAL(3, 2) COMMENT '신뢰도 점수',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (article_id) REFERENCES news_articles(article_id) ON DELETE CASCADE,
      FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
      INDEX idx_article_id (article_id),
      INDEX idx_tag_id (interest_tag_id),
      INDEX idx_status (classification_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "article_to_tags" created');
}

// -- ============================================
//-- SECTION 7: 커뮤니티
//-- ============================================


async function createCommunityPostsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_posts (
      post_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '게시글 ID',
      user_id INT NOT NULL COMMENT '작성자 ID (FK)',
      title VARCHAR(255) NOT NULL COMMENT '게시글 제목',
      content TEXT NOT NULL COMMENT '게시글 내용',
      likes_count INT DEFAULT 0 COMMENT '좋아요 개수',
      comments_count INT DEFAULT 0 COMMENT '댓글 개수',
      views_count INT DEFAULT 0 COMMENT '조회수',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at DESC),
      INDEX idx_likes_count (likes_count DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "community_posts" created');
}

async function createCommunityCommentsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_comments (
      comment_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '댓글 ID',
      post_id INT NOT NULL COMMENT '게시글 ID (FK)',
      user_id INT NOT NULL COMMENT '작성자 ID (FK)',
      content TEXT NOT NULL COMMENT '댓글 내용',
      likes_count INT DEFAULT 0 COMMENT '좋아요 개수',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_post_id (post_id),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at DESC)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "community_comments" created');
}

async function createCommunityPostLikesTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS post_likes (
      like_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '좋아요 ID',
      post_id INT NOT NULL COMMENT '게시글 ID (FK)',
      user_id INT NOT NULL COMMENT '사용자 ID (FK)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '좋아요 일시',
      FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      UNIQUE KEY uk_post_user (post_id, user_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "community_post_likes" created');
}

async function createCommunityPostTagsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_post_tags (
      tag_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '게시글 태그 ID',
      post_id INT NOT NULL COMMENT '게시글 ID (FK)',
      interest_tag_id INT NOT NULL COMMENT '태그 ID (FK)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
      INDEX idx_post_id (post_id),
      INDEX idx_tag_id (interest_tag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "community_post_tags" created');
}

//-- ============================================
//-- SECTION 8: 사용자 관심 및 알림
//-- ============================================


async function createUserInterestedModelsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_interested_models (
      interested_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '관심 ID',
      user_id INT NOT NULL COMMENT '사용자 ID (FK)',
      model_id VARCHAR(36) NOT NULL COMMENT '모델 ID (FK)',
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '추가일시',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
      UNIQUE KEY uk_user_model (user_id, model_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "user_interested_models" created');
}

async function createUserInterestTagsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_interest_tags (
      user_tag_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자 태그 ID',
      user_id INT NOT NULL COMMENT '사용자 ID (FK)',
      interest_tag_id INT NOT NULL COMMENT '태그 ID (FK)',
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '추가일시',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
      UNIQUE KEY uk_user_tag (user_id, interest_tag_id),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "user_interest_tags" created');
}

async function createUserPushNotificationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_push_notifications (
      notification_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '알림 ID',
      user_id INT NOT NULL COMMENT '사용자 ID (FK)',
      model_update_id INT COMMENT '모델 업데이트 ID (FK)',
      notification_type ENUM('model_update', 'issue_alert', 'digest') NOT NULL COMMENT '알림 타입',
      title VARCHAR(255) COMMENT '알림 제목',
      body TEXT COMMENT '알림 내용',
      sent_at DATETIME COMMENT '발송일시',
      read_at DATETIME COMMENT '읽은일시',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (model_update_id) REFERENCES model_updates(update_id) ON DELETE SET NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_sent_at (sent_at DESC),
      INDEX idx_notification_type (notification_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "user_push_notifications" created');
}


async function createFcmTokensTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      token_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '토큰 ID',
      user_id INT NOT NULL COMMENT '사용자 ID (FK)',
      fcm_token VARCHAR(500) NOT NULL COMMENT 'FCM 토큰',
      device_type VARCHAR(20) COMMENT '디바이스 타입 (iOS/Android)',
      is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "fcm_tokens" created');
}

//-- ============================================
//-- SECTION 9: 매핑 및 캐시
//-- ============================================

async function createJobOccupationToTasksTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS job_occupation_to_tasks (
      mapping_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '매핑 ID',
      job_occupation_id INT NOT NULL COMMENT '직업 ID (FK)',
      interest_tag_id INT NOT NULL COMMENT '태그 ID (FK)',
      boost_weight DECIMAL(3, 2) DEFAULT 1.0 COMMENT '가중치 (부스트)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      FOREIGN KEY (job_occupation_id) REFERENCES job_occupations(job_occupation_id),
      FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
      UNIQUE KEY uk_job_tag (job_occupation_id, interest_tag_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "job_occupation_to_tasks" created');
}

async function createModelComparisonCacheTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS model_comparison_cache (
      cache_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '캐시 ID',
      model_id_1 VARCHAR(36) NOT NULL COMMENT '모델1 ID (FK)',
      model_id_2 VARCHAR(36) NOT NULL COMMENT '모델2 ID (FK)',
      comparison_data JSON COMMENT '비교 데이터 (JSON)',
      cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '캐시 생성일시',
      expires_at DATETIME COMMENT '만료일시',
      FOREIGN KEY (model_id_1) REFERENCES ai_models(model_id),
      FOREIGN KEY (model_id_2) REFERENCES ai_models(model_id),
      UNIQUE KEY uk_model_pair (model_id_1, model_id_2),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "model_comparison_cache" created');
}

//-- ============================================
//-- SECTION 10: 데이터 수집 로그
//-- ============================================


async function createDataCollectionLogsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS data_collection_logs (
      log_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '로그 ID',
      source_type VARCHAR(50) NOT NULL COMMENT '데이터 소스 (naver, artificial_analysis 등)',
      collection_date DATETIME NOT NULL COMMENT '수집 일시',
      status VARCHAR(20) NOT NULL COMMENT '상태 (success/failed)',
      records_collected INT DEFAULT 0 COMMENT '수집된 레코드 수',
      errors_count INT DEFAULT 0 COMMENT '오류 건수',
      error_details JSON COMMENT '오류 상세 (JSON)',
      duration_seconds INT COMMENT '소요 시간 (초)',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
      INDEX idx_source_type (source_type),
      INDEX idx_collection_date (collection_date DESC),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `;
  await executeQuery(sql);
  logger.info('Table "data_collection_logs" created');
}

/**
 * Phase 4: 커뮤니티 플랫폼 기능 마이그레이션
 */
async function migrateCommunityTables(): Promise<void> {
  logger.info('Starting community platform migrations...');

  // 1. community_posts 테이블 수정
  await alterCommunityPostsTable();

  // 2. community_comments 테이블 수정
  await alterCommunityCommentsTable();

  // 3. community_notifications 테이블 생성
  await createCommunityNotificationsTable();

  logger.info('Community platform migrations completed');
}

/**
 * community_posts 테이블에 카테고리 및 소프트 삭제 컬럼 추가
 */
async function alterCommunityPostsTable(): Promise<void> {
  try {
    // 카테고리 컬럼 추가
    const addCategorySql = `
      ALTER TABLE community_posts
      ADD COLUMN IF NOT EXISTS category ENUM(
        'prompt_share',
        'qa',
        'review',
        'general',
        'announcement'
      ) NOT NULL DEFAULT 'general' AFTER content;
    `;
    await executeQuery(addCategorySql);

    // 소프트 삭제 컬럼 추가
    const addDeletedSql = `
      ALTER TABLE community_posts
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE AFTER views_count,
      ADD COLUMN IF NOT EXISTS deleted_at DATETIME AFTER is_deleted;
    `;
    await executeQuery(addDeletedSql);

    // FULLTEXT INDEX 추가 (이미 존재하면 무시)
    try {
      const addFulltextSql = `
        ALTER TABLE community_posts
        ADD FULLTEXT INDEX idx_fulltext_search (title, content);
      `;
      await executeQuery(addFulltextSql);
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }

    logger.info('Table "community_posts" altered successfully');
  } catch (error: any) {
    if (error.message.includes('Duplicate column name')) {
      logger.info('Table "community_posts" already migrated');
    } else {
      throw error;
    }
  }
}

/**
 * community_comments 테이블에 대댓글 및 소프트 삭제 컬럼 추가
 */
async function alterCommunityCommentsTable(): Promise<void> {
  try {
    // parent_comment_id 및 소프트 삭제 컬럼 추가
    const addColumnsSql = `
      ALTER TABLE community_comments
      ADD COLUMN IF NOT EXISTS parent_comment_id INT AFTER post_id,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE AFTER likes_count,
      ADD COLUMN IF NOT EXISTS deleted_at DATETIME AFTER is_deleted;
    `;
    await executeQuery(addColumnsSql);

    // 외래키 추가 (이미 존재하면 무시)
    try {
      const addFkSql = `
        ALTER TABLE community_comments
        ADD CONSTRAINT fk_parent_comment
        FOREIGN KEY (parent_comment_id) REFERENCES community_comments(comment_id) ON DELETE CASCADE;
      `;
      await executeQuery(addFkSql);
    } catch (error: any) {
      if (!error.message.includes('Duplicate foreign key')) {
        // FK 에러는 무시
      }
    }

    // 인덱스 추가 (이미 존재하면 무시)
    try {
      const addIndexSql = `
        ALTER TABLE community_comments
        ADD INDEX idx_parent_comment_id (parent_comment_id);
      `;
      await executeQuery(addIndexSql);
    } catch (error: any) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }

    logger.info('Table "community_comments" altered successfully');
  } catch (error: any) {
    if (error.message.includes('Duplicate column name')) {
      logger.info('Table "community_comments" already migrated');
    } else {
      throw error;
    }
  }
}

/**
 * community_notifications 테이블 생성
 */
async function createCommunityNotificationsTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS community_notifications (
      notification_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      actor_id INT,
      post_id INT,
      comment_id INT,
      notification_type ENUM(
        'post_comment',
        'comment_reply'
      ) NOT NULL,
      content VARCHAR(500),
      is_read BOOLEAN DEFAULT FALSE,
      read_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (actor_id) REFERENCES users(user_id) ON DELETE SET NULL,
      FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES community_comments(comment_id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_is_read (is_read),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await executeQuery(sql);
  logger.info('Table "community_notifications" created');
}
