# 🤖 AI Agent 지시 문서: Ainus 서버 개발 계획서

**버전:** 1.0  
**작성일:** 2025-11-09  
**대상:** AI Agent, 백엔드 개발팀  
**목적:** 9개 기능의 통합 백엔드 개발 작업 정의 및 추적  
**예상 기간:** 8주

---

## 📋 목차

1. [개요 및 아키텍처](#1-개요-및-아키텍처)
2. [데이터베이스 테이블 설계](#2-데이터베이스-테이블-설계)
3. [기능별 데이터 파이프라인](#3-기능별-데이터-파이프라인)
4. [API 엔드포인트 설계](#4-api-엔드포인트-설계)
5. [백엔드 개발 태스크](#5-백엔드-개발-태스크-체크리스트)
6. [기능별 프로세스 플로우](#6-기능별-프로세스-플로우)
7. [기능 간 연동 설계](#7-기능-간-연동-설계)
8. [배포 및 검증](#8-배포-및-검증)

---

## 1. 개요 및 아키텍처

### 1.1 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│                   React Native (프론트엔드)                    │
│            - 9개 기능의 UI/UX 구현                             │
└────────────────────────┬─────────────────────────────────────┘
                         │ (HTTP/REST API)
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                   Express.js Server (Node.js)                │
│  ┌─────────────┬─────────────┬─────────────┬──────────────┐  │
│  │ API Router  │  Auth Layer │Service Layer│ Error Handler│  │
│  │   (jwt)     │  (middleware)│ (business)  │  (logging)   │  │
│  └─────────────┴─────────────┴─────────────┴──────────────┘  │
│                         ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              Data Processing & Caching                  │  │
│  │  - 정규화 로직   - 캐싱   - 배치 작업   - 웹훅         │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
         │               │              │              │
         ↓               ↓              ↓              ↓
    ┌─────────┐    ┌──────────┐  ┌──────────┐  ┌────────────┐
    │  MySQL  │    │  Redis   │  │MongoDB   │  │Elasticsearch
    │정형 데이터 │  │캐싱/세션 │  │비정형    │  │검색/분석    │
    │         │    │실시간통계 │  │원문      │  │            │
    └─────────┘    └──────────┘  └──────────┘  └────────────┘
         │
         ↓
    ┌──────────────────────────────────────┐
    │          외부 API / 배치 작업          │
    │  - Artificial Analysis API           │
    │  - 뉴스 수집 API (Naver)              │
    │  - Google Trends API                 │
    │  - FCM (푸시 알림)                    │
    └──────────────────────────────────────┘
```

### 1.2 개발 팀 구성

| 역할 | 담당자 | 책임 범위 |
|------|-------|---------|
| **백엔드 팀장** | 최수안 | 전체 백엔드 조율, API 설계, 배포 |
| **백엔드 개발자 1** | 예병성 | 데이터 수집, DB 구축, 배치 작업 |
| **백엔드 개발자 2** | (예병성 보조) | API 구현, 캐싱, 테스트 |
| **프론트엔드 팀** | 박선우, 임성훈 | API 연동, UI 구현 |

### 1.3 기술 스택

```
언어: TypeScript (Node.js 18+)
프레임워크: Express.js 4.x
데이터베이스:
  - MySQL 8.0 (정형 데이터)
  - Redis 7.0 (캐싱/세션)
  - MongoDB 6.0 (비정형 데이터)
  - Elasticsearch 8.x (검색/분석)
인증: JWT (Bearer Token)
비동기 처리: Bull (job queue), Node-cron (스케줄)
로깅: Winston / Pino
테스트: Jest, Supertest
배포: Docker, PM2
모니터링: Prometheus + Grafana (선택)
```

---

## 2. 데이터베이스 테이블 설계

### 2.1 MySQL 테이블 (정형 데이터)

#### 🔹 사용자 및 인증

```sql
-- users: 사용자 기본 정보
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  job_category_id INT,
  profile_image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id)
);

-- user_profiles: 사용자 상세 정보
CREATE TABLE user_profiles (
  profile_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNIQUE NOT NULL,
  job_occupation_id INT,
  bio TEXT,
  preferences JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (job_occupation_id) REFERENCES job_occupations(job_occupation_id)
);

-- user_sessions: JWT 토큰 관리
CREATE TABLE user_sessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);
```

#### 🔹 AI 모델 정보

```sql
-- ai_models: 모델 기본 정보
CREATE TABLE ai_models (
  model_id INT PRIMARY KEY AUTO_INCREMENT,
  model_name VARCHAR(100) NOT NULL,
  series_name VARCHAR(50),
  developer VARCHAR(100),
  release_date DATE,
  overall_score DECIMAL(5, 2),
  performance_data_ref VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_model_name (model_name),
  INDEX idx_developer (developer)
);

-- model_benchmarks: 모델 벤치마크 데이터
CREATE TABLE model_benchmarks (
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
  INDEX idx_model_id (model_id),
  INDEX idx_collected_at (collected_at),
  UNIQUE KEY uk_model_benchmark (model_id, benchmark_name)
);

-- model_updates: 모델 업데이트 내역
CREATE TABLE model_updates (
  update_id INT PRIMARY KEY AUTO_INCREMENT,
  model_id INT NOT NULL,
  version_before VARCHAR(50),
  version_after VARCHAR(50),
  update_date DATE NOT NULL,
  summary TEXT,
  key_improvements JSON,
  performance_improvement DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
  INDEX idx_model_id (model_id),
  INDEX idx_update_date (update_date),
  UNIQUE KEY uk_model_version (model_id, version_after)
);

-- model_updates_details: 버전별 성능 상세 데이터
CREATE TABLE model_updates_details (
  detail_id INT PRIMARY KEY AUTO_INCREMENT,
  update_id INT NOT NULL,
  benchmark_name VARCHAR(100),
  before_score DECIMAL(8, 4),
  after_score DECIMAL(8, 4),
  improvement_pct DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (update_id) REFERENCES model_updates(update_id) ON DELETE CASCADE,
  INDEX idx_update_id (update_id)
);
```

#### 🔹 AI 이슈 지수

```sql
-- issue_index_daily: 전체 이슈 지수 (일별)
CREATE TABLE issue_index_daily (
  index_id INT PRIMARY KEY AUTO_INCREMENT,
  index_date DATE UNIQUE NOT NULL,
  score INT CHECK (score >= 0 AND score <= 100),
  comparison_previous_week DECIMAL(5, 2),
  main_keyword VARCHAR(100),
  trend VARCHAR(20),
  article_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_index_date (index_date)
);

-- issue_index_by_category: 카테고리별 이슈 지수
CREATE TABLE issue_index_by_category (
  category_index_id INT PRIMARY KEY AUTO_INCREMENT,
  index_date DATE NOT NULL,
  category_id INT NOT NULL,
  score INT CHECK (score >= 0 AND score <= 100),
  comparison_previous_week DECIMAL(5, 2),
  weight DECIMAL(3, 2),
  article_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES ai_categories(category_id),
  INDEX idx_date_category (index_date, category_id),
  UNIQUE KEY uk_date_category (index_date, category_id)
);

-- ai_categories: 관심사 카테고리
CREATE TABLE ai_categories (
  category_id INT PRIMARY KEY AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  weight DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- job_categories: 직업 카테고리 (13개)
CREATE TABLE job_categories (
  job_category_id INT PRIMARY KEY AUTO_INCREMENT,
  job_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- job_occupations: 구체적 직업 (선택사항)
CREATE TABLE job_occupations (
  job_occupation_id INT PRIMARY KEY AUTO_INCREMENT,
  job_category_id INT NOT NULL,
  occupation_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_category_id) REFERENCES job_categories(job_category_id)
);
```

#### 🔹 커뮤니티

```sql
-- community_posts: 게시글
CREATE TABLE community_posts (
  post_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- community_comments: 댓글
CREATE TABLE community_comments (
  comment_id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id),
  INDEX idx_user_id (user_id)
);

-- community_post_likes: 게시글 좋아요
CREATE TABLE community_post_likes (
  like_id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY uk_post_user (post_id, user_id),
  INDEX idx_user_id (user_id)
);

-- community_post_tags: 게시글 태그
CREATE TABLE community_post_tags (
  tag_id INT PRIMARY KEY AUTO_INCREMENT,
  post_id INT NOT NULL,
  interest_tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
  FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
  INDEX idx_post_id (post_id),
  INDEX idx_tag_id (interest_tag_id)
);
```

#### 🔹 뉴스 및 태그

```sql
-- news_articles: 뉴스 기사 메타데이터
CREATE TABLE news_articles (
  article_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(500) NOT NULL,
  url VARCHAR(500) UNIQUE NOT NULL,
  source VARCHAR(100),
  published_at DATETIME,
  collected_at DATETIME,
  summary TEXT,
  impact_score INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_source (source),
  INDEX idx_published_at (published_at),
  INDEX idx_impact_score (impact_score)
);

-- article_to_tags: 기사와 태그의 관계
CREATE TABLE article_to_tags (
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
);

-- interest_tags: 표준 관심 태그 (40개)
CREATE TABLE interest_tags (
  interest_tag_id INT PRIMARY KEY AUTO_INCREMENT,
  tag_name VARCHAR(50) NOT NULL,
  tag_code VARCHAR(20) UNIQUE NOT NULL,
  category_id INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES ai_categories(category_id),
  INDEX idx_tag_code (tag_code)
);
```

#### 🔹 관심 모델 및 알림

```sql
-- user_interested_models: 사용자의 관심 모델
CREATE TABLE user_interested_models (
  interested_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  model_id INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (model_id) REFERENCES ai_models(model_id) ON DELETE CASCADE,
  UNIQUE KEY uk_user_model (user_id, model_id),
  INDEX idx_user_id (user_id)
);

-- user_push_notifications: 푸시 알림 기록
CREATE TABLE user_push_notifications (
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
);

-- fcm_tokens: Firebase Cloud Messaging 토큰
CREATE TABLE fcm_tokens (
  token_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  fcm_token VARCHAR(500) NOT NULL,
  device_type VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);
```

#### 🔹 매핑 및 설정

```sql
-- job_occupation_to_tasks: 직업별 가중치 매핑
CREATE TABLE job_occupation_to_tasks (
  mapping_id INT PRIMARY KEY AUTO_INCREMENT,
  job_occupation_id INT NOT NULL,
  interest_tag_id INT NOT NULL,
  boost_weight DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_occupation_id) REFERENCES job_occupations(job_occupation_id),
  FOREIGN KEY (interest_tag_id) REFERENCES interest_tags(interest_tag_id),
  UNIQUE KEY uk_job_tag (job_occupation_id, interest_tag_id)
);

-- model_comparison_cache: 모델 비교 캐시
CREATE TABLE model_comparison_cache (
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
);
```

---

### 2.2 Redis 키 설계 (캐싱 및 실시간 데이터)

```
# 캐싱 (TTL: 1시간)
- model:{model_id}:scores        → 모델 점수 캐시
- model:comparison:{id1}:{id2}   → 모델 비교 결과
- issue:index:latest             → 최신 이슈 지수
- issue:index:by_category:{cat_id} → 카테고리별 이슈 지수

# 세션 (TTL: 30일)
- session:{user_id}              → 사용자 세션 데이터
- user:{user_id}:profile         → 사용자 프로필

# 실시간 통계 (TTL: 1일)
- post:trending:daily            → 트렌딩 게시글 (상위 10개)
- tag:popularity                 → 태그 인기도

# 레이트 리미팅 (TTL: 1분)
- ratelimit:{user_id}:{endpoint} → 사용자별 요청 횟수

# 작업 큐 (Bull - Job Queue)
- bull:collect:models            → 모델 데이터 수집 작업
- bull:collect:news              → 뉴스 수집 작업
- bull:classify:articles         → 기사 분류 작업
- bull:send:notifications        → 알림 발송 작업
```

---

### 2.3 MongoDB 컬렉션 (비정형 데이터)

```javascript
// model_performance_details: 모델 상세 성능 데이터
db.model_performance_details.insertOne({
  _id: ObjectId(),
  model_name: "GPT-4o",
  raw_json_from_api: { /* Artificial Analysis API 원본 */ },
  capabilities: {
    reasoning: 92,
    coding: 88,
    math: 85,
    // ... 기타 역량
  },
  benchmarks: [
    { name: "MMLU", score: 90.1 },
    { name: "HumanEval", score: 87.3 }
  ],
  last_updated: new Date()
});

// raw_news_articles: 뉴스 원문 아카이브
db.raw_news_articles.insertOne({
  _id: ObjectId(),
  title: "AI 안전성 논쟁 심화",
  original_url: "https://...",
  full_content: "기사 본문 전체...",
  source: "Naver News",
  published_at: new Date(),
  collected_at: new Date()
});

// google_trends_data: 구글 트렌드 데이터
db.google_trends_data.insertOne({
  _id: ObjectId(),
  keyword: "AI 일자리",
  time_series_data: [
    { date: "2025-11-01", value: 75 },
    { date: "2025-11-02", value: 78 },
    // ...
  ],
  collected_at: new Date()
});
```

---

### 2.4 Elasticsearch 인덱스

```json
{
  "index_name": "posts",
  "mappings": {
    "properties": {
      "post_id": { "type": "keyword" },
      "title": { 
        "type": "text",
        "analyzer": "nori"
      },
      "content": { 
        "type": "text",
        "analyzer": "nori"
      },
      "tags": { 
        "type": "keyword" 
      },
      "created_at": { 
        "type": "date" 
      },
      "likes_count": { 
        "type": "integer" 
      }
    }
  }
}

{
  "index_name": "news_articles",
  "mappings": {
    "properties": {
      "article_id": { "type": "keyword" },
      "title": { 
        "type": "text",
        "analyzer": "nori"
      },
      "summary": { 
        "type": "text",
        "analyzer": "nori"
      },
      "tags": { 
        "type": "keyword" 
      },
      "source": { 
        "type": "keyword" 
      },
      "impact_score": { 
        "type": "integer" 
      },
      "published_at": { 
        "type": "date" 
      }
    }
  }
}
```

---

## 3. 기능별 데이터 파이프라인

### 3.1 기능 #1: 타임라인 시각화 (모델 발전사)

```
┌─────────────────────────────────────────────────────────┐
│ 프론트엔드: 사용자가 "GPT" 시리즈 타임라인 조회 요청     │
└──────────────────┬──────────────────────────────────────┘
                   │ GET /api/v1/models/:modelId/timeline
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 백엔드 API Router: 요청 수신 및 검증                     │
│  - JWT 토큰 확인                                         │
│  - model_id 유효성 검사                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 캐시 레이어: Redis 조회                                  │
│  Key: model:{modelId}:timeline                          │
│  결과: 있음 → 응답 반환 (< 50ms)                         │
│       없음 → 다음 단계로                                 │
└──────────────────┬──────────────────────────────────────┘
                   │ 캐시 미스
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 데이터베이스 조회: MySQL                                 │
│  SELECT:                                                │
│   - ai_models (model_name, release_date, overall_score)│
│   - model_updates (버전별 업데이트 내역)                │
│   - model_benchmarks (벤치마크 스코어)                  │
│  WHERE: model_id = :modelId                            │
│  ORDER BY: update_date DESC                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 데이터 처리: 정규화 및 포맷팅                            │
│  1. 각 벤치마크 점수 정규화 (0-100)                     │
│  2. 종합 스코어 계산                                     │
│  3. 타임라인 데이터 구조화                               │
│  4. 날짜순 정렬                                          │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 캐싱: Redis에 결과 저장 (TTL: 1시간)                     │
│  SET model:{modelId}:timeline = <JSON>                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 응답 반환: 프론트엔드로 JSON 응답                        │
│  {                                                      │
│    "success": true,                                     │
│    "data": {                                            │
│      "model_id": 1,                                     │
│      "model_name": "GPT-4o",                            │
│      "timeline": [                                      │
│        {                                                │
│          "version": "4.0",                              │
│          "release_date": "2024-05-13",                  │
│          "scores": { "reasoning": 85, ... },           │
│          "improvements": [...]                          │
│        }                                                │
│      ]                                                  │
│    }                                                    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

**핵심 프로세스:**
```
외부 API (Artificial Analysis)
    ↓ (주 2-3회 배치 작업)
[데이터 수집 & 검증]
    ↓
[DB 저장: model_updates, model_benchmarks]
    ↓
[사용자 요청]
    ↓
[Redis 캐시 확인]
    ↓
[정규화 및 포맷팅]
    ↓
[응답 반환]
```

---

### 3.2 기능 #2: 모델 간단 비교

```
┌─────────────────────────────────────────────────────────┐
│ 프론트엔드: "GPT-4o vs Claude 3.5" 비교 요청             │
└──────────────────┬──────────────────────────────────────┘
                   │ GET /api/v1/models/compare?model_ids=1,2
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 백엔드: 요청 검증                                        │
│  - model_ids 형식: "1,2" (정확히 2개, 쉼표로 분리)      │
│  - 데이터 유효성 검사                                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 캐시 확인: Redis                                         │
│  Key: model:comparison:1:2                              │
│  TTL: 1시간                                              │
└──────────────────┬──────────────────────────────────────┘
                   │ 캐시 미스
                   ↓
┌─────────────────────────────────────────────────────────┐
│ DB 조회: 두 모델의 정규화된 스코어 조회                  │
│  SELECT:                                                │
│   - model_benchmarks (정규화된 스코어)                  │
│   - ai_models (기본 정보)                               │
│  WHERE: model_id IN (1, 2)                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 데이터 처리: 비교 데이터 생성                            │
│  1. 각 벤치마크별 스코어 추출                            │
│  2. 차이값 계산 (절대값 + 백분율)                       │
│  3. 강점/약점 분류                                       │
│  4. 가독성 높은 형식으로 변환                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 캐싱 & 응답                                              │
│  Key: model:comparison:1:2                              │
│  응답 JSON:                                              │
│  {                                                      │
│    "model_1": { "name": "GPT-4o", "scores": {...} },   │
│    "model_2": { "name": "Claude 3.5", "scores": {...}},│
│    "comparison": [                                      │
│      {                                                  │
│        "metric": "Reasoning",                           │
│        "model_1_score": 92,                             │
│        "model_2_score": 88,                             │
│        "difference": 4,                                 │
│        "winner": "model_1"                              │
│      }                                                  │
│    ]                                                    │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

**흐름:**
```
프론트엔드 요청 → 입력 검증 → 캐시 확인 → DB 조회 → 정규화/비교 → 캐싱 → 응답
```

---

### 3.3 기능 #5: AI 이슈 지수 시각화

```
┌──────────────────────────────────────────────────────┐
│ [배치 작업] 매일 자정에 실행                          │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 1️⃣ 뉴스 데이터 수집 (기능 #7에서 완료)              │
│   - news_articles 테이블에 저장된 뉴스               │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 2️⃣ 태그 분류 (기능 #9: SLM 분류)                    │
│   - article_to_tags 테이블의 classification_status   │
│   - interest_tag_id 추출                             │
│   - confidence_score >= 70% 필터링                   │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 3️⃣ 영향도 점수 계산                                  │
│   공식:                                              │
│   impact_score = (기사 발행 시점 가중치) +           │
│                 (태그 신뢰도) +                      │
│                 (뉴스 출처 가중치)                   │
│                                                      │
│   결과: news_articles.impact_score 업데이트         │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 4️⃣ 카테고리별 이슈 지수 계산                         │
│   공식:                                              │
│   category_score = SUM(article.impact_score) /      │
│                    COUNT(articles_in_category) *    │
│                    category.weight                   │
│                                                      │
│   결과: issue_index_by_category 저장                │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 5️⃣ 전체 이슈 지수 계산                               │
│   공식:                                              │
│   overall_score = WEIGHTED_AVG(all_category_scores) │
│                                                      │
│   결과: issue_index_daily 저장                       │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 6️⃣ 전주와의 비교 계산                                │
│   - 이전 주의 이슈 지수 조회                         │
│   - 변화량 (절대값, 백분율) 계산                     │
│   - main_keyword 추출 (상위 태그)                   │
│   - trend 판정 (상승/하강/유지)                      │
│                                                      │
│   결과: issue_index_daily 업데이트                  │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 7️⃣ Redis 캐시 갱신                                  │
│   - issue:index:latest                              │
│   - issue:index:by_category:{cat_id}                │
│   TTL: 1시간                                         │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 8️⃣ 사용자 알림 발송 (기능 #8)                        │
│   - user_interested_models 확인                      │
│   - 큰 변화가 있는 경우만 알림                       │
│   - FCM으로 푸시 알림 발송                           │
└──────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────

프론트엔드 요청 (조회 시)

GET /api/v1/models/issue-index/latest
    ↓
┌─ Redis 캐시 확인 ─┐
│                  │
└─ 캐시 미스 → DB 조회 → 응답
```

---

### 3.4 기능 #6: 모델 업데이트 내역

```
┌──────────────────────────────────────────────────────┐
│ [배치 작업] 주 2-3회 실행                             │
│ (Artificial Analysis API 업데이트 확인)               │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 1️⃣ 외부 API 호출                                    │
│   - Artificial Analysis API                         │
│   - 모든 LLM 모델 데이터 수집                        │
│   - 타임아웃: 30초, 재시도: 3회                     │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 2️⃣ 신규 업데이트 감지                                │
│   로직:                                              │
│   - 각 모델 현재 버전 vs DB 저장 버전 비교          │
│   - version_after가 DB에 없으면 신규                │
│   - 신규 업데이트 목록 생성                          │
│                                                      │
│   결과: 신규 업데이트 배열                           │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 3️⃣ 데이터 검증 및 정제                               │
│   - 필수 필드 확인                                   │
│   - 성능 지표 유효성 검사                            │
│   - 이상치 필터링                                    │
│   - 성능 개선도 계산                                 │
│                                                      │
│   성능개선도 = ((after_score - before_score) /      │
│                 before_score) * 100                 │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 4️⃣ DB 저장                                          │
│   INSERT INTO model_updates                         │
│   - version_before, version_after                   │
│   - update_date                                      │
│   - summary, key_improvements                       │
│   - performance_improvement                         │
│                                                      │
│   INSERT INTO model_updates_details                 │
│   - 벤치마크별 상세 데이터                           │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 5️⃣ 사용자 관심 모델 확인 & 알림                      │
│   - user_interested_models 조회                      │
│   - 해당 모델을 관심으로 설정한 사용자 추출         │
│   - FCM 토큰으로 푸시 알림 발송                      │
│                                                      │
│   알림 내용:                                         │
│   "GPT-4o 업데이트!"                                │
│   "컨텍스트 윈도우 확대, 추론 속도 2배 개선"         │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 6️⃣ Redis 캐시 무효화                                │
│   DEL model:{model_id}:scores                       │
│   DEL model:{model_id}:timeline                     │
│   DEL model:*:comparison                            │
│   TTL: 즉시 갱신                                     │
└──────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────

프론트엔드 요청 (조회 시)

GET /api/v1/models/:modelId/updates
    ↓
DB 조회: model_updates 테이블
    ↓
응답 JSON 반환
```

---

### 3.5 기능 #7: 뉴스 수집

```
┌──────────────────────────────────────────────────────┐
│ [배치 작업] 매 1시간마다 실행                         │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 1️⃣ 키워드 기반 뉴스 수집                             │
│   출처:                                              │
│   - Naver News API                                  │
│   - Google Trends API (선택)                        │
│                                                      │
│   키워드 (40개 관심 태그 기반):                      │
│   ["AI 윤리", "AI 일자리", "머신러닝", ...]         │
│                                                      │
│   각 키워드별 최근 뉴스 30개 수집                    │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 2️⃣ 중복 제거                                        │
│   - URL 기반 UNIQUE 키 확인                          │
│   - 이미 수집한 기사라면 스킵                        │
│   - news_articles.url 테이블 확인                   │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 3️⃣ 데이터 추출 및 정제                               │
│   추출 필드:                                         │
│   - title (제목)                                     │
│   - url (원본 링크)                                  │
│   - source (출처)                                    │
│   - published_at (발행일)                            │
│   - summary (요약)                                   │
│                                                      │
│   정제:                                              │
│   - HTML 태그 제거                                   │
│   - 특수문자 처리                                    │
│   - 길이 검증                                        │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 4️⃣ MongoDB에 원문 저장                              │
│   INSERT INTO raw_news_articles                     │
│   - title, url, full_content                        │
│   - source, published_at, collected_at              │
│                                                      │
│   목적: 장기 아카이빙, 재분석 가능성                 │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 5️⃣ MySQL에 메타데이터 저장                           │
│   INSERT INTO news_articles                         │
│   - title, url, source, published_at                │
│   - summary, impact_score (TBD)                     │
│   - collected_at = NOW()                            │
│                                                      │
│   상태: impact_score는 이슈 지수 계산 시 갱신       │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 6️⃣ 분류 작업 큐에 추가 (기능 #9)                    │
│   - Bull Job Queue에 태스크 추가                     │
│   - 각 뉴스를 개별 분류 작업으로 등록               │
│   - 나중에 SLM이 비동기로 처리                      │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 7️⃣ Elasticsearch 인덱싱 (검색용)                    │
│   - news_articles 인덱스에 문서 추가                │
│   - 제목, 요약 텍스트 색인                           │
│   - 한글 형태소 분석 (Nori 분석기)                  │
│   - 검색 응답 속도 < 500ms 목표                     │
└──────────────────────────────────────────────────────┘
```

---

### 3.6 기능 #9: AI 이슈 분류 (SLM)

```
┌──────────────────────────────────────────────────────┐
│ 입력: Bull Job Queue의 분류 작업                      │
│ (기능 #7에서 추가된 뉴스 기사)                        │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 1️⃣ 기사 데이터 로드                                 │
│   - news_articles 테이블에서 미분류 기사 조회       │
│   - MongoDB raw_news_articles에서 전문 조회        │
│   - 타임아웃: 30초                                   │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 2️⃣ SLM 모델 호출 (Mistral 7B)                      │
│   입력 프롬프트:                                      │
│   "다음 기사를 40개 표준 태그 중                     │
│    1-5개로 분류하세요:                              │
│    기사 제목: {title}                               │
│    기사 내용: {summary}"                            │
│                                                      │
│   모델 응답:                                         │
│   {                                                  │
│     "tags": [                                       │
│       { "tag_id": 15, "confidence": 0.95 },        │
│       { "tag_id": 23, "confidence": 0.87 }         │
│     ]                                                │
│   }                                                  │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 3️⃣ 신뢰도 필터링                                    │
│   규칙:                                              │
│   - confidence >= 0.70 → confirmed (자동 확정)      │
│   - confidence < 0.70 → pending_review (검토대기)   │
│   - 태그 개수 < 1 → rejected (거부)                 │
│                                                      │
│   결과:                                              │
│   - confirmed: 이슈 지수 계산에 즉시 포함           │
│   - pending_review: 관리자 수동 검토 대기           │
│   - rejected: 무시                                   │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 4️⃣ article_to_tags 테이블 저장                      │
│   INSERT INTO article_to_tags                       │
│   - article_id, interest_tag_id                     │
│   - classification_status (confirmed/pending_review)│
│   - confidence_score                                │
│                                                      │
│   UNIQUE: (article_id, interest_tag_id)             │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 5️⃣ pending_review 알림                              │
│   - 신뢰도 < 70%인 기사는 관리자 알림               │
│   - 관리자 전용 API: /admin/pending-classifications│
│   - 웹훅 또는 이메일로 알림                         │
└──────────────────┬─────────────────────────────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────┐
│ 6️⃣ Elasticsearch 인덱싱 (confirmed만)               │
│   - news_articles 인덱스에 tags 필드 추가           │
│   - 태그 기반 검색 최적화                            │
│   - 향후 개인화된 피드 제공 시 활용                 │
└──────────────────┬─────────────────────────────────┘

───────────────────────────────────────────────────────

관리자 승인 (선택)

PUT /api/v1/admin/articles/:articleId/tags
{
  "tags": [
    { "tag_id": 15, "status": "confirmed" },
    { "tag_id": 25, "status": "confirmed" }
  ]
}
    ↓
UPDATE article_to_tags SET classification_status = 'confirmed'
    ↓
이슈 지수 재계산
```

---

### 3.7 기능 #3: 커뮤니티 (게시글/댓글)

```
프론트엔드: 새 게시글 작성

POST /api/v1/community/posts
{
  "title": "GPT-4o vs Claude 3.5 비교 팁",
  "content": "프롬프트 작성할 때...",
  "tags": [15, 23]
}
    ↓
┌─────────────────────────────────────────────────────┐
│ 1️⃣ 입력 검증                                       │
│   - 제목: 5-255자                                   │
│   - 내용: 10-5000자                                │
│   - 태그: 1-10개                                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│ 2️⃣ XSS 방지 (DOMPurify)                             │
│   - HTML 태그 제거                                  │
│   - 악성 스크립트 필터링                            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│ 3️⃣ DB 저장                                         │
│   INSERT INTO community_posts                       │
│   INSERT INTO community_post_tags                   │
│                                                      │
│   결과: post_id 반환                                │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│ 4️⃣ Elasticsearch 인덱싱                             │
│   - posts 인덱스에 문서 추가                        │
│   - 제목, 내용 색인                                 │
│   - 태그, 작성자 메타데이터 포함                    │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│ 5️⃣ Redis 캐시 무효화                               │
│   - 트렌딩 게시글 목록 초기화                       │
│   - 카테고리별 최신 게시글 초기화                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────┐
│ 6️⃣ 응답 반환                                       │
│   {                                                 │
│     "success": true,                                │
│     "data": {                                       │
│       "post_id": 12345,                             │
│       "user_id": 100,                               │
│       "title": "...",                               │
│       "created_at": "2025-11-09T14:30:00Z"          │
│     }                                               │
│   }                                                 │
└──────────────────┬──────────────────────────────────┘

───────────────────────────────────────────────────────

피드 조회:

GET /api/v1/community/posts?page=1&limit=20
    ↓
Redis 캐시 확인
    ↓
캐시 미스 → DB 조회 (최신 순)
    ↓
좋아요 수, 댓글 수 추가
    ↓
캐시 저장 (TTL: 1시간)
    ↓
응답 반환

───────────────────────────────────────────────────────

좋아요:

POST /api/v1/community/posts/:postId/like
    ↓
UNIQUE 키 확인: (post_id, user_id)
    ↓
INSERT community_post_likes (없으면)
    ↓
UPDATE community_posts SET likes_count = likes_count + 1
    ↓
캐시 무효화
    ↓
응답
```

---

## 4. API 엔드포인트 설계

### 4.1 인증 관련 API

#### POST `/api/v1/auth/register`
**회원가입**

```typescript
// 요청
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "nickname": "AIEnthusiast",
  "job_category_id": 1
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "user_id": 100,
    "email": "user@example.com",
    "nickname": "AIEnthusiast",
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400
  }
}

// 에러 (400 / 409)
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "이미 가입된 이메일입니다."
  }
}
```

---

#### POST `/api/v1/auth/login`
**로그인**

```typescript
// 요청
{
  "email": "user@example.com",
  "password": "securePassword123!"
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "user_id": 100,
    "email": "user@example.com",
    "nickname": "AIEnthusiast",
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400
  }
}
```

---

#### POST `/api/v1/auth/refresh`
**토큰 갱신**

```typescript
// 요청
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400
  }
}
```

---

#### POST `/api/v1/auth/logout`
**로그아웃**

```typescript
// 요청
{} // 헤더의 Authorization Bearer 토큰 사용

// 응답 (200 OK)
{
  "success": true,
  "message": "로그아웃 되었습니다."
}
```

---

### 4.2 모델 관련 API

#### GET `/api/v1/models`
**모든 AI 모델 목록 조회**

```typescript
// 요청
GET /api/v1/models?page=1&limit=20&sort=overall_score

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "models": [
      {
        "model_id": 1,
        "model_name": "GPT-4o",
        "developer": "OpenAI",
        "release_date": "2024-05-13",
        "overall_score": 92.5,
        "series_name": "GPT"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_count": 150,
      "has_more": true
    }
  }
}
```

---

#### GET `/api/v1/models/:modelId`
**모델 상세 정보 조회**

```typescript
// 요청
GET /api/v1/models/1

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "model_id": 1,
    "model_name": "GPT-4o",
    "developer": "OpenAI",
    "release_date": "2024-05-13",
    "overall_score": 92.5,
    "benchmarks": [
      {
        "benchmark_name": "MMLU",
        "raw_score": 88.5,
        "normalized_score": 90.2
      }
    ],
    "latest_update": {
      "version": "4.5",
      "update_date": "2024-12-15",
      "key_improvements": ["Context Window 확대", "추론 속도 2배 개선"]
    }
  }
}
```

---

#### GET `/api/v1/models/:modelId/timeline`
**모델 발전사 (타임라인) 조회 - 기능 #1**

```typescript
// 요청
GET /api/v1/models/1/timeline?limit=10&offset=0

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "model_id": 1,
    "model_name": "GPT-4o",
    "total_versions": 25,
    "timeline": [
      {
        "version": "4.5",
        "release_date": "2024-12-15",
        "normalized_scores": {
          "reasoning": 92,
          "coding": 88,
          "math": 85
        },
        "key_improvements": ["Context Window 확대", "추론 속도 2배"],
        "overall_score": 88.5
      },
      {
        "version": "4.0",
        "release_date": "2024-05-13",
        "normalized_scores": {
          "reasoning": 85,
          "coding": 82,
          "math": 79
        },
        "overall_score": 82.0
      }
    ]
  }
}
```

---

#### GET `/api/v1/models/compare`
**모델 비교 - 기능 #2**

```typescript
// 요청
GET /api/v1/models/compare?model_ids=1,2

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "model_1": {
      "model_id": 1,
      "model_name": "GPT-4o",
      "overall_score": 92.5
    },
    "model_2": {
      "model_id": 2,
      "model_name": "Claude 3.5",
      "overall_score": 90.2
    },
    "comparison": [
      {
        "metric": "Reasoning",
        "model_1_score": 92,
        "model_2_score": 88,
        "difference": 4,
        "winner": "model_1"
      },
      {
        "metric": "Coding",
        "model_1_score": 88,
        "model_2_score": 91,
        "difference": -3,
        "winner": "model_2"
      }
    ],
    "overall_winner": "model_1"
  }
}
```

---

#### GET `/api/v1/models/:modelId/updates`
**모델 업데이트 내역 조회 - 기능 #6**

```typescript
// 요청
GET /api/v1/models/1/updates?limit=10&offset=0

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "model_id": 1,
    "model_name": "GPT-4o",
    "total_updates": 25,
    "updates": [
      {
        "update_id": 101,
        "version_before": "4.0",
        "version_after": "4.5",
        "update_date": "2024-12-15",
        "summary": "컨텍스트 윈도우 확대, 추론 속도 2배 개선",
        "key_improvements": [
          "컨텍스트 윈도우 64k → 128k",
          "추론 속도 2배 개선",
          "가격 50% 인하"
        ],
        "performance_improvements": {
          "reasoning": { "before": 85, "after": 92, "improvement_pct": 8.2 },
          "coding": { "before": 82, "after": 88, "improvement_pct": 7.3 }
        }
      }
    ]
  }
}
```

---

#### GET `/api/v1/models/:modelId/updates/:updateId`
**업데이트 상세 정보 조회**

```typescript
// 요청
GET /api/v1/models/1/updates/101

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "update_id": 101,
    "model_name": "GPT-4o",
    "version_before": "4.0",
    "version_after": "4.5",
    "update_date": "2024-12-15",
    "summary": "...",
    "benchmarks_detail": [
      {
        "benchmark_name": "MMLU",
        "before_score": 85.2,
        "after_score": 90.1,
        "improvement": 5.7
      }
    ],
    "source_articles": [
      {
        "title": "OpenAI GPT-4o 새 버전 공개",
        "url": "https://...",
        "published_at": "2024-12-15"
      }
    ]
  }
}
```

---

#### POST `/api/v1/users/:userId/interested-models`
**관심 모델 추가**

```typescript
// 요청
{
  "model_id": 1
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "interested_id": 5001,
    "user_id": 100,
    "model_id": 1,
    "added_at": "2025-11-09T14:30:00Z"
  }
}
```

---

#### DELETE `/api/v1/users/:userId/interested-models/:modelId`
**관심 모델 제거**

```typescript
// 요청
DELETE /api/v1/users/100/interested-models/1

// 응답 (200 OK)
{
  "success": true,
  "message": "관심 모델이 제거되었습니다."
}
```

---

#### GET `/api/v1/users/:userId/interested-models`
**사용자 관심 모델 목록**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "interested_models": [
      {
        "model_id": 1,
        "model_name": "GPT-4o",
        "overall_score": 92.5,
        "added_at": "2025-11-09T14:30:00Z"
      }
    ]
  }
}
```

---

### 4.3 AI 이슈 관련 API

#### GET `/api/v1/models/issue-index/latest`
**최신 AI 이슈 지수 조회 - 기능 #5**

```typescript
// 요청
GET /api/v1/models/issue-index/latest?date=2025-11-09

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "index_date": "2025-11-09",
    "score": 78,
    "comparison_previous_week": 5.2,
    "main_keyword": "AI 안전성",
    "trend": "상승",
    "previous_week_score": 74,
    "article_count": 156
  }
}
```

---

#### GET `/api/v1/models/issue-index/by-category`
**카테고리별 이슈 지수 조회**

```typescript
// 요청
GET /api/v1/models/issue-index/by-category?date=2025-11-09

// 응답 (200 OK)
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "category_name": "기술/개발",
      "category_code": "TECH",
      "score": 85,
      "comparison_previous_week": 8.5,
      "weight": 1.5,
      "rank": 1,
      "related_keywords": ["AI 모델", "자동화"],
      "article_count": 45
    },
    {
      "category_id": 5,
      "category_name": "교육",
      "category_code": "EDU",
      "score": 72,
      "comparison_previous_week": -2.3,
      "weight": 1.2,
      "rank": 2,
      "related_keywords": ["학습", "AI 튜터"],
      "article_count": 28
    }
  ]
}
```

---

#### GET `/api/v1/models/issue-index/:indexId/sources`
**이슈 지수 근거 데이터 조회**

```typescript
// 요청
GET /api/v1/models/issue-index/123/sources

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "index_id": 123,
    "index_date": "2025-11-09",
    "score": 78,
    "main_keyword": "AI 안전성",
    "sources": [
      {
        "rank": 1,
        "article_id": 5001,
        "title": "AI 안전성 기준 마련 논의 가속",
        "source": "Naver News",
        "url": "https://...",
        "published_at": "2025-11-09",
        "impact_score": 95
      },
      {
        "rank": 2,
        "article_id": 5002,
        "title": "OpenAI CEO, AI 규제 강화 촉구",
        "source": "Naver News",
        "url": "https://...",
        "published_at": "2025-11-09",
        "impact_score": 92
      }
    ]
  }
}
```

---

### 4.4 커뮤니티 API - 기능 #3

#### POST `/api/v1/community/posts`
**게시글 작성**

```typescript
// 요청
{
  "title": "GPT-4o vs Claude 3.5 비교 팁",
  "content": "프롬프트 작성할 때 다음 팁들을 활용하세요...",
  "tags": [15, 23, 28]
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "post_id": 12345,
    "user_id": 100,
    "title": "GPT-4o vs Claude 3.5 비교 팁",
    "content": "프롬프트 작성할 때...",
    "tags": [15, 23, 28],
    "likes_count": 0,
    "comments_count": 0,
    "created_at": "2025-11-09T14:30:00Z",
    "updated_at": "2025-11-09T14:30:00Z"
  }
}
```

---

#### GET `/api/v1/community/posts`
**게시글 목록 조회**

```typescript
// 요청
GET /api/v1/community/posts?page=1&limit=20&sort=latest

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "posts": [
      {
        "post_id": 12345,
        "user_id": 100,
        "user_nickname": "AIEnthusiast",
        "title": "GPT-4o vs Claude 3.5 비교 팁",
        "content": "프롬프트 작성할 때...",
        "tags": [15, 23, 28],
        "likes_count": 42,
        "comments_count": 8,
        "views_count": 356,
        "is_liked_by_me": false,
        "created_at": "2025-11-09T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_count": 5420,
      "has_more": true
    }
  }
}
```

---

#### GET `/api/v1/community/posts/:postId`
**게시글 상세 조회**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "post_id": 12345,
    "user_id": 100,
    "user_nickname": "AIEnthusiast",
    "user_image_url": "https://...",
    "title": "GPT-4o vs Claude 3.5 비교 팁",
    "content": "프롬프트 작성할 때...",
    "tags": [
      { "tag_id": 15, "tag_name": "프롬프트 엔지니어링" },
      { "tag_id": 23, "tag_name": "모델 비교" }
    ],
    "likes_count": 42,
    "comments_count": 8,
    "views_count": 356,
    "is_liked_by_me": false,
    "comments": [
      {
        "comment_id": 67890,
        "user_id": 101,
        "user_nickname": "TechLover",
        "content": "정말 유용한 팁이네요!",
        "likes_count": 3,
        "created_at": "2025-11-09T15:00:00Z"
      }
    ],
    "created_at": "2025-11-09T14:30:00Z",
    "updated_at": "2025-11-09T14:30:00Z"
  }
}
```

---

#### PUT `/api/v1/community/posts/:postId`
**게시글 수정 (소유자만)**

```typescript
// 요청
{
  "title": "GPT-4o vs Claude 3.5 완벽 비교 가이드",
  "content": "업데이트된 내용...",
  "tags": [15, 23]
}

// 응답 (200 OK)
{
  "success": true,
  "data": { /* 수정된 게시글 */ }
}
```

---

#### DELETE `/api/v1/community/posts/:postId`
**게시글 삭제 (소유자/관리자만)**

```typescript
// 요청
DELETE /api/v1/community/posts/12345

// 응답 (200 OK)
{
  "success": true,
  "message": "게시글이 삭제되었습니다."
}
```

---

#### POST `/api/v1/community/posts/:postId/like`
**게시글 좋아요**

```typescript
// 요청
{} // 토큰만으로 충분

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "like_id": 9001,
    "post_id": 12345,
    "user_id": 100,
    "created_at": "2025-11-09T14:35:00Z"
  }
}
```

---

#### DELETE `/api/v1/community/posts/:postId/like`
**게시글 좋아요 취소**

```typescript
// 요청
DELETE /api/v1/community/posts/12345/like

// 응답 (200 OK)
{
  "success": true,
  "message": "좋아요가 취소되었습니다."
}
```

---

#### POST `/api/v1/community/posts/:postId/comments`
**댓글 작성**

```typescript
// 요청
{
  "content": "정말 유용한 팁이네요!"
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "comment_id": 67890,
    "post_id": 12345,
    "user_id": 100,
    "user_nickname": "AIEnthusiast",
    "content": "정말 유용한 팁이네요!",
    "likes_count": 0,
    "created_at": "2025-11-09T15:00:00Z"
  }
}
```

---

#### GET `/api/v1/community/posts/:postId/comments`
**댓글 목록 조회**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "comments": [
      {
        "comment_id": 67890,
        "post_id": 12345,
        "user_id": 101,
        "user_nickname": "TechLover",
        "user_image_url": "https://...",
        "content": "정말 유용한 팁이네요!",
        "likes_count": 3,
        "is_liked_by_me": false,
        "created_at": "2025-11-09T15:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_count": 8,
      "has_more": false
    }
  }
}
```

---

#### DELETE `/api/v1/community/posts/:postId/comments/:commentId`
**댓글 삭제 (소유자/관리자)**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "message": "댓글이 삭제되었습니다."
}
```

---

#### GET `/api/v1/community/posts/search`
**게시글 검색 - Elasticsearch**

```typescript
// 요청
GET /api/v1/community/posts/search?q=프롬프트&tags=15,23&page=1

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "query": "프롬프트",
    "results": [
      {
        "post_id": 12345,
        "title": "프롬프트 엔지니어링 팁",
        "excerpt": "프롬프트 작성할 때 다음 팁들을 활용하세요...",
        "score": 15.23,
        "highlights": {
          "title": "<em>프롬프트</em> 엔지니어링 팁",
          "content": "...<em>프롬프트</em> 작성할 때..."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_count": 234
    }
  }
}
```

---

### 4.5 뉴스/태그 API - 기능 #7, #9

#### GET `/api/v1/news/articles`
**뉴스 기사 목록 조회**

```typescript
// 요청
GET /api/v1/news/articles?tags=15,23&sort=published_at&page=1

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "articles": [
      {
        "article_id": 5001,
        "title": "AI 안전성 기준 마련 논의 가속",
        "summary": "세계 주요국이 AI 안전성 기준 마련을 가속화하고 있습니다...",
        "source": "Naver News",
        "url": "https://...",
        "published_at": "2025-11-09T10:30:00Z",
        "tags": [
          { "tag_id": 15, "tag_name": "AI 안전성", "confidence": 0.95 }
        ],
        "impact_score": 95,
        "collected_at": "2025-11-09T11:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_count": 1250
    }
  }
}
```

---

#### GET `/api/v1/news/articles/:articleId`
**뉴스 기사 상세 조회**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "article_id": 5001,
    "title": "AI 안전성 기준 마련 논의 가속",
    "summary": "...",
    "source": "Naver News",
    "url": "https://...",
    "published_at": "2025-11-09T10:30:00Z",
    "full_content": "세계 주요국이 AI 안전성 기준 마련을 가속화...",
    "tags": [
      {
        "tag_id": 15,
        "tag_name": "AI 안전성",
        "confidence": 0.95,
        "classification_status": "confirmed"
      }
    ],
    "impact_score": 95,
    "collected_at": "2025-11-09T11:00:00Z"
  }
}
```

---

#### GET `/api/v1/news/articles/search`
**뉴스 기사 검색 - Elasticsearch**

```typescript
// 요청
GET /api/v1/news/articles/search?q=AI+윤리&date_from=2025-11-01&page=1

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "query": "AI 윤리",
    "filters": {
      "date_from": "2025-11-01"
    },
    "results": [
      {
        "article_id": 5001,
        "title": "AI 윤리 문제 해결책 제시",
        "excerpt": "...AI 윤리에 대한 국제적 합의...",
        "source": "Naver News",
        "published_at": "2025-11-08",
        "score": 12.45
      }
    ],
    "pagination": {
      "total_count": 456
    }
  }
}
```

---

#### POST `/api/v1/admin/articles/:articleId/tags`
**뉴스 기사 태그 수동 검토 (관리자)** - 기능 #9

```typescript
// 요청
{
  "tags": [
    { "tag_id": 15, "status": "confirmed" },
    { "tag_id": 23, "status": "confirmed" },
    { "tag_id": 28, "status": "rejected" }
  ]
}

// 응답 (200 OK)
{
  "success": true,
  "data": {
    "article_id": 5001,
    "confirmed_tags": [15, 23],
    "rejected_tags": [28],
    "updated_at": "2025-11-09T16:00:00Z"
  }
}
```

---

#### GET `/api/v1/admin/classifications/pending`
**수동 검토 대기 중인 분류 (관리자)**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "pending_classifications": [
      {
        "article_id": 5001,
        "title": "새로운 AI 모델 발표",
        "classification_status": "pending_review",
        "proposed_tags": [
          { "tag_id": 15, "confidence": 0.68 },
          { "tag_id": 23, "confidence": 0.65 }
        ],
        "collected_at": "2025-11-09T11:00:00Z"
      }
    ],
    "pagination": {
      "total_pending": 42
    }
  }
}
```

---

### 4.6 사용자 프로필 API

#### GET `/api/v1/users/:userId/profile`
**사용자 프로필 조회**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "user_id": 100,
    "email": "user@example.com",
    "nickname": "AIEnthusiast",
    "profile_image_url": "https://...",
    "job_category_id": 1,
    "job_category_name": "개발자",
    "bio": "AI 프롬프트 엔지니어",
    "interested_models_count": 5,
    "community_posts_count": 12,
    "created_at": "2025-10-01T10:00:00Z"
  }
}
```

---

#### PUT `/api/v1/users/:userId/profile`
**사용자 프로필 수정**

```typescript
// 요청
{
  "nickname": "AIEnthusiast2",
  "job_category_id": 2,
  "bio": "AI 연구원 지망"
}

// 응답 (200 OK)
{
  "success": true,
  "data": { /* 수정된 프로필 */ }
}
```

---

#### POST `/api/v1/users/:userId/fcm-token`
**FCM 토큰 등록 (푸시 알림)**

```typescript
// 요청
{
  "fcm_token": "c5UqhUmhOsQ:APA91bHabc123...",
  "device_type": "android"
}

// 응답 (201 Created)
{
  "success": true,
  "data": {
    "token_id": 2001,
    "device_type": "android",
    "is_active": true,
    "created_at": "2025-11-09T14:30:00Z"
  }
}
```

---

### 4.7 기타 API

#### GET `/api/v1/categories`
**전체 카테고리 및 태그 목록**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "job_categories": [
      { "job_category_id": 1, "job_name": "개발자", "category_code": "DEV" },
      { "job_category_id": 2, "job_name": "연구자", "category_code": "RES" }
    ],
    "ai_categories": [
      { "category_id": 1, "category_name": "기술/개발", "category_code": "TECH" }
    ],
    "interest_tags": [
      { "tag_id": 15, "tag_name": "프롬프트 엔지니어링", "category_id": 1 },
      { "tag_id": 23, "tag_name": "모델 비교", "category_id": 1 }
    ]
  }
}
```

---

#### GET `/api/v1/health`
**서버 상태 확인**

```typescript
// 응답 (200 OK)
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-11-09T14:30:00Z",
    "uptime": 864000,
    "database": "connected",
    "redis": "connected",
    "elasticsearch": "connected"
  }
}
```

---

## 5. 백엔드 개발 태스크 (체크리스트)

### Phase 1: 기초 인프라 (1-2주)

#### ☐ 5.1 프로젝트 초기화

- [ ] Node.js 프로젝트 생성 (`npm init`)
- [ ] TypeScript 설정 (`tsconfig.json`, `tslint.json`)
- [ ] Express.js 기본 서버 구축
- [ ] 환경변수 설정 (`.env.example`, `dotenv` 라이브러리)
- [ ] 기본 미들웨어 설정 (CORS, body-parser, helmet)
- [ ] 에러 핸들링 미들웨어 구현
- [ ] 로깅 시스템 구축 (Winston 또는 Pino)

---

#### ☐ 5.2 데이터베이스 연결

**MySQL**
- [ ] MySQL 클라이언트 라이브러리 설치 (`mysql2`, `sequelize` 또는 `typeorm`)
- [ ] 데이터베이스 연결 풀 설정
- [ ] 모든 테이블 생성 쿼리 작성 및 실행
- [ ] 인덱스 생성 (성능 최적화)
- [ ] 시드 데이터 삽입 (테스트용)

**Redis**
- [ ] Redis 클라이언트 설정 (`redis` 또는 `ioredis`)
- [ ] 캐시 키 네이밍 컨벤션 정의
- [ ] TTL 설정 전략 수립
- [ ] Redis 연결 풀 설정

**MongoDB**
- [ ] MongoDB 드라이버 설정 (`mongoose` 또는 `mongodb`)
- [ ] 컬렉션 스키마 정의
- [ ] 인덱스 생성
- [ ] 시드 데이터 작성

**Elasticsearch**
- [ ] Elasticsearch 클라이언트 설정
- [ ] 인덱스 매핑 정의 (posts, news_articles)
- [ ] 한글 분석기 설정 (Nori)
- [ ] 인덱스 생성

---

#### ☐ 5.3 인증 시스템 구축 - 기능 (준비)

- [ ] JWT 라이브러리 설치 (`jsonwebtoken`)
- [ ] 토큰 생성/검증 함수 구현
- [ ] 인증 미들웨어 작성 (Bearer Token 검증)
- [ ] 비밀번호 해싱 (bcrypt) 설정
- [ ] 요청에서 user_id 추출 로직 구현

---

#### ☐ 5.4 캐싱 전략 수립

- [ ] Redis 캐시 클래스 작성 (set, get, del, expire 메서드)
- [ ] 캐시 키 생성 함수 정의
- [ ] 캐시 갱신 전략 정의 (TTL, 이벤트 기반)
- [ ] 캐시 워밍 업(warming up) 스크립트 작성 (선택)

---

### Phase 2: 핵심 API 개발 (2-3주)

#### ☐ 5.5 인증 API 구현 - 기능 (준비)

**엔드포인트 구현:**
- [ ] POST `/api/v1/auth/register` - 회원가입
  - [ ] 이메일 유효성 검사
  - [ ] 비밀번호 해싱
  - [ ] users 테이블에 저장
  - [ ] 액세스/리프레시 토큰 발급
  
- [ ] POST `/api/v1/auth/login` - 로그인
  - [ ] 이메일로 사용자 조회
  - [ ] 비밀번호 검증
  - [ ] 토큰 발급
  
- [ ] POST `/api/v1/auth/refresh` - 토큰 갱신
  - [ ] 리프레시 토큰 검증
  - [ ] 새 액세스 토큰 발급
  
- [ ] POST `/api/v1/auth/logout` - 로그아웃
  - [ ] 토큰 블랙리스트 처리 (Redis)

**테스트:**
- [ ] 각 엔드포인트 단위 테스트 작성
- [ ] 에러 케이스 테스트 (중복 가입, 잘못된 비밀번호 등)

---

#### ☐ 5.6 모델 데이터 API - 기능 #1, #2, #6

**기본 데이터 조회:**
- [ ] GET `/api/v1/models` - 모든 모델 목록
  - [ ] 페이지네이션 구현
  - [ ] 정렬 옵션 (overall_score, release_date)
  - [ ] 캐싱 적용 (TTL: 1시간)
  
- [ ] GET `/api/v1/models/:modelId` - 모델 상세
  - [ ] 벤치마크 데이터 포함
  - [ ] 최신 업데이트 정보 포함
  - [ ] 캐싱 적용

**타임라인 API - 기능 #1:**
- [ ] GET `/api/v1/models/:modelId/timeline`
  - [ ] model_updates 테이블에서 버전 기록 조회
  - [ ] model_benchmarks에서 성능 데이터 조회
  - [ ] 정규화 로직 적용
  - [ ] 날짜순 정렬
  - [ ] JSON 응답 포맷팅
  - [ ] 캐싱 적용 (TTL: 1시간)

**비교 API - 기능 #2:**
- [ ] GET `/api/v1/models/compare?model_ids=1,2`
  - [ ] 입력 검증 (정확히 2개 모델)
  - [ ] 두 모델의 벤치마크 데이터 조회
  - [ ] 비교 데이터 생성 (차이값, 승자 판정)
  - [ ] 캐싱 적용 (Key: model:comparison:1:2)

**업데이트 API - 기능 #6:**
- [ ] GET `/api/v1/models/:modelId/updates`
  - [ ] model_updates 조회
  - [ ] 페이지네이션
  - [ ] 캐싱 적용
  
- [ ] GET `/api/v1/models/:modelId/updates/:updateId`
  - [ ] 업데이트 상세 정보
  - [ ] model_updates_details 데이터 포함
  - [ ] 성능 개선도 표시

**테스트:**
- [ ] 타임라인 응답 데이터 검증
- [ ] 비교 결과 정확성 테스트
- [ ] 캐시 히트/미스 테스트

---

#### ☐ 5.7 정규화 로직 구현 - 기능 #1, #2, #6

**점수 정규화:**
- [ ] `normalizeScore(rawScore, min, max)` 함수 구현
  - [ ] 공식: `((raw - min) / (max - min)) * 100`
  - [ ] 0-100 범위 보장
  - [ ] 에러 처리 (min = max 경우)
  
- [ ] `calculateOverallScore(benchmarks)` 함수
  - [ ] 가중 평균 계산
  - [ ] 정규화된 점수들의 가중합
  
- [ ] 테스트 케이스
  - [ ] TC-1: min=50, max=100, raw=75 → 50 확인
  - [ ] TC-2: 모든 벤치마크 평균 계산
  - [ ] TC-3: min=max인 경우 처리

**직업별 가중치:**
- [ ] `applyJobWeighting(score, jobId)` 함수
  - [ ] job_occupation_to_tasks에서 가중치 조회
  - [ ] score * weight 계산
  - [ ] 100 상한선 적용
  
- [ ] 테스트
  - [ ] 가중치 적용 전/후 비교

---

#### ☐ 5.8 이슈 지수 API - 기능 #5

**조회 API:**
- [ ] GET `/api/v1/models/issue-index/latest`
  - [ ] Redis 캐시 확인
  - [ ] issue_index_daily 조회
  - [ ] 전주 대비 변화량 계산
  - [ ] 응답 포맷팅
  
- [ ] GET `/api/v1/models/issue-index/by-category`
  - [ ] issue_index_by_category 조회
  - [ ] 모든 카테고리의 점수 반환
  - [ ] 랭킹 계산 (점수순 정렬)
  
- [ ] GET `/api/v1/models/issue-index/:indexId/sources`
  - [ ] 이슈 지수의 근거 뉴스 조회
  - [ ] 상위 2-3개 뉴스 반환
  - [ ] 영향도 점수 포함

**테스트:**
- [ ] 지수 값 범위 검증 (0-100)
- [ ] 전주 대비 변화량 계산 정확성
- [ ] 캐시 동작 확인

---

#### ☐ 5.9 커뮤니티 API - 기능 #3

**게시글 CRUD:**
- [ ] POST `/api/v1/community/posts` - 작성
  - [ ] 입력 검증 (제목, 내용 길이)
  - [ ] XSS 필터링 (DOMPurify)
  - [ ] community_posts 저장
  - [ ] community_post_tags 저장
  - [ ] Elasticsearch 인덱싱
  
- [ ] GET `/api/v1/community/posts` - 목록
  - [ ] 페이지네이션
  - [ ] 정렬 옵션 (최신, 인기)
  - [ ] 캐싱 적용
  - [ ] 좋아요 수, 댓글 수 포함
  
- [ ] GET `/api/v1/community/posts/:postId` - 상세
  - [ ] 게시글 + 댓글 조회
  - [ ] 조회수 증가
  
- [ ] PUT `/api/v1/community/posts/:postId` - 수정
  - [ ] 소유자 확인
  - [ ] 입력 검증
  - [ ] 캐시 무효화
  - [ ] Elasticsearch 업데이트
  
- [ ] DELETE `/api/v1/community/posts/:postId` - 삭제
  - [ ] 소유자/관리자 확인
  - [ ] 연관 댓글/좋아요 삭제
  - [ ] 캐시 무효화
  - [ ] Elasticsearch 인덱스 삭제

**좋아요/댓글:**
- [ ] POST `/api/v1/community/posts/:postId/like` - 좋아요
  - [ ] UNIQUE 키로 중복 방지
  - [ ] likes_count 증가
  - [ ] 캐시 갱신
  
- [ ] DELETE `/api/v1/community/posts/:postId/like` - 좋아요 취소
  - [ ] likes_count 감소
  
- [ ] POST `/api/v1/community/posts/:postId/comments` - 댓글
  - [ ] 입력 검증
  - [ ] XSS 필터링
  - [ ] 저장 및 응답
  
- [ ] DELETE `/api/v1/community/posts/:postId/comments/:commentId` - 댓글 삭제

**검색:**
- [ ] GET `/api/v1/community/posts/search`
  - [ ] Elasticsearch 쿼리 실행
  - [ ] 하이라이트 적용
  - [ ] 페이지네이션

**테스트:**
- [ ] XSS 방지 테스트
- [ ] UNIQUE 키 검증 (중복 좋아요 방지)
- [ ] 검색 결과 정확성

---

#### ☐ 5.10 뉴스 및 분류 API - 기능 #7, #9

**뉴스 조회:**
- [ ] GET `/api/v1/news/articles`
  - [ ] 필터링 (tags, source, date_from, date_to)
  - [ ] 정렬 (발행일, 영향도)
  - [ ] 페이지네이션
  - [ ] 캐싱
  
- [ ] GET `/api/v1/news/articles/:articleId`
  - [ ] 상세 정보
  - [ ] 태그 및 신뢰도 포함
  
- [ ] GET `/api/v1/news/articles/search`
  - [ ] Elasticsearch 검색
  - [ ] 키워드 하이라이트

**태그 분류 (관리자):**
- [ ] POST `/api/v1/admin/articles/:articleId/tags`
  - [ ] 태그 수동 검토
  - [ ] article_to_tags 업데이트
  - [ ] classification_status 변경
  
- [ ] GET `/api/v1/admin/classifications/pending`
  - [ ] 신뢰도 < 70%인 분류 조회
  - [ ] 페이지네이션

**테스트:**
- [ ] 태그 필터링 정확성
- [ ] 검색 결과 관련성

---

### Phase 3: 배치 작업 및 고급 기능 (2주)

#### ☐ 5.11 배치 작업 구축

**모델 데이터 수집 (주 2-3회) - 기능 #6:**
- [ ] Bull Job Queue 설정
- [ ] Artificial Analysis API 호출 함수 작성
  - [ ] API 타임아웃 설정 (30초)
  - [ ] 재시도 로직 (최대 3회)
  - [ ] 에러 로깅
  
- [ ] 신규 업데이트 감지 로직
  - [ ] 현재 버전 vs DB 버전 비교
  - [ ] 신규 업데이트 배열 생성
  
- [ ] 데이터 검증 및 정제
  - [ ] 필수 필드 확인
  - [ ] 이상치 필터링
  - [ ] 성능 개선도 계산
  
- [ ] DB 저장
  - [ ] model_updates 삽입
  - [ ] model_updates_details 삽입
  - [ ] 중복 체크 (UNIQUE KEY)
  
- [ ] 사용자 알림 발송
  - [ ] user_interested_models 조회
  - [ ] FCM 토큰 가져오기
  - [ ] 푸시 알림 전송 (별도 큐에 추가)
  
- [ ] 캐시 무효화
  - [ ] model:{id}:scores 삭제
  - [ ] model:{id}:timeline 삭제
  - [ ] model:*:comparison 삭제

**테스트:**
- [ ] API 호출 성공/실패 시나리오
- [ ] 신규 업데이트 감지 정확성
- [ ] DB 저장 후 조회 확인

---

#### ☐ 5.12 뉴스 수집 배치 (1시간마다) - 기능 #7

- [ ] Naver News API 호출 함수
  - [ ] 40개 키워드별로 뉴스 수집
  - [ ] 타임아웃: 30초, 재시도: 3회
  
- [ ] 중복 제거
  - [ ] URL 기반 UNIQUE 체크
  - [ ] news_articles.url 확인
  
- [ ] 데이터 정제
  - [ ] HTML 태그 제거
  - [ ] 특수문자 처리
  - [ ] 필드 길이 검증
  
- [ ] 저장 (이원 저장)
  - [ ] MongoDB raw_news_articles에 원문 저장
  - [ ] MySQL news_articles에 메타데이터 저장
  
- [ ] 분류 작업 큐에 추가
  - [ ] 각 뉴스를 Bull 작업으로 등록
  - [ ] 나중에 SLM이 비동기 처리
  
- [ ] Elasticsearch 인덱싱
  - [ ] news_articles 인덱스에 추가

**테스트:**
- [ ] 수집된 뉴스 개수 확인
- [ ] 중복 제거 동작 확인
- [ ] MongoDB/MySQL 저장 확인

---

#### ☐ 5.13 이슈 지수 계산 배치 (매일 자정) - 기능 #5

- [ ] 뉴스 데이터 집계
  - [ ] 당일 수집된 모든 뉴스 조회
  - [ ] article_to_tags에서 확정된 태그만 필터링 (confidence >= 70%)
  
- [ ] 영향도 점수 계산 (각 뉴스)
  - [ ] 기사 발행 시점 가중치
  - [ ] 태그 신뢰도 (confidence_score)
  - [ ] 뉴스 출처 가중치 (Naver, Yahoo 등)
  - [ ] impact_score = 가중합
  - [ ] news_articles.impact_score 업데이트
  
- [ ] 카테고리별 이슈 지수 계산
  - [ ] 각 카테고리별로 뉴스 그룹핑
  - [ ] 공식: `SUM(impact_score) / COUNT * category.weight`
  - [ ] issue_index_by_category 저장
  - [ ] 0-100 정규화
  
- [ ] 전체 이슈 지수 계산
  - [ ] 모든 카테고리 점수의 가중 평균
  - [ ] issue_index_daily 저장
  
- [ ] 비교 데이터 계산
  - [ ] 이전 주 이슈 지수 조회
  - [ ] 변화량 계산 (절대값, 백분율)
  - [ ] main_keyword 추출 (상위 태그 1개)
  - [ ] trend 판정 (상승/하강/유지)
  
- [ ] Redis 캐시 갱신
  - [ ] SET issue:index:latest = <data>
  - [ ] SET issue:index:by_category:{cat} = <data>
  - [ ] TTL: 1시간
  
- [ ] 사용자 알림 발송
  - [ ] 변화가 큰 경우만 (예: 5% 이상)
  - [ ] user_interested_models 기반 필터링 (선택)
  - [ ] FCM 푸시 알림 전송

**테스트:**
- [ ] 영향도 점수 계산 검증
- [ ] 카테고리별 점수 범위 확인 (0-100)
- [ ] 전주 대비 변화량 정확성
- [ ] 캐시 갱신 확인

---

#### ☐ 5.14 SLM 분류 배치 (지속적) - 기능 #9

- [ ] Bull 작업 처리기 구현
  - [ ] 미분류 뉴스 조회
  - [ ] 타임아웃: 30초
  
- [ ] SLM 모델 호출 (Mistral 7B)
  - [ ] 프롬프트 작성
  - [ ] 모델 추론
  - [ ] 응답 파싱
  
- [ ] 신뢰도 필터링
  - [ ] confidence >= 70% → confirmed
  - [ ] confidence < 70% → pending_review
  - [ ] 태그 개수 < 1 → rejected
  
- [ ] article_to_tags 저장
  - [ ] insert with 중복 체크
  
- [ ] pending_review 알림 (선택)
  - [ ] 신뢰도 < 70%인 경우 관리자 알림
  
- [ ] Elasticsearch 업데이트 (confirmed만)
  - [ ] 뉴스 문서에 tags 필드 추가

**테스트:**
- [ ] SLM 모델 응답 파싱
- [ ] 신뢰도별 분류 정확성
- [ ] 동시 처리 (Bull 워커 수)

---

#### ☐ 5.15 푸시 알림 시스템 - 기능 (통합)

- [ ] FCM 클라이언트 설정
  - [ ] Firebase Admin SDK 초기화
  
- [ ] 알림 타입별 발송
  - [ ] 모델 업데이트 알림
  - [ ] 이슈 지수 변화 알림
  - [ ] 다이제스트 알림 (일일/주간)
  
- [ ] fcm_tokens 관리
  - [ ] POST `/api/v1/users/:userId/fcm-token` - 토큰 등록
  - [ ] 토큰 갱신/삭제 로직
  
- [ ] 발송 로직
  - [ ] user_push_notifications에 기록
  - [ ] 발송 지연시간 < 2초
  - [ ] 재시도 로직 (최대 3회)

**테스트:**
- [ ] FCM 토큰 등록 확인
- [ ] 알림 수신 확인 (테스트 기기)
- [ ] 발송 지연시간 측정

---

### Phase 4: 관심 모델 및 통합 기능 (1주)

#### ☐ 5.16 관심 모델 관리

- [ ] POST `/api/v1/users/:userId/interested-models`
  - [ ] user_interested_models 저장
  - [ ] UNIQUE 키 (user_id, model_id)
  
- [ ] DELETE `/api/v1/users/:userId/interested-models/:modelId`
  - [ ] 레코드 삭제
  
- [ ] GET `/api/v1/users/:userId/interested-models`
  - [ ] 사용자의 관심 모델 목록

**테스트:**
- [ ] 중복 추가 방지
- [ ] 삭제 후 조회 확인

---

#### ☐ 5.17 사용자 프로필 API

- [ ] GET `/api/v1/users/:userId/profile`
  - [ ] 사용자 정보 조회
  - [ ] 직업 정보 포함
  
- [ ] PUT `/api/v1/users/:userId/profile`
  - [ ] 프로필 수정 (소유자만)
  - [ ] nickname, job_category_id, bio 등

**테스트:**
- [ ] 프로필 조회/수정 동작 확인

---

#### ☐ 5.18 카테고리 및 태그 API

- [ ] GET `/api/v1/categories`
  - [ ] job_categories 목록
  - [ ] ai_categories 목록
  - [ ] interest_tags 목록 (40개)
  - [ ] 캐싱 적용 (TTL: 1일)

**테스트:**
- [ ] 모든 카테고리 반환 확인

---

### Phase 5: 성능 최적화 및 테스트 (1주)

#### ☐ 5.19 성능 최적화

**데이터베이스:**
- [ ] 쿼리 최적화 (EXPLAIN ANALYZE)
  - [ ] 슬로우 쿼리 식별
  - [ ] 인덱스 활용도 확인
  - [ ] N+1 쿼리 제거
  
- [ ] 연결 풀 설정
  - [ ] MySQL: pool size = 20
  - [ ] Redis: pool size = 10
  
- [ ] 분할 쿼리 (batch processing)
  - [ ] 대량 데이터 처리 시 배치 처리

**캐싱:**
- [ ] 캐시 히트율 목표: >= 80%
- [ ] 캐시 워밍(warming) 구현 (선택)
- [ ] 캐시 무효화 전략 재검토

**API 응답:**
- [ ] 응답 압축 (gzip)
- [ ] 필요한 필드만 반환 (필드 필터링)
- [ ] 페이지네이션 한계 설정 (limit <= 100)

---

#### ☐ 5.20 포괄적 테스트

**단위 테스트:**
- [ ] 정규화 함수 테스트
- [ ] 계산 로직 테스트 (이슈 지수, 개선도 등)
- [ ] 입력 검증 테스트

**통합 테스트:**
- [ ] 각 기능 엔드포인트 테스트
- [ ] 에러 시나리오 테스트
- [ ] 캐시 동작 테스트
- [ ] 데이터 일관성 테스트

**부하 테스트:**
- [ ] 동시 사용자 500-1000명
- [ ] 응답시간 목표: P95 < 500ms
- [ ] 에러율 < 1%
- [ ] 데이터베이스 쿼리 시간 < 100ms

**테스트 도구:**
- [ ] Jest (단위 테스트)
- [ ] Supertest (API 테스트)
- [ ] Apache JMeter 또는 k6 (부하 테스트)

---

#### ☐ 5.21 모니터링 및 로깅

- [ ] 로깅 설정
  - [ ] ERROR, WARN, INFO, DEBUG 레벨
  - [ ] 로그 파일 rotation 설정
  
- [ ] 메트릭 수집
  - [ ] API 응답시간
  - [ ] 에러율
  - [ ] 캐시 히트율
  - [ ] DB 쿼리 시간
  
- [ ] 헬스 체크 엔드포인트
  - [ ] GET `/api/v1/health`
  - [ ] 데이터베이스, Redis, Elasticsearch 상태 확인

**모니터링 도구 (선택):**
- [ ] Prometheus (메트릭 수집)
- [ ] Grafana (대시보드)
- [ ] ELK Stack (로그 분석)

---

### Phase 6: 배포 및 안정화 (1주)

#### ☐ 5.22 배포 준비

- [ ] Docker 컨테이너화
  - [ ] Dockerfile 작성
  - [ ] docker-compose.yml 작성 (DB 포함)
  - [ ] 빌드 및 테스트
  
- [ ] 환경 설정
  - [ ] production 환경변수 설정
  - [ ] 로그 레벨 조정
  - [ ] 캐시 TTL 최적화
  
- [ ] 데이터베이스 마이그레이션
  - [ ] 스키마 최종 검증
  - [ ] 인덱스 생성 확인
  - [ ] 시드 데이터 정의 (테스트용)

---

#### ☐ 5.23 스테이징 배포

- [ ] 스테이징 서버에 배포
- [ ] 전체 기능 재검증
- [ ] 실제 데이터로 성능 테스트
- [ ] 모니터링 설정 및 확인
- [ ] 팀과 함께 UAT (User Acceptance Testing)

---

#### ☐ 5.24 프로덕션 배포

- [ ] 백업 전략 수립
- [ ] 롤백 계획 수립
- [ ] 배포 스크립트 작성
- [ ] PM2 설정 (프로세스 관리)
- [ ] 실제 배포
- [ ] 모니터링 및 알림 확인

---

#### ☐ 5.25 배포 후 안정화

- [ ] 실시간 모니터링 (24시간)
- [ ] 에러 로그 분석
- [ ] 성능 지표 확인
- [ ] 긴급 버그 수정 (필요 시)
- [ ] 사용자 피드백 수집

---

## 6. 기능별 프로세스 플로우

### Flow 1: 모델 타임라인 조회 (기능 #1)

```
┌─────────────────────────────┐
│ 사용자: 타임라인 페이지 접속 │
└──────────────┬──────────────┘
               │
               ↓
        ┌──────────────┐
        │ model_id = 1 │
        │ (GPT-4o)     │
        └──────┬───────┘
               │
               ↓
    ┌──────────────────────┐
    │ GET /api/v1/models/1/│
    │ timeline             │
    └──────────┬───────────┘
               │
               ↓
    ┌──────────────────────────┐
    │ JWT 토큰 검증              │
    │ (인증 미들웨어)            │
    └──────────┬───────────────┘
               │
               ↓
    ┌──────────────────────────┐
    │ Redis에서 캐시 확인        │
    │ Key: model:1:timeline    │
    └──┬──────────────────┬────┘
       │                  │
   캐시 미스         캐시 히트
       │                  │
       ↓                  ↓
  ┌──────────┐      ┌──────────┐
  │ DB 조회  │      │ 캐시 반환 │
  │(MySQL)   │      │(<50ms)   │
  └─────┬────┘      └────┬─────┘
        │                │
        ↓                │
   ┌──────────┐          │
   │ 정규화   │          │
   │ 포맷팅   │          │
   │ 가중치   │          │
   └─────┬────┘          │
        │                │
        ↓                │
   ┌──────────┐          │
   │ 캐시 저장 │          │
   │ (1시간)   │          │
   └─────┬────┘          │
        │                │
        └────────┬───────┘
                 │
                 ↓
        ┌──────────────┐
        │ JSON 응답    │
        │ (타임라인)   │
        └──────┬───────┘
               │
               ↓
        ┌──────────────┐
        │ 프론트엔드:  │
        │ 타임라인     │
        │ 시각화       │
        └──────────────┘
```

---

### Flow 2: 배치 작업 - 모델 업데이트 감지 (기능 #6)

```
┌──────────────────────────┐
│ 정기 배치 작업 시작       │
│ (주 2-3회)               │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 1. Artificial Analysis   │
│    API 호출              │
│    (모든 모델 데이터)    │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 2. 버전 비교             │
│    현재 버전 vs DB      │
└──────────┬───────────────┘
           │
           ├─ 신규 업데이트 있음 ──→ 3-1. 신규 업데이트 처리
           │
           └─ 없음 ──→ 종료
                      
           ↓ (신규 업데이트)
┌──────────────────────────┐
│ 3-1. 데이터 검증         │
│      성능 개선도 계산    │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 3-2. DB 저장             │
│      model_updates       │
│      model_updates_details
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 4. 사용자 관심 모델 확인  │
│    user_interested_models│
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 5. FCM 푸시 알림 발송    │
│    (관심 사용자에게)     │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 6. Redis 캐시 무효화     │
│    model:*:scores 등     │
└──────────┬───────────────┘
           │
           ↓
┌──────────────────────────┐
│ 배치 작업 완료           │
└──────────────────────────┘
```

---

### Flow 3: 이슈 지수 계산 배치 (기능 #5)

```
┌──────────────────────┐
│ 매일 자정에 실행     │
│ (배치 작업 시작)     │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────┐
│ 1. 당일 뉴스 데이터 수집     │
│    news_articles 조회        │
│    article_to_tags (confirmed)
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ 2. 영향도 점수 계산           │
│    - 발행 시점 가중치         │
│    - 태그 신뢰도             │
│    - 출처 가중치             │
│    → impact_score 업데이트   │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ 3. 카테고리별 이슈 지수 계산  │
│    각 카테고리:              │
│    - 뉴스 그룹핑            │
│    - 점수 계산              │
│    - 가중치 적용            │
│    → issue_index_by_category│
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ 4. 전체 이슈 지수 계산        │
│    모든 카테고리 가중 평균    │
│    → issue_index_daily      │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ 5. 전주 대비 비교 계산        │
│    - 변화량 (%, 절대값)      │
│    - trend 판정             │
│    - main_keyword 추출       │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ 6. Redis 캐시 갱신           │
│    issue:index:latest       │
│    issue:index:by_category  │
│    TTL: 1시간               │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ 7. 사용자 알림 발송 (선택)   │
│    변화 큰 경우만            │
│    (예: 5% 이상)            │
└──────────┬──────────────────┘
           │
           ↓
┌──────────────────────────┐
│ 배치 작업 완료           │
└──────────────────────────┘
```

---

## 7. 기능 간 연동 설계

### 7.1 데이터 흐름 맵

```
┌─────────────┐
│ 외부 API    │ (Artificial Analysis, Naver News, Google Trends)
└──────┬──────┘
       │
       ├─→ [배치 #1] 모델 데이터 수집 ──→ model_updates
       │                              ──→ model_benchmarks
       │
       └─→ [배치 #2] 뉴스 수집 ──→ news_articles (MySQL)
                                ──→ raw_news_articles (MongoDB)
                                ──→ Bull 큐 (분류 작업)
                                ──→ Elasticsearch

[배치 #3] SLM 분류
    ↓ (Bull 큐에서 지속적)
    ├─→ article_to_tags (확정/대기)
    └─→ Elasticsearch 인덱싱

[배치 #4] 이슈 지수 계산 (매일 자정)
    ↓
    ├─→ issue_index_daily
    ├─→ issue_index_by_category
    ├─→ Redis 캐시 갱신
    └─→ FCM 푸시 알림

사용자 요청 (프론트엔드)
    ↓
    ├─→ 모델 조회 ──→ 캐시/DB ──→ 응답
    ├─→ 비교 ──→ 정규화 ──→ 캐시 ──→ 응답
    ├─→ 게시글 ──→ MySQL + Elasticsearch ──→ 응답
    └─→ 이슈 지수 ──→ Redis 캐시 ──→ 응답
```

---

### 7.2 기능 간 의존성

```
┌─────────────────────────────────────┐
│ 기초 계층 (독립적)                  │
├─────────────────────────────────────┤
│ #1: 타임라인                        │
│ #2: 모델 비교                       │
│ #3: 커뮤니티                        │
│ #5: 이슈 지수                       │
│ #6: 모델 업데이트                  │
│ #7: 뉴스 수집                       │
└─────────────────────────────────────┘
             ↑
             │ (데이터 제공)
┌─────────────────────────────────────┐
│ 중간 계층 (의존성 있음)              │
├─────────────────────────────────────┤
│ #9: 뉴스 태그 분류                  │
│ (의존: #7 뉴스 수집)                │
│ (#5 이슈 지수에 데이터 제공)         │
└─────────────────────────────────────┘
             ↑
             │ (데이터 제공)
┌─────────────────────────────────────┐
│ 상위 계층 (통합)                    │
├─────────────────────────────────────┤
│ #4: 사용 목적별 AI 모델 추천/검색   │
│ (의존: #1, #2, #5, #6 데이터 활용) │
│                                     │
│ #8: 개인화 피드                     │
│ (의존: 모든 기능)                   │
└─────────────────────────────────────┘
```

---

### 7.3 데이터 통일성 보장

```
┌───────────────────────────────────┐
│ 데이터 일관성 체크포인트            │
├───────────────────────────────────┤
│ 1. 점수 정규화 (기능 #1, #2, #6)  │
│    - 모든 벤치마크 0-100 범위      │
│    - 공식 통일: normalizeScore()  │
│                                   │
│ 2. 태그 표준화 (기능 #7, #9)      │
│    - 40개 표준 태그만 사용         │
│    - interest_tags 테이블 기준     │
│                                   │
│ 3. 캐시 일관성 (기능 #1-6)        │
│    - 배치 작업 후 캐시 무효화      │
│    - 사용자 수정 후 캐시 갱신     │
│                                   │
│ 4. 시간대 통일                     │
│    - 모든 시간 UTC 저장            │
│    - 응답 시 사용자 TZ 변환        │
└───────────────────────────────────┘
```

---

## 8. 배포 및 검증

### 8.1 배포 체크리스트

#### 배포 전 검증

- [ ] 모든 단위 테스트 통과 (커버율 >= 80%)
- [ ] 모든 통합 테스트 통과
- [ ] 부하 테스트 결과 검토 (P95 응답시간 < 500ms)
- [ ] 코드 리뷰 완료
- [ ] 보안 검사 완료 (SQL Injection, XSS, CSRF 등)
- [ ] 환경변수 설정 확인
- [ ] 데이터베이스 마이그레이션 스크립트 준비
- [ ] 롤백 계획 수립

#### 배포 중

- [ ] 현재 버전 백업
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 새 버전 배포 (무중단 배포 방식)
- [ ] 헬스 체크 확인
- [ ] 모니터링 실시간 확인

#### 배포 후

- [ ] 모니터링 24시간 지속
- [ ] 에러 로그 검토
- [ ] 성능 지표 검토
- [ ] 사용자 피드백 수집
- [ ] 긴급 버그 수정 (필요 시)

---

### 8.2 성능 검증 기준

| 항목 | 목표 | 측정 도구 |
|------|------|---------|
| API 응답시간 | P95 < 500ms | Prometheus + Grafana |
| 에러율 | < 1% | 로그 분석 |
| 캐시 히트율 | > 80% | Redis 통계 |
| DB 쿼리 시간 | < 100ms | EXPLAIN ANALYZE |
| 처리량 | 100-500 req/sec | k6 부하 테스트 |

---

### 8.3 모니터링 대시보드

```
┌─────────────────────────────────────┐
│ 실시간 모니터링 지표                 │
├─────────────────────────────────────┤
│ API 응답시간 (P50/P95/P99)          │
│ 에러율 (5분 단위)                    │
│ 캐시 히트율                          │
│ 데이터베이스 연결 상태               │
│ 배치 작업 상태 (성공/실패)          │
│ Redis 메모리 사용량                  │
│ CPU/메모리 사용률                   │
│ 동시 접속자 수                       │
│ FCM 알림 발송 현황                  │
└─────────────────────────────────────┘
```

---

### 8.4 긴급 대응 계획

```
┌─────────────────────────────┐
│ 에러 감지 (모니터링)        │
└──────────────┬──────────────┘
               │
               ↓
        ┌──────────────┐
        │ 에러율 > 5%? │
        └──┬───────┬──┘
           │       │
       YES │       │ NO → 모니터링 지속
           │       │
           ↓       └────→ [계속]
    ┌───────────────┐
    │ 알림 발송     │
    │ (개발팀)      │
    └───────┬───────┘
            │
            ↓
    ┌───────────────────┐
    │ 원인 파악          │
    │ - 로그 분석        │
    │ - 최근 변경사항 확인│
    │ - DB 상태 확인    │
    └───────┬───────────┘
            │
            ↓
    ┌───────────────────┐
    │ 조치 결정          │
    ├───────────────────┤
    │ - 간단한 버그      │
    │   → 핫픽스        │
    │ - 복잡한 문제      │
    │   → 롤백 + 분석    │
    │ - 외부 서비스 문제 │
    │   → 대체 방법 실행 │
    └───────┬───────────┘
            │
            ↓
    ┌───────────────────┐
    │ 조치 실행          │
    └───────┬───────────┘
            │
            ↓
    ┌───────────────────┐
    │ 모니터링 재개      │
    │ (에러율 정상 확인)  │
    └───────────────────┘
```

---

## 📌 주요 주의사항

### 의존성 순서

```
✅ 먼저 완료해야 할 것:
1. 데이터베이스 설계 & 테이블 생성
2. 인증 시스템 (JWT)
3. 캐싱 레이어 (Redis)
4. 기본 CRUD API

⏳ 그 다음:
5. 배치 작업 (모델 수집, 뉴스 수집)
6. 정규화 및 점수 계산 로직
7. 알림 시스템

⏸ 마지막:
8. 최적화 & 모니터링
9. 배포 & 운영
```

---

### 보안 체크리스트

- [ ] 모든 API에 JWT 인증
- [ ] SQL Injection 방지 (파라미터화 쿼리)
- [ ] XSS 방지 (입력 검증, HTML 이스케이프)
- [ ] CSRF 토큰 (상태 변경 API)
- [ ] Rate Limiting 적용
- [ ] API 키 환경변수 관리
- [ ] 암호화된 비밀번호 저장 (bcrypt)
- [ ] HTTPS 강제 (프로덕션)

---

### 리소스 할당

```
👨‍💼 최수안 (백엔드 팀장)
├─ 전체 조율 & 리뷰
├─ API 설계 & 설명서 작성
├─ 배포 & 운영

👨‍💻 예병성 (백엔드 개발)
├─ DB 설계 & 구축
├─ 배치 작업 구현
├─ 모든 API 구현
└─ 테스트 작성
```

---

## 🎯 성공 기준

| 항목 | 기준 |
|------|------|
| **기능 완성도** | 9개 기능 모두 구현 완료 |
| **API 응답시간** | P95 < 500ms, P99 < 1s |
| **에러율** | < 1% |
| **테스트 커버율** | >= 80% |
| **배포 성공** | 무중단 배포, 즉시 롤백 가능 |
| **모니터링** | 24/7 모니터링 시스템 운영 |
| **문서화** | API 문서 100% 작성 |

---

**작성 완료** ✅  
**다음 단계**: Phase 1 (기초 인프라) 시작  
**기대 일정**: 2025-11-15 ~ 2026-01-10 (8주)