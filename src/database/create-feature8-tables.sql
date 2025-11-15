-- Feature #8: 개인화된 AI 트렌드 모니터링 - 데이터베이스 스키마
-- 담당자: 최수안 (백엔드 팀장)
-- 작성일: 2025-11-12

-- ===== 1. 직업 카테고리 테이블 (jobs) =====
CREATE TABLE IF NOT EXISTS jobs (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '직업 ID',
  job_code VARCHAR(50) NOT NULL UNIQUE COMMENT '직업 코드 (TECH_DEV 등)',
  job_name_ko VARCHAR(100) NOT NULL COMMENT '한글명',
  job_name_en VARCHAR(100) NOT NULL COMMENT '영문명',
  description TEXT COMMENT '직업 설명',
  icon_url VARCHAR(500) COMMENT '아이콘 이미지 URL',
  sort_order INT DEFAULT 0 COMMENT '정렬 순서',
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_code (job_code),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='13개 표준 직업 카테고리';

-- ===== 2. 관심사 태그 테이블 (interest_tags) =====
CREATE TABLE IF NOT EXISTS interest_tags (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '태그 ID',
  tag_name_ko VARCHAR(100) NOT NULL UNIQUE COMMENT '한글 태그명',
  tag_name_en VARCHAR(100) NOT NULL COMMENT '영문 태그명',
  tag_category ENUM('tech', 'application', 'trend') COMMENT '태그 분류',
  description TEXT COMMENT '태그 설명',
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_name (tag_name_ko),
  INDEX idx_category (tag_category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='40개 표준 관심사 태그';

-- ===== 3. 사용자 프로필에 직업 정보 추가 =====
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS job_category_id INT COMMENT 'jobs FK' AFTER user_id,
ADD FOREIGN KEY (job_category_id) REFERENCES jobs(id),
ADD INDEX IF NOT EXISTS idx_job (job_category_id);

-- ===== 4. 사용자 관심 태그 테이블 (user_interest_tags) =====
CREATE TABLE IF NOT EXISTS user_interest_tags (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '사용자-태그 관계 ID',

  user_id BIGINT NOT NULL COMMENT 'users FK',
  tag_id INT NOT NULL COMMENT 'interest_tags FK',

  selected_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '선택 시간',

  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES interest_tags(id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_tag (user_id, tag_id),
  INDEX idx_user (user_id),
  INDEX idx_tag (tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='사용자가 선택한 관심사 태그';

-- ===== 5. 직업-작업 매핑 테이블 (job_occupation_to_tasks) =====
CREATE TABLE IF NOT EXISTS job_occupation_to_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '매핑 ID',

  job_category_id INT NOT NULL COMMENT '직업 카테고리 ID',
  job_category_name VARCHAR(100) NOT NULL COMMENT '직업명',

  task_category VARCHAR(100) NOT NULL COMMENT '작업 카테고리',

  boost_weight DECIMAL(3, 2) NOT NULL DEFAULT 1.0 COMMENT '점수 가중치 (1.0~2.0)',

  description VARCHAR(255) NULL COMMENT '설명',
  is_primary BOOLEAN DEFAULT FALSE COMMENT '주요 작업 여부',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_job_task (job_category_id, task_category),
  INDEX idx_job_category (job_category_id),
  INDEX idx_task_category (task_category),
  FOREIGN KEY (job_category_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='13개 직업 → 작업 카테고리 매핑 + 가중치';

-- ===== 6. 직업-태그 추천 매핑 테이블 (job_to_interest_tags) =====
CREATE TABLE IF NOT EXISTS job_to_interest_tags (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '매핑 ID',

  job_category_id INT NOT NULL COMMENT '직업 카테고리 ID',
  job_category_name VARCHAR(100) NOT NULL COMMENT '직업명',

  interest_tag_id INT NOT NULL COMMENT '관심사 태그 ID',
  interest_tag_name VARCHAR(100) NOT NULL COMMENT '태그명',

  recommendation_rank INT DEFAULT 1 COMMENT '추천 순위',
  recommendation_reason VARCHAR(255) NULL COMMENT '추천 이유',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_job_tag (job_category_id, interest_tag_id),
  INDEX idx_job_category (job_category_id),
  INDEX idx_recommendation_rank (recommendation_rank),
  FOREIGN KEY (job_category_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='13개 직업별 추천 관심사 태그';

-- ===== 7. 직업별 이슈 지수 테이블 (issue_index_by_category) =====
CREATE TABLE IF NOT EXISTS issue_index_by_category (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '이슈 지수 ID',

  date DATE NOT NULL COMMENT '날짜',
  job_category_id INT COMMENT 'jobs FK',

  index_value DECIMAL(5, 2) NOT NULL COMMENT '직업별 이슈 지수 (0-100)',
  base_index DECIMAL(5, 2) COMMENT '전체 이슈 지수',
  deviation DECIMAL(5, 2) COMMENT '전체 지수 대비 편차',

  relevant_news_count INT COMMENT '해당 직업 관련 뉴스 개수',
  calculation_method VARCHAR(100) COMMENT '계산 방식',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_date_job (date, job_category_id),
  INDEX idx_date_job (date DESC, job_category_id),
  INDEX idx_value (index_value DESC),
  FOREIGN KEY (job_category_id) REFERENCES jobs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='직업별 AI 이슈 지수';

-- ===== 초기 데이터 (표준 13개 직업) =====
INSERT IGNORE INTO jobs (id, job_code, job_name_ko, job_name_en, description, sort_order) VALUES
(1, 'TECH_DEV', '기술/개발', 'Tech/Development', '소프트웨어 및 데이터 개발 직무', 1),
(2, 'CREATIVE', '창작/콘텐츠', 'Creative/Content', '콘텐츠 제작 및 창의적 작업', 2),
(3, 'ANALYSIS', '분석/사무', 'Analysis/Administrative', '데이터 분석 및 사무 업무', 3),
(4, 'HEALTHCARE', '의료/과학', 'Healthcare/Science', '의료 및 과학 분야 전문가', 4),
(5, 'EDUCATION', '교육', 'Education', '교육 및 훈련 전문가', 5),
(6, 'BUSINESS', '비즈니스', 'Business', '비즈니스 및 경영 전문가', 6),
(7, 'MANUFACTURING', '제조/건설', 'Manufacturing/Construction', '제조 및 건설 분야', 7),
(8, 'SERVICE', '서비스', 'Service', '서비스업 종사자', 8),
(9, 'STARTUP', '창업/자영업', 'Startup/Self-Employment', '창업가 및 자영업자', 9),
(10, 'AGRICULTURE', '농업/축산업', 'Agriculture/Livestock', '농업 및 축산업 종사자', 10),
(11, 'FISHERIES', '어업/해상업', 'Fisheries/Maritime', '어업 및 해상업 종사자', 11),
(12, 'STUDENT', '학생', 'Student', '학생', 12),
(13, 'OTHER', '기타', 'Others', '기타 직종', 13);

-- ===== 초기 데이터 (표준 40개 관심사 태그) =====
-- 기술 중심 태그 (12개)
INSERT IGNORE INTO interest_tags (id, tag_name_ko, tag_name_en, tag_category) VALUES
(1, 'LLM', 'Large Language Model', 'tech'),
(2, '컴퓨터비전', 'Computer Vision', 'tech'),
(3, '자연어처리', 'NLP', 'tech'),
(4, '머신러닝', 'Machine Learning', 'tech'),
(5, '강화학습', 'Reinforcement Learning', 'tech'),
(6, '연합학습', 'Federated Learning', 'tech'),
(7, '모델경량화', 'Model Optimization', 'tech'),
(8, '프롬프트엔지니어링', 'Prompt Engineering', 'tech'),
(9, '에지AI', 'Edge AI', 'tech'),
(10, '윤리AI', 'Ethical AI', 'tech'),
(11, 'AI보안', 'AI Security', 'tech'),
(12, '개인화추천', 'Personalization', 'tech'),

-- 산업/응용 중심 태그 (18개)
(13, '콘텐츠생성', 'Content Creation', 'application'),
(14, '이미지생성', 'Image Generation', 'application'),
(15, '영상생성', 'Video Generation', 'application'),
(16, '코드생성', 'Code Generation', 'application'),
(17, '글쓰기지원', 'Writing Assistant', 'application'),
(18, '번역', 'Translation', 'application'),
(19, '음성합성', 'Voice Synthesis', 'application'),
(20, '음성인식', 'Speech Recognition', 'application'),
(21, '채팅봇', 'Chatbot', 'application'),
(22, '감정분석', 'Sentiment Analysis', 'application'),
(23, '데이터분석', 'Data Analysis', 'application'),
(24, '예측분석', 'Predictive Analytics', 'application'),
(25, '자동화', 'Automation', 'application'),
(26, '업무효율화', 'Productivity', 'application'),
(27, '의사결정지원', 'Decision Support', 'application'),
(28, '마케팅자동화', 'Marketing Automation', 'application'),
(29, '검색최적화', 'SEO', 'application'),
(30, '가격결정', 'Pricing Optimization', 'application'),

-- 트렌드/산업이슈 중심 태그 (10개)
(31, 'AI일자리', 'Job Impact', 'trend'),
(32, 'AI윤리', 'AI Ethics', 'trend'),
(33, 'AI규제', 'Regulation', 'trend'),
(34, 'AI성능', 'Performance', 'trend'),
(35, '모델출시', 'Model Release', 'trend'),
(36, '오픈소스', 'Open Source', 'trend'),
(37, '의료진단', 'Medical Diagnosis', 'trend'),
(38, '교육지원', 'Learning Support', 'trend'),
(39, '비용절감', 'Cost Reduction', 'trend'),
(40, '기술트렌드', 'Tech Trend', 'trend');

-- ===== 직업-태그 추천 매핑 (표준 매핑) =====
-- 기술/개발 (ID=1) → LLM, 컴퓨터비전, 자연어처리, 머신러닝, 코드생성, 모델경량화, 에지AI, 오픈소스
INSERT IGNORE INTO job_to_interest_tags (job_category_id, job_category_name, interest_tag_id, interest_tag_name, recommendation_rank) VALUES
(1, '기술/개발', 1, 'LLM', 1),
(1, '기술/개발', 2, '컴퓨터비전', 2),
(1, '기술/개발', 3, '자연어처리', 3),
(1, '기술/개발', 4, '머신러닝', 4),
(1, '기술/개발', 16, '코드생성', 5),
(1, '기술/개발', 7, '모델경량화', 6),
(1, '기술/개발', 9, '에지AI', 7),
(1, '기술/개발', 36, '오픈소스', 8),

-- 창작/콘텐츠 (ID=2) → 콘텐츠생성, 이미지생성, 영상생성, 글쓰기지원, 마케팅자동화, 검색최적화
(2, '창작/콘텐츠', 13, '콘텐츠생성', 1),
(2, '창작/콘텐츠', 14, '이미지생성', 2),
(2, '창작/콘텐츠', 15, '영상생성', 3),
(2, '창작/콘텐츠', 17, '글쓰기지원', 4),
(2, '창작/콘텐츠', 28, '마케팅자동화', 5),
(2, '창작/콘텐츠', 29, '검색최적화', 6),

-- 분석/사무 (ID=3) → 데이터분석, 예측분석, 자동화, 업무효율화, 의사결정지원
(3, '분석/사무', 23, '데이터분석', 1),
(3, '분석/사무', 24, '예측분석', 2),
(3, '분석/사무', 25, '자동화', 3),
(3, '분석/사무', 26, '업무효율화', 4),
(3, '분석/사무', 27, '의사결정지원', 5),

-- 의료/과학 (ID=4) → 컴퓨터비전, 의료진단, 데이터분석, 머신러닝
(4, '의료/과학', 2, '컴퓨터비전', 1),
(4, '의료/과학', 37, '의료진단', 2),
(4, '의료/과학', 23, '데이터분석', 3),
(4, '의료/과학', 4, '머신러닝', 4),

-- 교육 (ID=5) → 채팅봇, 교육지원, 글쓰기지원, 자동화
(5, '교육', 21, '채팅봇', 1),
(5, '교육', 38, '교육지원', 2),
(5, '교육', 17, '글쓰기지원', 3),
(5, '교육', 25, '자동화', 4),

-- 비즈니스 (ID=6) → 데이터분석, 예측분석, 의사결정지원, 자동화, 마케팅자동화, 가격결정
(6, '비즈니스', 23, '데이터분석', 1),
(6, '비즈니스', 24, '예측분석', 2),
(6, '비즈니스', 27, '의사결정지원', 3),
(6, '비즈니스', 25, '자동화', 4),
(6, '비즈니스', 28, '마케팅자동화', 5),
(6, '비즈니스', 30, '가격결정', 6),

-- 제조/건설 (ID=7) → 컴퓨터비전, 자동화, 데이터분석, 모델경량화
(7, '제조/건설', 2, '컴퓨터비전', 1),
(7, '제조/건설', 25, '자동화', 2),
(7, '제조/건설', 23, '데이터분석', 3),
(7, '제조/건설', 7, '모델경량화', 4),

-- 서비스 (ID=8) → 채팅봇, 감정분석, 자동화, 마케팅자동화
(8, '서비스', 21, '채팅봇', 1),
(8, '서비스', 22, '감정분석', 2),
(8, '서비스', 25, '자동화', 3),
(8, '서비스', 28, '마케팅자동화', 4),

-- 창업/자영업 (ID=9) → 자동화, 업무효율화, 의사결정지원, 데이터분석, 비용절감
(9, '창업/자영업', 25, '자동화', 1),
(9, '창업/자영업', 26, '업무효율화', 2),
(9, '창업/자영업', 27, '의사결정지원', 3),
(9, '창업/자영업', 23, '데이터분석', 4),
(9, '창업/자영업', 39, '비용절감', 5),

-- 농업/축산업 (ID=10) → 컴퓨터비전, 데이터분석, 자동화
(10, '농업/축산업', 2, '컴퓨터비전', 1),
(10, '농업/축산업', 23, '데이터분석', 2),
(10, '농업/축산업', 25, '자동화', 3),

-- 어업/해상업 (ID=11) → 데이터분석, 자동화, 예측분석
(11, '어업/해상업', 23, '데이터분석', 1),
(11, '어업/해상업', 25, '자동화', 2),
(11, '어업/해상업', 24, '예측분석', 3),

-- 학생 (ID=12) → 교육지원, 글쓰기지원, 코드생성, LLM
(12, '학생', 38, '교육지원', 1),
(12, '학생', 17, '글쓰기지원', 2),
(12, '학생', 16, '코드생성', 3),
(12, '학생', 1, 'LLM', 4),

-- 기타 (ID=13) → 기술트렌드, 자동화, 데이터분석
(13, '기타', 40, '기술트렌드', 1),
(13, '기타', 25, '자동화', 2),
(13, '기타', 23, '데이터분석', 3);
