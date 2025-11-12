# Feature #8: 개인화된 AI 트렌드 모니터링 - 개발 가이드

**버전**: 1.0
**작성일**: 2025-11-12
**담당자**: 최수안 (백엔드 팀장)
**예외처리**: agent_exception_handling_guide.md 준수

---

## 📋 목차

1. [개요](#개요)
2. [표준화 데이터](#표준화-데이터)
3. [설치 및 마이그레이션](#설치-및-마이그레이션)
4. [API 엔드포인트](#api-엔드포인트)
5. [파일 구조](#파일-구조)
6. [예외 처리](#예외-처리)
7. [캐싱 전략](#캐싱-전략)
8. [테스트](#테스트)
9. [주의사항](#주의사항)

---

## 개요

**기능 8: 개인화된 AI 트렌드 모니터링**은 사용자가 선택한 직업(13개)과 관심사 태그(40개)를 기반으로 맞춤형 AI 정보를 제공합니다.

### 핵심 기능

- 🏢 **직업 선택**: 13개 표준 직업 카테고리
- 🏷️ **관심 태그**: 40개 표준 관심사 태그
- 📊 **이슈 지수**: 직업별 AI 이슈 지수 (0-100)
- 📰 **뉴스 피드**: 관심 태그 기반 맞춤형 뉴스
- 🛠️ **추천 도구**: 직업별 AI 도구 추천

---

## 표준화 데이터

### 13개 표준 직업 카테고리

| ID | 한글명 | 영문명 | 코드 |
|----|--------|--------|------|
| 1 | 기술/개발 | Tech/Development | TECH_DEV |
| 2 | 창작/콘텐츠 | Creative/Content | CREATIVE |
| 3 | 분석/사무 | Analysis/Administrative | ANALYSIS |
| 4 | 의료/과학 | Healthcare/Science | HEALTHCARE |
| 5 | 교육 | Education | EDUCATION |
| 6 | 비즈니스 | Business | BUSINESS |
| 7 | 제조/건설 | Manufacturing/Construction | MANUFACTURING |
| 8 | 서비스 | Service | SERVICE |
| 9 | 창업/자영업 | Startup/Self-Employment | STARTUP |
| 10 | 농업/축산업 | Agriculture/Livestock | AGRICULTURE |
| 11 | 어업/해상업 | Fisheries/Maritime | FISHERIES |
| 12 | 학생 | Student | STUDENT |
| 13 | 기타 | Others | OTHER |

### 40개 표준 관심사 태그

**기술 중심 (12개)**: LLM, 컴퓨터비전, 자연어처리, 머신러닝, 강화학습, 연합학습, 모델경량화, 프롬프트엔지니어링, 에지AI, 윤리AI, AI보안, 개인화추천

**산업/응용 (18개)**: 콘텐츠생성, 이미지생성, 영상생성, 코드생성, 글쓰기지원, 번역, 음성합성, 음성인식, 채팅봇, 감정분석, 데이터분석, 예측분석, 자동화, 업무효율화, 의사결정지원, 마케팅자동화, 검색최적화, 가격결정

**트렌드/이슈 (10개)**: AI일자리, AI윤리, AI규제, AI성능, 모델출시, 오픈소스, 의료진단, 교육지원, 비용절감, 기술트렌드

**참고 파일**: `Ainus 표준화 태그.md`

---

## 설치 및 마이그레이션

### 1. 데이터베이스 마이그레이션

마이그레이션은 앱 시작 시 자동 실행됩니다.

```bash
# 수동 마이그레이션 실행 (필요한 경우)
npm run migrate
```

**생성되는 테이블:**
- `jobs` - 13개 직업 카테고리
- `interest_tags` - 40개 관심사 태그
- `user_interest_tags` - 사용자가 선택한 태그
- `job_to_interest_tags` - 직업별 추천 태그
- `job_occupation_to_tasks` - 직업-작업 매핑

### 2. Redis 설정

캐싱을 위해 Redis가 필요합니다.

```bash
# Redis 서버 실행
redis-server

# 환경 변수 설정
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. 환경 변수

```env
# .env 파일
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=ainus_db
DATABASE_USER=root
DATABASE_PASSWORD=password

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your_secret_key
NODE_ENV=development
```

---

## API 엔드포인트

### 1. 직업 목록 조회

```http
GET /api/v1/jobs
```

**응답 예시:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "jobs": [
      {
        "job_id": 1,
        "job_code": "TECH_DEV",
        "job_name_ko": "기술/개발",
        "job_name_en": "Tech/Development",
        "description": "소프트웨어 및 데이터 개발 직무",
        "icon_url": null,
        "recommended_tags": [
          {
            "tag_id": 1,
            "tag_name_ko": "LLM",
            "tag_name_en": "Large Language Model",
            "recommendation_rank": 1
          }
        ]
      }
    ],
    "total_jobs": 13,
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

**캐싱**: 24시간 (Redis)
**속도 제한**: 분당 100 요청

---

### 2. 사용자 직업 및 태그 저장

```http
PUT /api/v1/users/profile/job-and-tags
Authorization: Bearer {token}
Content-Type: application/json
```

**요청 본문:**
```json
{
  "job_category_id": 1,
  "interest_tag_ids": [1, 3, 4, 16, 7, 9, 36]
}
```
※ 기술/개발 선택 시 자동 추천: LLM(1), 컴퓨터비전(2), 자연어처리(3), 머신러닝(4), 코드생성(16), 모델경량화(7), 에지AI(9), 오픈소스(36)

**응답 예시:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "user_id": 12345,
    "job_category": {
      "job_id": 1,
      "job_name_ko": "기술/개발",
      "job_name_en": "Tech/Development"
    },
    "interest_tags": [
      {
        "tag_id": 1,
        "tag_name_ko": "LLM",
        "tag_name_en": "Large Language Model"
      }
    ],
    "profile_updated_at": "2025-01-15T12:05:00Z"
  }
}
```

**검증:**
- `job_category_id`: 1-13 범위
- `interest_tag_ids`: 1-40개 태그
- 모든 태그 ID 유효성 확인

**에러 응답:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "직업 ID는 1-13 범위여야 합니다",
    "status": 400,
    "failed_method": "saveUserJobAndTags",
    "retry_possible": false
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

### 3. 직업별 이슈 지수 조회

```http
GET /api/v1/jobs/{job_category_id}/issue-index?days=30
Authorization: Bearer {token}
```

**쿼리 파라미터:**
- `days`: 조회 기간 (1-365일, 기본값: 30)

**응답 예시:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "job_category": {
      "job_id": 1,
      "job_name_ko": "기술/개발",
      "job_name_en": "Tech/Development"
    },
    "current_index": {
      "date": "2025-01-15",
      "value": 82,
      "previous_value": 79,
      "change_percentage": 3.8,
      "change_direction": "up",
      "last_updated_at": "2025-01-15T00:00:00Z"
    },
    "trend_data": [
      {
        "date": "2025-01-15",
        "value": 82
      }
    ],
    "source_articles": []
  }
}
```

**캐싱**: 6시간 (Redis)
**속도 제한**: 분당 60 요청

---

### 4. 관심 태그 기반 뉴스 피드

```http
GET /api/v1/news/by-tags?limit=10&offset=0&sort_by=published_at&days=7
Authorization: Bearer {token}
```

**쿼리 파라미터:**
- `limit`: 반환할 뉴스 개수 (1-50, 기본값: 10)
- `offset`: 페이지네이션 오프셋 (기본값: 0)
- `sort_by`: 정렬 기준 (published_at/relevance)
- `days`: 최근 N일 뉴스 (1-90, 기본값: 7)

**응답 예시:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "total_count": 156,
    "articles": [
      {
        "article_id": 1001,
        "title": "PyTorch 2.0 출시, 성능 50% 향상",
        "summary": "새로운 버전에서 컴파일 최적화로 50% 성능 향상",
        "source": "Naver News",
        "source_url": "https://news.naver.com/article/123",
        "published_at": "2025-01-15T10:30:00Z",
        "tags": ["머신러닝", "오픈소스"],
        "matched_tags": ["머신러닝"],
        "impact_score": 92,
        "is_cited_in_index": true,
        "thumbnail_url": "https://cdn.example.com/img_1.jpg"
      }
    ],
    "timestamp": "2025-01-15T12:00:00Z"
  }
}
```

**캐싱**: 1시간 (Redis, 사용자별)
**속도 제한**: 분당 60 요청

---

### 5. 직업별 추천 도구

```http
GET /api/v1/jobs/{job_category_id}/recommended-tools
```

**응답 예시:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "job_category": {
      "job_id": 1,
      "job_name_ko": "기술/개발",
      "job_name_en": "Tech/Development"
    },
    "tool_categories": [
      {
        "category_name": "코드 생성",
        "description": "자동 코드 작성 및 개발 효율화",
        "tools": [
          {
            "tool_id": 101,
            "tool_name": "GitHub Copilot",
            "description": "AI 기반 코드 자동 완성",
            "rating": 4.8,
            "use_cases": ["자동 코드 생성", "버그 수정"],
            "pricing_tier": "paid",
            "url": "https://github.com/features/copilot"
          }
        ]
      }
    ]
  }
}
```

**캐싱**: 24시간 (Redis)
**속도 제한**: 분당 60 요청

---

## 파일 구조

```
src/
├── services/
│   └── TrendMonitoringService.ts     # 메인 비즈니스 로직
├── routes/
│   └── trendMonitoring.ts           # API 라우터
├── database/
│   ├── migrations.ts                # DB 마이그레이션
│   └── create-feature8-tables.sql    # SQL 스크립트
└── app.ts                           # 라우터 마운트
```

### TrendMonitoringService 메서드

| 메서드 | 설명 | 예외 처리 |
|--------|------|---------|
| `getJobs()` | 직업 목록 조회 | DatabaseException, ValidationException |
| `saveUserJobAndTags()` | 사용자 프로필 저장 | ValidationException, DatabaseException |
| `getJobIssueIndex()` | 이슈 지수 조회 | ValidationException, DatabaseException |
| `getNewsByTags()` | 태그 기반 뉴스 | ValidationException, DatabaseException |
| `getRecommendedTools()` | 추천 도구 조회 | ValidationException, DatabaseException |

---

## 예외 처리

### 예외 클래스 계층

```
AgentException (기본 클래스)
├── ValidationException       → 400 Bad Request
├── DatabaseException         → 500 Server Error (재시도 가능)
├── AuthenticationException   → 401 Unauthorized
├── TimeoutException          → 504 Gateway Timeout (재시도 가능)
└── ExternalAPIException      → 503 Service Unavailable (재시도 가능)
```

### 예외 처리 예시

```typescript
// TrendMonitoringService.ts의 getJobs() 메서드

try {
  // 1단계: 입력 검증
  if (!isValid(input)) {
    throw new ValidationException('입력 오류', methodName);
  }

  // 2단계: 비즈니스 로직
  const result = await executeQuery(sql);

  // 3단계: 결과 저장 및 캐싱
  await redis.set(cacheKey, JSON.stringify(result));

  return result;
} catch (error) {
  if (error instanceof ValidationException) {
    throw error;
  }
  throw new DatabaseException(`조회 실패: ${error}`, methodName);
}
```

### 에러 응답 포맷

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "직업 ID는 1-13 범위여야 합니다",
    "status": 400,
    "failed_method": "getJobIssueIndex",
    "retry_possible": false,
    "severity": "low",
    "action_required": "fix_input"
  },
  "timestamp": "2025-01-15T12:00:00Z"
}
```

---

## 캐싱 전략

### Redis 캐시 키 구조

| 데이터 | 캐시 키 | TTL | 무효화 조건 |
|--------|----------|-----|-----------|
| 직업 목록 | `jobs:all` | 24시간 | 수동 |
| 직업별 추천 태그 | `job:{job_id}:tags` | 24시간 | 수동 |
| 이슈 지수 | `job_index:{job_id}:{date}` | 6시간 | 자동 |
| 사용자 프로필 | `user_profile:{user_id}` | 1시간 | 프로필 변경 시 |
| 태그 기반 뉴스 | `news:user:{user_id}` | 1시간 | 1시간 마다 |

### 캐시 무효화 예시

```typescript
// 사용자 프로필 변경 시
async function saveUserJobAndTags(...) {
  // ... 프로필 저장 로직 ...

  // 캐시 무효화
  await redis.del(`user_profile:${userId}`);
  await redis.del(`news:user:${userId}`);
}
```

---

## 테스트

### 1. 직업 목록 테스트

```bash
curl -X GET http://localhost:3000/api/v1/jobs
```

**예상 응답**: 13개 직업 목록

### 2. 프로필 저장 테스트

```bash
curl -X PUT http://localhost:3000/api/v1/users/profile/job-and-tags \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_category_id": 1,
    "interest_tag_ids": [1, 3, 4]
  }'
```

**예상 응답**: 저장된 프로필 정보

### 3. 입력 검증 테스트

```bash
# 유효하지 않은 job_category_id
curl -X PUT http://localhost:3000/api/v1/users/profile/job-and-tags \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_category_id": 99,
    "interest_tag_ids": [1, 3]
  }'
```

**예상 응답**: 400 Bad Request with ValidationException

---

## 주의사항

### ⚠️ 보안

1. **JWT 인증**: 모든 보호된 엔드포인트는 Bearer Token 필수
2. **SQL Injection**: 모든 쿼리 파라미터는 바인딩 사용
3. **XSS 방지**: 뉴스 제목/요약 HTML 이스케이프 필요
4. **Rate Limiting**: API 속도 제한 준수

### ⚠️ 성능

1. **캐싱**: Redis 캐시 적극 활용
2. **인덱스**: 모든 FK와 검색 필드에 인덱스 필수
3. **배치 작업**: 이슈 지수는 배치 작업으로 계산 (6시간 단위)
4. **연결 풀**: 최대 연결 수 모니터링

### ⚠️ 데이터 일관성

1. **트랜잭션**: 프로필 저장 시 원자성 보장
2. **foreign key**: 모든 참조 관계에 CASCADE 설정
3. **unique constraint**: 중복 방지를 위한 unique 키 설정

### ⚠️ 에러 처리

1. **부분 성공 허용**: 일부 데이터 조회 실패 시에도 부분 응답 반환
2. **재시도 가능 여부**: 예외마다 retry_able 플래그 설정
3. **로깅**: 모든 오류를 structured log로 기록

---

## 다음 단계

### Phase 1: 완료
- ✅ API 엔드포인트 5개 구현
- ✅ 메서드 단위 예외 처리
- ✅ Redis 캐싱
- ✅ 입력 검증

### Phase 2: 추가 개발 필요
- 📋 뉴스 기사 연동 (news_articles, news_tags)
- 📋 이슈 지수 배치 작업 구현
- 📋 추천 도구 데이터베이스
- 📋 프론트엔드 UI/UX

---

**문의**: 최수안 (백엔드 팀장)
**최종 업데이트**: 2025-11-12
