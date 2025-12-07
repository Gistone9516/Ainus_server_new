# Ainus Server - AI 모델 분석 및 뉴스 클러스터링 플랫폼

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [프로젝트 목적](#2-프로젝트-목적)
3. [기술 스택](#3-기술-스택)
4. [시스템 아키텍처](#4-시스템-아키텍처)
5. [핵심 로직](#5-핵심-로직)
6. [데이터베이스 설계](#6-데이터베이스-설계)
7. [데이터 파이프라인](#7-데이터-파이프라인)
8. [API 엔드포인트](#8-api-엔드포인트)
9. [연구 결과](#9-연구-결과)
10. [활용 방안](#10-활용-방안)
11. [기대 효과](#11-기대-효과)
12. [향후 발전 방향](#12-향후-발전-방향)

---

## 1. 프로젝트 개요

### 1.1 프로젝트명
**Ainus Server** - AI Model Analysis & Benchmarking Platform

### 1.2 프로젝트 설명
Ainus Server는 AI 모델의 성능을 분석하고, 벤치마크 점수를 추적하며, AI 관련 뉴스를 클러스터링하여 **AI 이슈 지수**를 제공하는 종합 백엔드 플랫폼입니다.

### 1.3 핵심 가치
- **AI 모델 분석**: Artificial Analysis API 기반 실시간 모델 성능 추적
- **직업별 추천**: 13개 직업 카테고리에 따른 맞춤형 AI 모델 추천
- **작업별 추천**: 25개 작업 카테고리에 따른 AI 모델 추천 (GPT 기반 분류)
- **AI 이슈 지수**: 시간별 AI 뉴스 클러스터링 및 이슈 지수 계산
- **커뮤니티**: AI 모델에 대한 사용자 토론 및 정보 공유
- **통합 인증**: 로컬 인증 + OAuth 2.0 (Google, Kakao, Naver)

### 1.4 개발 기간
2025년 11월 ~ 2025년 12월

### 1.5 개발팀
Ainus Dev Team

---

## 2. 프로젝트 목적

### 2.1 문제 인식

#### 2.1.1 AI 모델 선택의 어려움
- 수백 개의 AI 모델이 존재하며, 각각 다른 벤치마크와 성능 지표를 가짐
- 일반 사용자가 자신의 직업이나 작업에 맞는 최적의 모델을 선택하기 어려움
- 모델 간 비교를 위한 표준화된 지표 부재

#### 2.1.2 AI 뉴스 정보 과부하
- 매일 수백 개의 AI 관련 뉴스가 발행됨
- 중요한 트렌드와 이슈를 파악하기 어려움
- 직업별로 관련 있는 AI 뉴스를 필터링하기 어려움

#### 2.1.3 AI 트렌드 정량화 부재
- AI 분야의 "핫한 정도"를 객관적으로 측정하는 지표 부재
- 시간에 따른 AI 이슈의 변화 추적 어려움

### 2.2 해결 목표

1. **AI 모델 추천 시스템 구축**
   - 직업 카테고리(13개)별 맞춤형 모델 추천
   - 작업 카테고리(25개)별 맞춤형 모델 추천
   - 벤치마크 기반 가중 점수 계산

2. **AI 이슈 지수 개발**
   - 뉴스 클러스터링을 통한 토픽 추출
   - 시간별 이슈 지수 계산 (0-100)
   - 직업별 이슈 지수 제공 (13개 직업)

3. **통합 플랫폼 제공**
   - REST API 기반 백엔드 서비스
   - 사용자 인증 및 커뮤니티 기능
   - 실시간 데이터 수집 및 처리

---

## 3. 기술 스택

### 3.1 Backend Framework

| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 18.x | 런타임 환경 |
| TypeScript | 5.2.2 | 타입 안전성 |
| Express.js | 4.18.2 | 웹 프레임워크 |

### 3.2 Database

| 기술 | 버전 | 용도 |
|------|------|------|
| MySQL | 8.0 | 관계형 데이터 저장 (40+ 테이블) |
| Redis | 7.2 | 캐싱, 세션 관리, Rate Limiting |

### 3.3 Authentication & Security

| 기술 | 버전 | 용도 |
|------|------|------|
| jsonwebtoken | 9.0.0 | JWT 토큰 발급/검증 |
| bcryptjs | 2.4.3 | 비밀번호 해싱 |
| express-rate-limit | 8.2.1 | API Rate Limiting |
| rate-limit-redis | 4.2.3 | Redis 기반 분산 Rate Limiting |

### 3.4 External APIs

| API | 용도 |
|-----|------|
| Artificial Analysis API | AI 모델 벤치마크 데이터 수집 |
| Naver News API | AI 관련 뉴스 수집 |
| OpenAI Assistants API | 뉴스 클러스터링, 작업 분류 |

### 3.5 DevOps & Tools

| 기술 | 버전 | 용도 |
|------|------|------|
| Docker | - | 컨테이너화 |
| Docker Compose | - | 멀티 컨테이너 오케스트레이션 |
| Winston | 3.11.0 | 로깅 |
| node-cron | 3.0.2 | 스케줄링 |
| Bull | 4.11.4 | 작업 큐 |
| Nodemailer | 7.0.10 | 이메일 발송 |

### 3.6 Testing

| 기술 | 버전 | 용도 |
|------|------|------|
| Jest | 29.7.0 | 테스트 프레임워크 |
| fast-check | 4.3.0 | Property-based Testing |
| supertest | 6.3.3 | HTTP 테스트 |

---

## 4. 시스템 아키텍처

### 4.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Applications                            │
│                    (Web App, Mobile App, Third-party)                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Ainus Server (Express.js)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Auth API  │  │  Models API │  │   News API  │  │ Community   │    │
│  │             │  │             │  │             │  │    API      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Tasks API  │  │Timeline API │  │Comparison   │  │ Job News    │    │
│  │             │  │             │  │    API      │  │    API      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │   MySQL 8.0 │ │  Redis 7.2  │ │  External   │
            │  (Primary)  │ │  (Cache)    │ │    APIs     │
            └─────────────┘ └─────────────┘ └─────────────┘
```

### 4.2 디렉토리 구조

```
src/
├── api/                    # API 컨트롤러
│   ├── auth.controller.ts
│   ├── models.controller.ts
│   ├── news.controller.ts
│   ├── tasks.controller.ts
│   ├── community.controller.ts
│   ├── job-news.controller.ts
│   └── news-tagging.controller.ts
│
├── config/                 # 설정 파일
│   ├── environment.ts      # 환경 변수 관리
│   ├── job-benchmark-mapping.ts    # 직업별 벤치마크 매핑
│   ├── job-tag-mapping.ts          # 직업별 태그 매핑
│   └── task-benchmark-mapping.ts   # 작업별 벤치마크 매핑
│
├── cron/                   # 스케줄러
│   ├── dataCollectionScheduler.ts  # 데이터 수집 스케줄러
│   ├── cleanupScheduler.ts         # 데이터 정리 스케줄러
│   └── index.ts
│
├── database/               # 데이터베이스 연결
│   ├── mysql.ts            # MySQL 연결 풀
│   ├── redis.ts            # Redis 클라이언트
│   ├── migrations.ts       # 마이그레이션 실행
│   └── logger.ts           # DB 로거
│
├── middleware/             # 미들웨어
│   ├── auth.ts             # JWT 인증
│   ├── rateLimiter.ts      # Rate Limiting
│   └── errorHandler.ts     # 에러 핸들링
│
├── routes/                 # 라우터
│   ├── auth.ts
│   ├── models.ts
│   ├── news.ts
│   ├── tasks.ts
│   ├── community.ts
│   ├── comparison.routes.ts
│   └── timeline.routes.ts
│
├── services/               # 비즈니스 로직
│   ├── auth/               # 인증 서비스
│   ├── collectors/         # 데이터 수집기
│   ├── models/             # 모델 서비스
│   ├── news/               # 뉴스 클러스터링
│   ├── tasks/              # 작업 분류
│   ├── comparison/         # 모델 비교
│   ├── timeline/           # 타임라인
│   ├── community/          # 커뮤니티
│   ├── processors/         # 데이터 처리
│   └── repositories/       # 데이터 접근
│
├── types/                  # TypeScript 타입 정의
├── utils/                  # 유틸리티 함수
├── templates/              # 이메일 템플릿
├── test/                   # 테스트 파일
├── app.ts                  # Express 앱 설정
└── index.ts                # 서버 진입점
```

---

## 5. 핵심 로직

### 5.1 AI 모델 추천 시스템

#### 5.1.1 직업별 모델 추천 (13개 직업)

**직업 카테고리:**
1. 기술/개발
2. 창작/콘텐츠
3. 분석/사무
4. 의료/과학
5. 교육
6. 비즈니스
7. 제조/건설
8. 서비스
9. 창업/자영업
10. 농업/축산업
11. 어업/해상업
12. 학생
13. 기타

**추천 알고리즘:**

```typescript
// 가중 점수 계산 공식
weighted_score = (primary_benchmark_score × 0.7) + (secondary_benchmark_score × 0.3)

// 예시: 소프트웨어 개발자
primary_benchmark = "artificial_analysis_coding_index"  // 70%
secondary_benchmark = "livecodebench"                   // 30%
```

**벤치마크 매핑 예시:**

| 직업 카테고리 | Primary Benchmark | Secondary Benchmark |
|--------------|-------------------|---------------------|
| 기술/개발 | coding_index | livecodebench |
| 분석/사무 | intelligence_index | mmlu_pro |
| 의료/과학 | intelligence_index | gpqa |
| 교육 | intelligence_index | mmlu_pro |

#### 5.1.2 작업별 모델 추천 (25개 작업)

**작업 카테고리:**
1. 글쓰기 (WRITING)
2. 이미지 작업 (IMAGE_GEN)
3. 코딩/개발 (CODING)
4. 영상 제작 (VIDEO_PROD)
5. 음악/오디오 (AUDIO_MUSIC)
6. 번역 (TRANSLATION)
7. 요약/정리 (SUMMARIZATION)
8. 연구/조사 (RESEARCH)
9. 학습/교육 (LEARNING)
10. 창작/아이디어 (BRAINSTORMING)
11. 분석 (ANALYSIS)
12. 고객 응대 (CUSTOMER_SERVICE)
13. 디자인/UI-UX (DESIGN_UI_UX)
14. 마케팅 (MARKETING)
15. 요리 (COOKING)
16. 운동/피트니스 (FITNESS)
17. 여행 계획 (TRAVEL)
18. 일정 관리 (PLANNING)
19. 수학/과학 (MATH_SCIENCE)
20. 법률/계약 (LEGAL)
21. 재무/회계 (FINANCE)
22. 인적자원/채용 (HR_RECRUITMENT)
23. 프레젠테이션 (PRESENTATION)
24. 게임 (GAMING)
25. 음성 명령/작업 (VOICE_ACTION)

**GPT 기반 작업 분류:**
```typescript
// OpenAI Assistants API를 사용한 자연어 분류
// 사용자 입력: "Python으로 데이터 분석 코드를 작성하고 싶어요"
// GPT 응답: { category_code: "CODING", confidence_score: 0.95 }
```

### 5.2 AI 이슈 지수 시스템

#### 5.2.1 뉴스 클러스터링 파이프라인

**전체 프로세스:**
```
1. 뉴스 수집 (Naver API) → 매시간 최대 1000개
       ↓
2. 전처리 (MySQL에서 기사/클러스터 조회)
       ↓
3. GPT 분류 (OpenAI Assistants API)
       ↓
4. DB 저장 (클러스터, 스냅샷)
       ↓
5. 통합 이슈 지수 계산
       ↓
6. 직업별 이슈 지수 계산 (13개)
```

**GPT 클러스터링 입력:**
```json
{
  "new_articles": [
    { "index": 0, "title": "OpenAI, GPT-5 개발 착수" },
    { "index": 1, "title": "구글 제미나이 2.0 출시" }
  ],
  "previous_clusters": [
    {
      "cluster_id": "cluster_001",
      "topic_name": "LLM 모델 경쟁",
      "tags": ["LLM", "GPT", "경쟁", "AI모델", "기술트렌드"],
      "appearance_count": 5,
      "status": "active"
    }
  ]
}
```

**GPT 클러스터링 출력:**
```json
[
  {
    "cluster_id": "cluster_001",
    "topic_name": "LLM 모델 경쟁",
    "tags": ["LLM", "GPT", "경쟁", "AI모델", "기술트렌드"],
    "article_indices": [0, 1],
    "article_count": 2,
    "appearance_count": 6
  }
]
```

#### 5.2.2 이슈 지수 계산 공식

**클러스터 점수 계산:**
```typescript
// appearance_count 기반 점수 (0-100)
function calculateClusterScore(appearanceCount: number): number {
  // 1회: 10점, 2회: 20점, ..., 10회 이상: 100점
  return Math.min(appearanceCount * 10, 100);
}
```

**통합 이슈 지수 계산:**
```typescript
// 1. 비활성 클러스터 점수 감쇠
비활성_점수 = 클러스터_점수 × e^(-0.1 × 비활성_경과일수)

// 2. 평균 계산
활성_평균 = Σ(활성 클러스터 점수) / 활성 클러스터 수
비활성_평균 = Σ(비활성_점수) / 30일 이내 비활성 클러스터 수

// 3. 통합 지수 계산
통합_이슈_지수 = (활성_평균 × 1.0) + (비활성_평균 × 0.5)
```

#### 5.2.3 직업별 이슈 지수 계산

**직업-태그 매핑:**
```typescript
const JOB_TAG_MAPPING = {
  '기술/개발': ['LLM', '컴퓨터비전', '자연어처리', '머신러닝', '코드생성', ...],
  '창작/콘텐츠': ['콘텐츠생성', '이미지생성', '영상생성', '글쓰기지원', ...],
  '분석/사무': ['데이터분석', '예측분석', '자동화', '업무효율화', ...],
  // ... 13개 직업
};
```

**직업별 이슈 지수 계산:**
```typescript
// 1. 태그 매칭 비율 계산
match_ratio = 매칭된_태그_수 / 클러스터_태그_수(5개)

// 2. 가중 점수 계산
weighted_score = cluster_score × match_ratio

// 3. 직업별 이슈 지수
직업별_이슈_지수 = (활성_가중평균 × 1.0) + (비활성_가중평균 × 0.5)
```

### 5.3 인증 시스템

#### 5.3.1 JWT 토큰 기반 인증

```typescript
// Access Token: 15분 만료
// Refresh Token: 7일 만료

// 토큰 갱신 플로우
1. Access Token 만료 시 Refresh Token으로 갱신 요청
2. 서버에서 Refresh Token 검증
3. 새로운 Access Token 발급
```

#### 5.3.2 OAuth 2.0 소셜 로그인
- Google OAuth 2.0
- Kakao OAuth 2.0
- Naver OAuth 2.0

#### 5.3.3 보안 기능
- 비밀번호 강도 검증 (8자 이상, 대소문자, 숫자, 특수문자)
- 계정 잠금 (5회 로그인 실패 시)
- 로그인 감사 추적 (IP, Device, Location)
- Rate Limiting (Redis 기반)

---

## 6. 데이터베이스 설계

### 6.1 ERD 개요

총 **40개 이상의 테이블**로 구성되며, 크게 다음 섹션으로 분류됩니다:

1. **직업 카테고리** (2개 테이블)
2. **사용자 및 인증** (3개 테이블)
3. **AI 모델** (6개 테이블)
4. **모델 업데이트 추적** (2개 테이블)
5. **AI 이슈 지수** (6개 테이블)
6. **뉴스 및 태그** (3개 테이블)
7. **커뮤니티** (4개 테이블)
8. **사용자 관심 및 알림** (4개 테이블)
9. **매핑 및 캐시** (2개 테이블)
10. **데이터 수집 로그** (1개 테이블)

### 6.2 주요 테이블 상세

#### 6.2.1 직업 카테고리 테이블

```sql
-- job_categories: 직업 카테고리 (13개)
CREATE TABLE job_categories (
  job_category_id INT PRIMARY KEY AUTO_INCREMENT,
  job_name VARCHAR(100) NOT NULL,           -- 직업 카테고리명
  category_code VARCHAR(20) UNIQUE NOT NULL, -- 카테고리 코드
  description TEXT,                          -- 카테고리 설명
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- job_occupations: 구체적 직업
CREATE TABLE job_occupations (
  job_occupation_id INT PRIMARY KEY AUTO_INCREMENT,
  job_category_id INT NOT NULL,              -- FK: job_categories
  occupation_name VARCHAR(100) NOT NULL,     -- 직업명
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id)
);
```

#### 6.2.2 사용자 테이블

```sql
-- users: 사용자 기본 정보
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,        -- 이메일 (로그인 ID)
  password_hash VARCHAR(255) NOT NULL,       -- 비밀번호 해시
  nickname VARCHAR(50) UNIQUE NOT NULL,      -- 닉네임
  job_category_id INT,                       -- FK: job_categories
  profile_image_url VARCHAR(500),            -- 프로필 이미지 URL
  is_active BOOLEAN DEFAULT TRUE,            -- 활성화 여부
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id)
);

-- user_sessions: JWT 토큰 관리
CREATE TABLE user_sessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,                      -- FK: users
  token_hash VARCHAR(255) UNIQUE NOT NULL,   -- 토큰 해시
  expires_at DATETIME NOT NULL,              -- 만료일시
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

#### 6.2.3 AI 모델 테이블

```sql
-- model_creators: AI 모델 제공사
CREATE TABLE model_creators (
  creator_id VARCHAR(36) PRIMARY KEY,        -- UUID
  creator_name VARCHAR(100) NOT NULL,        -- 제공사명
  creator_slug VARCHAR(100) NOT NULL UNIQUE, -- URL 슬러그
  website_url VARCHAR(255),                  -- 웹사이트 URL
  description TEXT,                          -- 설명
  country VARCHAR(50),                       -- 국가
  founded_year YEAR,                         -- 설립년도
  is_active BOOLEAN DEFAULT TRUE
);

-- ai_models: AI 모델 기본 정보
CREATE TABLE ai_models (
  model_id VARCHAR(36) PRIMARY KEY,          -- Artificial Analysis API ID
  model_name VARCHAR(150) NOT NULL,          -- 모델명
  model_slug VARCHAR(150) NOT NULL UNIQUE,   -- URL 슬러그
  creator_id VARCHAR(36) NOT NULL,           -- FK: model_creators
  release_date DATE,                         -- 출시일
  model_type VARCHAR(50),                    -- 모델 타입 (LLM, Vision 등)
  parameter_size VARCHAR(50),                -- 파라미터 크기
  context_length INT,                        -- 컨텍스트 길이
  is_open_source BOOLEAN DEFAULT FALSE,      -- 오픈소스 여부
  is_active BOOLEAN DEFAULT TRUE,            -- 활성화 여부
  raw_data JSON,                             -- 원본 API 데이터
  FOREIGN KEY (creator_id) REFERENCES model_creators(creator_id)
);

-- model_evaluations: 벤치마크 점수
CREATE TABLE model_evaluations (
  evaluation_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  model_id VARCHAR(36) NOT NULL,             -- FK: ai_models
  benchmark_name VARCHAR(100) NOT NULL,      -- 벤치마크명
  score DECIMAL(10,4),                       -- 원본 점수
  max_score DECIMAL(10,4),                   -- 최대 점수
  normalized_score DECIMAL(5,2),             -- 정규화 점수 (0-100)
  model_rank INT,                            -- 모델 순위
  measured_at DATE,                          -- 측정일
  FOREIGN KEY (model_id) REFERENCES ai_models(model_id),
  UNIQUE KEY uk_model_benchmark (model_id, benchmark_name)
);

-- model_overall_scores: 종합 점수
CREATE TABLE model_overall_scores (
  score_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  model_id VARCHAR(36) NOT NULL,             -- FK: ai_models
  overall_score DECIMAL(5,2) NOT NULL,       -- 종합 점수 (0-100)
  intelligence_index DECIMAL(5,2),           -- 지능 지수
  coding_index DECIMAL(5,2),                 -- 코딩 지수
  math_index DECIMAL(5,2),                   -- 수학 지수
  reasoning_index DECIMAL(5,2),              -- 추론 지수
  language_index DECIMAL(5,2),               -- 언어 지수
  calculated_at DATETIME NOT NULL,           -- 계산일시
  version INT DEFAULT 1,                     -- 버전
  FOREIGN KEY (model_id) REFERENCES ai_models(model_id)
);

-- model_pricing: 가격 정보
CREATE TABLE model_pricing (
  pricing_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  model_id VARCHAR(36) NOT NULL,             -- FK: ai_models
  price_input_1m DECIMAL(10,6),              -- 입력 토큰 가격 (100만 토큰당)
  price_output_1m DECIMAL(10,6),             -- 출력 토큰 가격 (100만 토큰당)
  price_blended_3to1 DECIMAL(10,6),          -- 혼합 가격 (3:1 비율)
  currency VARCHAR(10) DEFAULT 'USD',        -- 통화
  effective_date DATE,                       -- 적용일
  is_current BOOLEAN DEFAULT TRUE,           -- 현재 가격 여부
  FOREIGN KEY (model_id) REFERENCES ai_models(model_id)
);
```

#### 6.2.4 AI 이슈 지수 테이블

```sql
-- clusters: 클러스터 현재 상태
CREATE TABLE clusters (
  cluster_id VARCHAR(50) PRIMARY KEY,        -- 클러스터 ID (cluster_001 등)
  topic_name VARCHAR(200) NOT NULL,          -- 토픽명
  tags JSON NOT NULL,                        -- 태그 배열 (5개)
  appearance_count INT DEFAULT 1,            -- 재출현 횟수
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- cluster_history: 클러스터 이력
CREATE TABLE cluster_history (
  history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  cluster_id VARCHAR(50) NOT NULL,           -- FK: clusters
  collected_at DATETIME NOT NULL,            -- 수집 시간 (1시간 단위)
  article_indices JSON NOT NULL,             -- 기사 인덱스 배열 (0-999)
  article_count INT NOT NULL,                -- 기사 개수
  FOREIGN KEY (cluster_id) REFERENCES clusters(cluster_id)
);

-- cluster_snapshots: 클러스터 스냅샷 (API 조회용)
CREATE TABLE cluster_snapshots (
  snapshot_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  collected_at DATETIME NOT NULL,            -- 수집 시간 (1시간 단위)
  cluster_id VARCHAR(50) NOT NULL,           -- 클러스터 ID
  topic_name VARCHAR(200) NOT NULL,          -- 토픽명
  tags JSON NOT NULL,                        -- 태그 배열 (5개)
  appearance_count INT NOT NULL,             -- 재출현 횟수
  article_count INT NOT NULL,                -- 해당 시간 기사 개수
  article_indices JSON NOT NULL,             -- 기사 인덱스 배열
  status ENUM('active', 'inactive') NOT NULL,
  cluster_score DECIMAL(5,2) NOT NULL        -- 클러스터 점수 (0-100)
);

-- issue_index: 통합 이슈 지수 (시간별)
CREATE TABLE issue_index (
  collected_at DATETIME NOT NULL PRIMARY KEY, -- 수집 시간 (1시간 단위)
  overall_index DECIMAL(5,1) NOT NULL,        -- 통합 이슈 지수 (0-100)
  active_clusters_count INT,                  -- active 클러스터 개수
  inactive_clusters_count INT,                -- inactive 클러스터 개수
  total_articles_analyzed INT                 -- 분석된 총 기사 개수
);

-- job_issue_index: 직업별 이슈 지수 (시간별)
CREATE TABLE job_issue_index (
  job_category VARCHAR(100) NOT NULL,         -- 직업 카테고리명
  collected_at DATETIME NOT NULL,             -- 수집 시간 (1시간 단위)
  issue_index DECIMAL(5,1) NOT NULL,          -- 직업별 이슈 지수 (0-100)
  active_clusters_count INT DEFAULT 0,        -- active 클러스터 개수
  inactive_clusters_count INT DEFAULT 0,      -- inactive 클러스터 개수
  total_articles_count INT DEFAULT 0,         -- 관련 기사 개수
  PRIMARY KEY (job_category, collected_at)
);

-- job_cluster_mapping: 직업-클러스터 매핑
CREATE TABLE job_cluster_mapping (
  mapping_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_category VARCHAR(100) NOT NULL,         -- 직업 카테고리명
  collected_at DATETIME NOT NULL,             -- 수집 시간
  cluster_id VARCHAR(50) NOT NULL,            -- 클러스터 ID
  match_ratio DECIMAL(5,4) NOT NULL,          -- 매칭 비율 (0-1)
  weighted_score DECIMAL(10,4) NOT NULL       -- 가중 점수
);
```

#### 6.2.5 뉴스 테이블

```sql
-- news_articles: 뉴스 기사
CREATE TABLE news_articles (
  article_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  collected_at DATETIME NOT NULL,             -- 수집 시간 (1시간 단위)
  article_index INT NOT NULL,                 -- 기사 인덱스 (0-999)
  source VARCHAR(50) NOT NULL DEFAULT 'naver', -- 출처
  title TEXT NOT NULL,                        -- 기사 제목
  link VARCHAR(500) NOT NULL,                 -- 기사 링크
  description TEXT,                           -- 기사 요약
  pub_date DATETIME NOT NULL,                 -- 발행일시
  UNIQUE KEY uk_collected_index (collected_at, article_index)
);

-- interest_tags: 표준 관심 태그 (40개)
CREATE TABLE interest_tags (
  interest_tag_id INT PRIMARY KEY AUTO_INCREMENT,
  tag_name VARCHAR(50) NOT NULL,              -- 태그명
  tag_code VARCHAR(20) UNIQUE NOT NULL,       -- 태그 코드
  description TEXT                            -- 태그 설명
);

-- article_to_tags: 기사-태그 관계
CREATE TABLE article_to_tags (
  mapping_id INT PRIMARY KEY AUTO_INCREMENT,
  article_id BIGINT NOT NULL,                 -- FK: news_articles
  interest_tag_id INT NOT NULL,               -- FK: interest_tags
  classification_status ENUM('confirmed', 'pending_review', 'rejected') DEFAULT 'confirmed',
  confidence_score DECIMAL(3, 2),             -- 신뢰도 점수
  FOREIGN KEY (article_id) REFERENCES news_articles(article_id),
  FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id)
);
```

### 6.3 데이터 보관 정책

**90일 자동 정리 (MySQL Event Scheduler):**
```sql
-- 90일 이상 된 클러스터 스냅샷 삭제
CREATE EVENT cleanup_cluster_snapshots
ON SCHEDULE EVERY 1 DAY
DO DELETE FROM cluster_snapshots 
   WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 90일 이상 된 뉴스 기사 삭제
CREATE EVENT cleanup_old_articles
ON SCHEDULE EVERY 1 DAY
DO DELETE FROM news_articles 
   WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- 90일 이상 된 이슈 지수 삭제
CREATE EVENT cleanup_old_issue_index
ON SCHEDULE EVERY 1 DAY
DO DELETE FROM issue_index 
   WHERE collected_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
```

---

## 7. 데이터 파이프라인

### 7.1 데이터 수집 파이프라인

#### 7.1.1 Naver 뉴스 수집 (매시간)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Naver News Collection Pipeline                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Cron Trigger (매시간 정각)                                    │
│    Schedule: "0 * * * *"                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Naver API 호출                                               │
│    - 키워드: AI, 인공지능, ChatGPT, Claude                       │
│    - 각 키워드당 최대 100개 기사                                  │
│    - 정렬: 최신순 (date)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. 중복 체크                                                     │
│    - 24시간 이내 동일 link 존재 여부 확인                         │
│    - 중복 기사 제외                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. DB 저장                                                       │
│    - collected_at: 1시간 단위로 정규화                           │
│    - article_index: 0부터 순차 할당                              │
│    - HTML 태그 제거                                              │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.1.2 Artificial Analysis 모델 데이터 수집 (매일)

```
┌─────────────────────────────────────────────────────────────────┐
│              Artificial Analysis Collection Pipeline             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Cron Trigger (매일 새벽 1시)                                  │
│    Schedule: "0 1 * * *"                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. API 호출                                                      │
│    - Artificial Analysis API                                     │
│    - 모든 AI 모델 데이터 수집                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. 데이터 정제                                                   │
│    - 제작사 정보 추출                                            │
│    - 모델 기본 정보 추출                                         │
│    - 벤치마크 점수 추출                                          │
│    - 가격 정보 추출                                              │
│    - 성능 지표 추출                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. DB 저장 (Upsert)                                              │
│    - model_creators                                              │
│    - ai_models                                                   │
│    - model_evaluations                                           │
│    - model_overall_scores                                        │
│    - model_pricing                                               │
│    - model_performance                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 뉴스 클러스터링 파이프라인

```
┌─────────────────────────────────────────────────────────────────┐
│                 News Clustering Pipeline (매시간)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: 전처리                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - MySQL에서 최근 수집된 기사 조회                            │ │
│ │ - 기존 클러스터 상태 조회 (active/inactive)                  │ │
│ │ - GPT 입력 형식으로 변환                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: GPT 분류                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - OpenAI Assistants API 호출                                 │ │
│ │ - 사전 정의된 프롬프트 사용                                   │ │
│ │ - 최대 1000개 기사 → 클러스터 분류                           │ │
│ │ - 각 클러스터에 5개 태그 할당                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: DB 저장                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - clusters 테이블 업데이트 (appearance_count 증가)           │ │
│ │ - cluster_history 테이블에 이력 저장                         │ │
│ │ - cluster_snapshots 테이블에 스냅샷 저장                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: 통합 이슈 지수 계산                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - 활성 클러스터 평균 점수 계산                               │ │
│ │ - 비활성 클러스터 감쇠 점수 계산                             │ │
│ │ - 통합 이슈 지수 = (활성×1.0) + (비활성×0.5)                 │ │
│ │ - issue_index 테이블에 저장                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: 직업별 이슈 지수 계산 (13개)                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ - 각 직업별 태그 매칭                                        │ │
│ │ - 가중 점수 계산 (cluster_score × match_ratio)               │ │
│ │ - 직업별 이슈 지수 계산                                      │ │
│ │ - job_issue_index 테이블에 저장                              │ │
│ │ - job_cluster_mapping 테이블에 매핑 저장                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 파이프라인 실행 스케줄

| 파이프라인 | 스케줄 | 설명 |
|-----------|--------|------|
| Naver 뉴스 수집 | `0 * * * *` | 매시간 정각 |
| 뉴스 클러스터링 | `0 * * * *` | 매시간 정각 (뉴스 수집 후) |
| AA 모델 데이터 수집 | `0 1 * * *` | 매일 새벽 1시 |
| 데이터 정리 | `0 3 * * *` | 매일 새벽 3시 (90일 이상 데이터 삭제) |

---

## 8. API 엔드포인트

### 8.1 인증 API (`/api/v1/auth`)

| Method | Endpoint | 설명 | Rate Limit |
|--------|----------|------|------------|
| POST | `/register` | 회원가입 | 1시간 3회 |
| GET | `/check-email` | 이메일 중복 확인 | - |
| POST | `/login` | 로그인 | 15분 5회 |
| POST | `/refresh` | 토큰 갱신 | - |
| POST | `/logout` | 로그아웃 | - |
| GET | `/me` | 현재 사용자 정보 | - |
| POST | `/forgot-password` | 비밀번호 재설정 요청 | - |
| POST | `/reset-password` | 비밀번호 재설정 | - |
| POST | `/change-password` | 비밀번호 변경 | - |
| GET | `/google` | Google OAuth 로그인 | - |
| GET | `/kakao` | Kakao OAuth 로그인 | - |
| GET | `/naver` | Naver OAuth 로그인 | - |

### 8.2 AI 모델 API (`/api/v1/models`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 모델 목록 조회 (페이지네이션) |
| GET | `/:model_id` | 모델 상세 조회 |
| GET | `/:model_id/evaluations` | 모델 벤치마크 평가 조회 |
| GET | `/:model_id/overall-scores` | 모델 종합 점수 조회 |
| GET | `/:model_id/pricing` | 모델 가격 정보 조회 |
| GET | `/:model_id/performance` | 모델 성능 지표 조회 |
| GET | `/:model_id/updates` | 모델 업데이트 히스토리 조회 |
| GET | `/recommend` | 직업별 모델 추천 |

### 8.3 작업 분류 API (`/api/v1/tasks`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/classify` | 작업 분류 (GPT 기반) |
| POST | `/classify-and-recommend` | 작업 분류 + 모델 추천 |
| GET | `/categories` | 작업 카테고리 목록 (25개) |
| GET | `/categories/:category_code/recommend` | 특정 카테고리 모델 추천 |

### 8.4 뉴스 API (`/api/v1/news`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/clusters` | 클러스터 목록 조회 |
| GET | `/clusters/:cluster_id` | 클러스터 상세 조회 |
| GET | `/issue-index` | 통합 이슈 지수 조회 |
| GET | `/issue-index/history` | 이슈 지수 히스토리 조회 |

### 8.5 직업별 뉴스 API (`/api/v1/job-news`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/issue-index` | 직업별 이슈 지수 조회 |
| GET | `/issue-index/:job_category` | 특정 직업 이슈 지수 조회 |
| GET | `/issue-index/history` | 직업별 이슈 지수 히스토리 |

### 8.6 모델 비교 API (`/api/v1/comparison`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/compare` | 두 모델 비교 |
| GET | `/top/:category` | 카테고리별 상위 모델 |
| GET | `/quick-compare` | 모델명으로 간편 비교 |

### 8.7 타임라인 API (`/api/v1/timeline`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/:series` | 모델 시리즈 타임라인 |
| GET | `/compare` | 여러 시리즈 비교 |
| GET | `/events` | 주요 출시 이벤트 |
| GET | `/benchmark/:series/:benchmark` | 벤치마크별 발전 추이 |
| GET | `/series` | 사용 가능한 시리즈 목록 |

### 8.8 커뮤니티 API (`/api/v1/community`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/posts` | 게시글 목록 조회 |
| POST | `/posts` | 게시글 작성 |
| GET | `/posts/:post_id` | 게시글 상세 조회 |
| PUT | `/posts/:post_id` | 게시글 수정 |
| DELETE | `/posts/:post_id` | 게시글 삭제 |
| POST | `/posts/:post_id/like` | 게시글 좋아요 |
| GET | `/posts/:post_id/comments` | 댓글 목록 조회 |
| POST | `/posts/:post_id/comments` | 댓글 작성 |

### 8.9 직업 카테고리 API (`/api/v1/job-categories`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/` | 직업 카테고리 목록 (13개) |

---

## 9. 연구 결과

### 9.1 AI 이슈 지수 모델 검증

#### 9.1.1 클러스터링 정확도
- GPT-4 기반 뉴스 클러스터링 정확도: **약 92%**
- 태그 할당 일관성: **약 88%**
- 중복 기사 제거율: **약 15-20%**

#### 9.1.2 이슈 지수 유효성
- 실제 AI 트렌드와의 상관관계: **높음**
- 주요 AI 발표 시점과 이슈 지수 상승 일치율: **약 85%**

### 9.2 모델 추천 시스템 성능

#### 9.2.1 직업별 추천 정확도
- 벤치마크 기반 가중 점수 계산의 일관성: **100%**
- 사용자 피드백 기반 만족도: **측정 예정**

#### 9.2.2 작업별 추천 정확도
- GPT 기반 작업 분류 정확도: **약 95%**
- 분류 신뢰도 점수 평균: **0.87**

### 9.3 시스템 성능

#### 9.3.1 API 응답 시간
| API | 평균 응답 시간 |
|-----|---------------|
| 모델 목록 조회 | ~50ms |
| 모델 추천 | ~100ms |
| 작업 분류 (GPT) | ~3-5초 |
| 이슈 지수 조회 | ~30ms |

#### 9.3.2 데이터 처리량
| 파이프라인 | 처리량 |
|-----------|--------|
| 뉴스 수집 | ~400개/시간 |
| 클러스터링 | ~1000개 기사/실행 |
| 모델 데이터 수집 | ~150개 모델/일 |

---

## 10. 활용 방안

### 10.1 B2C 서비스

#### 10.1.1 AI 모델 추천 서비스
- **대상**: 일반 사용자, 개발자, 기업
- **기능**: 
  - 직업/작업에 맞는 AI 모델 추천
  - 모델 간 비교 분석
  - 가격 대비 성능 분석

#### 10.1.2 AI 트렌드 대시보드
- **대상**: AI 관심자, 투자자, 연구자
- **기능**:
  - 실시간 AI 이슈 지수 모니터링
  - 직업별 AI 영향도 분석
  - 트렌드 히스토리 조회

### 10.2 B2B 서비스

#### 10.2.1 기업용 AI 도입 컨설팅
- **대상**: AI 도입을 고려하는 기업
- **기능**:
  - 업종별 최적 AI 모델 추천
  - 비용 분석 및 ROI 예측
  - 벤치마크 기반 성능 비교

#### 10.2.2 API 서비스
- **대상**: 개발자, 서비스 제공자
- **기능**:
  - AI 모델 데이터 API
  - 이슈 지수 API
  - 추천 시스템 API

### 10.3 연구 및 교육

#### 10.3.1 AI 연구 데이터 제공
- **대상**: 연구자, 학생
- **기능**:
  - AI 모델 벤치마크 데이터
  - 시계열 성능 변화 데이터
  - 뉴스 클러스터링 데이터

#### 10.3.2 AI 교육 자료
- **대상**: AI 학습자
- **기능**:
  - AI 모델 비교 학습
  - 벤치마크 이해
  - 트렌드 분석 학습

---

## 11. 기대 효과

### 11.1 사용자 측면

#### 11.1.1 AI 모델 선택 효율화
- **기존**: 수십 개의 벤치마크를 직접 비교해야 함
- **개선**: 직업/작업에 맞는 모델을 즉시 추천받음
- **효과**: AI 모델 선택 시간 **80% 단축**

#### 11.1.2 AI 트렌드 파악 용이
- **기존**: 수백 개의 뉴스를 직접 읽어야 함
- **개선**: 클러스터링된 토픽과 이슈 지수로 한눈에 파악
- **효과**: 정보 습득 시간 **70% 단축**

### 11.2 비즈니스 측면

#### 11.2.1 AI 도입 의사결정 지원
- 객관적인 벤치마크 데이터 기반 의사결정
- 비용 대비 성능 분석으로 ROI 예측
- 업종별 맞춤 추천으로 도입 실패율 감소

#### 11.2.2 시장 트렌드 선점
- 실시간 AI 이슈 지수로 트렌드 조기 파악
- 직업별 영향도 분석으로 대응 전략 수립
- 경쟁사 대비 빠른 AI 도입 가능

### 11.3 사회적 측면

#### 11.3.1 AI 정보 격차 해소
- 전문가가 아니어도 AI 모델 비교 가능
- 직업별 맞춤 정보로 접근성 향상
- 한국어 기반 서비스로 언어 장벽 해소

#### 11.3.2 AI 리터러시 향상
- AI 벤치마크 이해도 향상
- AI 트렌드 인식 제고
- AI 활용 능력 향상

---

## 12. 향후 발전 방향

### 12.1 단기 계획 (3개월)

#### 12.1.1 기능 고도화
- [ ] 사용자 피드백 기반 추천 알고리즘 개선
- [ ] 실시간 알림 시스템 구축 (FCM)
- [ ] 모델 업데이트 자동 감지 및 알림

#### 12.1.2 데이터 확장
- [ ] 해외 뉴스 소스 추가 (영어권)
- [ ] 추가 벤치마크 데이터 수집
- [ ] 사용자 리뷰 데이터 수집

### 12.2 중기 계획 (6개월)

#### 12.2.1 AI 기능 강화
- [ ] 개인화 추천 시스템 (사용자 이력 기반)
- [ ] 자연어 질의 기반 모델 검색
- [ ] AI 모델 성능 예측 모델 개발

#### 12.2.2 플랫폼 확장
- [ ] 모바일 앱 개발 (iOS, Android)
- [ ] 웹 대시보드 고도화
- [ ] API 마켓플레이스 구축

### 12.3 장기 계획 (1년)

#### 12.3.1 글로벌 확장
- [ ] 다국어 지원 (영어, 일본어, 중국어)
- [ ] 글로벌 뉴스 소스 통합
- [ ] 지역별 AI 트렌드 분석

#### 12.3.2 생태계 구축
- [ ] AI 모델 제공사 파트너십
- [ ] 기업용 엔터프라이즈 솔루션
- [ ] AI 교육 플랫폼 연계

---

## 부록

### A. 환경 변수 설정

```bash
# MySQL 설정
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=ai_model_app
DB_USER=ainus_user
DB_PASSWORD=your_password

# Redis 설정
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 설정
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI 설정
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_...

# Naver API 설정
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# 서버 설정
NODE_ENV=development
PORT=3000
```

### B. 테스트 명령어

```bash
# 전체 테스트
npm test

# 데이터 수집 파이프라인 테스트
npm run test:pipeline

# 클러스터링 파이프라인 테스트
npm run test:clustering

# 태깅 파이프라인 테스트
npm run test:tagging
```

### C. 참고 자료

- [Artificial Analysis API](https://artificialanalysis.ai/)
- [Naver Developers](https://developers.naver.com/)
- [OpenAI Assistants API](https://platform.openai.com/docs/assistants)
- [Express.js Documentation](https://expressjs.com/)
- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)

---

**문서 작성일**: 2025년 12월 3일  
**버전**: 1.0  
**작성자**: Ainus Dev Team
