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

## 설정

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
```
