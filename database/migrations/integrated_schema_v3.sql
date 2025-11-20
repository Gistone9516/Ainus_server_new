-- ============================================
-- Ainus 통합 데이터베이스 스키마 v3
-- AI 이슈 지수 시스템 적용 (MongoDB, Elasticsearch 제거)
-- 작성일: 2025-11-18
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- SECTION 1: 직업 카테고리 (선행 필요)
-- ============================================

-- job_categories: 직업 카테고리 (13개)
CREATE TABLE IF NOT EXISTS job_categories (
  job_category_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '직업 카테고리 ID',
  job_name VARCHAR(100) NOT NULL COMMENT '직업 카테고리명',
  category_code VARCHAR(20) UNIQUE NOT NULL COMMENT '카테고리 코드',
  description TEXT COMMENT '카테고리 설명',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  INDEX idx_category_code (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='직업 카테고리 마스터 테이블';

-- job_occupations: 구체적 직업
CREATE TABLE IF NOT EXISTS job_occupations (
  job_occupation_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '직업 ID',
  job_category_id INT NOT NULL COMMENT '직업 카테고리 ID (FK)',
  occupation_name VARCHAR(100) NOT NULL COMMENT '직업명',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id),
  INDEX idx_job_category (job_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='직업 상세 테이블';

-- ============================================
-- SECTION 2: 사용자 및 인증
-- ============================================

-- users: 사용자 기본 정보
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='사용자 기본 정보';

-- user_profiles: 사용자 상세 정보
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='사용자 상세 프로필';

-- user_sessions: JWT 토큰 관리
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
COMMENT='사용자 세션 관리 (JWT)';

-- ============================================
-- SECTION 3: AI 모델 (Artificial Analysis 구조 유지)
-- ============================================

-- model_creators: AI 모델 제공사
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
COMMENT='AI 모델 제공사';

-- ai_models: AI 모델 기본 정보
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
COMMENT='AI 모델 기본 정보';

-- model_evaluations: 벤치마크 점수
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
COMMENT='모델 벤치마크 평가 결과';

-- model_overall_scores: 종합 점수
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
COMMENT='모델 종합 점수';

-- model_pricing: 가격 정보
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
COMMENT='모델 가격 정보';

-- model_performance: 성능 지표
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
COMMENT='모델 성능 지표';

-- ============================================
-- SECTION 4: 모델 업데이트 추적
-- ============================================

-- model_updates: 모델 업데이트 내역
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
COMMENT='모델 업데이트 이력';

-- model_updates_details: 버전별 성능 상세 데이터
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
COMMENT='모델 업데이트 벤치마크 상세';

-- ============================================
-- SECTION 5: AI 이슈 지수 (v3 신규 - 시간별)
-- ============================================

-- clusters: 클러스터 현재 상태
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
COMMENT='클러스터 현재 상태 (MongoDB history 배열 대체)';

-- cluster_history: 클러스터 이력
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
COMMENT='클러스터 출현 이력 (1시간마다 기록)';

-- cluster_snapshots: 클러스터 스냅샷 (API 조회용)
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
COMMENT='클러스터 스냅샷 (특정 시점 전체 상태)';

-- issue_index: 통합 이슈 지수 (시간별)
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
COMMENT='통합 AI 이슈 지수 (1시간마다)';

-- ============================================
-- SECTION 6: 뉴스 및 태그
-- ============================================

-- interest_tags: 표준 관심 태그 (40개)
CREATE TABLE IF NOT EXISTS interest_tags (
  interest_tag_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '태그 ID',
  tag_name VARCHAR(50) NOT NULL COMMENT '태그명',
  tag_code VARCHAR(20) UNIQUE NOT NULL COMMENT '태그 코드',
  description TEXT COMMENT '태그 설명',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  INDEX idx_tag_code (tag_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='표준 관심 태그 (40개 고정)';

-- news_articles: 뉴스 기사 (v3 수정 - collected_at, article_index 추가)
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
COMMENT='뉴스 기사 메타데이터 (1시간마다 1000개)';

-- article_to_tags: 기사와 태그의 관계
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
COMMENT='기사-태그 관계';

-- ============================================
-- SECTION 7: 커뮤니티
-- ============================================

-- community_posts: 게시글
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
COMMENT='커뮤니티 게시글';

-- community_comments: 댓글
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
COMMENT='게시글 댓글';

-- post_likes: 게시글 좋아요
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
COMMENT='게시글 좋아요';

-- community_post_tags: 게시글 태그
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
COMMENT='게시글-태그 관계';

-- ============================================
-- SECTION 8: 사용자 관심 및 알림
-- ============================================

-- user_interested_models: 사용자의 관심 모델
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
COMMENT='사용자 관심 모델';

-- user_interest_tags: 사용자 관심 태그
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
COMMENT='사용자 관심 태그';

-- user_push_notifications: 푸시 알림 기록
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
COMMENT='푸시 알림 기록';

-- fcm_tokens: Firebase Cloud Messaging 토큰
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
COMMENT='FCM 토큰 관리';

-- ============================================
-- SECTION 9: 매핑 및 캐시
-- ============================================

-- job_occupation_to_tasks: 직업별 가중치 매핑
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
COMMENT='직업별 태그 가중치';

-- model_comparison_cache: 모델 비교 캐시
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
COMMENT='모델 비교 캐시';

-- ============================================
-- SECTION 10: 데이터 수집 로그
-- ============================================

-- data_collection_logs: 데이터 수집 로그
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
COMMENT='데이터 수집 로그';

-- ============================================
-- SECTION 11: 자동 정리 이벤트 (90일 보관)
-- ============================================

-- 90일 이상 된 클러스터 스냅샷 삭제
DROP EVENT IF EXISTS cleanup_cluster_snapshots;
CREATE EVENT cleanup_cluster_snapshots
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  DELETE FROM cluster_snapshots 
  WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 90일 이상 된 클러스터 이력 삭제
DROP EVENT IF EXISTS cleanup_cluster_history;
CREATE EVENT cleanup_cluster_history
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  DELETE FROM cluster_history 
  WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 90일 이상 된 뉴스 기사 삭제
DROP EVENT IF EXISTS cleanup_old_articles;
CREATE EVENT cleanup_old_articles
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  DELETE FROM news_articles 
  WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 90일 이상 된 이슈 지수 삭제
DROP EVENT IF EXISTS cleanup_old_issue_index;
CREATE EVENT cleanup_old_issue_index
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  DELETE FROM issue_index 
  WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 스키마 생성 완료
-- ============================================
SELECT 
  'Ainus v3 integrated schema created successfully!' AS status,
  'MongoDB removed - clusters now in MySQL' AS change_1,
  'Elasticsearch removed - news_articles in MySQL' AS change_2,
  'Hourly issue index implemented' AS change_3,
  '90-day automatic cleanup enabled' AS change_4;
