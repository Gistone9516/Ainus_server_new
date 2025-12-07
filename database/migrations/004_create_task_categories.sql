-- ============================================
-- 작업 카테고리 기반 AI 모델 추천 시스템
-- 작성일: 2025-11-21
-- 설명: 25개 표준 작업 카테고리 및 벤치마크 매핑
-- ============================================

-- ============================================
-- SECTION 1: 작업 카테고리 테이블
-- ============================================

-- task_categories: 25개 표준 작업 카테고리
CREATE TABLE IF NOT EXISTS task_categories (
  task_category_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '작업 카테고리 ID',
  category_code VARCHAR(50) UNIQUE NOT NULL COMMENT '카테고리 코드 (WRITING, CODING 등)',
  category_name_ko VARCHAR(100) NOT NULL COMMENT '한글명',
  category_name_en VARCHAR(100) NOT NULL COMMENT '영문명',
  description TEXT COMMENT '카테고리 설명',
  keywords JSON COMMENT '분류를 위한 키워드 배열',
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성화 여부',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  INDEX idx_category_code (category_code),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='25개 표준 작업 카테고리';

-- task_benchmark_mapping: 작업 카테고리별 벤치마크 매핑
CREATE TABLE IF NOT EXISTS task_benchmark_mapping (
  mapping_id INT PRIMARY KEY AUTO_INCREMENT COMMENT '매핑 ID',
  task_category_id INT NOT NULL COMMENT '작업 카테고리 ID (FK)',
  primary_benchmark VARCHAR(100) NOT NULL COMMENT '주요 벤치마크 (70%)',
  secondary_benchmark VARCHAR(100) NOT NULL COMMENT '보조 벤치마크 (30%)',
  primary_weight DECIMAL(3,2) DEFAULT 0.70 COMMENT '주요 벤치마크 가중치',
  secondary_weight DECIMAL(3,2) DEFAULT 0.30 COMMENT '보조 벤치마크 가중치',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  FOREIGN KEY (task_category_id) REFERENCES task_categories(task_category_id) ON DELETE CASCADE,
  UNIQUE KEY uk_task_category (task_category_id),
  INDEX idx_primary_benchmark (primary_benchmark),
  INDEX idx_secondary_benchmark (secondary_benchmark)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='작업 카테고리별 벤치마크 가중치';

-- ============================================
-- SECTION 2: 25개 작업 카테고리 초기 데이터
-- ============================================

INSERT INTO task_categories (category_code, category_name_ko, category_name_en, description, keywords) VALUES
('WRITING', '글쓰기', 'Writing', '블로그, 에세이, 기사, 소설 등 텍스트 작성 작업', JSON_ARRAY('글쓰기', '작문', '블로그', '에세이', '기사', '소설', '칼럼', '리뷰')),
('IMAGE_GEN', '이미지 작업', 'Image Generation/Editing', '이미지 생성, 편집, 변환 작업', JSON_ARRAY('이미지', '그림', '사진', '디자인', '편집', '생성', '변환', 'AI 아트')),
('CODING', '코딩/개발', 'Coding', '프로그래밍, 코드 작성, 디버깅, 소프트웨어 개발', JSON_ARRAY('코딩', '개발', '프로그래밍', '코드', '디버깅', 'API', '앱', '웹')),
('VIDEO_PROD', '영상 제작', 'Video Production', '영상 편집, 제작, 스크립트 작성', JSON_ARRAY('영상', '비디오', '편집', '제작', '스크립트', '유튜브', '콘텐츠')),
('AUDIO_MUSIC', '음악/오디오', 'Audio/Music', '음악 작곡, 오디오 편집, 사운드 디자인', JSON_ARRAY('음악', '오디오', '작곡', '편집', '사운드', '노래', '멜로디')),
('TRANSLATION', '번역', 'Translation', '언어 간 번역 및 통역', JSON_ARRAY('번역', '통역', '영어', '한국어', '외국어', '언어')),
('SUMMARIZATION', '요약/정리', 'Summarization', '문서 요약, 정리, 핵심 내용 추출', JSON_ARRAY('요약', '정리', '핵심', '간추리기', '요점', '발췌')),
('RESEARCH', '연구/조사', 'Research', '자료 조사, 연구, 정보 수집', JSON_ARRAY('연구', '조사', '자료', '정보', '분석', '데이터', '논문')),
('LEARNING', '학습/교육', 'Learning', '학습 자료, 교육 콘텐츠, 강의 준비', JSON_ARRAY('학습', '교육', '공부', '강의', '수업', '과외', '튜터링')),
('BRAINSTORMING', '창작/아이디어', 'Brainstorming', '아이디어 생성, 브레인스토밍, 창작 활동', JSON_ARRAY('아이디어', '브레인스토밍', '창작', '기획', '발상', '구상')),
('ANALYSIS', '분석', 'Analysis', '데이터 분석, 통계 분석, 추세 파악', JSON_ARRAY('분석', '데이터', '통계', '추세', '패턴', '인사이트')),
('CUSTOMER_SERVICE', '고객 응대', 'Customer Service', '고객 응대, 챗봇, 상담', JSON_ARRAY('고객', '응대', '상담', '챗봇', '서비스', 'CS', '문의')),
('DESIGN_UI_UX', '디자인/UI-UX', 'Design', 'UI/UX 디자인, 사용자 경험 설계', JSON_ARRAY('디자인', 'UI', 'UX', '인터페이스', '사용자', '경험')),
('MARKETING', '마케팅', 'Marketing', '마케팅 전략, 광고, 홍보', JSON_ARRAY('마케팅', '광고', '홍보', '프로모션', '캠페인', 'SNS')),
('COOKING', '요리', 'Cooking', '레시피, 요리법, 음식 관련', JSON_ARRAY('요리', '레시피', '음식', '조리', '식사', '메뉴')),
('FITNESS', '운동/피트니스', 'Fitness', '운동 계획, 피트니스, 건강 관리', JSON_ARRAY('운동', '피트니스', '헬스', '건강', '트레이닝', '다이어트')),
('TRAVEL', '여행 계획', 'Travel Planning', '여행 일정, 관광 정보, 여행 준비', JSON_ARRAY('여행', '관광', '일정', '투어', '여행지', '숙소')),
('PLANNING', '일정 관리', 'Schedule/Planning', '일정, 계획 수립, 스케줄 관리', JSON_ARRAY('일정', '계획', '스케줄', '관리', '플래너', '타임라인')),
('MATH_SCIENCE', '수학/과학', 'Math/Science', '수학 문제, 과학 계산, 공식 풀이', JSON_ARRAY('수학', '과학', '계산', '공식', '문제', '물리', '화학')),
('LEGAL', '법률/계약', 'Legal', '법률 자문, 계약서, 법률 문서', JSON_ARRAY('법률', '계약', '법', '계약서', '법적', '소송')),
('FINANCE', '재무/회계', 'Finance', '재무 분석, 회계, 금융 계산', JSON_ARRAY('재무', '회계', '금융', '예산', '투자', '세금')),
('HR_RECRUITMENT', '인적자원/채용', 'HR/Recruitment', '채용, HR, 인사 관리', JSON_ARRAY('채용', '인사', 'HR', '면접', '구인', '인재')),
('PRESENTATION', '프레젠테이션', 'Presentation', '발표 자료, 프레젠테이션 준비', JSON_ARRAY('발표', '프레젠테이션', 'PPT', '슬라이드', '자료')),
('GAMING', '게임', 'Gaming', '게임 관련 작업, 게임 개발, 게임 공략', JSON_ARRAY('게임', '플레이', '개발', '공략', '전략')),
('VOICE_ACTION', '음성 명령/작업', 'Voice/Action', '음성 명령 처리, 자동화 작업', JSON_ARRAY('음성', '명령', '자동화', '액션', '실행', '제어'));

-- ============================================
-- SECTION 3: 작업 카테고리별 벤치마크 매핑
-- ============================================

INSERT INTO task_benchmark_mapping (task_category_id, primary_benchmark, secondary_benchmark, primary_weight, secondary_weight)
SELECT task_category_id,
  CASE category_code
    WHEN 'WRITING' THEN 'artificial_analysis_intelligence_index'
    WHEN 'IMAGE_GEN' THEN 'artificial_analysis_intelligence_index'
    WHEN 'CODING' THEN 'artificial_analysis_coding_index'
    WHEN 'VIDEO_PROD' THEN 'artificial_analysis_intelligence_index'
    WHEN 'AUDIO_MUSIC' THEN 'artificial_analysis_intelligence_index'
    WHEN 'TRANSLATION' THEN 'artificial_analysis_intelligence_index'
    WHEN 'SUMMARIZATION' THEN 'artificial_analysis_intelligence_index'
    WHEN 'RESEARCH' THEN 'gpqa'
    WHEN 'LEARNING' THEN 'mmlu_pro'
    WHEN 'BRAINSTORMING' THEN 'artificial_analysis_intelligence_index'
    WHEN 'ANALYSIS' THEN 'artificial_analysis_math_index'
    WHEN 'CUSTOMER_SERVICE' THEN 'artificial_analysis_intelligence_index'
    WHEN 'DESIGN_UI_UX' THEN 'artificial_analysis_intelligence_index'
    WHEN 'MARKETING' THEN 'artificial_analysis_intelligence_index'
    WHEN 'COOKING' THEN 'artificial_analysis_intelligence_index'
    WHEN 'FITNESS' THEN 'artificial_analysis_intelligence_index'
    WHEN 'TRAVEL' THEN 'artificial_analysis_intelligence_index'
    WHEN 'PLANNING' THEN 'artificial_analysis_intelligence_index'
    WHEN 'MATH_SCIENCE' THEN 'artificial_analysis_math_index'
    WHEN 'LEGAL' THEN 'mmlu_pro'
    WHEN 'FINANCE' THEN 'artificial_analysis_math_index'
    WHEN 'HR_RECRUITMENT' THEN 'artificial_analysis_intelligence_index'
    WHEN 'PRESENTATION' THEN 'artificial_analysis_intelligence_index'
    WHEN 'GAMING' THEN 'artificial_analysis_intelligence_index'
    WHEN 'VOICE_ACTION' THEN 'artificial_analysis_intelligence_index'
  END AS primary_benchmark,
  CASE category_code
    WHEN 'WRITING' THEN 'mmlu_pro'
    WHEN 'IMAGE_GEN' THEN 'hle'
    WHEN 'CODING' THEN 'livecodebench'
    WHEN 'VIDEO_PROD' THEN 'mmlu_pro'
    WHEN 'AUDIO_MUSIC' THEN 'mmlu_pro'
    WHEN 'TRANSLATION' THEN 'hle'
    WHEN 'SUMMARIZATION' THEN 'mmlu_pro'
    WHEN 'RESEARCH' THEN 'tau2'
    WHEN 'LEARNING' THEN 'artificial_analysis_intelligence_index'
    WHEN 'BRAINSTORMING' THEN 'tau2'
    WHEN 'ANALYSIS' THEN 'gpqa'
    WHEN 'CUSTOMER_SERVICE' THEN 'hle'
    WHEN 'DESIGN_UI_UX' THEN 'hle'
    WHEN 'MARKETING' THEN 'mmlu_pro'
    WHEN 'COOKING' THEN 'mmlu_pro'
    WHEN 'FITNESS' THEN 'mmlu_pro'
    WHEN 'TRAVEL' THEN 'mmlu_pro'
    WHEN 'PLANNING' THEN 'tau2'
    WHEN 'MATH_SCIENCE' THEN 'aime_25'
    WHEN 'LEGAL' THEN 'artificial_analysis_intelligence_index'
    WHEN 'FINANCE' THEN 'mmlu_pro'
    WHEN 'HR_RECRUITMENT' THEN 'mmlu_pro'
    WHEN 'PRESENTATION' THEN 'mmlu_pro'
    WHEN 'GAMING' THEN 'livecodebench'
    WHEN 'VOICE_ACTION' THEN 'terminalbench_hard'
  END AS secondary_benchmark,
  0.70,
  0.30
FROM task_categories;

-- ============================================
-- 마이그레이션 완료
-- ============================================

SELECT
  '25 task categories and benchmark mappings created successfully!' AS status,
  (SELECT COUNT(*) FROM task_categories) AS total_categories,
  (SELECT COUNT(*) FROM task_benchmark_mapping) AS total_mappings;
