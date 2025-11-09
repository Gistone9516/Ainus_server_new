# 🤖 Ainus AI Model Analysis Server

AI 모델의 벤치마크, 업데이트, 트렌드 정보를 한눈에 볼 수 있는 통합 백엔드 서버

## 📋 개요

- **완전한 인증 시스템** - 로컬, Google, Kakao, Naver OAuth 지원
- **메서드 단위 예외 처리** 전략으로 안정성 확보
- **Redis 캐싱**과 **데이터베이스 최적화**로 높은 성능 보장
- **TypeScript + Express.js**로 타입 안전성 제공
- **보안 우선** - 암호화, Rate Limiting, 계정 잠금 등

## 🏗️ 프로젝트 구조

```
src/
├── config/              # 환경 설정
│   └── environment.ts   # 환경 변수 로더 (JWT, OAuth, Email, DB 설정)
├── database/            # 데이터베이스 관련
│   ├── mysql.ts         # MySQL 연결 풀
│   ├── redis.ts         # Redis 캐싱 레이어
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
│   ├── AuthService.ts            # 인증 서비스
│   ├── EmailService.ts           # 이메일 전송 서비스
│   ├── LoginAuditService.ts      # 로그인 감시 서비스
│   ├── GoogleOAuthService.ts     # Google OAuth 서비스
│   ├── KakaoOAuthService.ts      # Kakao OAuth 서비스
│   └── NaverOAuthService.ts      # Naver OAuth 서비스
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
│   └── migrate.ts       # 마이그레이션 실행
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
# 서버 설정
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# 데이터베이스 (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=ainus_db

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
```

### 3. 데이터베이스 마이그레이션

```bash
npm run migrate
```

### 4. 서버 시작

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm run build && npm start
```

## 📦 기술 스택

| 분류 | 기술 |
|------|------|
| **언어** | TypeScript, Node.js 18+ |
| **프레임워크** | Express.js 4.x |
| **데이터베이스** | MySQL 8.0, Redis 7.0 |
| **인증** | JWT (Bearer Token), OAuth 2.0 |
| **암호화** | AES-256-CBC (crypto), bcrypt (password) |
| **이메일** | Nodemailer, EJS (template) |
| **로깅** | Custom Logger (Winston 호환) |
| **Rate Limiting** | express-rate-limit |
| **보안** | CORS, bcrypt, JWT, Token Rotation |
| **배포** | PM2, Docker (예정) |

## 🔄 개발 단계 (Phase)

| Phase | 내용 | 상태 | 완료일 |
|-------|------|------|--------|
| **Phase 1** | 기초 인증 시스템 | ✅ 완료 | 2025-11-09 |
| **Phase 2** | OAuth 2.0 소셜 로그인 | ✅ 완료 | 2025-11-09 |
| **Phase 3** | 이메일 & 비밀번호 재설정 | ✅ 완료 | 2025-11-09 |
| **Phase 4** | 고급 보안 (2FA, 의심 로그인) | 📋 예정 | - |
| **Phase 5** | 사용자 프로필 관리 | 📋 예정 | - |
| **Phase 6** | 모델 관련 API | 📋 예정 | - |

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

- [개발 계획서](./Ainus%20서버%20개발%20계획서.md)
- [예외 처리 가이드](./agent_exception_handling_guide.md)

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

### Phase 1: 기초 인증 시스템
- **구현 시간**: ~20시간
- **코드 라인**: ~1000줄
- **테스트 커버리지**: 진행 중

### Phase 2: OAuth 2.0 소셜 로그인
- **구현 시간**: ~15시간
- **코드 라인**: ~1200줄
- **테스트 커버리지**: 진행 중

### Phase 3: 이메일 & 비밀번호 재설정
- **구현 시간**: ~12시간
- **코드 라인**: ~1300줄
- **테스트 커버리지**: 진행 중

### 전체 통계
- **총 구현 시간**: ~47시간
- **총 코드 라인**: ~3500줄
- **API 엔드포인트**: 16개
- **예외 클래스**: 7개
- **이메일 템플릿**: 3개

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

```bash
# MySQL 데이터베이스 생성
mysql -u root -p < scripts/init-db.sql

# 마이그레이션 실행
npm run migrate
```

### 5. 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 6. 헬스 체크

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

## 🔒 보안 권장사항

### 프로덕션 배포 시

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

## 📞 지원

문제가 발생하거나 질문이 있으신 경우:

1. [Issues](./issues) 페이지 확인
2. [개발 계획서](./Ainus%20서버%20개발%20계획서.md) 참고
3. [예외 처리 가이드](./agent_exception_handling_guide.md) 참고

## 📝 라이선스

MIT

---

**개발팀:** Ainus AI Development Team
**시작 날짜:** 2025-11-09
**마지막 업데이트:** 2025-11-09
**현재 버전:** 1.0.0 (Phase 3 완료)
**다음 예정:** Phase 4 - 고급 보안 기능
