# Ainus Server

> AI Model Analysis and News Clustering Platform Backend Server

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.2.2-blue.svg)](https://www.typescriptlang.org/)

## 📋 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [기술 스택](#기술-스택)
- [시스템 요구사항](#시스템-요구사항)
- [설치 및 실행](#설치-및-실행)
- [환경 변수 설정](#환경-변수-설정)
- [API 문서](#api-문서)
- [프로젝트 구조](#프로젝트-구조)
- [개발 가이드](#개발-가이드)
- [라이센스](#라이센스)

## 🎯 개요

**Ainus Server**는 AI 모델 분석 및 뉴스 클러스터링 플랫폼을 위한 백엔드 서버입니다. 다양한 AI 모델의 벤치마크 정보를 제공하고, GPT를 활용한 실시간 뉴스 클러스터링 및 이슈 인덱스 계산, 그리고 커뮤니티 기능을 통합적으로 제공합니다.

### 주요 특징

- **🔐 완전한 인증 시스템**: Email/Password + OAuth 2.0 (Google, Kakao, Naver)
- **🤖 AI 모델 카탈로그**: 다양한 AI 모델의 벤치마크, 가격, 성능 정보 제공
- **📰 AI 기반 뉴스 클러스터링**: GPT를 활용한 실시간 뉴스 분류 및 이슈 인덱스 계산
- **💬 커뮤니티 플랫폼**: 사용자 게시글, 댓글, 좋아요, 알림 기능
- **🔍 검색 및 태깅**: Elasticsearch 기반 검색 및 AI 자동 태깅

## ✨ 주요 기능

### 1. 인증 및 사용자 관리

#### Phase 1: 기본 인증
- ✅ 이메일/비밀번호 기반 회원가입 및 로그인
- ✅ JWT 기반 인증 (Access Token + Refresh Token)
- ✅ 비밀번호 강도 검증 (최소 8자, 대소문자, 숫자, 특수문자)
- ✅ 로그인 실패 추적 및 계정 잠금
- ✅ Rate Limiting을 통한 무차별 대입 공격 방어

#### Phase 2: OAuth 2.0 소셜 로그인
- ✅ Google OAuth 통합
- ✅ Kakao OAuth 통합
- ✅ Naver OAuth 통합
- ✅ CSRF 보호를 위한 State 검증
- ✅ 소셜 계정 자동 연동

#### Phase 3: 이메일 및 비밀번호 재설정
- ✅ 토큰 기반 비밀번호 재설정
- ✅ 이메일 인증
- ✅ 비밀번호 변경 (인증된 사용자)
- ✅ 의심스러운 로그인 시도 이메일 알림

### 2. AI 모델 정보

- **모델 카탈로그**: 다양한 AI 모델의 상세 정보 제공
- **벤치마크 평가**: 모델별 벤치마크 점수 및 평가
- **가격 정보**: 토큰당 비용, 월 구독료 등
- **성능 메트릭**: 응답 시간, 처리량 등 성능 지표
- **업데이트 이력**: 모델 버전 업데이트 추적
- **제공자 정보**: AI 모델 제공업체 정보

### 3. 뉴스 클러스터링 및 이슈 인덱스

- **실시간 클러스터링**: GPT를 활용한 자동 뉴스 분류
- **이슈 인덱스 계산**: 실시간 트렌드 분석 및 중요도 점수 산출
- **클러스터 스냅샷**: 시간별 클러스터 데이터 저장
- **히스토리 추적**: 과거 이슈 인덱스 조회
- **AI 자동 태깅**: 뉴스 기사에 대한 자동 태그 분류
- **Elasticsearch 통합**: 빠른 검색 및 필터링

### 4. 커뮤니티 플랫폼

- **게시글 관리**: 생성, 수정, 삭제, 조회 (CRUD)
- **카테고리**: 프롬프트 공유, Q&A, 리뷰, 일반, 공지사항
- **댓글 시스템**: 댓글 작성 및 대댓글 (중첩 댓글)
- **좋아요 기능**: 게시글 좋아요/취소
- **검색**: 게시글 검색 기능
- **알림**: 댓글 및 대댓글 알림
- **Soft Delete**: 데이터 보존을 위한 소프트 삭제

## 🛠 기술 스택

### Backend
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript 5.2.2
- **Framework**: Express.js 4.18.2
- **Authentication**: JWT, OAuth 2.0

### Databases
- **MySQL**: 주 데이터베이스 (사용자, 모델, 커뮤니티 데이터)
- **MongoDB**: 뉴스 클러스터링 데이터
- **Redis**: 캐싱 및 세션 관리
- **Elasticsearch**: 검색 엔진

### External Services
- **OpenAI API**: GPT 기반 뉴스 분류 및 태깅
- **Google OAuth**: 구글 소셜 로그인
- **Kakao OAuth**: 카카오 소셜 로그인
- **Naver OAuth**: 네이버 소셜 로그인
- **Nodemailer**: 이메일 발송 (비밀번호 재설정, 인증)

### Additional Tools
- **Bull**: 작업 큐 (백그라운드 작업)
- **node-cron**: 작업 스케줄링 (뉴스 파이프라인)
- **Winston**: 로깅
- **Jest**: 테스팅
- **ESLint + Prettier**: 코드 품질 관리

## 💻 시스템 요구사항

- **Node.js**: v18.0.0 이상
- **MySQL**: v8.0 이상
- **MongoDB**: v6.0 이상
- **Redis**: v7.0 이상
- **Elasticsearch**: v8.0 이상
- **npm** 또는 **yarn**

## 🚀 설치 및 실행

### 1. 저장소 클론

```bash
git clone https://github.com/Gistone9516/Ainus_server_new.git
cd Ainus_server_new
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 실제 값으로 수정합니다:

```bash
cp .env.example .env
```

자세한 환경 변수 설정은 [환경 변수 설정](#환경-변수-설정) 섹션을 참고하세요.

### 4. 데이터베이스 마이그레이션

```bash
npm run migrate
```

### 5. 서버 실행

#### 개발 모드
```bash
npm run dev
```

#### 프로덕션 빌드 및 실행
```bash
npm run build
npm start
```

서버가 정상적으로 실행되면 `http://localhost:3000`에서 접속 가능합니다.

### 6. 헬스 체크

```bash
curl http://localhost:3000/health
```

## ⚙️ 환경 변수 설정

### 데이터베이스 설정

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ainus_db

# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=ai_news_classifier

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Elasticsearch
ELASTICSEARCH_HOST=http://localhost:9200
```

### JWT 및 보안

```env
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRY=30d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ENCRYPTION_KEY=your_32_character_encryption_key
```

### OAuth 2.0 Credentials

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/v1/auth/google/callback

# Kakao OAuth
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_REDIRECT_URI=http://localhost:3000/api/v1/auth/kakao/callback

# Naver OAuth
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
NAVER_REDIRECT_URI=http://localhost:3000/api/v1/auth/naver/callback
```

### 이메일 설정

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@ainus.com
```

### OpenAI API

```env
OPENAI_API_KEY=sk-your_openai_api_key
OPENAI_ASSISTANT_ID=asst_your_assistant_id
```

### 파이프라인 설정

```env
# 자동 스케줄 활성화
PIPELINE_ENABLE_SCHEDULE=true

# 매 시간 정각 실행 (cron 형식)
PIPELINE_SCHEDULE_TIME=0 * * * *

# 재시도 설정
PIPELINE_MAX_RETRIES=2
PIPELINE_RETRY_DELAY_MS=5000
```

### 기타 설정

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
API_TIMEOUT_MS=30000
```

## 📚 API 문서

### Authentication API

#### 기본 인증
- `POST /api/v1/auth/register` - 회원가입
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/logout` - 로그아웃
- `POST /api/v1/auth/refresh` - 토큰 갱신

#### 비밀번호 관리
- `POST /api/v1/auth/forgot-password` - 비밀번호 재설정 요청
- `POST /api/v1/auth/reset-password` - 비밀번호 재설정
- `POST /api/v1/auth/change-password` - 비밀번호 변경

#### 이메일 인증
- `POST /api/v1/auth/verify-email` - 이메일 인증

#### OAuth 2.0
- `GET /api/v1/auth/google` - Google OAuth 리다이렉트
- `GET /api/v1/auth/google/callback` - Google OAuth 콜백
- `GET /api/v1/auth/kakao` - Kakao OAuth 리다이렉트
- `GET /api/v1/auth/kakao/callback` - Kakao OAuth 콜백
- `GET /api/v1/auth/naver` - Naver OAuth 리다이렉트
- `GET /api/v1/auth/naver/callback` - Naver OAuth 콜백

### AI Models API

#### 모델 정보
- `GET /api/v1/models` - 모델 목록 조회 (페이지네이션)
- `GET /api/v1/models/:model_id` - 모델 상세 정보
- `GET /api/v1/models/:model_id/evaluations` - 벤치마크 평가
- `GET /api/v1/models/:model_id/overall-scores` - 전체 성능 점수
- `GET /api/v1/models/:model_id/pricing` - 가격 정보
- `GET /api/v1/models/:model_id/performance` - 성능 메트릭
- `GET /api/v1/models/:model_id/updates` - 업데이트 이력

#### 제공자 정보
- `GET /api/v1/creators` - 제공자 목록
- `GET /api/v1/creators/:creator_id` - 제공자 상세 정보
- `GET /api/v1/creators/:creator_id/models` - 제공자별 모델 목록

### News & Clustering API

#### 이슈 인덱스
- `GET /api/issue-index/current` - 현재(최신) 이슈 인덱스
- `GET /api/issue-index/history?date=YYYY-MM-DD` - 날짜별 이슈 인덱스
- `GET /api/issue-index/clusters?collected_at=...` - 클러스터 스냅샷
- `GET /api/issue-index/articles?collected_at=...&indices=...` - 이슈별 뉴스 기사

#### 뉴스 태깅 (Admin)
- `POST /api/v1/news-tagging/admin/run` - 태깅 파이프라인 수동 실행
- `GET /api/v1/news-tagging/admin/status` - 파이프라인 상태 확인
- `GET /api/v1/news-tagging/admin/untagged` - 미태깅 기사 목록

#### 뉴스 태깅 (Public)
- `GET /api/v1/news-tagging/tags` - 태그 목록
- `GET /api/v1/news-tagging/tags/:tag_id` - 태그 상세 정보
- `GET /api/v1/news-tagging/tags/:tag_id/articles` - 태그별 기사 목록
- `GET /api/v1/news-tagging/stats/distribution` - 태그 분포 통계

### Community API

#### 게시글
- `POST /api/v1/community/posts` - 게시글 작성
- `GET /api/v1/community/posts` - 게시글 목록 (페이지네이션)
- `GET /api/v1/community/posts/search` - 게시글 검색
- `GET /api/v1/community/posts/:postId` - 게시글 상세 조회
- `PUT /api/v1/community/posts/:postId` - 게시글 수정
- `DELETE /api/v1/community/posts/:postId` - 게시글 삭제
- `POST /api/v1/community/posts/:postId/like` - 좋아요/취소

#### 댓글
- `POST /api/v1/community/posts/:postId/comments` - 댓글 작성
- `GET /api/v1/community/posts/:postId/comments` - 댓글 목록
- `DELETE /api/v1/community/comments/:commentId` - 댓글 삭제

#### 알림
- `GET /api/v1/community/notifications` - 알림 목록
- `PUT /api/v1/community/notifications/:notificationId/read` - 읽음 표시
- `PUT /api/v1/community/notifications/read-all` - 전체 읽음 표시
- `GET /api/v1/community/notifications/unread-count` - 읽지 않은 알림 개수

### Health Check API

- `GET /health` - 기본 헬스 체크
- `GET /api/version` - API 버전 정보
- `GET /health/news-clustering` - 뉴스 클러스터링 헬스 체크
- `GET /health/news-clustering/detailed` - 상세 헬스 체크

## 📁 프로젝트 구조

```
ainus-server/
├── src/
│   ├── api/                      # API 컨트롤러
│   │   ├── auth.controller.ts
│   │   ├── community.controller.ts
│   │   ├── models.controller.ts
│   │   ├── news-tagging.controller.ts
│   │   └── news.controller.ts
│   │
│   ├── routes/                   # API 라우트 정의
│   │   ├── auth.ts
│   │   ├── community.ts
│   │   ├── models.ts
│   │   ├── news-tagging.ts
│   │   └── news.ts
│   │
│   ├── services/                 # 비즈니스 로직
│   │   ├── auth/
│   │   │   ├── AuthService.ts
│   │   │   ├── GoogleOAuthService.ts
│   │   │   ├── KakaoOAuthService.ts
│   │   │   ├── NaverOAuthService.ts
│   │   │   └── LoginAuditService.ts
│   │   ├── community/
│   │   │   ├── CommunityPostService.ts
│   │   │   ├── CommunityCommentService.ts
│   │   │   ├── CommunityLikeService.ts
│   │   │   ├── CommunityNotificationService.ts
│   │   │   └── CommunitySearchService.ts
│   │   ├── models/
│   │   │   ├── ModelService.ts
│   │   │   ├── UpdateService.ts
│   │   │   └── CreatorService.ts
│   │   ├── news/
│   │   │   ├── news-clustering-pipeline.ts
│   │   │   ├── news-tagging-pipeline.ts
│   │   │   ├── gpt-classifier.ts
│   │   │   ├── gpt-tagging-classifier.ts
│   │   │   ├── calculate-issue-index.ts
│   │   │   └── ...
│   │   └── common/
│   │       └── EmailService.ts
│   │
│   ├── middleware/               # Express 미들웨어
│   │   ├── auth.ts              # JWT 인증
│   │   ├── admin-auth.ts        # 관리자 인증
│   │   ├── rateLimiter.ts       # Rate Limiting
│   │   └── community.ts         # 커뮤니티 관련
│   │
│   ├── database/                 # 데이터베이스
│   │   ├── mysql.ts             # MySQL 연결
│   │   ├── mongodb.ts           # MongoDB 연결
│   │   ├── redis.ts             # Redis 연결
│   │   ├── elasticsearch.ts     # Elasticsearch 연결
│   │   ├── migrations.ts        # 마이그레이션
│   │   └── community-migration.sql
│   │
│   ├── config/                   # 설정
│   │   └── environment.ts       # 환경 변수 관리
│   │
│   ├── utils/                    # 유틸리티
│   │   ├── jwt.ts               # JWT 토큰 생성/검증
│   │   ├── encryption.ts        # 암호화/복호화
│   │   ├── password.ts          # 비밀번호 해싱
│   │   └── logger.ts            # 로거
│   │
│   ├── types/                    # TypeScript 타입 정의
│   │   ├── index.ts
│   │   ├── community.ts
│   │   └── news-tagging.ts
│   │
│   ├── exceptions/               # 커스텀 예외 클래스
│   │   └── ...
│   │
│   ├── constants/                # 상수
│   │   └── errorCodes.ts        # 에러 코드 정의
│   │
│   ├── templates/                # 이메일 템플릿
│   │   ├── password-reset.ejs
│   │   └── email-verification.ejs
│   │
│   ├── app.ts                    # Express 앱 설정
│   └── index.ts                  # 서버 진입점
│
├── scripts/                      # 스크립트
│   ├── migrate.ts               # 마이그레이션 스크립트
│   └── init-databases.ts        # DB 초기화
│
├── tests/                        # 테스트
│   └── ...
│
├── .env.example                  # 환경 변수 예제
├── tsconfig.json                 # TypeScript 설정
├── package.json                  # 의존성 및 스크립트
├── jest.config.js                # Jest 설정
└── README.md                     # 프로젝트 문서
```

## 🔧 개발 가이드

### NPM Scripts

```bash
# 개발 모드 실행 (ts-node)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start

# 데이터베이스 마이그레이션
npm run migrate

# 테스트 실행
npm test

# 테스트 (watch 모드)
npm run test:watch

# 린팅
npm run lint

# 코드 포매팅
npm run format
```

### 에러 코드 시스템

4자리 에러 코드 형식 (`XYYY`):
- **X**: 카테고리 (1=회원가입, 2=로그인, 3=토큰, 4=일반, 5=OAuth)
- **YYY**: 세부 에러

예시:
- `1001` - 이미 등록된 이메일 (409)
- `1003` - 약한 비밀번호 (400)
- `2001` - 잘못된 인증 정보 (401)
- `2003` - 계정 잠김 (423)
- `3001` - 유효하지 않은 토큰 (401)
- `5001` - OAuth 제공자 오류 (503)

### Rate Limiting

- **전역**: IP당 15분에 100회
- **로그인**: 15분에 5회
- **회원가입**: 1시간에 3회
- **커뮤니티**: 15분에 50회

### 보안 기능

- ✅ bcrypt를 사용한 비밀번호 해싱
- ✅ JWT 토큰 생성 및 검증
- ✅ OAuth 2.0 State 검증 (CSRF 방어)
- ✅ 민감한 토큰 암호화
- ✅ 로그인 감사 로깅
- ✅ 계정 잠금 메커니즘
- ✅ SQL Injection 방어 (Prepared Statements)
- ✅ Rate Limiting (무차별 대입 공격 방어)

### 데이터베이스 연결 풀링

- MySQL 연결 풀링 (기본값: 10)
- 싱글톤 패턴으로 데이터베이스 연결 관리

### 캐싱 전략

- Redis를 사용한 세션 관리
- OAuth State TTL 기반 캐싱

### 작업 스케줄링

- `node-cron`을 사용한 뉴스 클러스터링 파이프라인
- 환경 변수로 스케줄 설정 가능
- 지수 백오프를 사용한 재시도 로직

### Module Aliasing

TypeScript/Node.js 모듈 별칭 사용:

```typescript
import { db } from '@/database/mysql';
import { AuthService } from '@services/auth/AuthService';
import { requireAuth } from '@middleware/auth';
```

설정 (`package.json`):
```json
{
  "_moduleAliases": {
    "@": "dist",
    "@config": "dist/config",
    "@services": "dist/services",
    "@routes": "dist/routes",
    "@middleware": "dist/middleware",
    "@utils": "dist/utils"
  }
}
```

### 테스트

```bash
# 전체 테스트 실행
npm test

# 특정 파일 테스트
npm test -- auth.test.ts

# 커버리지 확인
npm test -- --coverage
```

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

---

## 📞 문의 및 지원

프로젝트에 대한 문의사항이나 버그 리포트는 [GitHub Issues](https://github.com/Gistone9516/Ainus_server_new/issues)를 통해 제출해주세요.

**Developed by Ainus Dev Team**
