# 🤖 Ainus AI Model Analysis & News Clustering Server

AI 모델의 벤치마크, 업데이트, 트렌드 정보를 한눈에 볼 수 있는 통합 백엔드 서버

현재 **AI 뉴스 클러스터링 & 이슈 지수 시스템**이 통합되어 있습니다.

## 📋 개요

### Ainus AI 인증 & 분석 시스템
- **완전한 인증 시스템** - 로컬, Google, Kakao, Naver OAuth 지원
- **메서드 단위 예외 처리** 전략으로 안정성 확보
- **Redis 캐싱**과 **데이터베이스 최적화**로 높은 성능 보장

### AI 뉴스 클러스터링 & 이슈 지수 시스템 (NEW)
- **자동 뉴스 분류** - OpenAI Assistants API를 통한 1000개 뉴스 자동 클러스터링
- **실시간 이슈 지수** - 활성/비활성 클러스터 가중 평균으로 시장 트렌드 추적
- **시간 기반 감소 함수** - 지난 30일 비활성 클러스터에 지수 감소 적용
- **스냅샷 기반 히스토리** - 매 수집 시점의 전체 클러스터 상태 저장
- **다중 데이터베이스 최적화** - MongoDB (문서), MySQL (인덱싱), ElasticSearch (검색)

### 공통 기능
- **TypeScript + Express.js**로 타입 안전성 제공
- **보안 우선** - 암호화, Rate Limiting, 계정 잠금 등
- **자동 스케줄러** - Cron 기반 시간 간격 실행 및 재시도 로직

## 🏗️ 프로젝트 구조

```
src/
├── config/              # 환경 설정
│   └── environment.ts   # 환경 변수 로더 (JWT, OAuth, Email, DB 설정)
├── database/            # 데이터베이스 관련
│   ├── mysql.ts         # MySQL 연결 풀 (이슈 지수)
│   ├── mongodb.ts       # MongoDB 연결 (클러스터)
│   ├── redis.ts         # Redis 캐싱 레이어
│   ├── elasticsearch.ts # ElasticSearch 클라이언트 (뉴스 기사)
│   ├── logger.ts        # 로거 유틸리티
│   └── migrations.ts    # DB 마이그레이션
├── exceptions/          # 예외 처리 (가이드 준수)
│   ├── AgentException.ts
│   ├── ExceptionHandler.ts
│   └── index.ts
├── middleware/          # Express 미들웨어
│   ├── errorHandler.ts  # 통합 에러 핸들링
│   ├── auth.ts          # JWT 인증 미들웨어
│   └── rateLimiter.ts   # Rate Limiting 미들웨어
├── services/            # 비즈니스 로직
│   ├── AuthService.ts                    # 인증 서비스
│   ├── EmailService.ts                   # 이메일 전송 서비스
│   ├── LoginAuditService.ts              # 로그인 감시 서비스
│   ├── GoogleOAuthService.ts             # Google OAuth 서비스
│   ├── KakaoOAuthService.ts              # Kakao OAuth 서비스
│   ├── NaverOAuthService.ts              # Naver OAuth 서비스
│   ├── news-clustering-pipeline.ts       # 뉴스 클러스터링 파이프라인 (스케줄러)
│   ├── gpt-classifier.ts                 # GPT 분류 (Assistants API)
│   ├── gpt_input_preprocessing.ts        # GPT 입력 전처리
│   ├── db-save.ts                        # MongoDB 저장 (클러스터)
│   ├── calculate-issue-index.ts          # 이슈 지수 계산
│   └── save-issue-index.ts               # MySQL 저장 (이슈 지수)
├── api/                 # API 엔드포인트 (뉴스 클러스터링)
│   └── api-endpoints.ts # 4개 뉴스 조회 엔드포인트
├── routes/              # API 라우트
│   └── auth.ts          # 인증 관련 API
├── types/               # TypeScript 타입 정의
├── utils/               # 유틸리티 함수
│   ├── jwt.ts           # JWT 토큰 생성/검증
│   ├── password.ts      # 비밀번호 해싱/검증
│   ├── encryption.ts    # AES-256-CBC 암호화
│   └── tokenGenerator.ts # 보안 토큰 생성
├── templates/           # 이메일 템플릿
│   └── emails/
│       ├── password-reset.html
│       ├── email-verification.html
│       └── suspicious-login.html
├── constants/           # 상수 정의
│   └── errorCodes.ts    # 표준화된 에러 코드
├── scripts/             # 실행 스크립트
│   ├── migrate.ts       # 마이그레이션 실행
│   └── init-databases.ts # 데이터베이스 초기화 (MongoDB, MySQL, ES)
├── app.ts              # Express 앱 설정
└── index.ts            # 메인 엔트리 포인트
```

## 🚀 빠른 시작

### 1. 설치

```bash
npm install
```

### 2. 환경 설정

```bash
cp .env.example .env
```

필수 환경 변수:

```env
# === 서버 설정 ===
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# === Ainus AI 인증 시스템 (기존) ===

# 데이터베이스 (MySQL) - Ainus 사용자 관리
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DB=ainus_db

# 캐시 (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT 설정
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRY=30d

# 암호화 (Phase 2)
ENCRYPTION_KEY=your-encryption-key-32-bytes

# OAuth 2.0 (Phase 2)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret

KAKAO_CLIENT_ID=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-secret

NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-secret

# 이메일 설정 (Phase 3)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@ainus.example.com
EMAIL_FROM_NAME=Ainus

# === AI 뉴스 클러스터링 & 이슈 지수 시스템 (NEW) ===

# MongoDB - 클러스터 저장소
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ai_news_classifier

# ElasticSearch - 뉴스 기사 저장소
ELASTICSEARCH_HOST=http://localhost:9200

# OpenAI Assistants API
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_ASSISTANT_ID=asst_EaIPCgI31CX996Zvl61Oqk7C

# 파이프라인 설정
PIPELINE_ENABLE_SCHEDULE=true
PIPELINE_SCHEDULE_TIME=0 * * * *
PIPELINE_MAX_RETRIES=2
PIPELINE_RETRY_DELAY_MS=5000
```

### 3. 데이터베이스 초기화

#### Ainus AI 인증 시스템 (기존)
```bash
npm run migrate
```

#### AI 뉴스 클러스터링 시스템 (NEW)
```bash
npm run init:db
```

이 명령은 다음을 초기화합니다:
- **MongoDB**: `ai_news_classifier` DB, `clusters` 및 `cluster_snapshots` 컬렉션 생성
- **MySQL**: `ai_news_classifier` DB, `issue_index` 테이블 생성
- **ElasticSearch**: `articles` 인덱스 생성 (한글 형태소 분석기)

자세한 내용은 [PIPELINE_DOCUMENTATION.md](./PIPELINE_DOCUMENTATION.md#-데이터베이스-초기화) 참고

### 4. 서버 시작

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm run build && npm start
```

## 📦 기술 스택

### 공통 기술
| 분류 | 기술 |
|------|------|
| **언어** | TypeScript, Node.js 18+ |
| **프레임워크** | Express.js 4.x |
| **캐시** | Redis 7.0 |
| **로깅** | Custom Logger (Winston 호환) |
| **보안** | CORS, bcrypt, JWT, Token Rotation |
| **배포** | PM2, Docker (예정) |

### Ainus AI 인증 시스템
| 분류 | 기술 |
|------|------|
| **데이터베이스** | MySQL 8.0 (사용자 관리) |
| **인증** | JWT (Bearer Token), OAuth 2.0 |
| **암호화** | AES-256-CBC (crypto), bcrypt (password) |
| **이메일** | Nodemailer, EJS (template) |
| **Rate Limiting** | express-rate-limit |

### AI 뉴스 클러스터링 & 이슈 지수 시스템
| 분류 | 기술 |
|------|------|
| **문서 DB** | MongoDB 5.0+ (클러스터, 스냅샷) |
| **분석 DB** | MySQL 8.0 (이슈 지수) |
| **검색 엔진** | ElasticSearch 8.0+ (뉴스 기사) |
| **AI 분류** | OpenAI Assistants API |
| **스케줄러** | Node-cron |
| **재시도 로직** | Exponential Backoff with Max Retries |

## 🔄 개발 단계 (Phase)

| Phase | 내용 | 상태 | 완료일 |
|-------|------|------|--------|
| **Phase 1** | Ainus 기초 인증 시스템 | ✅ 완료 | 2025-11-09 |
| **Phase 2** | OAuth 2.0 소셜 로그인 | ✅ 완료 | 2025-11-09 |
| **Phase 3** | 이메일 & 비밀번호 재설정 | ✅ 완료 | 2025-11-09 |
| **Phase 4** | AI 뉴스 클러스터링 & 이슈 지수 (NEW) | ✅ 완료 | 2025-11-17 |
| **Phase 5** | 고급 보안 (2FA, 의심 로그인) | 📋 예정 | - |
| **Phase 6** | 사용자 프로필 관리 | 📋 예정 | - |
| **Phase 7** | 모델 관련 API | 📋 예정 | - |

## 🔐 Phase 1: 기초 인증 시스템 (완료)

### 구현된 기능

| Task | 기능 | 상태 |
|------|------|------|
| TASK-1-7 | 회원가입 (비밀번호 강도 검증) | ✅ |
| TASK-1-9 | 이메일 중복 확인 (Redis 캐싱) | ✅ |
| TASK-1-10 | 로그인 (계정 잠금, 감시 로깅) | ✅ |
| TASK-1-13~15 | Refresh Token 토큰 회전 | ✅ |
| TASK-1-18 | Rate Limiting (express-rate-limit) | ✅ |
| TASK-1-19 | 표준화된 에러 코드 (24개) | ✅ |

### API 엔드포인트

```
POST   /api/v1/auth/register              회원가입
POST   /api/v1/auth/login                 로그인 (Rate limit: 5/15분)
POST   /api/v1/auth/logout                로그아웃
POST   /api/v1/auth/refresh               Access Token 갱신
GET    /api/v1/auth/me                    현재 사용자 정보
GET    /api/v1/auth/check-email           이메일 중복 확인
```

### 보안 특징

- ✅ bcrypt를 사용한 비밀번호 해싱
- ✅ 비밀번호 강도 검증 (8자 이상, 대소문자, 숫자, 특수문자)
- ✅ JWT 토큰 기반 인증 (Access Token 15분, Refresh Token 7일)
- ✅ 토큰 회전 (Refresh Token 사용 시 새 토큰 발급)
- ✅ 로그인 실패 감시 (5회 실패 시 30분 계정 잠금)
- ✅ 전역 Rate Limiting (100회/15분)
- ✅ IP 주소 및 User-Agent 로깅

## 🌐 Phase 2: OAuth 2.0 소셜 로그인 (완료)

### 구현된 기능

| Task | 기능 | 상태 |
|------|------|------|
| TASK-2-1~4 | Google OAuth 2.0 | ✅ |
| TASK-2-5~8 | Kakao OAuth 2.0 | ✅ |
| TASK-2-9~12 | Naver OAuth 2.0 | ✅ |
| TASK-2-13 | 이메일 기반 계정 연동 | ✅ |
| TASK-2-15 | AES-256-CBC 암호화 | ✅ |

### API 엔드포인트

```
GET    /api/v1/auth/google                Google OAuth 페이지로 리다이렉트
GET    /api/v1/auth/google/callback       Google OAuth 콜백
GET    /api/v1/auth/kakao                 Kakao OAuth 페이지로 리다이렉트
GET    /api/v1/auth/kakao/callback        Kakao OAuth 콜백
GET    /api/v1/auth/naver                 Naver OAuth 페이지로 리다이렉트
GET    /api/v1/auth/naver/callback        Naver OAuth 콜백
```

### 보안 특징

- ✅ CSRF 보호 (state 파라미터, Redis 저장, 10분 TTL)
- ✅ 토큰 암호화 저장 (AES-256-CBC)
- ✅ 이메일 기반 자동 계정 연동
- ✅ Provider별 사용자 정보 추출 및 정규화
- ✅ 자동 사용자 생성 및 로그인

## 📧 Phase 3: 이메일 & 비밀번호 재설정 (완료)

### 구현된 기능

| Task | 기능 | 상태 |
|------|------|------|
| TASK-3-1 | EmailService (NodeMailer) | ✅ |
| TASK-3-2 | 이메일 인증 | ✅ |
| TASK-3-3 | 비밀번호 재설정 요청 | ✅ |
| TASK-3-4 | 비밀번호 재설정 | ✅ |
| TASK-3-5 | 비밀번호 변경 (인증 필요) | ✅ |
| TASK-3-6 | HTML 이메일 템플릿 | ✅ |

### API 엔드포인트

```
POST   /api/v1/auth/forgot-password       비밀번호 재설정 요청
POST   /api/v1/auth/reset-password        비밀번호 재설정 (토큰 사용)
POST   /api/v1/auth/change-password       비밀번호 변경 (인증 필요)
POST   /api/v1/auth/verify-email          이메일 인증
```

### 이메일 템플릿

- ✅ `password-reset.html` - 비밀번호 재설정 (1시간 유효)
- ✅ `email-verification.html` - 이메일 인증 (24시간 유효)
- ✅ `suspicious-login.html` - 의심 로그인 알림

### 보안 특징

- ✅ 256-bit 보안 토큰 생성
- ✅ SHA-256 토큰 해싱
- ✅ 토큰 만료 검증 (1시간/24시간)
- ✅ 일회용 토큰 강제
- ✅ SMTP 암호화 지원 (Gmail, SendGrid, 커스텀)
- ✅ EJS 템플릿 렌더링
- ✅ 반응형 HTML 이메일 디자인

## 🗞️ Phase 4: AI 뉴스 클러스터링 & 이슈 지수 (완료)

### 핵심 기능

| 기능 | 설명 | 상태 |
|------|------|------|
| **자동 뉴스 분류** | OpenAI Assistants API로 1000개 뉴스를 주제별로 분류 | ✅ |
| **클러스터 관리** | 새로운 주제 추적, 기존 주제 업데이트, 오래된 주제 비활성화 | ✅ |
| **이슈 지수 계산** | 활성(70%) + 비활성(30%) 가중 평균 + 지수 감소 함수 | ✅ |
| **시간 기반 감소** | 비활성 클러스터에 지난 30일 기준 `e^(-0.1×days)` 적용 | ✅ |
| **스냅샷 저장** | 매 수집 시점의 모든 클러스터 상태 기록 | ✅ |
| **자동 스케줄러** | Cron 기반 시간 간격 실행, 최대 2회 재시도 | ✅ |
| **다중 DB 최적화** | MongoDB (문서), MySQL (인덱싱), ES (검색) | ✅ |

### API 엔드포인트

```
GET    /api/issue-index/current              현재 이슈 지수 (최신)
GET    /api/issue-index/history?date=...     과거 이슈 지수 (특정 시점)
GET    /api/issue-index/clusters?collected_at=... 클러스터 스냅샷
GET    /api/issue-index/articles?collected_at=...&indices=... 뉴스 기사 원문
GET    /health/news-clustering               뉴스 클러스터링 헬스 체크
GET    /health/news-clustering/detailed      상세 헬스 체크 (DB 연결 상태)
```

### 데이터베이스 설계

#### MongoDB (클러스터 저장소)
```
Database: ai_news_classifier
Collections:
├── clusters              # 마스터 클러스터 데이터
│   └── cluster_id, topic_name, tags, appearance_count, status, score_history
├── cluster_snapshots     # 시간 기반 스냅샷 (90일 TTL)
│   └── collected_at, cluster_id, status, article_count, article_indices
```

#### MySQL (이슈 지수 저장소)
```
Database: ai_news_classifier
Table: issue_index
├── collected_at (PK)     # 수집 시점
├── overall_index         # 통합 이슈 지수 (0-100)
└── created_at            # 생성 시간
```

#### ElasticSearch (뉴스 기사 저장소)
```
Index: articles
├── collected_at          # 수집 시점
├── source                # 기사 출처
└── articles[] (nested)   # 1000개 기사 배열
    ├── index, title, link, description, pubDate
```

### 파이프라인 실행 흐름

```
1. 전처리 (Preprocessing)
   └─ ElasticSearch에서 최신 1000개 뉴스 조회
   └─ MongoDB에서 활성/비활성 클러스터 조회
   └─ GPT 입력 형식으로 변환

2. GPT 분류 (Classification)
   └─ OpenAI Assistants API 호출
   └─ 1000개 뉴스를 주제별로 분류
   └─ JSON 응답 파싱 및 검증

3. DB 저장 (Database Save)
   └─ MongoDB: 새/기존 클러스터 업데이트
   └─ MongoDB: 스냅샷 저장
   └─ 비활성 클러스터 표시

4. 이슈 지수 계산 (Index Calculation)
   └─ 활성 클러스터 평균 계산
   └─ 비활성 클러스터 지수 감소 적용
   └─ 가중 평균: (활성×0.7 + 비활성×0.3)
   └─ MySQL에 저장
```

### 클러스터 점수 계산 공식

```
cluster_score = 20 + (80 × log(appearance_count)) / log(720)
```

- 최소값: 20 (appearance_count = 1)
- 최대값: 100 (appearance_count = 720)
- 로그 함수로 초기 증가 빠르고 중간부터 천천히 증가

### 이슈 지수 계산 공식

```
비활성_점수 = cluster_score × e^(-0.1 × elapsed_days)
활성_평균 = Σ(활성 점수) / 활성 개수
비활성_평균 = Σ(비활성_점수) / 30일 이내 비활성 개수
통합_지수 = (활성_평균 × 0.7) + (비활성_평균 × 0.3)
```

### 스케줄러 설정

```env
PIPELINE_ENABLE_SCHEDULE=true        # 스케줄러 활성화
PIPELINE_SCHEDULE_TIME=0 * * * *     # 1시간 간격 (cron 형식)
PIPELINE_MAX_RETRIES=2                # 최대 재시도 횟수
PIPELINE_RETRY_DELAY_MS=5000         # 재시도 간격 (5초)
```

### 보안 및 최적화 특징

- ✅ **토큰 검증**: GPT 응답의 모든 1000개 기사가 정확히 한 번씩 할당되는지 검증
- ✅ **TTL 인덱스**: MongoDB 스냅샷 자동 삭제 (90일)
- ✅ **복합 인덱스**: collected_at, cluster_id 기준 빠른 조회
- ✅ **중첩 문서**: ElasticSearch nested 구조로 효율적 검색
- ✅ **한글 분석**: Nori 형태소 분석기로 한글 뉴스 처리
- ✅ **재시도 로직**: 실패 시 자동 재시도 (최대 2회)
- ✅ **상세 로깅**: 각 단계별 진행 상황 기록

## 📝 예외 처리 정책

**agent_exception_handling_guide.md** 문서를 엄격히 따릅니다.

### 예외 클래스 계층

```typescript
AgentException (기본)
├─ ValidationException       // 입력 검증 실패 (재시도 불가)
├─ ExternalAPIException      // 외부 API 호출 실패 (재시도 가능)
├─ DatabaseException         // DB 작업 실패 (재시도 가능)
├─ AuthenticationException   // 인증/권한 오류 (재시도 불가)
├─ TimeoutException          // 타임아웃 (재시도 가능)
└─ RateLimitException        // Rate limit 초과 (재시도 가능)
```

### 메서드 단위 예외 처리 패턴

```typescript
async function methodName(params: any): Promise<Result> {
  const methodName = "methodName";

  // 1단계: 입력 검증
  try {
    validateInputs(params, methodName);
  } catch (error) {
    throw new ValidationException("...", methodName);
  }

  // 2단계: 비즈니스 로직
  try {
    const result = await executeLogic(params);
  } catch (error) {
    throw new ExternalAPIException("...", methodName);
  }

  // 3단계: 결과 저장
  try {
    await saveResult(result);
  } catch (error) {
    throw new DatabaseException("...", methodName);
  }

  return result;
}
```

## 🔍 에러 코드 체계

24개의 표준화된 에러 코드 제공:

```
1000번대: 회원가입 관련 (1001~1006)
2000번대: 로그인 관련 (2001~2005)
3000번대: 토큰 관련 (3001~3003)
4000번대: 비밀번호 재설정 (4001~4004)
5000번대: 소셜 로그인 (5001~5005)
9000번대: 서버 에러 (9001~9999)
```

각 에러 코드는:
- HTTP 상태 코드 매핑
- 에러 메시지
- 에러 카테고리
- 재시도 가능 여부

## 📖 문서

### Ainus AI 인증 시스템
- [개발 계획서](./Ainus%20서버%20개발%20계획서.md) - Phase 1~3 기초 인증 및 OAuth 구현 계획
- [예외 처리 가이드](./agent_exception_handling_guide.md) - 메서드 단위 예외 처리 전략

### AI 뉴스 클러스터링 & 이슈 지수 시스템
- [파이프라인 설명서](./PIPELINE_DOCUMENTATION.md) - Phase 4 상세 기술 문서
  - 데이터베이스 초기화 가이드
  - 파이프라인 실행 흐름
  - API 엔드포인트 상세 문서
  - 설정 및 실행 가이드
  - 트러블슈팅

## 🧪 테스트

```bash
# 단위 테스트 (예정)
npm run test

# 통합 테스트 (예정)
npm run test:integration

# 커버리지 (예정)
npm run test:coverage
```

## 📊 개발 통계

### Ainus AI 인증 시스템 (Phase 1~3)

#### Phase 1: 기초 인증 시스템
- **구현 시간**: ~20시간
- **코드 라인**: ~1000줄
- **API 엔드포인트**: 6개
- **테스트 커버리지**: 진행 중

#### Phase 2: OAuth 2.0 소셜 로그인
- **구현 시간**: ~15시간
- **코드 라인**: ~1200줄
- **API 엔드포인트**: 6개
- **테스트 커버리지**: 진행 중

#### Phase 3: 이메일 & 비밀번호 재설정
- **구현 시간**: ~12시간
- **코드 라인**: ~1300줄
- **API 엔드포인트**: 4개
- **이메일 템플릿**: 3개
- **테스트 커버리지**: 진행 중

#### Phase 1~3 통계
- **총 구현 시간**: ~47시간
- **총 코드 라인**: ~3500줄
- **API 엔드포인트**: 16개
- **예외 클래스**: 7개

### AI 뉴스 클러스터링 & 이슈 지수 (Phase 4)

#### Phase 4: AI 뉴스 클러스터링 & 이슈 지수
- **구현 시간**: ~18시간
- **코드 라인**: ~2200줄
- **서비스 파일**: 6개 (파이프라인, GPT, DB 저장, 계산, 전처리)
- **인프라 파일**: 4개 (DB 초기화, ElasticSearch, API 엔드포인트, 통합)
- **API 엔드포인트**: 6개 (4개 조회 + 2개 헬스 체크)
- **데이터베이스**: 3개 (MongoDB, MySQL, ElasticSearch)
- **컬렉션/테이블**: 4개 (clusters, cluster_snapshots, issue_index, articles)

### 전체 통계 (Phase 1~4)
- **총 구현 시간**: ~65시간
- **총 코드 라인**: ~5700줄
- **서비스 파일**: 12개
- **인프라 파일**: 4개
- **API 엔드포인트**: 22개
- **예외 클래스**: 7개
- **이메일 템플릿**: 3개
- **데이터베이스**: 4개 (MySQL Ainus, MySQL AI News, MongoDB, Redis, ElasticSearch)

## 🚦 설치 및 실행 예제

### 1. 저장소 클론

```bash
git clone <repository-url>
cd Ainus_server_new
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 필수 값들을 설정
```

### 4. 데이터베이스 셋업

#### Ainus AI 인증 시스템
```bash
# MySQL 데이터베이스 생성
mysql -u root -p < scripts/init-db.sql

# 마이그레이션 실행
npm run migrate
```

#### AI 뉴스 클러스터링 & 이슈 지수 시스템
```bash
# MongoDB, MySQL, ElasticSearch 초기화
# 사전 조건: MongoDB, MySQL, ElasticSearch가 실행 중이어야 함
npm run init:db
```

### 5. 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 6. 헬스 체크

#### Ainus AI 인증 시스템
```bash
curl http://localhost:3000/health
```

응답:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-09T10:30:00.000Z",
  "environment": "development"
}
```

#### AI 뉴스 클러스터링 & 이슈 지수 시스템
```bash
# 기본 헬스 체크
curl http://localhost:3000/health/news-clustering

# 상세 헬스 체크 (DB 연결 상태 포함)
curl http://localhost:3000/health/news-clustering/detailed
```

응답:
```json
{
  "status": "ok",
  "service": "news-clustering",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "services": {
    "elasticsearch": "connected",
    "mongodb": "configured",
    "mysql": "configured"
  }
}
```

### 7. API 테스트 예제

#### 현재 이슈 지수 조회
```bash
curl http://localhost:3000/api/issue-index/current
```

#### 과거 특정 시점 이슈 지수 조회
```bash
curl "http://localhost:3000/api/issue-index/history?date=2025-11-17T12:00:00Z"
```

#### 클러스터 스냅샷 조회
```bash
curl "http://localhost:3000/api/issue-index/clusters?collected_at=2025-11-17T12:00:00Z"
```

#### 특정 클러스터의 뉴스 기사 조회
```bash
curl "http://localhost:3000/api/issue-index/articles?collected_at=2025-11-17T12:00:00Z&indices=0,1,2,3,4"
```

자세한 API 사용법은 [PIPELINE_DOCUMENTATION.md](./PIPELINE_DOCUMENTATION.md#-api-엔드포인트)를 참고하세요.

## 🔒 보안 권장사항

### 프로덕션 배포 시

#### Ainus AI 인증 시스템
1. **환경 변수**
   - 모든 민감한 정보는 환경 변수로 관리
   - `.env` 파일을 절대 커밋하지 말 것

2. **HTTPS 필수**
   - 모든 OAuth 리다이렉트 URI는 HTTPS 사용
   - JWT 토큰은 HTTPS 전송만 허용

3. **데이터베이스**
   - MySQL 암호 강력화
   - 주기적인 백업
   - 읽기 복제본 설정

4. **Redis**
   - 비밀번호 설정
   - 네트워크 격리 (내부망만)

5. **Email 설정**
   - Gmail 앱 비밀번호 사용
   - SendGrid API 키 로테이션
   - SPF, DKIM, DMARC 설정

6. **API 보안**
   - CORS 정책 검토
   - Rate Limiting 조정
   - JWT 만료 시간 단축

#### AI 뉴스 클러스터링 & 이슈 지수 시스템
1. **OpenAI API 보안**
   - API 키는 환경 변수로만 관리
   - API 키 로테이션 정책 수립
   - API 호출 로깅 및 모니터링

2. **MongoDB 보안**
   - 인증 활성화 (username/password)
   - 네트워크 격리 (VPC/방화벽)
   - 암호화된 연결 (TLS/SSL)
   - 주기적 백업 및 모니터링

3. **MySQL 보안**
   - 암호 강력화
   - 읽기 전용 복제본 설정
   - 쿼리 감사 로깅

4. **ElasticSearch 보안**
   - X-Pack 보안 모듈 활성화
   - 호스트명 기반 접근 제어
   - HTTPS 필수

5. **파이프라인 보안**
   - 스케줄러 로그 모니터링
   - 실패 알림 설정
   - 재시도 로직 모니터링
   - 이상 탐지 시스템

## 📞 지원

문제가 발생하거나 질문이 있으신 경우:

### Ainus AI 인증 시스템 관련
1. [Issues](./issues) 페이지 확인
2. [개발 계획서](./Ainus%20서버%20개발%20계획서.md) 참고
3. [예외 처리 가이드](./agent_exception_handling_guide.md) 참고

### AI 뉴스 클러스터링 & 이슈 지수 시스템 관련
1. [파이프라인 설명서](./PIPELINE_DOCUMENTATION.md) - 상세 기술 문서 및 트러블슈팅
2. [Issues](./issues) 페이지 - 버그 리포트 및 기능 요청

## 🚀 다음 단계

- **Phase 5** (예정): 고급 보안 기능 (2FA, 의심 로그인 탐지)
- **Phase 6** (예정): 사용자 프로필 관리
- **Phase 7** (예정): 모델 관련 API

## 📝 라이선스

MIT

---

**개발팀:** Ainus AI Development Team
**시작 날짜:** 2025-11-09
**마지막 업데이트:** 2025-11-17
**현재 버전:** 1.1.0 (Phase 4 - AI 뉴스 클러스터링 & 이슈 지수 완료)
**다음 예정:** Phase 5 - 고급 보안 기능 (2FA, 의심 로그인)
