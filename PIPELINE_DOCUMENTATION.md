# AI 뉴스 클러스터링 & 이슈 지수 시스템

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [데이터베이스 구조](#데이터베이스-구조)
3. [파이프라인 흐름](#파이프라인-흐름)
4. [API 엔드포인트](#api-엔드포인트)
5. [이슈 지수 산출 공식](#이슈-지수-산출-공식)
6. [구현 파일 가이드](#구현-파일-가이드)

---

## 시스템 개요

**목표**: 최신 뉴스 1000개를 AI가 자동으로 분류하고, 이슈 지수를 계산하여 REST API로 제공

**핵심 기능**:
- ✅ 뉴스 자동 클러스터링 (ChatGPT Assistants API)
- ✅ 클러스터별 이슈 점수 계산
- ✅ 통합 이슈 지수 산출
- ✅ 시간별 근거 추적
- ✅ 1시간마다 자동 실행
- ✅ GPT API 오류 시 최대 2번 자동 재시도

---

## 데이터베이스 구조

### 1️⃣ MongoDB - 분류 결과 저장

#### Clusters 컬렉션
```javascript
{
  cluster_id: "cluster_001",
  topic_name: "GPT-5 출시",
  tags: ["LLM", "AI성능", "모델출시", "AI일자리", "기술트렌드"],
  appearance_count: 4,
  status: "active" | "inactive",
  history: [
    {
      collected_at: "2025-11-11T10:00:00Z",
      article_indices: [0, 4, 15, 67],
      article_count: 4
    }
  ],
  created_at: "2025-11-11T10:00:00Z",
  updated_at: "2025-11-11T12:00:00Z"
}
```

#### Cluster_Snapshots 컬렉션
```javascript
{
  collected_at: "2025-11-11T12:00:00Z",
  cluster_id: "cluster_001",
  topic_name: "GPT-5 출시",
  tags: ["LLM", "AI성능", "모델출시", "AI일자리", "기술트렌드"],
  appearance_count: 3,
  article_count: 5,
  article_indices: [0, 4, 15, 67, 234],
  status: "active",
  cluster_score: 21.2
}
```

**특징**:
- ✅ 매 수집 시점마다 모든 클러스터 기록
- ✅ 비활성 클러스터: article_indices=[], cluster_score=0
- ✅ 90일 후 자동 삭제 (TTL)
- ✅ 이슈 지수 근거 추적용

---

### 2️⃣ MySQL - 계산된 이슈 지수 저장

```sql
CREATE TABLE issue_index (
  collected_at DATETIME NOT NULL PRIMARY KEY,
  overall_index DECIMAL(5, 1) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

**데이터 예시**:
```
collected_at          | overall_index
2025-11-11 10:00:00  | 20.0
2025-11-11 11:00:00  | 42.5
2025-11-11 12:00:00  | 44.1
```

**특징**:
- ✅ 빠른 조회 (O(1) - PK 기반)
- ✅ 매 시간 1개 행 추가

---

### 3️⃣ ElasticSearch - 뉴스 기사 저장

**인덱스**: articles

**문서 구조**:
```javascript
{
  collected_at: "2025-11-11T12:00:00Z",
  source: "naver",
  articles: [
    {
      index: 0,
      title: "도봉구, 인공지능 대전환 시대...",
      link: "https://...",
      description: "...",
      pubDate: "2025-11-11T10:14:00+09:00"
    }
    // ... 999개 더
  ]
}
```

---

## 파이프라인 흐름

### 전체 프로세스

```
매 1시간마다 자동 실행
    ↓
1️⃣ 전처리 (Preprocessing)
   • ElasticSearch: 1000개 기사 조회
   • MongoDB: active + 30일내 비활성 클러스터
   ↓
2️⃣ GPT 분류 (Classification)
   • Assistants API 호출
   • 응답 파싱 및 검증
   • 최대 2번 재시도
   ↓
3️⃣ DB 저장 (Save to Databases)
   • MongoDB: clusters + cluster_snapshots
   • MySQL: issue_index (지수만)
   ↓
4️⃣ 이슈 지수 계산 (Calculate Index)
   • 활성 평균 계산
   • 비활성 감쇠 적용
   • 통합 지수 산출
    ↓
✅ 완료
```

---

## API 엔드포인트

### 1️⃣ 현재 이슈 지수
```
GET /api/issue-index/current
```

**응답 (200)**:
```json
{
  "collected_at": "2025-11-11T12:00:00Z",
  "overall_index": 44.1
}
```

---

### 2️⃣ 과거 이슈 지수
```
GET /api/issue-index/history?date=2025-11-11T12:00:00Z
```

---

### 3️⃣ 클러스터 스냅샷 (근거)
```
GET /api/issue-index/clusters?collected_at=2025-11-11T12:00:00Z
```

**응답 (200)**:
```json
{
  "collected_at": "2025-11-11T12:00:00Z",
  "clusters": [
    {
      "cluster_id": "cluster_001",
      "topic_name": "GPT-5 출시",
      "tags": ["LLM", "AI성능", "모델출시", "AI일자리", "기술트렌드"],
      "appearance_count": 4,
      "article_count": 5,
      "article_indices": [0, 4, 15, 67, 234],
      "status": "active",
      "cluster_score": 21.2
    }
  ],
  "metadata": {
    "total_clusters": 2,
    "total_articles": 9
  }
}
```

---

### 4️⃣ 기사 원문
```
GET /api/issue-index/articles?collected_at=2025-11-11T12:00:00Z&indices=0,4,15,67
```

**응답 (200)**:
```json
{
  "collected_at": "2025-11-11T12:00:00Z",
  "article_count": 4,
  "articles": [
    {
      "index": 0,
      "title": "도봉구, 인공지능 대전환 시대...",
      "link": "https://...",
      "description": "...",
      "pubDate": "2025-11-11T10:14:00+09:00"
    }
  ]
}
```

---

## 이슈 지수 산출 공식

### 1단계: 클러스터 점수 계산

```
cluster_score = 20 + (80 × log(appearance_count)) / log(720)
```

범위: 20~100점

---

### 2단계: 활성 클러스터 평균

```
활성_평균 = Σ(활성 점수) / 활성 수
```

**예시**:
```
활성: cluster_001 (45.8) + cluster_002 (38.9) + cluster_003 (42.1) = 42.27
```

---

### 3단계: 비활성 클러스터 감쇠

```
비활성_점수 = cluster_score × e^(-0.1 × 비활성_경과일수)
```

**감쇠율 예시**:
```
0일:  100%
5일:  60.7%
10일: 36.8%
30일: 4.98%
```

---

### 4단계: 비활성 평균

```
비활성_평균 = Σ(비활성_점수) / 30일 이내 비활성 수
```

---

### 5단계: 통합 지수 계산

```
통합 지수 = (활성_평균 × 0.7) + (비활성_평균 × 0.3)
```

**가중치**:
- 활성 클러스터: 70% (현재 이슈 중심)
- 비활성 클러스터: 30% (과거 이슈 반영)

**예시**:
```
활성_평균 = 42.27
비활성_평균 = 16.84

통합 지수 = (42.27 × 0.7) + (16.84 × 0.3)
         = 29.59 + 5.05
         = 34.6
```

---

## 구현 파일 가이드

### 핵심 서비스 파일

| 파일 | 역할 | 주요 함수 |
|------|------|---------|
| `gpt_input_preprocessing.ts` | 전처리 | `preprocessGPTInputData()` |
| `gpt-classifier.ts` | GPT 분류 | `classifyNewsWithGPT()` |
| `db-save.ts` | MongoDB 저장 | `saveClassificationResultToDB()` |
| `calculate-issue-index.ts` | 지수 계산 | `calculateIssueIndex()` |
| `save-issue-index.ts` | MySQL 저장 | `saveIssueIndexToMySQL()` |
| `news-clustering-pipeline.ts` | 오케스트레이션 | `startScheduler()` |

---

## 주요 특징

| 항목 | 상세 |
|------|------|
| **분류 방식** | ChatGPT Assistants API |
| **태그 체계** | 40개 표준 태그, 클러스터당 5개 |
| **지수 범위** | 0~100점 |
| **실행 주기** | 1시간마다 (자동) |
| **재시도 정책** | 최대 2번 (5초 간격) |
| **데이터 보존** | MongoDB 90일, MySQL 무제한 |
| **응답 시간** | <10ms (MySQL) |

---

## 설정 및 실행 가이드

### 환경변수 설정

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ai_news_classifier

# MySQL
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DB=ai_news_classifier

# ElasticSearch
ELASTICSEARCH_HOST=http://localhost:9200

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_EaIPCgI31CX996Zvl61Oqk7C

# Pipeline
PIPELINE_ENABLE_SCHEDULE=true
PIPELINE_SCHEDULE_TIME=0 * * * *
PIPELINE_MAX_RETRIES=2
PIPELINE_RETRY_DELAY_MS=5000

# Server
PORT=3000
NODE_ENV=development
```

---

## 인프라 파일 상세 가이드

### 1️⃣ **`scripts/init-databases.ts`** - DB 초기화

**역할**: MongoDB, MySQL, ElasticSearch 초기 설정

**실행 방법**:
```bash
npm run init:db
```

**실행 내용**:

#### MongoDB 초기화
```
✅ 데이터베이스 생성: ai_news_classifier
✅ 컬렉션 생성:
   - clusters (인덱스: cluster_id, status, updated_at)
   - cluster_snapshots (인덱스: collected_at, cluster_id, TTL 90일)
```

#### MySQL 초기화
```
✅ 데이터베이스 생성: ai_news_classifier
✅ 테이블 생성:
   - issue_index
     PK: collected_at (DATETIME)
     칼럼: overall_index (DECIMAL 5,1)
     인덱스: collected_at DESC
```

#### ElasticSearch 초기화
```
✅ 인덱스 생성: articles
✅ 매핑 설정:
   - Analyzer: 한글 형태소 분석 (nori tokenizer)
   - Nested documents: 최신 1000개 기사
```

**주의**: 최초 1회만 실행. 이후 실행 시 기존 데이터는 유지됨.

---

### 2️⃣ **`src/database/elasticsearch.ts`** - ElasticSearch 클라이언트

**역할**: ElasticSearch와의 모든 통신 담당

**주요 함수**:

#### `getElasticsearchClient()`
```typescript
// ElasticSearch 클라이언트 생성 (싱글톤)
const client = getElasticsearchClient();
```

#### `getLatestArticlesFromES()`
```typescript
// 최신 1000개 기사 조회
const articles = await getLatestArticlesFromES();
// 반환: { collected_at, source, articles: [...1000개] }
```

#### `getArticlesByIndices(indices: number[])`
```typescript
// 특정 인덱스의 기사 조회
const articles = await getArticlesByIndices([0, 4, 15, 67]);
// 반환: Article[]
```

#### `testElasticsearchConnection()`
```typescript
// 연결 테스트
const isConnected = await testElasticsearchConnection();
```

**특징**:
- ✅ 자동 재시도 로직
- ✅ 에러 처리
- ✅ 로깅

---

### 3️⃣ **`src/api/api-endpoints.ts`** - API 엔드포인트

**역할**: 4개 REST API 구현

**함수별 상세**:

#### `getCurrentIssueIndex(req, res)`
```
요청: GET /api/issue-index/current
처리:
  1. MySQL에서 최신 issue_index 조회
  2. JSON 응답 반환
응답 형식:
  { "collected_at": "...", "overall_index": 44.1 }
```

#### `getHistoryIssueIndex(req, res)`
```
요청: GET /api/issue-index/history?date=2025-11-11T12:00:00Z
처리:
  1. 파라미터 검증 (ISO 8601 형식)
  2. MySQL에서 해당 날짜 조회
  3. 404 또는 데이터 반환
```

#### `getClustersSnapshot(req, res)`
```
요청: GET /api/issue-index/clusters?collected_at=2025-11-11T12:00:00Z
처리:
  1. 파라미터 검증
  2. MongoDB cluster_snapshots에서 조회
  3. 메타데이터 포함하여 반환
응답:
  {
    "collected_at": "...",
    "clusters": [...],
    "metadata": {
      "total_clusters": 2,
      "total_articles": 9
    }
  }
```

#### `getArticlesOriginal(req, res)`
```
요청: GET /api/issue-index/articles?collected_at=...&indices=0,4,15,67
처리:
  1. 파라미터 검증 (collected_at, indices)
  2. indices 파싱: "0,4,15,67" → [0, 4, 15, 67]
  3. ElasticSearch에서 기사 조회
  4. 기사 배열 반환
```

**에러 처리**:
- ✅ 400: Missing/Invalid parameter
- ✅ 404: Data not found
- ✅ 500: Server error

---

### 4️⃣ **`src/index.ts`** - Express 메인 앱

**역할**: 서버 시작, 라우트 등록, 파이프라인 스케줄러 시작

**실행 흐름**:

```
npm start
  ↓
1️⃣ 환경설정 로드
  - .env 파일 읽기
  - 포트, 환경변수 설정
  ↓
2️⃣ DB 연결 초기화
  - MySQL 풀 생성
  - Redis 캐시 초기화
  ↓
3️⃣ Express 앱 설정
  - 미들웨어 등록 (JSON 파싱, 요청 로깅)
  - 4개 API 라우트 등록
  - 헬스체크 엔드포인트 등록
  ↓
4️⃣ 파이프라인 스케줄러 시작
  - cron job 설정 (매 시간 정각)
  - 1시간마다 뉴스 분류 자동 실행
  ↓
5️⃣ 서버 시작
  - 포트 3000 (또는 설정값)에서 listening
  ↓
✅ 완료 - API 호출 가능
```

**새로 추가된 라우트**:

```
📋 News Clustering API Routes:
   GET  /api/issue-index/current
   GET  /api/issue-index/history?date=...
   GET  /api/issue-index/clusters?collected_at=...
   GET  /api/issue-index/articles?indices=...
   GET  /health/news-clustering
   GET  /health/news-clustering/detailed
```

---

## 🚀 실행 단계별 가이드

### Step 1: 환경변수 설정
```bash
# .env 파일 생성 (.env.example 복사)
cp .env.example .env

# .env 파일 수정 (실제 DB 정보 입력)
MONGODB_URI=mongodb://localhost:27017
MYSQL_HOST=localhost
OPENAI_API_KEY=sk-xxx...
```

### Step 2: 데이터베이스 초기화 (최초 1회)
```bash
npm run init:db
```

**콘솔 출력**:
```
========== MongoDB Initialization ==========
✅ Connected to MongoDB
✅ clusters collection created
✅ Indexes created (with TTL 90 days)

========== MySQL Initialization ==========
✅ Connected to MySQL
✅ Database created
✅ issue_index table created

========== ElasticSearch Initialization ==========
✅ Connected to ElasticSearch
✅ articles index created with Korean analyzer

✅ All databases initialized successfully!
```

### Step 3: 서버 시작
```bash
npm start
```

**콘솔 출력**:
```
🚀 Ainus AI & News Clustering System
========== ========== ==========
📅 Timestamp: 2025-11-17T...
🌍 Environment: development

Initializing database pool...
✅ Database pool initialized
Initializing Redis cache...
✅ Redis cache initialized

📋 News Clustering API Routes:
   GET  /api/issue-index/current
   GET  /api/issue-index/history?date=...
   GET  /api/issue-index/clusters?collected_at=...
   GET  /api/issue-index/articles?indices=...

========== ========== ==========
✅ Server is running on http://localhost:3000
========== ========== ==========

📅 Starting News Clustering Pipeline Scheduler...
✅ Scheduler is running. Next execution: 2025-11-18T09:00:00Z
```

---

## 📡 API 호출 예시

### 1️⃣ 현재 이슈 지수 조회

```bash
curl http://localhost:3000/api/issue-index/current
```

**응답**:
```json
{
  "collected_at": "2025-11-11T12:00:00Z",
  "overall_index": 44.1
}
```

---

### 2️⃣ 과거 이슈 지수 조회

```bash
curl http://localhost:3000/api/issue-index/history?date=2025-11-11T12:00:00Z
```

**응답**:
```json
{
  "collected_at": "2025-11-11T12:00:00Z",
  "overall_index": 42.5
}
```

---

### 3️⃣ 클러스터 스냅샷 조회 (근거)

```bash
curl http://localhost:3000/api/issue-index/clusters?collected_at=2025-11-11T12:00:00Z
```

**응답**:
```json
{
  "collected_at": "2025-11-11T12:00:00Z",
  "clusters": [
    {
      "cluster_id": "cluster_001",
      "topic_name": "GPT-5 출시",
      "tags": ["LLM", "AI성능", "모델출시", "AI일자리", "기술트렌드"],
      "appearance_count": 4,
      "article_count": 5,
      "article_indices": [0, 4, 15, 67, 234],
      "status": "active",
      "cluster_score": 21.2
    }
  ],
  "metadata": {
    "total_clusters": 1,
    "total_articles": 5
  }
}
```

---

### 4️⃣ 기사 원문 조회

```bash
curl "http://localhost:3000/api/issue-index/articles?collected_at=2025-11-11T12:00:00Z&indices=0,4,15"
```

**응답**:
```json
{
  "collected_at": "2025-11-11T12:00:00Z",
  "article_count": 3,
  "articles": [
    {
      "index": 0,
      "title": "도봉구, 인공지능 대전환 시대 직원 대상 '로봇인공지능 체험교육'",
      "link": "https://weekly.cnbnews.com/news/article.html?no=196188",
      "description": "교육에서는 ▲전시물 도슨트 투어...",
      "pubDate": "2025-11-11T10:14:00+09:00"
    },
    {
      "index": 4,
      "title": "대우건설, '대한민국 인공지능 혁신대상' 종합대상 수상",
      "link": "https://www.thefairnews.co.kr/news/articleView.html?idxno=60198",
      "description": "AI 혁신을 선도한 공로로...",
      "pubDate": "2025-11-11T09:30:00+09:00"
    }
  ]
}
```

---

### 5️⃣ 헬스 체크

```bash
# 간단한 헬스 체크
curl http://localhost:3000/health/news-clustering

# 상세 헬스 체크
curl http://localhost:3000/health/news-clustering/detailed
```

**응답**:
```json
{
  "status": "ok",
  "service": "news-clustering",
  "timestamp": "2025-11-17T08:30:45Z",
  "services": {
    "elasticsearch": "connected",
    "mongodb": "configured",
    "mysql": "configured"
  }
}
```

---

## 🔧 트러블슈팅

### 문제: "MongoDB 연결 실패"

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**해결**:
```bash
# MongoDB 실행 확인
mongod --version

# MongoDB 시작
mongod
# 또는 Docker 사용
docker run -d -p 27017:27017 mongo
```

---

### 문제: "MySQL 연결 실패"

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**해결**:
```bash
# MySQL 실행 확인
mysql --version

# MySQL 시작
mysql.server start
# 또는 Docker 사용
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password mysql
```

---

### 문제: "ElasticSearch 연결 실패"

```
Error: RequestError: connect ECONNREFUSED 127.0.0.1:9200
```

**해결**:
```bash
# ElasticSearch 버전 확인
curl http://localhost:9200/

# Docker 사용
docker run -d -p 9200:9200 -e discovery.type=single-node docker.elastic.co/elasticsearch/elasticsearch:8.0.0
```

---

### 문제: "No data found" 응답

**원인**: 아직 파이프라인이 실행되지 않았거나 데이터가 없음

**해결**:
1. 파이프라인이 실행될 때까지 대기
2. 또는 수동으로 파이프라인 실행:
```bash
# (파이프라인 수동 실행 함수 추가 예정)
```

---

## 📊 완전한 파일 구조

```
project/
├── src/
│   ├── index.ts                          (메인 앱 - Express 설정)
│   ├── api/
│   │   └── api-endpoints.ts              (4개 API 엔드포인트)
│   ├── database/
│   │   └── elasticsearch.ts              (ElasticSearch 클라이언트)
│   ├── services/
│   │   ├── calculate-issue-index.ts      (이슈 지수 계산)
│   │   ├── save-issue-index.ts           (MySQL 저장)
│   │   ├── db-save.ts                    (MongoDB 저장)
│   │   ├── gpt-classifier.ts             (GPT 분류)
│   │   ├── gpt_input_preprocessing.ts    (전처리)
│   │   └── news-clustering-pipeline.ts   (오케스트레이션)
│   └── ...
├── scripts/
│   └── init-databases.ts                 (DB 초기화)
├── .env.example                          (환경변수 템플릿)
├── PIPELINE_DOCUMENTATION.md             (이 문서)
└── package.json
```

---

## ✅ 준비 완료 체크리스트

- [ ] `.env` 파일 생성 및 DB 정보 입력
- [ ] MongoDB 실행
- [ ] MySQL 실행
- [ ] ElasticSearch 실행
- [ ] `npm run init:db` 실행 (DB 초기화)
- [ ] `npm start` 실행 (서버 시작)
- [ ] API 호출 테스트
- [ ] 파이프라인 자동 실행 확인 (1시간 후 또는 수동 실행)
