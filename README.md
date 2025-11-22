# Ainus Server - AI Model Analysis & Benchmarking Platform

> AI 모델 분석, 벤치마킹, 뉴스 클러스터링, 커뮤니티 플랫폼을 제공하는 백엔드 REST API 서버

[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue.svg)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-7.2-red.svg)](https://redis.io/)
[![Express](https://img.shields.io/badge/Express-4.18.2-lightgrey.svg)](https://expressjs.com/)

---

## 📋 목차

- [프로젝트 개요](#-프로젝트-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [시작하기](#-시작하기)
  - [필수 요구사항](#필수-요구사항)
  - [설치 방법](#설치-방법)
  - [환경 변수 설정](#환경-변수-설정)
  - [실행 방법](#실행-방법)
- [API 엔드포인트](#-api-엔드포인트)
- [데이터베이스 스키마](#-데이터베이스-스키마)
- [프로젝트 구조](#-프로젝트-구조)
- [개발 가이드](#-개발-가이드)

---

## 🎯 프로젝트 개요

**Ainus Server**는 AI 모델의 성능을 분석하고, 벤치마크 점수를 추적하며, AI 관련 뉴스를 클러스터링하여 이슈 지수를 제공하는 종합 플랫폼입니다.

### 핵심 가치

- **AI 모델 분석**: Artificial Analysis API 기반 실시간 모델 성능 추적
- **직업별 추천**: 13개 직업 카테고리에 따른 맞춤형 AI 모델 추천
- **AI 이슈 지수**: 시간별 AI 뉴스 클러스터링 및 이슈 지수 계산
- **커뮤니티**: AI 모델에 대한 사용자 토론 및 정보 공유
- **통합 인증**: 로컬 인증 + OAuth 2.0 (Google, Kakao, Naver)

---

## ✨ 주요 기능

### Phase 1: 인증 시스템 (완료 ✅)
- ✅ 이메일/비밀번호 회원가입 및 로그인
- ✅ JWT 토큰 기반 인증 (Access Token 15분, Refresh Token 7일)
- ✅ 비밀번호 강도 검증 (8자 이상, 대소문자, 숫자, 특수문자)
- ✅ 계정 잠금 (5회 실패 시)
- ✅ 로그인 감사 추적 (IP, Device, Location)

### Phase 2: OAuth 2.0 소셜 로그인 (완료 ✅)
- ✅ Google OAuth 2.0 통합
- ✅ Kakao OAuth 2.0 통합
- ✅ Naver OAuth 2.0 통합
- ✅ 소셜 계정 연동/해제

### Phase 3: 이메일 & 비밀번호 관리 (완료 ✅)
- ✅ 비밀번호 재설정 (이메일 토큰 기반)
- ✅ 이메일 인증
- ✅ 비밀번호 변경 (인증된 사용자)

### AI 모델 분석
- 📊 모델 정보 조회 (이름, 제공사, 출시일, 파라미터, 컨텍스트 길이)
- 📈 벤치마크 점수 추적 (MMLU_PRO, LiveCodeBench, HumanEval 등)
- 🎯 종합 점수 계산 (Intelligence, Coding, Math, Reasoning, Language Index)
- 💰 가격 정보 (입력/출력 토큰당 비용)
- ⚡ 성능 지표 (Latency, Throughput, TTFT)
- 📝 업데이트 히스토리

### 직업별 AI 모델 추천
- 👔 13개 직업 카테고리별 모델 추천
- 🎯 직업별 가중치 기반 점수 계산
- 🏆 Top N 모델 추천

### AI 뉴스 클러스터링 & 이슈 지수
- 📰 뉴스 수집 및 클러스터링 (1시간마다)
- 🤖 GPT 기반 토픽 분류
- 📊 시간별 AI 이슈 지수 (0-100)
- 📌 직업별 이슈 지수 (13개 카테고리)
- 📅 이슈 지수 히스토리 (90일 보관)

### 커뮤니티 (Phase 4)
- 📝 게시글 작성/수정/삭제
- 💬 댓글 시스템
- 👍 좋아요 기능
- 🔍 검색 및 필터링
- 🔔 알림 시스템

### 모델 비교 & 타임라인
- ⚖️ 두 모델 비교 (벤치마크, 가격, 성능)
- 📈 모델 시리즈 타임라인 시각화
- 🔬 벤치마크별 발전 추이
- 🏆 카테고리별 상위 모델

---

## 🛠 기술 스택

### Backend
- **Runtime**: Node.js 18.x
- **Language**: TypeScript 5.2.2
- **Framework**: Express.js 4.18.2
- **ORM/Query**: MySQL2 (Connection Pool)

### Database
- **Primary DB**: MySQL 8.0 (관계형 데이터, 40+ 테이블)
- **Cache/Session**: Redis 7.2

### Authentication & Security
- **JWT**: jsonwebtoken 9.0.0
- **Password Hashing**: bcryptjs 2.4.3
- **Rate Limiting**: express-rate-limit 8.2.1
- **OAuth 2.0**: Google, Kakao, Naver

### External APIs
- **AI Model Data**: Artificial Analysis API
- **News Collection**: Naver News API
- **AI Processing**: OpenAI SDK 4.75.0

### DevOps & Tools
- **Containerization**: Docker + Docker Compose
- **Logging**: Winston 3.11.0
- **Task Scheduling**: node-cron 3.0.2
- **Queue Processing**: Bull 4.11.4
- **Email**: Nodemailer 7.0.10

---

## 🚀 시작하기

### 필수 요구사항

- **Node.js**: 18.x 이상
- **MySQL**: 8.0 이상
- **Redis**: 7.2 이상
- **npm** 또는 **yarn**

### 설치 방법

#### 1. 레포지토리 클론

```bash
git clone https://github.com/Gistone9516/Ainus_server_new.git
cd Ainus_server_new
```

#### 2. 의존성 설치

```bash
npm install
```

#### 3. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 실제 값으로 수정:

```bash
cp .env.example .env
```

#### 4. Docker로 데이터베이스 실행 (선택사항)

```bash
docker-compose up -d
```

이 명령어는 MySQL(3307 포트)과 Redis(6379 포트)를 자동으로 실행합니다.

#### 5. 데이터베이스 마이그레이션

```bash
npm run migrate
```

#### 6. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

---

## 🔧 환경 변수 설정

### 필수 환경 변수

아래 환경 변수는 **반드시** 설정해야 합니다:

```bash
# ===========================================
# MySQL 설정 (필수)
# ===========================================
DB_HOST=127.0.0.1                          # MySQL 호스트
DB_PORT=3307                               # MySQL 포트 (Docker: 3307, 일반: 3306)
DB_NAME=ai_model_app                       # 데이터베이스 이름
DB_USER=ainus_user                         # MySQL 사용자명
DB_PASSWORD=qwer1234                       # MySQL 비밀번호

# ===========================================
# Redis 설정 (필수)
# ===========================================
REDIS_HOST=localhost                       # Redis 호스트
REDIS_PORT=6379                            # Redis 포트
# REDIS_PASSWORD=                          # Redis 비밀번호 (없으면 비워두기)

# ===========================================
# JWT 설정 (필수)
# ===========================================
JWT_SECRET=your_jwt_secret_change_me_to_random_string
JWT_EXPIRES_IN=15m                         # Access Token 만료 시간 (15분)
JWT_REFRESH_SECRET=your_refresh_secret_change_me_to_random_string
JWT_REFRESH_EXPIRES_IN=7d                  # Refresh Token 만료 시간 (7일)

# ===========================================
# 서버 설정
# ===========================================
NODE_ENV=development                       # development | production | test
PORT=3000                                  # 서버 포트
LOG_LEVEL=info                             # error | warn | info | debug
```

### OAuth 2.0 설정 (소셜 로그인 사용 시)

Google, Kakao, Naver OAuth를 사용하려면 각 플랫폼에서 Client ID와 Secret을 발급받아야 합니다.

#### Google OAuth 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. OAuth 2.0 클라이언트 ID 생성
3. 승인된 리디렉션 URI 추가: `http://localhost:3000/api/v1/auth/google/callback`

```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

#### Kakao OAuth 설정

1. [Kakao Developers](https://developers.kakao.com/)에서 애플리케이션 추가
2. REST API 키 발급
3. Redirect URI 등록: `http://localhost:3000/api/v1/auth/kakao/callback`

```bash
KAKAO_CLIENT_ID=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret  # (선택사항)
KAKAO_CALLBACK_URL=http://localhost:3000/api/v1/auth/kakao/callback
```

#### Naver OAuth 설정

1. [Naver Developers](https://developers.naver.com/)에서 애플리케이션 등록
2. Client ID와 Client Secret 발급
3. Callback URL 등록: `http://localhost:3000/api/v1/auth/naver/callback`

```bash
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
NAVER_CALLBACK_URL=http://localhost:3000/api/v1/auth/naver/callback
```

### External API 설정

#### Artificial Analysis API (AI 모델 데이터)

```bash
ARTIFICIAL_ANALYSIS_API_KEY=your_api_key_here
```

발급 방법: [Artificial Analysis](https://artificialanalysis.ai/)에서 API 키 발급

#### Naver News API (뉴스 수집)

```bash
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

발급 방법: [Naver Developers](https://developers.naver.com/products/service-api/search/search.md)에서 검색 API 신청

### 이메일 설정 (비밀번호 재설정, 이메일 인증)

Gmail SMTP를 사용하는 경우:

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false                         # true for 465, false for 587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password  # Gmail 앱 비밀번호 사용
EMAIL_FROM=noreply@ainus.example.com
EMAIL_FROM_NAME=Ainus
```

**Gmail 앱 비밀번호 생성 방법:**
1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성

### 선택적 환경 변수

```bash
# ===========================================
# 캐싱 설정
# ===========================================
CACHE_TTL_DEFAULT=300                      # 기본 캐시 TTL (초)
CACHE_TTL_MODELS=600                       # 모델 데이터 캐시 TTL (초)
CACHE_TTL_TIMELINE=300                     # 타임라인 캐시 TTL (초)

# ===========================================
# 보안 설정
# ===========================================
BCRYPT_ROUNDS=10                           # Bcrypt 해싱 라운드 (10-12 권장)
RATE_LIMIT_WINDOW_MS=900000                # Rate Limit 시간 창 (15분 = 900000ms)
RATE_LIMIT_MAX_REQUESTS=100                # 시간 창 내 최대 요청 수

# ===========================================
# 데이터 수집 설정
# ===========================================
DATA_COLLECTION_ENABLED=true               # 뉴스 수집 활성화
DATA_COLLECTION_CRON=0 * * * *             # Cron 형식 (매 시간 정각)

# ===========================================
# 기능 플래그
# ===========================================
ENABLE_BATCH_JOBS=true                     # 배치 작업 활성화
ENABLE_NOTIFICATIONS=true                  # 알림 기능 활성화
GOOGLE_TRENDS_ENABLED=false                # Google Trends 통합 (미구현)

# ===========================================
# OpenAI 설정 (GPT 클러스터링)
# ===========================================
OPENAI_API_KEY=sk-...                      # OpenAI API 키
OPENAI_ASSISTANT_ID=asst_...               # Assistant ID (선택사항)
```

### 환경 변수 검증

서버 시작 시 필수 환경 변수가 누락되면 에러가 발생합니다:

```
필수 환경 변수 누락: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
```

---

## 📡 API 엔드포인트

### Base URL

```
http://localhost:3000/api/v1
```

모든 API 응답은 다음 형식을 따릅니다:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "workflow_id": "uuid-v4"
}
```

에러 응답:

```json
{
  "success": false,
  "error": {
    "code": "2001",
    "message": "Invalid credentials",
    "details": { ... }
  },
  "timestamp": "2025-01-01T00:00:00.000Z",
  "workflow_id": "uuid-v4"
}
```

---

## 🔐 인증 API

### 1. 회원가입

**POST** `/api/v1/auth/register`

회원가입을 진행합니다. 비밀번호는 8자 이상, 대소문자, 숫자, 특수문자를 포함해야 합니다.

**Rate Limit**: 1시간에 3회

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "nickname": "사용자닉네임",
  "job_category_id": 1
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "nickname": "사용자닉네임",
      "job_category_id": 1,
      "created_at": "2025-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "15m"
    }
  }
}
```

**에러 코드**:
- `1001`: Email already registered
- `1002`: Nickname already taken
- `1003`: Password strength validation failed
- `1004`: Invalid email format

---

### 2. 이메일 중복 확인

**GET** `/api/v1/auth/check-email?email=user@example.com`

회원가입 전 이메일 중복 여부를 확인합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "available": true
  }
}
```

---

### 3. 로그인

**POST** `/api/v1/auth/login`

로컬 계정으로 로그인합니다. 5회 실패 시 계정이 잠깁니다.

**Rate Limit**: 15분에 5회

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": 1,
      "email": "user@example.com",
      "nickname": "사용자닉네임",
      "profile_image_url": null,
      "job_category_id": 1
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "15m"
    }
  }
}
```

**에러 코드**:
- `2001`: Invalid credentials
- `2002`: Account not found
- `2003`: Account locked (too many failed attempts)

---

### 4. 토큰 갱신

**POST** `/api/v1/auth/refresh`

Refresh Token으로 새로운 Access Token을 발급받습니다.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m"
  }
}
```

**에러 코드**:
- `3001`: Token expired
- `3002`: Invalid token

---

### 5. 로그아웃

**POST** `/api/v1/auth/logout`

로그아웃하고 Refresh Token을 무효화합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 6. 현재 사용자 정보

**GET** `/api/v1/auth/me`

현재 로그인한 사용자의 정보를 조회합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "nickname": "사용자닉네임",
    "job_category_id": 1,
    "profile_image_url": null,
    "auth_provider": "local",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 7. 비밀번호 재설정 요청

**POST** `/api/v1/auth/forgot-password`

비밀번호 재설정 이메일을 발송합니다.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### 8. 비밀번호 재설정

**POST** `/api/v1/auth/reset-password`

이메일로 받은 토큰으로 비밀번호를 재설정합니다.

**Request Body**:
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

### 9. 비밀번호 변경 (인증 필요)

**POST** `/api/v1/auth/change-password`

로그인한 사용자가 비밀번호를 변경합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Request Body**:
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 10. OAuth 2.0 로그인

#### Google 로그인

**GET** `/api/v1/auth/google`

Google OAuth 인증 페이지로 리다이렉트됩니다.

**Callback**: `/api/v1/auth/google/callback`

#### Kakao 로그인

**GET** `/api/v1/auth/kakao`

Kakao OAuth 인증 페이지로 리다이렉트됩니다.

**Callback**: `/api/v1/auth/kakao/callback`

#### Naver 로그인

**GET** `/api/v1/auth/naver`

Naver OAuth 인증 페이지로 리다이렉트됩니다.

**Callback**: `/api/v1/auth/naver/callback`

OAuth 콜백은 자동으로 JWT 토큰을 발급하고 클라이언트로 리다이렉트합니다.

---

## 🤖 AI 모델 API

### 1. 모델 목록 조회

**GET** `/api/v1/models?page=1&limit=20&is_active=true`

AI 모델 목록을 페이지네이션으로 조회합니다.

**Query Parameters**:
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 20, max: 100): 페이지당 항목 수
- `is_active` (optional, default: true): 활성화된 모델만 조회

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "model_id": "uuid-123",
        "model_name": "GPT-4 Turbo",
        "model_slug": "gpt-4-turbo",
        "creator_name": "OpenAI",
        "release_date": "2024-01-01",
        "model_type": "LLM",
        "parameter_size": "1.7T",
        "context_length": 128000,
        "is_open_source": false
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasMore": true
  }
}
```

---

### 2. 모델 상세 조회

**GET** `/api/v1/models/:model_id`

특정 모델의 상세 정보를 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "model_id": "uuid-123",
    "model_name": "GPT-4 Turbo",
    "model_slug": "gpt-4-turbo",
    "creator": {
      "creator_id": "uuid-456",
      "creator_name": "OpenAI",
      "website_url": "https://openai.com"
    },
    "release_date": "2024-01-01",
    "model_type": "LLM",
    "parameter_size": "1.7T",
    "context_length": 128000,
    "is_open_source": false,
    "is_active": true,
    "created_at": "2025-01-01T00:00:00.000Z",
    "updated_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 3. 모델 벤치마크 평가 조회

**GET** `/api/v1/models/:model_id/evaluations`

모델의 벤치마크 점수를 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "benchmark_name": "MMLU_PRO",
      "score": 84.5,
      "max_score": 100,
      "normalized_score": 84.5,
      "model_rank": 3,
      "measured_at": "2024-12-01"
    },
    {
      "benchmark_name": "LiveCodeBench",
      "score": 72.3,
      "max_score": 100,
      "normalized_score": 72.3,
      "model_rank": 5,
      "measured_at": "2024-12-01"
    }
  ]
}
```

---

### 4. 모델 종합 점수 조회

**GET** `/api/v1/models/:model_id/overall-scores?version=1`

모델의 종합 점수를 조회합니다.

**Query Parameters**:
- `version` (optional): 버전 번호 (생략 시 최신 버전)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "overall_score": 85.7,
    "intelligence_index": 87.2,
    "coding_index": 82.5,
    "math_index": 88.9,
    "reasoning_index": 86.3,
    "language_index": 84.1,
    "calculated_at": "2024-12-15T10:00:00.000Z",
    "version": 1
  }
}
```

---

### 5. 모델 가격 정보 조회

**GET** `/api/v1/models/:model_id/pricing?current=true`

모델의 가격 정보를 조회합니다.

**Query Parameters**:
- `current` (optional, default: true): 현재 가격만 조회

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "price_input_1m": 10.0,
    "price_output_1m": 30.0,
    "price_blended_3to1": 17.5,
    "currency": "USD",
    "effective_date": "2024-12-01",
    "is_current": true
  }
}
```

---

### 6. 모델 성능 지표 조회

**GET** `/api/v1/models/:model_id/performance?latest=true`

모델의 성능 지표 (Latency, Throughput)를 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "median_output_tokens_per_second": 85.5,
    "median_time_to_first_token": 0.45,
    "median_time_to_first_answer": 0.52,
    "latency_p50": 0.35,
    "latency_p95": 0.78,
    "latency_p99": 1.25,
    "measured_at": "2024-12-15T10:00:00.000Z"
  }
}
```

---

### 7. 모델 업데이트 히스토리 조회

**GET** `/api/v1/models/:model_id/updates?page=1&limit=10`

모델의 업데이트 이력을 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "update_id": 1,
        "version_before": "gpt-4-turbo-2024-04",
        "version_after": "gpt-4-turbo-2024-11",
        "update_date": "2024-11-01",
        "summary": "성능 개선 및 컨텍스트 윈도우 확장",
        "key_improvements": [
          "컨텍스트 길이 128K로 확장",
          "추론 성능 15% 향상",
          "가격 20% 인하"
        ],
        "performance_improvement": 15.0
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

---

### 8. 직업별 모델 추천

**GET** `/api/v1/models/recommend?job_category_code=software_dev&limit=5`

직업 카테고리에 맞는 AI 모델을 추천합니다.

**Query Parameters**:
- `job_category_id` (optional): 직업 카테고리 ID
- `job_category_code` (optional): 직업 카테고리 코드
- `limit` (optional, default: 3, max: 10): 추천 개수

둘 중 하나는 필수입니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "job_category": {
      "job_category_id": 1,
      "job_name": "소프트웨어 개발",
      "category_code": "software_dev"
    },
    "recommendations": [
      {
        "rank": 1,
        "model_id": "uuid-123",
        "model_name": "GPT-4 Turbo",
        "creator_name": "OpenAI",
        "weighted_score": 92.5,
        "overall_score": 85.7,
        "coding_index": 95.2,
        "reasoning_index": 88.3,
        "recommendation_reason": "코딩 및 추론 능력이 탁월합니다"
      }
    ]
  }
}
```

---

### 9. 직업 카테고리 목록

**GET** `/api/v1/job-categories`

13개 직업 카테고리 목록을 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "job_category_id": 1,
      "job_name": "소프트웨어 개발",
      "category_code": "software_dev",
      "description": "웹/앱 개발, 백엔드/프론트엔드 개발자"
    },
    {
      "job_category_id": 2,
      "job_name": "데이터 과학",
      "category_code": "data_science",
      "description": "데이터 분석가, ML 엔지니어, 데이터 과학자"
    }
  ]
}
```

---

## ⚖️ 모델 비교 API

### 1. 두 모델 비교

**GET** `/api/v1/comparison/compare?modelA=uuid-123&modelB=uuid-456`

두 AI 모델을 벤치마크, 가격, 성능 기준으로 비교합니다.

**Query Parameters**:
- `modelA` (required): 첫 번째 모델 ID
- `modelB` (required): 두 번째 모델 ID

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "model_a": {
      "model_id": "uuid-123",
      "model_name": "GPT-4 Turbo",
      "creator_name": "OpenAI",
      "overall_score": 85.7,
      "coding_index": 95.2,
      "price_blended_3to1": 17.5
    },
    "model_b": {
      "model_id": "uuid-456",
      "model_name": "Claude 3.5 Sonnet",
      "creator_name": "Anthropic",
      "overall_score": 87.3,
      "coding_index": 92.8,
      "price_blended_3to1": 15.0
    },
    "comparison_summary": {
      "winner": "model_b",
      "score_difference": 1.6,
      "price_difference": -2.5,
      "strengths_a": ["코딩 성능", "추론 능력"],
      "strengths_b": ["가격", "전반적 성능"]
    },
    "visual_data": {
      "benchmark_comparison": [
        {
          "benchmark_name": "MMLU_PRO",
          "model_a_score": 84.5,
          "model_b_score": 86.2,
          "difference": 1.7
        }
      ]
    }
  }
}
```

---

### 2. 카테고리별 상위 모델

**GET** `/api/v1/comparison/top/:category?limit=10`

카테고리별 상위 모델을 조회합니다.

**Path Parameters**:
- `category` (required): `overall` | `intelligence` | `coding` | `math`

**Query Parameters**:
- `limit` (optional, default: 10, max: 50): 조회 개수

**Response** (200 OK):
```json
{
  "success": true,
  "category": "coding",
  "count": 10,
  "data": [
    {
      "model_id": "uuid-123",
      "model_name": "GPT-4 Turbo",
      "creator_name": "OpenAI",
      "score": 95.2,
      "rank": 1
    }
  ]
}
```

---

### 3. 간편 비교 (모델명으로)

**GET** `/api/v1/comparison/quick-compare?nameA=GPT-4&nameB=Claude`

모델명으로 검색하여 비교합니다. (부분 일치)

**Response**: `/compare`와 동일 + `matched` 필드 추가

```json
{
  "success": true,
  "matched": {
    "model_a": "GPT-4 Turbo",
    "model_b": "Claude 3.5 Sonnet"
  },
  "data": { ... }
}
```

---

## 📈 타임라인 API

### 1. 모델 시리즈 타임라인

**GET** `/api/v1/timeline/:series?limit=20`

특정 모델 시리즈의 발전 타임라인을 조회합니다.

**Path Parameters**:
- `series` (required): 시리즈 이름 (예: GPT, Claude, Gemini)

**Query Parameters**:
- `limit` (optional, default: 20, max: 50): 조회 개수

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "series": "GPT",
    "timeline": [
      {
        "model_name": "GPT-4 Turbo",
        "release_date": "2024-11-01",
        "overall_score": 85.7,
        "major_improvements": ["컨텍스트 128K", "성능 15% 향상"]
      },
      {
        "model_name": "GPT-4",
        "release_date": "2023-03-14",
        "overall_score": 82.1,
        "major_improvements": ["멀티모달 지원"]
      }
    ]
  }
}
```

---

### 2. 여러 시리즈 비교

**GET** `/api/v1/timeline/compare?series=GPT,Claude,Gemini`

여러 모델 시리즈의 타임라인을 비교합니다.

**Query Parameters**:
- `series` (required): 쉼표로 구분된 시리즈 이름 (최소 2개, 최대 5개)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "compared_series": ["GPT", "Claude", "Gemini"],
    "timeline_comparison": [
      {
        "date": "2024-11-01",
        "events": [
          {
            "series": "GPT",
            "model_name": "GPT-4 Turbo",
            "event": "release",
            "overall_score": 85.7
          }
        ]
      }
    ]
  }
}
```

---

### 3. 주요 출시 이벤트

**GET** `/api/v1/timeline/events?startDate=2024-01-01&endDate=2024-12-31`

특정 기간의 주요 모델 출시 이벤트를 조회합니다.

**Query Parameters**:
- `startDate` (required): 시작일 (YYYY-MM-DD)
- `endDate` (required): 종료일 (YYYY-MM-DD)

**Response** (200 OK):
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "model_name": "GPT-4 Turbo",
      "creator_name": "OpenAI",
      "release_date": "2024-11-01",
      "event_type": "major_release",
      "significance": "high"
    }
  ]
}
```

---

### 4. 벤치마크별 발전 추이

**GET** `/api/v1/timeline/benchmark/:series/:benchmark`

특정 벤치마크 기준으로 모델 시리즈의 성능 발전을 추적합니다.

**Path Parameters**:
- `series` (required): 시리즈 이름
- `benchmark` (required): 벤치마크 이름 (예: MMLU_PRO, LiveCodeBench)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "series": "GPT",
    "benchmark": "MMLU_PRO",
    "progression": [
      {
        "model_name": "GPT-4 Turbo",
        "release_date": "2024-11-01",
        "score": 84.5,
        "improvement_from_previous": 3.2
      },
      {
        "model_name": "GPT-4",
        "release_date": "2023-03-14",
        "score": 81.3,
        "improvement_from_previous": null
      }
    ]
  }
}
```

---

### 5. 사용 가능한 시리즈 목록

**GET** `/api/v1/timeline/series`

사용 가능한 모델 시리즈 목록을 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "count": 8,
  "data": [
    {
      "series_name": "GPT",
      "model_count": 12,
      "latest_model": "GPT-4 Turbo",
      "latest_release": "2024-11-01"
    }
  ]
}
```

---

## 📰 AI 이슈 지수 API

### 1. 현재 이슈 지수

**GET** `/api/issue-index/current`

현재 시간 기준 AI 이슈 지수를 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "collected_at": "2025-01-01T14:00:00.000Z",
    "overall_index": 72.5,
    "active_clusters_count": 8,
    "inactive_clusters_count": 2,
    "total_articles_analyzed": 1000,
    "top_clusters": [
      {
        "cluster_id": "cluster_001",
        "topic_name": "OpenAI GPT-5 출시 소식",
        "tags": ["GPT-5", "OpenAI", "LLM", "성능향상", "혁신"],
        "cluster_score": 95.2,
        "article_count": 150
      }
    ]
  }
}
```

---

### 2. 과거 이슈 지수

**GET** `/api/issue-index/history?date=2025-01-01`

특정 날짜의 이슈 지수를 조회합니다.

**Query Parameters**:
- `date` (required): 날짜 (YYYY-MM-DD)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "collected_at": "2025-01-01T14:00:00.000Z",
      "overall_index": 72.5,
      "active_clusters_count": 8,
      "inactive_clusters_count": 2
    },
    {
      "collected_at": "2025-01-01T13:00:00.000Z",
      "overall_index": 68.3,
      "active_clusters_count": 7,
      "inactive_clusters_count": 3
    }
  ]
}
```

---

### 3. 클러스터 스냅샷

**GET** `/api/issue-index/clusters?collected_at=2025-01-01T14:00:00Z`

특정 시간의 전체 클러스터 스냅샷을 조회합니다.

**Query Parameters**:
- `collected_at` (required): 수집 시간 (ISO 8601 format)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "cluster_id": "cluster_001",
      "topic_name": "OpenAI GPT-5 출시 소식",
      "tags": ["GPT-5", "OpenAI", "LLM", "성능향상", "혁신"],
      "appearance_count": 5,
      "article_count": 150,
      "article_indices": [0, 1, 2, 5, 8, 12, ...],
      "status": "active",
      "cluster_score": 95.2
    }
  ]
}
```

---

### 4. 기사 원문 조회

**GET** `/api/issue-index/articles?collected_at=2025-01-01T14:00:00Z&indices=0,1,2`

특정 시간의 특정 인덱스 기사들을 조회합니다.

**Query Parameters**:
- `collected_at` (required): 수집 시간
- `indices` (required): 쉼표로 구분된 기사 인덱스 (0-999)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "article_index": 0,
      "title": "OpenAI, GPT-5 개발 중단 발표",
      "link": "https://news.example.com/article/123",
      "description": "OpenAI가 GPT-5 개발을 중단한다고 발표했습니다...",
      "pub_date": "2025-01-01T12:30:00.000Z",
      "source": "naver"
    }
  ]
}
```

---

## 💬 커뮤니티 API

### 1. 게시글 작성

**POST** `/api/v1/community/posts`

새 게시글을 작성합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Request Body**:
```json
{
  "title": "GPT-4 Turbo 사용 후기",
  "content": "GPT-4 Turbo를 한 달간 사용해본 결과...",
  "tags": [1, 5, 8]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "post_id": 123,
    "title": "GPT-4 Turbo 사용 후기",
    "content": "GPT-4 Turbo를 한 달간 사용해본 결과...",
    "author": {
      "user_id": 1,
      "nickname": "사용자닉네임"
    },
    "likes_count": 0,
    "comments_count": 0,
    "views_count": 0,
    "created_at": "2025-01-01T14:00:00.000Z"
  }
}
```

---

### 2. 게시글 목록 조회

**GET** `/api/v1/community/posts?page=1&limit=20&sort=recent`

게시글 목록을 조회합니다.

**Query Parameters**:
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 20): 페이지당 항목 수
- `sort` (optional, default: recent): `recent` | `popular` | `views`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "post_id": 123,
        "title": "GPT-4 Turbo 사용 후기",
        "author": {
          "user_id": 1,
          "nickname": "사용자닉네임"
        },
        "likes_count": 15,
        "comments_count": 8,
        "views_count": 234,
        "created_at": "2025-01-01T14:00:00.000Z"
      }
    ],
    "total": 500,
    "page": 1,
    "limit": 20
  }
}
```

---

### 3. 게시글 상세 조회

**GET** `/api/v1/community/posts/:postId`

특정 게시글의 상세 내용을 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "post_id": 123,
    "title": "GPT-4 Turbo 사용 후기",
    "content": "GPT-4 Turbo를 한 달간 사용해본 결과...",
    "author": {
      "user_id": 1,
      "nickname": "사용자닉네임",
      "profile_image_url": null
    },
    "tags": [
      {
        "interest_tag_id": 1,
        "tag_name": "GPT",
        "tag_code": "gpt"
      }
    ],
    "likes_count": 15,
    "comments_count": 8,
    "views_count": 235,
    "is_liked": false,
    "created_at": "2025-01-01T14:00:00.000Z",
    "updated_at": "2025-01-01T14:00:00.000Z"
  }
}
```

---

### 4. 게시글 수정

**PUT** `/api/v1/community/posts/:postId`

자신이 작성한 게시글을 수정합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Request Body**:
```json
{
  "title": "GPT-4 Turbo 사용 후기 (수정)",
  "content": "내용 수정..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "post_id": 123,
    "title": "GPT-4 Turbo 사용 후기 (수정)",
    "updated_at": "2025-01-01T15:00:00.000Z"
  }
}
```

---

### 5. 게시글 삭제

**DELETE** `/api/v1/community/posts/:postId`

자신이 작성한 게시글을 삭제합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

---

### 6. 게시글 좋아요/취소

**POST** `/api/v1/community/posts/:postId/like`

게시글에 좋아요를 누르거나 취소합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "post_id": 123,
    "is_liked": true,
    "likes_count": 16
  }
}
```

---

### 7. 댓글 작성

**POST** `/api/v1/community/posts/:postId/comments`

게시글에 댓글을 작성합니다.

**Headers**:
```
Authorization: Bearer <accessToken>
```

**Request Body**:
```json
{
  "content": "좋은 후기 감사합니다!"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "comment_id": 456,
    "post_id": 123,
    "content": "좋은 후기 감사합니다!",
    "author": {
      "user_id": 2,
      "nickname": "댓글작성자"
    },
    "likes_count": 0,
    "created_at": "2025-01-01T15:00:00.000Z"
  }
}
```

---

### 8. 댓글 목록 조회

**GET** `/api/v1/community/posts/:postId/comments?page=1&limit=20`

게시글의 댓글 목록을 조회합니다.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "comment_id": 456,
        "content": "좋은 후기 감사합니다!",
        "author": {
          "user_id": 2,
          "nickname": "댓글작성자"
        },
        "likes_count": 3,
        "created_at": "2025-01-01T15:00:00.000Z"
      }
    ],
    "total": 8,
    "page": 1,
    "limit": 20
  }
}
```

---

### 9. 게시글 검색

**GET** `/api/v1/community/posts/search?q=GPT-4&page=1&limit=20`

키워드로 게시글을 검색합니다.

**Query Parameters**:
- `q` (required): 검색 키워드
- `page` (optional, default: 1): 페이지 번호
- `limit` (optional, default: 20): 페이지당 항목 수

**Response**: `/posts`와 동일

---

## 🗄️ 데이터베이스 스키마

### ERD 개요

Ainus Server는 **40개 이상의 테이블**로 구성된 MySQL 8.0 데이터베이스를 사용합니다.

### 주요 섹션

1. **직업 카테고리** (2개 테이블)
2. **사용자 및 인증** (4개 테이블)
3. **AI 모델** (7개 테이블)
4. **모델 업데이트** (2개 테이블)
5. **AI 이슈 지수** (4개 테이블)
6. **뉴스 및 태그** (3개 테이블)
7. **커뮤니티** (4개 테이블)
8. **사용자 관심 및 알림** (6개 테이블)
9. **매핑 및 캐시** (2개 테이블)
10. **데이터 수집 로그** (1개 테이블)

---

### 1. 직업 카테고리 테이블

#### `job_categories` - 직업 카테고리 마스터

13개의 직업 카테고리를 저장합니다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `job_category_id` | INT (PK, AI) | 직업 카테고리 ID |
| `job_name` | VARCHAR(100) | 직업 카테고리명 (예: 소프트웨어 개발) |
| `category_code` | VARCHAR(20) UNIQUE | 카테고리 코드 (예: software_dev) |
| `description` | TEXT | 카테고리 설명 |
| `created_at` | TIMESTAMP | 생성일시 |

**인덱스**:
- `idx_category_code` on `category_code`

**데이터 예시**:
```sql
(1, '소프트웨어 개발', 'software_dev', '웹/앱 개발, 백엔드/프론트엔드'),
(2, '데이터 과학', 'data_science', '데이터 분석가, ML 엔지니어'),
(3, '연구원', 'researcher', 'AI 연구, 학술 연구'),
...
```

---

#### `job_occupations` - 구체적 직업

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `job_occupation_id` | INT (PK, AI) | 직업 ID |
| `job_category_id` | INT (FK) | 직업 카테고리 ID |
| `occupation_name` | VARCHAR(100) | 직업명 (예: 백엔드 개발자) |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `job_category_id` → `job_categories(job_category_id)`

---

### 2. 사용자 및 인증 테이블

#### `users` - 사용자 기본 정보

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `user_id` | INT (PK, AI) | 사용자 ID |
| `email` | VARCHAR(255) UNIQUE | 이메일 (로그인 ID) |
| `password_hash` | VARCHAR(255) | 비밀번호 해시 (bcrypt) |
| `nickname` | VARCHAR(50) UNIQUE | 닉네임 |
| `job_category_id` | INT (FK) | 직업 카테고리 ID |
| `profile_image_url` | VARCHAR(500) | 프로필 이미지 URL |
| `is_active` | BOOLEAN | 활성화 여부 (default: TRUE) |
| `created_at` | TIMESTAMP | 가입일시 |
| `updated_at` | TIMESTAMP | 수정일시 |

**외래 키**:
- `job_category_id` → `job_categories(job_category_id)`

**인덱스**:
- `idx_email` on `email`
- `idx_nickname` on `nickname`
- `idx_is_active` on `is_active`

---

#### `user_profiles` - 사용자 상세 프로필

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `profile_id` | INT (PK, AI) | 프로필 ID |
| `user_id` | INT (FK, UNIQUE) | 사용자 ID (1:1 관계) |
| `job_occupation_id` | INT (FK) | 구체적 직업 ID |
| `bio` | TEXT | 자기소개 |
| `preferences` | JSON | 사용자 설정 (알림, 테마 등) |
| `created_at` | TIMESTAMP | 생성일시 |
| `updated_at` | TIMESTAMP | 수정일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE
- `job_occupation_id` → `job_occupations(job_occupation_id)`

---

#### `user_sessions` - JWT 토큰 관리

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `session_id` | INT (PK, AI) | 세션 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `token_hash` | VARCHAR(255) UNIQUE | Refresh Token 해시 |
| `expires_at` | DATETIME | 만료일시 |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE

**인덱스**:
- `idx_user_id` on `user_id`
- `idx_expires_at` on `expires_at`
- `idx_token_hash` on `token_hash`

---

#### `user_social_accounts` - OAuth 소셜 계정 연동

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `social_account_id` | INT (PK, AI) | 소셜 계정 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `provider` | VARCHAR(20) | 제공자 (google, kakao, naver) |
| `provider_user_id` | VARCHAR(255) | 제공자의 사용자 ID |
| `access_token` | TEXT | 암호화된 Access Token |
| `refresh_token` | TEXT | 암호화된 Refresh Token |
| `token_expires_at` | DATETIME | 토큰 만료일시 |
| `created_at` | TIMESTAMP | 연동일시 |
| `updated_at` | TIMESTAMP | 수정일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE

**유니크 키**:
- `uk_provider_user` on (`provider`, `provider_user_id`)

---

#### `password_reset_tokens` - 비밀번호 재설정 토큰

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `token_id` | INT (PK, AI) | 토큰 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `token_hash` | VARCHAR(255) UNIQUE | 토큰 해시 |
| `expires_at` | DATETIME | 만료일시 (기본: 1시간) |
| `used_at` | DATETIME | 사용일시 |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE

---

#### `login_audit_logs` - 로그인 감사 로그

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `audit_id` | BIGINT (PK, AI) | 감사 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `login_status` | ENUM | success, failed, locked |
| `ip_address` | VARCHAR(45) | IP 주소 (IPv6 지원) |
| `user_agent` | TEXT | User-Agent 문자열 |
| `device_type` | VARCHAR(50) | 디바이스 타입 (mobile, desktop) |
| `location` | VARCHAR(100) | 위치 (IP 기반) |
| `failure_reason` | VARCHAR(255) | 실패 사유 |
| `created_at` | TIMESTAMP | 로그인 시도 일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE

**인덱스**:
- `idx_user_id` on `user_id`
- `idx_login_status` on `login_status`
- `idx_created_at` on `created_at`

---

### 3. AI 모델 테이블

#### `model_creators` - AI 모델 제공사

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `creator_id` | VARCHAR(36) (PK) | UUID |
| `creator_name` | VARCHAR(100) | 제공사명 (예: OpenAI) |
| `creator_slug` | VARCHAR(100) UNIQUE | URL 슬러그 (예: openai) |
| `website_url` | VARCHAR(255) | 웹사이트 URL |
| `description` | TEXT | 설명 |
| `country` | VARCHAR(50) | 국가 |
| `founded_year` | YEAR | 설립년도 |
| `is_active` | BOOLEAN | 활성화 여부 |
| `created_at` | DATETIME | 생성일시 |
| `updated_at` | DATETIME | 수정일시 |

**인덱스**:
- `idx_creator_slug` on `creator_slug`
- `idx_is_active` on `is_active`

---

#### `ai_models` - AI 모델 기본 정보

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `model_id` | VARCHAR(36) (PK) | Artificial Analysis API ID (UUID) |
| `model_name` | VARCHAR(150) | 모델명 (예: GPT-4 Turbo) |
| `model_slug` | VARCHAR(150) UNIQUE | URL 슬러그 (예: gpt-4-turbo) |
| `creator_id` | VARCHAR(36) (FK) | 제공사 ID |
| `release_date` | DATE | 출시일 |
| `model_type` | VARCHAR(50) | 모델 타입 (LLM, Vision 등) |
| `parameter_size` | VARCHAR(50) | 파라미터 크기 (예: 1.7T) |
| `context_length` | INT | 컨텍스트 길이 (예: 128000) |
| `is_open_source` | BOOLEAN | 오픈소스 여부 |
| `is_active` | BOOLEAN | 활성화 여부 |
| `raw_data` | JSON | 원본 API 데이터 |
| `created_at` | DATETIME | 생성일시 |
| `updated_at` | DATETIME | 수정일시 |

**외래 키**:
- `creator_id` → `model_creators(creator_id)` ON DELETE CASCADE

**인덱스**:
- `idx_model_slug` on `model_slug`
- `idx_creator_id` on `creator_id`
- `idx_release_date` on `release_date`
- `idx_is_active` on `is_active`

---

#### `model_evaluations` - 벤치마크 점수

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `evaluation_id` | BIGINT (PK, AI) | 평가 ID |
| `model_id` | VARCHAR(36) (FK) | 모델 ID |
| `benchmark_name` | VARCHAR(100) | 벤치마크명 (예: MMLU_PRO) |
| `score` | DECIMAL(10,4) | 원본 점수 |
| `max_score` | DECIMAL(10,4) | 최대 점수 |
| `normalized_score` | DECIMAL(5,2) | 정규화 점수 (0-100) |
| `model_rank` | INT | 모델 순위 |
| `measured_at` | DATE | 측정일 |
| `created_at` | DATETIME | 생성일시 |
| `updated_at` | DATETIME | 수정일시 |

**외래 키**:
- `model_id` → `ai_models(model_id)` ON DELETE CASCADE

**유니크 키**:
- `uk_model_benchmark` on (`model_id`, `benchmark_name`)

**인덱스**:
- `idx_benchmark_name` on `benchmark_name`
- `idx_normalized_score` on `normalized_score DESC`
- `idx_measured_at` on `measured_at`

---

#### `model_overall_scores` - 종합 점수

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `score_id` | BIGINT (PK, AI) | 점수 ID |
| `model_id` | VARCHAR(36) (FK) | 모델 ID |
| `overall_score` | DECIMAL(5,2) | 종합 점수 (0-100) |
| `intelligence_index` | DECIMAL(5,2) | 지능 지수 |
| `coding_index` | DECIMAL(5,2) | 코딩 지수 |
| `math_index` | DECIMAL(5,2) | 수학 지수 |
| `reasoning_index` | DECIMAL(5,2) | 추론 지수 |
| `language_index` | DECIMAL(5,2) | 언어 지수 |
| `calculated_at` | DATETIME | 계산일시 |
| `version` | INT | 버전 (default: 1) |
| `created_at` | DATETIME | 생성일시 |
| `updated_at` | DATETIME | 수정일시 |

**외래 키**:
- `model_id` → `ai_models(model_id)` ON DELETE CASCADE

**유니크 키**:
- `uk_model_version` on (`model_id`, `version`)

**인덱스**:
- `idx_overall_score` on `overall_score DESC`
- `idx_calculated_at` on `calculated_at DESC`

---

#### `model_pricing` - 가격 정보

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `pricing_id` | BIGINT (PK, AI) | 가격 ID |
| `model_id` | VARCHAR(36) (FK) | 모델 ID |
| `price_input_1m` | DECIMAL(10,6) | 입력 토큰 가격 (100만 토큰당 USD) |
| `price_output_1m` | DECIMAL(10,6) | 출력 토큰 가격 (100만 토큰당 USD) |
| `price_blended_3to1` | DECIMAL(10,6) | 혼합 가격 (3:1 비율) |
| `currency` | VARCHAR(10) | 통화 (default: USD) |
| `effective_date` | DATE | 적용일 |
| `is_current` | BOOLEAN | 현재 가격 여부 |
| `created_at` | DATETIME | 생성일시 |
| `updated_at` | DATETIME | 수정일시 |

**외래 키**:
- `model_id` → `ai_models(model_id)` ON DELETE CASCADE

**인덱스**:
- `idx_model_id` on `model_id`
- `idx_is_current` on `is_current`
- `idx_effective_date` on `effective_date DESC`

---

#### `model_performance` - 성능 지표

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `performance_id` | BIGINT (PK, AI) | 성능 ID |
| `model_id` | VARCHAR(36) (FK) | 모델 ID |
| `median_output_tokens_per_second` | DECIMAL(10,2) | 초당 출력 토큰 (중간값) |
| `median_time_to_first_token` | DECIMAL(10,4) | 첫 토큰까지 시간 (초, 중간값) |
| `median_time_to_first_answer` | DECIMAL(10,4) | 첫 답변까지 시간 (초, 중간값) |
| `latency_p50` | DECIMAL(10,4) | 지연시간 50분위 (초) |
| `latency_p95` | DECIMAL(10,4) | 지연시간 95분위 (초) |
| `latency_p99` | DECIMAL(10,4) | 지연시간 99분위 (초) |
| `measured_at` | DATETIME | 측정일시 |
| `created_at` | DATETIME | 생성일시 |
| `updated_at` | DATETIME | 수정일시 |

**외래 키**:
- `model_id` → `ai_models(model_id)` ON DELETE CASCADE

**인덱스**:
- `idx_model_id` on `model_id`
- `idx_measured_at` on `measured_at DESC`

---

### 4. 모델 업데이트 테이블

#### `model_updates` - 모델 업데이트 이력

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `update_id` | INT (PK, AI) | 업데이트 ID |
| `model_id` | VARCHAR(36) (FK) | 모델 ID |
| `version_before` | VARCHAR(50) | 이전 버전 |
| `version_after` | VARCHAR(50) | 이후 버전 |
| `update_date` | DATE | 업데이트 일자 |
| `summary` | TEXT | 업데이트 요약 |
| `key_improvements` | JSON | 주요 개선사항 배열 |
| `performance_improvement` | DECIMAL(5,2) | 성능 개선률 (%) |
| `created_at` | TIMESTAMP | 생성일시 |
| `updated_at` | TIMESTAMP | 수정일시 |

**외래 키**:
- `model_id` → `ai_models(model_id)` ON DELETE CASCADE

**인덱스**:
- `idx_model_id` on `model_id`
- `idx_update_date` on `update_date DESC`

---

#### `model_updates_details` - 업데이트 벤치마크 상세

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `detail_id` | INT (PK, AI) | 상세 ID |
| `update_id` | INT (FK) | 업데이트 ID |
| `benchmark_name` | VARCHAR(100) | 벤치마크명 |
| `before_score` | DECIMAL(8,4) | 이전 점수 |
| `after_score` | DECIMAL(8,4) | 이후 점수 |
| `improvement_pct` | DECIMAL(5,2) | 개선률 (%) |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `update_id` → `model_updates(update_id)` ON DELETE CASCADE

**인덱스**:
- `idx_update_id` on `update_id`
- `idx_benchmark_name` on `benchmark_name`

---

### 5. AI 이슈 지수 테이블

#### `clusters` - 클러스터 현재 상태

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `cluster_id` | VARCHAR(50) (PK) | 클러스터 ID (cluster_001, cluster_002 등) |
| `topic_name` | VARCHAR(200) | 토픽명 |
| `tags` | JSON | 태그 배열 (5개) |
| `appearance_count` | INT | 재출현 횟수 |
| `status` | ENUM | active, inactive |
| `created_at` | DATETIME | 최초 생성일시 |
| `updated_at` | DATETIME | 최종 업데이트일시 |

**인덱스**:
- `idx_status` on `status`
- `idx_updated_at` on `updated_at DESC`

---

#### `cluster_history` - 클러스터 이력

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `history_id` | BIGINT (PK, AI) | 이력 ID |
| `cluster_id` | VARCHAR(50) (FK) | 클러스터 ID |
| `collected_at` | DATETIME | 수집 시간 (1시간 단위) |
| `article_indices` | JSON | 기사 인덱스 배열 (0-999) |
| `article_count` | INT | 기사 개수 |
| `created_at` | DATETIME | 생성일시 |

**외래 키**:
- `cluster_id` → `clusters(cluster_id)` ON DELETE CASCADE

**인덱스**:
- `idx_cluster_collected` on (`cluster_id`, `collected_at`)
- `idx_collected_at` on `collected_at DESC`

---

#### `cluster_snapshots` - 클러스터 스냅샷

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `snapshot_id` | BIGINT (PK, AI) | 스냅샷 ID |
| `collected_at` | DATETIME | 수집 시간 (1시간 단위) |
| `cluster_id` | VARCHAR(50) | 클러스터 ID |
| `topic_name` | VARCHAR(200) | 토픽명 |
| `tags` | JSON | 태그 배열 (5개) |
| `appearance_count` | INT | 재출현 횟수 |
| `article_count` | INT | 해당 시간 기사 개수 |
| `article_indices` | JSON | 기사 인덱스 배열 |
| `status` | ENUM | active, inactive |
| `cluster_score` | DECIMAL(5,2) | 클러스터 점수 (0-100) |
| `created_at` | DATETIME | 생성일시 |

**인덱스**:
- `idx_collected_at` on `collected_at DESC`
- `idx_cluster_id` on `cluster_id`
- `idx_collected_cluster` on (`collected_at`, `cluster_id`)
- `idx_cluster_score` on `cluster_score DESC`

---

#### `issue_index` - 통합 이슈 지수

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `collected_at` | DATETIME (PK) | 수집 시간 (1시간 단위) |
| `overall_index` | DECIMAL(5,1) | 통합 이슈 지수 (0-100) |
| `active_clusters_count` | INT | active 클러스터 개수 |
| `inactive_clusters_count` | INT | inactive 클러스터 개수 |
| `total_articles_analyzed` | INT | 분석된 총 기사 개수 |
| `created_at` | DATETIME | 생성일시 |

**인덱스**:
- `idx_collected_at_desc` on `collected_at DESC`
- `idx_overall_index` on `overall_index DESC`

---

### 6. 뉴스 및 태그 테이블

#### `interest_tags` - 표준 관심 태그 (40개)

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `interest_tag_id` | INT (PK, AI) | 태그 ID |
| `tag_name` | VARCHAR(50) | 태그명 (예: GPT, Claude, LLM) |
| `tag_code` | VARCHAR(20) UNIQUE | 태그 코드 (예: gpt, claude) |
| `description` | TEXT | 태그 설명 |
| `created_at` | TIMESTAMP | 생성일시 |

**인덱스**:
- `idx_tag_code` on `tag_code`

**데이터 예시**:
```sql
(1, 'GPT', 'gpt', 'OpenAI GPT 시리즈'),
(2, 'Claude', 'claude', 'Anthropic Claude 시리즈'),
(3, 'LLM', 'llm', 'Large Language Model'),
...
```

---

#### `news_articles` - 뉴스 기사 메타데이터

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `article_id` | BIGINT (PK, AI) | 기사 ID |
| `collected_at` | DATETIME | 수집 시간 (1시간 단위) |
| `article_index` | INT | 기사 인덱스 (0-999, GPT 입력 순서) |
| `source` | VARCHAR(50) | 출처 (naver 등) |
| `title` | TEXT | 기사 제목 |
| `link` | VARCHAR(500) | 기사 링크 |
| `description` | TEXT | 기사 요약 |
| `pub_date` | DATETIME | 발행일시 |
| `created_at` | DATETIME | 생성일시 |

**유니크 키**:
- `uk_collected_index` on (`collected_at`, `article_index`)

**인덱스**:
- `idx_collected_at` on `collected_at DESC`
- `idx_article_index` on `article_index`
- `idx_pub_date` on `pub_date DESC`
- `idx_source` on `source`

---

#### `article_to_tags` - 기사-태그 관계

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `mapping_id` | INT (PK, AI) | 매핑 ID |
| `article_id` | BIGINT (FK) | 기사 ID |
| `interest_tag_id` | INT (FK) | 태그 ID |
| `classification_status` | ENUM | confirmed, pending_review, rejected |
| `confidence_score` | DECIMAL(3,2) | 신뢰도 점수 (0-1) |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `article_id` → `news_articles(article_id)` ON DELETE CASCADE
- `interest_tag_id` → `interest_tags(interest_tag_id)`

**인덱스**:
- `idx_article_id` on `article_id`
- `idx_tag_id` on `interest_tag_id`
- `idx_status` on `classification_status`

---

### 7. 커뮤니티 테이블

#### `community_posts` - 게시글

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `post_id` | INT (PK, AI) | 게시글 ID |
| `user_id` | INT (FK) | 작성자 ID |
| `title` | VARCHAR(255) | 게시글 제목 |
| `content` | TEXT | 게시글 내용 |
| `likes_count` | INT | 좋아요 개수 (default: 0) |
| `comments_count` | INT | 댓글 개수 (default: 0) |
| `views_count` | INT | 조회수 (default: 0) |
| `created_at` | TIMESTAMP | 작성일시 |
| `updated_at` | TIMESTAMP | 수정일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE

**인덱스**:
- `idx_user_id` on `user_id`
- `idx_created_at` on `created_at DESC`
- `idx_likes_count` on `likes_count DESC`

---

#### `community_comments` - 댓글

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `comment_id` | INT (PK, AI) | 댓글 ID |
| `post_id` | INT (FK) | 게시글 ID |
| `user_id` | INT (FK) | 작성자 ID |
| `content` | TEXT | 댓글 내용 |
| `likes_count` | INT | 좋아요 개수 (default: 0) |
| `created_at` | TIMESTAMP | 작성일시 |
| `updated_at` | TIMESTAMP | 수정일시 |

**외래 키**:
- `post_id` → `community_posts(post_id)` ON DELETE CASCADE
- `user_id` → `users(user_id)` ON DELETE CASCADE

**인덱스**:
- `idx_post_id` on `post_id`
- `idx_user_id` on `user_id`
- `idx_created_at` on `created_at DESC`

---

#### `post_likes` - 게시글 좋아요

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `like_id` | INT (PK, AI) | 좋아요 ID |
| `post_id` | INT (FK) | 게시글 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `created_at` | TIMESTAMP | 좋아요 일시 |

**외래 키**:
- `post_id` → `community_posts(post_id)` ON DELETE CASCADE
- `user_id` → `users(user_id)` ON DELETE CASCADE

**유니크 키**:
- `uk_post_user` on (`post_id`, `user_id`)

---

#### `community_post_tags` - 게시글-태그 관계

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `tag_id` | INT (PK, AI) | 게시글 태그 ID |
| `post_id` | INT (FK) | 게시글 ID |
| `interest_tag_id` | INT (FK) | 태그 ID |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `post_id` → `community_posts(post_id)` ON DELETE CASCADE
- `interest_tag_id` → `interest_tags(interest_tag_id)`

---

### 8. 사용자 관심 및 알림 테이블

#### `user_interested_models` - 사용자 관심 모델

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `interested_id` | INT (PK, AI) | 관심 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `model_id` | VARCHAR(36) (FK) | 모델 ID |
| `added_at` | TIMESTAMP | 추가일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE
- `model_id` → `ai_models(model_id)` ON DELETE CASCADE

**유니크 키**:
- `uk_user_model` on (`user_id`, `model_id`)

---

#### `user_interest_tags` - 사용자 관심 태그

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `user_tag_id` | INT (PK, AI) | 사용자 태그 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `interest_tag_id` | INT (FK) | 태그 ID |
| `added_at` | TIMESTAMP | 추가일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE
- `interest_tag_id` → `interest_tags(interest_tag_id)`

---

#### `user_push_notifications` - 푸시 알림 기록

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `notification_id` | INT (PK, AI) | 알림 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `model_update_id` | INT (FK) | 모델 업데이트 ID (nullable) |
| `notification_type` | ENUM | model_update, issue_alert, digest |
| `title` | VARCHAR(255) | 알림 제목 |
| `body` | TEXT | 알림 내용 |
| `sent_at` | DATETIME | 발송일시 |
| `read_at` | DATETIME | 읽은일시 |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE
- `model_update_id` → `model_updates(update_id)` ON DELETE SET NULL

---

#### `fcm_tokens` - Firebase Cloud Messaging 토큰

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `token_id` | INT (PK, AI) | 토큰 ID |
| `user_id` | INT (FK) | 사용자 ID |
| `fcm_token` | VARCHAR(500) | FCM 토큰 |
| `device_type` | VARCHAR(20) | 디바이스 타입 (iOS/Android) |
| `is_active` | BOOLEAN | 활성화 여부 |
| `created_at` | TIMESTAMP | 생성일시 |
| `updated_at` | TIMESTAMP | 수정일시 |

**외래 키**:
- `user_id` → `users(user_id)` ON DELETE CASCADE

---

### 9. 매핑 및 캐시 테이블

#### `job_occupation_to_tasks` - 직업별 태그 가중치

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `mapping_id` | INT (PK, AI) | 매핑 ID |
| `job_occupation_id` | INT (FK) | 직업 ID |
| `interest_tag_id` | INT (FK) | 태그 ID |
| `boost_weight` | DECIMAL(3,2) | 가중치 (부스트) default: 1.0 |
| `created_at` | TIMESTAMP | 생성일시 |

**외래 키**:
- `job_occupation_id` → `job_occupations(job_occupation_id)`
- `interest_tag_id` → `interest_tags(interest_tag_id)`

**유니크 키**:
- `uk_job_tag` on (`job_occupation_id`, `interest_tag_id`)

---

#### `model_comparison_cache` - 모델 비교 캐시

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `cache_id` | INT (PK, AI) | 캐시 ID |
| `model_id_1` | VARCHAR(36) (FK) | 모델1 ID |
| `model_id_2` | VARCHAR(36) (FK) | 모델2 ID |
| `comparison_data` | JSON | 비교 데이터 |
| `cached_at` | TIMESTAMP | 캐시 생성일시 |
| `expires_at` | DATETIME | 만료일시 |

**외래 키**:
- `model_id_1` → `ai_models(model_id)`
- `model_id_2` → `ai_models(model_id)`

**유니크 키**:
- `uk_model_pair` on (`model_id_1`, `model_id_2`)

---

### 10. 데이터 수집 로그 테이블

#### `data_collection_logs` - 데이터 수집 로그

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `log_id` | BIGINT (PK, AI) | 로그 ID |
| `source_type` | VARCHAR(50) | 데이터 소스 (naver, artificial_analysis 등) |
| `collection_date` | DATETIME | 수집 일시 |
| `status` | VARCHAR(20) | 상태 (success/failed) |
| `records_collected` | INT | 수집된 레코드 수 |
| `errors_count` | INT | 오류 건수 |
| `error_details` | JSON | 오류 상세 |
| `duration_seconds` | INT | 소요 시간 (초) |
| `created_at` | DATETIME | 생성일시 |

**인덱스**:
- `idx_source_type` on `source_type`
- `idx_collection_date` on `collection_date DESC`
- `idx_status` on `status`

---

### 자동 정리 이벤트

데이터베이스에는 90일 이상 된 데이터를 자동으로 삭제하는 MySQL 이벤트가 설정되어 있습니다:

1. **cleanup_cluster_snapshots**: 90일 이전 클러스터 스냅샷 삭제 (매일 실행)
2. **cleanup_cluster_history**: 90일 이전 클러스터 이력 삭제 (매일 실행)
3. **cleanup_old_articles**: 90일 이전 뉴스 기사 삭제 (매일 실행)
4. **cleanup_old_issue_index**: 90일 이전 이슈 지수 삭제 (매일 실행)

---

## 📂 프로젝트 구조

```
Ainus_server_new/
├── src/
│   ├── api/                     # API Controllers (7개 파일)
│   │   ├── auth.controller.ts
│   │   ├── models.controller.ts
│   │   ├── community.controller.ts
│   │   ├── news.controller.ts
│   │   ├── tasks.controller.ts
│   │   ├── job-news.controller.ts
│   │   └── news-tagging.controller.ts
│   │
│   ├── routes/                  # API Route 정의 (9개 파일)
│   │   ├── auth.ts
│   │   ├── models.ts
│   │   ├── community.ts
│   │   ├── news.ts
│   │   ├── comparison.routes.ts
│   │   ├── timeline.routes.ts
│   │   ├── tasks.ts
│   │   ├── job-news.ts
│   │   └── news-tagging.ts
│   │
│   ├── services/                # 비즈니스 로직 (도메인별)
│   │   ├── auth/               # 인증 서비스
│   │   │   ├── AuthService.ts
│   │   │   ├── GoogleOAuthService.ts
│   │   │   ├── KakaoOAuthService.ts
│   │   │   ├── NaverOAuthService.ts
│   │   │   └── LoginAuditService.ts
│   │   │
│   │   ├── models/             # AI 모델 서비스
│   │   │   ├── ModelService.ts
│   │   │   ├── RecommendationService.ts
│   │   │   └── ModelUpdateService.ts
│   │   │
│   │   ├── news/               # 뉴스 클러스터링
│   │   │   ├── NewsClusteringPipeline.ts
│   │   │   ├── GPTProcessor.ts
│   │   │   └── IssueIndexCalculator.ts
│   │   │
│   │   ├── community/          # 커뮤니티
│   │   │   ├── CommunityPostService.ts
│   │   │   └── CommentService.ts
│   │   │
│   │   ├── comparison/         # 모델 비교
│   │   │   └── modelComparisonService.ts
│   │   │
│   │   ├── timeline/           # 타임라인
│   │   │   └── modelTimelineService_standalone.ts
│   │   │
│   │   ├── repositories/       # 데이터 접근 계층
│   │   ├── processors/         # 데이터 프로세서
│   │   ├── collectors/         # 데이터 수집기
│   │   └── common/             # 공통 서비스 (Email 등)
│   │
│   ├── database/               # 데이터베이스 연결
│   │   ├── mysql.ts           # MySQL 커넥션 풀
│   │   ├── redis.ts           # Redis 래퍼
│   │   ├── migrations.ts      # 스키마 생성
│   │   └── logger.ts          # 로깅
│   │
│   ├── middleware/             # Express 미들웨어
│   │   ├── auth.ts            # JWT 검증
│   │   ├── rateLimiter.ts     # Rate Limiting
│   │   ├── errorHandler.ts    # 에러 핸들링
│   │   ├── community.ts       # 커뮤니티 미들웨어
│   │   └── asyncHandler.ts    # Async 래퍼
│   │
│   ├── config/                 # 설정 관리
│   │   ├── environment.ts     # 환경 변수 검증
│   │   └── database.ts        # DB 설정
│   │
│   ├── utils/                  # 유틸리티
│   │   ├── jwt.ts             # JWT 생성/검증
│   │   ├── password.ts        # 비밀번호 해싱
│   │   └── passwordValidator.ts
│   │
│   ├── exceptions/             # Custom Exception 클래스
│   │   ├── AgentException.ts
│   │   ├── ValidationException.ts
│   │   ├── DatabaseException.ts
│   │   └── AuthenticationException.ts
│   │
│   ├── types/                  # TypeScript 타입 정의
│   │   └── index.ts
│   │
│   ├── constants/              # 상수 및 에러 코드
│   │   └── errorCodes.ts
│   │
│   ├── templates/              # 이메일 템플릿 (EJS)
│   │   ├── password-reset.ejs
│   │   └── email-verification.ejs
│   │
│   ├── scripts/                # 스크립트
│   │   └── migrate.ts         # DB 마이그레이션
│   │
│   └── index.ts                # 애플리케이션 진입점
│
├── database/
│   └── migrations/             # 데이터베이스 스키마
│       └── integrated_schema_v3.sql
│
├── config/                     # Docker 설정
│   └── mysql/
│
├── logs/                       # 로그 파일
│   └── app.log
│
├── docker-compose.yml          # Docker Compose 설정
├── package.json                # NPM 의존성
├── tsconfig.json              # TypeScript 설정
├── .env.example               # 환경 변수 예시
├── .gitignore
└── README.md
```

---

## 👨‍💻 개발 가이드

### 개발 스크립트

```bash
# 개발 서버 실행 (Hot Reload)
npm run dev

# TypeScript 빌드
npm run build

# 프로덕션 실행
npm start

# 데이터베이스 마이그레이션
npm run migrate

# 테스트 실행 (미구현)
npm test

# 코드 린팅
npm run lint

# 코드 포맷팅
npm run format
```

---

### 에러 코드 체계

Ainus Server는 표준화된 에러 코드를 사용합니다:

| 범위 | 카테고리 | 예시 |
|------|---------|------|
| 1000-1999 | Validation Errors | 1001: Email already registered |
| 2000-2999 | Authentication Errors | 2001: Invalid credentials |
| 3000-3999 | Authorization Errors | 3001: Token expired |
| 4000-4999 | Database Errors | 4001: Database connection failed |
| 5000-5999 | External API Errors | 5001: Artificial Analysis API error |
| 9000-9999 | Internal Server Errors | 9001: Unknown error |

---

### Rate Limiting

API Rate Limiting 정책:

| 엔드포인트 | 제한 |
|-----------|------|
| 전역 (Global) | 100 요청 / 15분 |
| `/auth/login` | 5 요청 / 15분 |
| `/auth/register` | 3 요청 / 1시간 |
| `/community/*` (POST/PUT/DELETE) | 20 요청 / 15분 |

---

### 로깅

Winston을 사용한 구조화된 로깅:

```typescript
import logger from '@/database/logger';

logger.info('User logged in', { userId: 123, ip: '192.168.1.1' });
logger.error('Database query failed', { error: err.message });
logger.debug('Request body', { body: req.body });
```

**로그 레벨**: `error` > `warn` > `info` > `debug`

---

### TypeScript 경로 별칭

`tsconfig.json`에 정의된 경로 별칭:

```typescript
import { AuthService } from '@/services/auth/AuthService';
import { getConfig } from '@config/environment';
import { mysqlPool } from '@/database/mysql';
import { requireAuth } from '@middleware/auth';
import { AgentException } from '@exceptions/AgentException';
```

---

### 커밋 메시지 컨벤션

```
<type>: <subject>

<body (optional)>
```

**Types**:
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 변경

**예시**:
```
feat: Google OAuth 2.0 통합 구현

- GoogleOAuthService 생성
- /auth/google, /auth/google/callback 라우트 추가
- 소셜 계정 연동 테이블 스키마 추가
```

---

## 🔒 보안 고려사항

1. **비밀번호 해싱**: bcrypt (10 rounds)
2. **JWT 토큰**:
   - Access Token: 15분 만료
   - Refresh Token: 7일 만료, 해시 저장
3. **Rate Limiting**: 무차별 대입 공격 방지
4. **계정 잠금**: 5회 로그인 실패 시
5. **CORS 정책**: 프로덕션에서 허용 도메인 설정 필요
6. **환경 변수**: 민감한 정보는 `.env` 파일에만 저장
7. **SQL Injection 방지**: Prepared Statements 사용
8. **XSS 방지**: 사용자 입력 검증 및 이스케이핑

---

## 📊 성능 최적화

1. **데이터베이스 인덱싱**:
   - Foreign Key 인덱스
   - 자주 조회되는 컬럼 인덱스
   - 복합 인덱스 (collected_at + cluster_id 등)

2. **Redis 캐싱**:
   - 모델 비교 결과 캐싱
   - 세션 관리
   - TTL 기반 자동 만료

3. **Connection Pooling**:
   - MySQL 커넥션 풀 (10개)
   - Redis 커넥션 재사용

4. **JSON 컬럼**:
   - 유연한 데이터 저장 (preferences, raw_data 등)
   - 스키마 변경 없이 필드 추가 가능

5. **자동 데이터 정리**:
   - 90일 이전 데이터 자동 삭제 (MySQL Event)

---

## 🐛 트러블슈팅

### MySQL 연결 오류

```bash
Error: ER_ACCESS_DENIED_ERROR: Access denied for user
```

**해결책**:
1. `.env` 파일의 `DB_USER`, `DB_PASSWORD` 확인
2. MySQL 사용자 권한 확인:
```sql
GRANT ALL PRIVILEGES ON ai_model_app.* TO 'ainus_user'@'%';
FLUSH PRIVILEGES;
```

---

### Redis 연결 오류

```bash
Error: Redis connection to localhost:6379 failed
```

**해결책**:
1. Redis 서버 실행 확인: `redis-cli ping` (응답: PONG)
2. Docker Compose 실행: `docker-compose up -d redis`

---

### JWT 토큰 에러

```bash
Error: Token expired
```

**해결책**:
1. `/auth/refresh` 엔드포인트로 새 Access Token 발급
2. Refresh Token도 만료되었다면 다시 로그인

---

### Rate Limit 초과

```bash
Error: Too many requests, please try again later
```

**해결책**:
- 15분 후 재시도
- Rate Limit을 높여야 한다면 `.env`에서 `RATE_LIMIT_MAX_REQUESTS` 수정

---

## 📝 라이선스

MIT License

---

## 👥 팀 정보

**Ainus Dev Team**

프로젝트 관련 문의: [GitHub Issues](https://github.com/Gistone9516/Ainus_server_new/issues)

---

## 📚 참고 자료

- [Artificial Analysis API Documentation](https://artificialanalysis.ai/docs)
- [Naver Search API](https://developers.naver.com/docs/serviceapi/search/news/news.md)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)
- [Redis Documentation](https://redis.io/docs/)

---

**Last Updated**: 2025-01-22
**Version**: 1.0.0
