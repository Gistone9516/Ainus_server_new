# 🔐 Ainus 인증 시스템 구현 To-Do 리스트

**목적**: 최신 버전의 기본 인증 API 를 개선하여 엔터프라이즈급 인증 시스템 구현  
**기간**: 8주 (Phase 1-4)  
**상태**: `Ainus_서버_개발_계획서.md` 의 인증 API 개선 작업

---

## 📌 버전 업데이트 안내

### 기존 정규화된 내용 (최신 버전에서 유지)
```
✅ 유지할 사항:
- POST /api/v1/auth/register (회원가입)
- POST /api/v1/auth/login (로그인)
- POST /api/v1/auth/refresh (토큰 갱신)
- POST /api/v1/auth/logout (로그아웃)
- JWT 토큰 기반 인증
- bcrypt 비밀번호 해싱
```

### 새로운 개선 사항 (최신 버전에서 추가됨)
```
✨ 추가 사항:
- 상세한 에러 코드 표준화 (15개 → 3자리 숫자 코드)
- 데이터베이스 테이블 확장 (6개 테이블)
- Naver 소셜 로그인 추가 (Google, Kakao, Naver)
- 계정 잠금 기능 (5회 실패 → 30분 잠금)
- Redis 캐싱 전략
- Rate Limiting
- 감사 로그 시스템
```

---

## 🚀 Phase 1: 기초 인증 구축 (Week 1-2)

### ✅ 1.1 데이터베이스 스키마 설계 및 마이그레이션

- [ ] **TASK-1-1**: `users` 테이블 생성
  - 필드: user_id, email, password_hash, nickname, job_category_id, auth_provider, is_active, failed_login_attempts, account_locked_until, email_verified, marketing_agreed, created_at, updated_at, deleted_at
  - 인덱스: idx_email, idx_is_active, idx_created_at
  - 외래키: job_categories.job_category_id
  - 상태: 새로 추가되는 필드 표시 (account_locked_until, failed_login_attempts 등)

- [ ] **TASK-1-2**: `user_profiles` 테이블 생성
  - 필드: profile_id, user_id, bio, preferences (JSON), theme_preference, notification_enabled, last_login_at, last_ip_address, created_at, updated_at
  - 상태: 기존 user_profiles 확장 (last_ip_address, notification_enabled 추가)

- [ ] **TASK-1-3**: `user_sessions` 테이블 생성
  - 필드: session_id, user_id, access_token_hash, refresh_token_hash, device_info (JSON), ip_address, user_agent, expires_at, refresh_expires_at, created_at, revoked_at
  - 인덱스: idx_user_id, idx_refresh_token_hash, idx_expires_at
  - **변경사항**: 토큰 해시 저장으로 보안 강화 (기존 로직에서 변경)

- [ ] **TASK-1-4**: `user_social_accounts` 테이블 생성
  - 필드: social_account_id, user_id, provider (google/kakao/naver), provider_user_id, provider_email, provider_name, provider_profile_image, access_token_encrypted, refresh_token_encrypted, connected_at, disconnected_at, last_login_at, created_at, updated_at
  - **신규**: Naver 소셜 로그인 지원 추가 (provider enum에 'naver' 포함)
  - 고유키: uk_provider_account (provider + provider_user_id)

- [ ] **TASK-1-5**: `password_reset_tokens` 테이블 생성
  - 필드: token_id, user_id, token_hash, expires_at, used_at, created_at
  - TTL: 1시간

- [ ] **TASK-1-6**: `login_audit_logs` 테이블 생성
  - 필드: log_id, user_id, email, status (success/failed/blocked), failure_reason, ip_address, user_agent, device_type, location_info (JSON), created_at
  - 인덱스: idx_user_id, idx_status, idx_created_at
  - **신규**: 보안 감사 및 의심 로그인 감지용

---

### ✅ 1.2 기본 인증 API 구현 (최신 버전에서 확장)

#### 회원가입 (기존 유지 + 개선)

- [ ] **TASK-1-7**: `POST /api/v1/auth/register` 재구현
  - 기존 필드 유지: email, password, password_confirm, nickname, job_category_id
  - **추가 필드**: marketing_agreed, terms_agreed, privacy_agreed
  - 응답에 user_id 포함
  - **에러 코드 표준화** (새로 추가):
    - `1001`: EMAIL_ALREADY_EXISTS (409)
    - `1002`: NICKNAME_ALREADY_EXISTS (409)
    - `1003`: WEAK_PASSWORD (400)
    - `1004`: INVALID_EMAIL_FORMAT (400)
    - `1005`: INVALID_PASSWORD_CONFIRM (400)
    - `1006`: MISSING_REQUIRED_FIELD (400)

- [ ] **TASK-1-8**: 비밀번호 강도 검증 함수 구현
  - 정규식: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]).{8,72}$/`
  - 강도 점수 반환 (0-4단계)
  - 프론트엔드 피드백: 부족한 조건 명시

- [ ] **TASK-1-9**: 이메일 중복 확인 API 구현
  - `GET /api/v1/auth/check-email?email={email}`
  - Redis 캐시: TTL 24시간
  - 응답: `{ available: boolean, message: string }`

#### 로그인 (기존 유지 + 개선)

- [ ] **TASK-1-10**: `POST /api/v1/auth/login` 재구현
  - 기존 필드 유지: email, password
  - **추가 필드**: remember_me (자동 로그인 옵션)
  - 응답 형식 개선:
    ```json
    {
      "success": true,
      "data": {
        "user": { user_id, email, nickname, auth_provider },
        "tokens": {
          "access_token": "...",
          "refresh_token": "...",
          "expires_in": 900,
          "token_type": "Bearer"
        }
      }
    }
    ```
  - **에러 코드 표준화** (새로 추가):
    - `2001`: INVALID_CREDENTIALS (401)
    - `2002`: ACCOUNT_NOT_FOUND (404)
    - `2003`: ACCOUNT_LOCKED (423)
    - `2004`: ACCOUNT_DISABLED (403)

- [ ] **TASK-1-11**: 계정 잠금 기능 구현 (신규)
  - 로그인 실패 5회 → 계정 잠금
  - 잠금 시간: 30분
  - DB 업데이트: failed_login_attempts, account_locked_until
  - 에러 응답: `ACCOUNT_LOCKED (2003)` + unlock_at 시간 포함
  - Redis 블랙리스트: `login:${email}:attempts` (TTL: 30분)

- [ ] **TASK-1-12**: 로그인 감사 로그 기록 (신규)
  - 성공/실패 모두 기록
  - 필드: user_id, email, status, failure_reason, ip_address, user_agent, device_type
  - 테이블: login_audit_logs

#### JWT 토큰 관리 (기존 유지 + 확장)

- [ ] **TASK-1-13**: JWT 토큰 발급 함수 개선
  - Access Token: 15분 유효
  - Refresh Token: 7일 유효
  - Payload 필드 추가:
    ```typescript
    {
      user_id, email, nickname, auth_provider,
      iat, exp, iss: 'ainus', aud: 'ainus-app',
      jti: '<unique-id-for-revocation>'
    }
    ```
  - 토큰 서명: HS256 (JWT_SECRET 환경변수)

- [ ] **TASK-1-14**: JWT 토큰 검증 Middleware 개선
  - Authorization 헤더 파싱: `Bearer <token>`
  - 서명 검증
  - 만료 시간 확인
  - Redis 토큰 해시 검증 (캐시 활용)
  - 응답: req.user에 payload 저장

- [ ] **TASK-1-15**: `POST /api/v1/auth/refresh` 재구현
  - Refresh Token 검증
  - 새로운 Access Token 발급
  - (선택) 새로운 Refresh Token도 발급
  - Redis 블랙리스트 확인 (토큰 무효화 여부)
  - **에러 코드**:
    - `3001`: INVALID_REFRESH_TOKEN (401)
    - `3002`: REFRESH_TOKEN_EXPIRED (401)
    - `3003`: REFRESH_TOKEN_REVOKED (401)

#### 로그아웃 (기존 유지 + 개선)

- [ ] **TASK-1-16**: `POST /api/v1/auth/logout` 재구현
  - 요청: access_token (헤더), refresh_token (body)
  - 처리:
    1. Refresh Token을 Redis 블랙리스트에 추가 (TTL: 7일)
    2. user_sessions.revoked_at 업데이트
    3. 필요시 모든 세션 토큰 무효화 (logout_all 옵션)
  - 응답: 성공 메시지

---

### ✅ 1.3 보안 및 성능 (Phase 1)

- [ ] **TASK-1-17**: 비밀번호 해싱 구현 (bcrypt)
  - 라이브러리: bcryptjs
  - Salt rounds: 10
  - 저장: users.password_hash

- [ ] **TASK-1-18**: Rate Limiting 구현 (신규)
  - 로그인 실패: 15분 내 5회 제한 → 423 (RATE_LIMIT_EXCEEDED)
  - 회원가입: 1시간 내 3회 제한
  - 전체 API: 15분 내 100회 제한
  - 라이브러리: express-rate-limit + Redis
  - 키: `ratelimit:${ip}:${endpoint}`

- [ ] **TASK-1-19**: 에러 처리 표준화 (신규)
  - 모든 에러를 다음 형식으로 반환:
    ```json
    {
      "success": false,
      "error": {
        "code": "<ERROR_CODE>",
        "message": "<한글 메시지>",
        "status": <http_status>,
        "details": { ... },
        "timestamp": "2025-01-16T10:00:00Z",
        "path": "/api/v1/auth/login"
      }
    }
    ```
  - 에러 코드 매핑 테이블 작성 (15개 코드 표준화)

- [ ] **TASK-1-20**: Redis 캐싱 초기 설정 (신규)
  - 설정:
    - TOKEN_VALIDATION: 토큰 검증 결과 (TTL: 15분)
    - EMAIL_EXISTS: 이메일 중복 확인 (TTL: 24시간)
    - LOGIN_ATTEMPTS: 로그인 실패 횟수 (TTL: 30분)
  - 클라이언트: redis@latest
  - 테스트: Redis 연결 확인

- [ ] **TASK-1-21**: 입력 검증 Middleware 구현
  - 라이브러리: express-validator
  - 검증 규칙:
    - email: 이메일 형식
    - password: 8-72자, 강도 검증
    - nickname: 2-50자, 한글/영문/숫자만
    - job_category_id: 숫자
  - 에러 응답: 400 + 세부 검증 실패 이유

---

### ✅ 1.4 테스트 (Phase 1)

- [ ] **TASK-1-22**: 회원가입 단위 테스트
  - 정상 가입
  - 중복 이메일
  - 중복 닉네임
  - 약한 비밀번호
  - 비밀번호 불일치
  - 필수 필드 누락
  - 커버율: 100%

- [ ] **TASK-1-23**: 로그인 단위 테스트
  - 정상 로그인
  - 계정 잠금 (5회 실패)
  - 계정 없음
  - 잘못된 비밀번호
  - 비활성 계정
  - 커버율: 100%

- [ ] **TASK-1-24**: 토큰 갱신 단위 테스트
  - 정상 갱신
  - 만료된 토큰
  - 무효화된 토큰
  - 잘못된 토큰 서명
  - 커버율: 100%

- [ ] **TASK-1-25**: 통합 테스트 (가입 → 로그인 → API 호출 → 로그아웃)
  - 전체 플로우 검증
  - 로그아웃 후 토큰 재사용 불가 확인

---

## 🎯 Phase 2: 소셜 로그인 (Google, Kakao, Naver) (Week 3-4)

### ✅ 2.1 Google OAuth 2.0 구현 (신규)

- [ ] **TASK-2-1**: Google OAuth 설정
  - Google Cloud Console 프로젝트 생성
  - OAuth 2.0 Client ID 발급
  - 승인된 리다이렉트 URI:
    - 개발: `http://localhost:3001/api/v1/auth/google/callback`
    - 프로덕션: `https://api.ainus.example.com/api/v1/auth/google/callback`
  - 환경변수 설정: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

- [ ] **TASK-2-2**: Google 로그인 엔드포인트 구현
  - `GET /api/v1/auth/google`
  - 로직:
    1. OAuth state 생성 (CSRF 방지)
    2. Redis에 state 저장 (TTL: 10분)
    3. Google 로그인 페이지로 리다이렉트
  - 리다이렉트 URL: Google Authorization Endpoint
  - 권한 요청: openid, email, profile

- [ ] **TASK-2-3**: Google 콜백 처리
  - `GET /api/v1/auth/google/callback?code=...&state=...`
  - 로직:
    1. state 검증 (CSRF 방지)
    2. Authorization Code로 Access Token 요청
    3. Google API로 사용자 정보 조회 (email, name, profile_image)
    4. DB에서 사용자 조회 (provider_user_id로)
    5. 없으면 신규 사용자 생성
    6. JWT 토큰 발급
    7. 앱으로 리다이렉트
  - 리다이렉트:
    - 웹: `http://localhost:3000/auth/callback?access_token=...&refresh_token=...&expires_in=900`
    - 모바일: `ainus://auth?access_token=...&refresh_token=...`
  - **에러 코드**:
    - `5001`: GOOGLE_AUTH_FAILED (401)
    - `5002`: INVALID_STATE (401)

- [ ] **TASK-2-4**: Google 소셜 계정 저장
  - 테이블: user_social_accounts
  - 필드 저장:
    - provider: 'google'
    - provider_user_id: Google user ID
    - provider_email: Google email
    - provider_name: Google name
    - provider_profile_image: Google profile picture URL
    - access_token_encrypted: Google Access Token (암호화)
    - refresh_token_encrypted: Google Refresh Token (암호화)
  - 암호화: AES-256-CBC (process.env.ENCRYPTION_KEY)

---

### ✅ 2.2 Kakao OAuth 2.0 구현 (신규)

- [ ] **TASK-2-5**: Kakao OAuth 설정
  - Kakao Developers 앱 생성
  - REST API 키, JavaScript 키, Admin 키 발급
  - 리다이렉트 URI:
    - 개발: `http://localhost:3001/api/v1/auth/kakao/callback`
    - 프로덕션: `https://api.ainus.example.com/api/v1/auth/kakao/callback`
  - 환경변수: KAKAO_CLIENT_ID, KAKAO_CLIENT_SECRET

- [ ] **TASK-2-6**: Kakao 로그인 엔드포인트
  - `GET /api/v1/auth/kakao`
  - 로직: Google과 동일 (state 생성, Redis 저장, 리다이렉트)

- [ ] **TASK-2-7**: Kakao 콜백 처리
  - `GET /api/v1/auth/kakao/callback?code=...`
  - 로직: Google 콜백과 동일 (Authorization Code 교환, 사용자 정보 조회, 토큰 발급)
  - **에러 코드**: `5003`: KAKAO_AUTH_FAILED (401)

- [ ] **TASK-2-8**: Kakao 소셜 계정 저장
  - 테이블: user_social_accounts (provider: 'kakao')
  - 필드: provider_user_id, provider_email, provider_name, provider_profile_image
  - 암호화: 동일

---

### ✅ 2.3 Naver OAuth 2.0 구현 (신규 - 새로 추가!)

- [ ] **TASK-2-9**: Naver OAuth 설정
  - Naver Developers 애플리케이션 등록
  - Client ID, Client Secret 발급
  - 리다이렉트 URI:
    - 개발: `http://localhost:3001/api/v1/auth/naver/callback`
    - 프로덕션: `https://api.ainus.example.com/api/v1/auth/naver/callback`
  - 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

- [ ] **TASK-2-10**: Naver 로그인 엔드포인트
  - `GET /api/v1/auth/naver`
  - 로직: Google/Kakao와 동일 (state 생성 + Redis 저장)

- [ ] **TASK-2-11**: Naver 콜백 처리
  - `GET /api/v1/auth/naver/callback?code=...&state=...`
  - Naver API 엔드포인트: `https://openapi.naver.com/v1/nid/me`
  - 사용자 정보 조회: response.response 구조 (Naver 특성)
  - 토큰 발급 및 리다이렉트
  - **에러 코드**: `5004`: NAVER_AUTH_FAILED (401)

- [ ] **TASK-2-12**: Naver 소셜 계정 저장
  - 테이블: user_social_accounts (provider: 'naver')
  - 필드: provider_user_id, provider_email, provider_name, provider_profile_image
  - 암호화: 동일

---

### ✅ 2.4 소셜 로그인 공통 로직 (신규)

- [ ] **TASK-2-13**: 중복 계정 처리
  - 시나리오 1: 이메일로 이미 계정이 있는 경우
    - 소셜 계정 연동 (user_social_accounts에 추가)
    - 기존 JWT 토큰 발급
  - 시나리오 2: 새로운 사용자
    - users 테이블 신규 생성 (auth_provider: 'google'/'kakao'/'naver')
    - user_social_accounts 생성
    - JWT 토큰 발급
  - **에러 코드**: `5005`: SOCIAL_ACCOUNT_ALREADY_LINKED (409)

- [ ] **TASK-2-14**: 소셜 계정 연동 해제 (선택)
  - `DELETE /api/v1/auth/social/:provider`
  - 로직: user_social_accounts.disconnected_at 업데이트
  - 검증: 최소 1개 로그인 방식 유지 필수

- [ ] **TASK-2-15**: 암호화 함수 구현 (신규)
  - AES-256-CBC 암호화
  - 환경변수: ENCRYPTION_KEY (32바이트)
  - 함수: encrypt(plaintext), decrypt(ciphertext)
  - 저장 대상: access_token, refresh_token (user_social_accounts)

---

### ✅ 2.5 테스트 (Phase 2)

- [ ] **TASK-2-16**: Google 소셜 로그인 테스트
  - OAuth 콜백 시뮬레이션
  - 신규 사용자 자동 생성
  - 기존 사용자 계정 연동
  - 커버율: 100%

- [ ] **TASK-2-17**: Kakao 소셜 로그인 테스트
  - 동일 (Kakao 특성 반영)

- [ ] **TASK-2-18**: Naver 소셜 로그인 테스트 (신규)
  - 동일 (Naver 특성 반영)

- [ ] **TASK-2-19**: 소셜 계정 중복 처리 테스트
  - 이메일로 이미 가입한 사용자가 소셜 로그인 시도
  - 자동 연동 확인

---

## 🔒 Phase 3: 고급 기능 (Week 5-6)

### ✅ 3.1 비밀번호 관리 (신규)

- [ ] **TASK-3-1**: 비밀번호 찾기 엔드포인트
  - `POST /api/v1/auth/forgot-password`
  - 요청: { email }
  - 로직:
    1. 이메일 존재 확인 (존재 여부 상관없이 동일 메시지)
    2. Reset Token 생성 (Random 32자)
    3. password_reset_tokens 테이블에 저장 (TTL: 1시간)
    4. 이메일 전송 (NodeMailer)
  - 응답: 성공 메시지 (보안상 존재 여부 노출 안 함)
  - **에러 코드**: `4001`: RATE_LIMIT_EXCEEDED (429)

- [ ] **TASK-3-2**: 비밀번호 재설정 엔드포인트
  - `POST /api/v1/auth/reset-password`
  - 요청: { token, new_password, password_confirm }
  - 로직:
    1. Token 검증 (signature, 만료 시간, used_at 확인)
    2. 새 비밀번호 강도 검증
    3. password_hash 업데이트
    4. password_reset_tokens.used_at 설정 (재사용 방지)
    5. 모든 세션 무효화 (보안)
  - **에러 코드**:
    - `4002`: RESET_TOKEN_EXPIRED (401)
    - `4003`: RESET_TOKEN_INVALID (401)
    - `4004`: RESET_TOKEN_ALREADY_USED (400)

- [ ] **TASK-3-3**: 비밀번호 변경 엔드포인트
  - `POST /api/v1/auth/change-password` (인증 필요)
  - 요청: { old_password, new_password, password_confirm }
  - 로직:
    1. 현재 비밀번호 검증
    2. 새 비밀번호 검증
    3. password_hash 업데이트
    4. 모든 세션 무효화

- [ ] **TASK-3-4**: 이메일 전송 구현
  - 라이브러리: nodemailer
  - 환경변수: EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
  - 템플릿: HTML 이메일 (비밀번호 재설정 링크 포함)
  - 링크: `https://ainus.example.com/reset-password?token={reset_token}`

---

### ✅ 3.2 의심 로그인 감지 (신규)

- [ ] **TASK-3-5**: IP/Device 추적 구현
  - 필드 저장:
    - last_ip_address (user_profiles)
    - device_type (login_audit_logs)
    - user_agent (login_audit_logs)
  - 로직:
    1. 요청 IP 추출 (IP 미들웨어)
    2. 기존 IP와 비교
    3. 다른 IP = "의심 로그인" 플래그

- [ ] **TASK-3-6**: 의심 로그인 경고 (선택)
  - 조건: 새로운 IP + 새로운 디바이스 동시 발생
  - 처리: 확인 이메일 발송
  - 링크: 의심 로그인 확인 엔드포인트
  - **에러 코드**: `2005`: SUSPICIOUS_LOGIN (별도 처리)

---

### ✅ 3.3 이메일 인증 (선택)

- [ ] **TASK-3-7**: 이메일 인증 토큰 생성
  - 회원가입 직후 자동 발송
  - users.email_verified = false로 시작
  - Token 저장: Redis (TTL: 24시간)

- [ ] **TASK-3-8**: 이메일 인증 엔드포인트
  - `GET /api/v1/auth/verify-email?token={email_verification_token}`
  - 로직:
    1. Token 검증
    2. users.email_verified = true
    3. users.email_verified_at = now()
  - 이미 인증된 이메일: 리다이렉트 (앱으로)

- [ ] **TASK-3-9**: 인증 필수 강제
  - 미인증 계정으로 특정 API 호출 시
  - **에러 코드**: `2004`: EMAIL_NOT_VERIFIED (403)

---

### ✅ 3.4 테스트 (Phase 3)

- [ ] **TASK-3-10**: 비밀번호 찾기/재설정 테스트
  - 정상 재설정
  - 만료된 토큰
  - 이미 사용된 토큰
  - 커버율: 100%

- [ ] **TASK-3-11**: 의심 로그인 감지 테스트
  - IP 변경 감지
  - 디바이스 변경 감지
  - 이메일 발송 확인

---

## 🚀 Phase 4: 최적화 및 운영 (Week 7+)

### ✅ 4.1 2단계 인증 (선택)

- [ ] **TASK-4-1**: OTP 구현 (선택)
  - 라이브러리: speakeasy, qrcode
  - TOTP (Time-based One-Time Password) 사용
  - QR 코드 생성 (Google Authenticator 연동)
  - 인증 엔드포인트: `POST /api/v1/auth/verify-otp`

---

### ✅ 4.2 성능 최적화

- [ ] **TASK-4-2**: 데이터베이스 쿼리 최적화
  - 인덱스 추가 (users.email, users.is_active, login_audit_logs.status)
  - 쿼리 실행 계획 분석 (EXPLAIN ANALYZE)
  - 느린 쿼리 로깅 활성화

- [ ] **TASK-4-3**: Redis 캐싱 확대
  - 토큰 검증 결과 캐싱 (TTL: 15분)
  - 사용자 프로필 캐싱 (TTL: 1시간)
  - 캐시 무효화 시점 명시

- [ ] **TASK-4-4**: 데이터베이스 연결 풀
  - 설정: 최대 10개 연결
  - 타임아웃: 5초
  - 유휴 연결 정리

---

### ✅ 4.3 모니터링 및 알림

- [ ] **TASK-4-5**: 로그 수집 및 분석
  - Winston 또는 Pino로 구조화된 로깅
  - 로그 레벨: DEBUG, INFO, WARN, ERROR
  - 로그 저장: 파일 + ELK Stack (선택)

- [ ] **TASK-4-6**: 메트릭 수집
  - API 응답 시간 (P50/P95/P99)
  - 에러율 (5분 단위)
  - 캐시 히트율
  - 데이터베이스 쿼리 시간

- [ ] **TASK-4-7**: 실시간 알림
  - 에러율 > 5% → Slack 알림
  - 응답 시간 > 1초 → 로그 기록
  - 의심 로그인 → 이메일 알림

---

### ✅ 4.4 문서화 및 배포

- [ ] **TASK-4-8**: API 문서 작성 (Swagger/OpenAPI)
  - 모든 엔드포인트 명세
  - Request/Response 예시
  - 에러 코드 설명

- [ ] **TASK-4-9**: 환경 변수 가이드
  - .env.example 작성
  - 필수/선택 변수 명시
  - 암호화 키 생성 방법

- [ ] **TASK-4-10**: 무중단 배포 계획
  - 데이터베이스 마이그레이션 스크립트
  - 롤백 계획
  - 헬스 체크 엔드포인트

- [ ] **TASK-4-11**: 보안 감사 및 테스트
  - SQL Injection 테스트
  - XSS 테스트
  - CSRF 테스트
  - 인증 우회 테스트
  - 침투 테스트 (선택)

---

## 📋 체크리스트 요약

### 필수 구현 (32개)
- Database: 6개 테이블
- Phase 1 Auth API: 12개 (회원가입, 로그인, 토큰, 로그아웃)
- Phase 2 Social Login: 12개 (Google, Kakao, Naver)
- Phase 3 Advanced: 6개 (비밀번호 재설정, 의심 감지)

### 중요 구현 (8개)
- Rate Limiting, 에러 처리, Redis 캐싱
- 이메일 전송, 의심 로그인 알림
- 비밀번호 찾기, 로그인 감사 로그

### 선택 구현 (5개)
- 이메일 인증, 2단계 인증 (OTP)
- 소셜 계정 연동 해제
- 모니터링 대시보드

### 테스트 (14개)
- Phase 1: 5개
- Phase 2: 4개
- Phase 3: 2개
- Phase 4: 3개

---

## 🎯 성공 기준

| 항목 | 목표 | 우선순위 |
|------|------|---------|
| **기능 완성도** | Phase 1-2 100%, Phase 3 80% | ⭐⭐⭐ |
| **API 응답시간** | P95 < 500ms | ⭐⭐⭐ |
| **에러 처리** | 15개 코드 표준화 | ⭐⭐⭐ |
| **테스트 커버율** | >= 80% (필수 기능) | ⭐⭐⭐ |
| **보안** | SQL Injection/XSS 방지 | ⭐⭐⭐ |
| **문서화** | API 명세 100% | ⭐⭐ |
| **모니터링** | 실시간 모니터링 구현 | ⭐⭐ |

---

## 📌 주의사항

### 의존성 순서
```
✅ Phase 1 완료 필수 → Phase 2 시작 가능
✅ Phase 2 완료 필수 → Phase 3 시작 가능
⏸ Phase 3/4는 병렬 진행 가능
```

### 환경 변수 필수 설정
```
JWT_SECRET=<32자 이상>
ENCRYPTION_KEY=<32바이트>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
REDIS_URL=redis://localhost:6379
EMAIL_HOST=...
EMAIL_USER=...
EMAIL_PASSWORD=...
```

### 보안 체크리스트 (배포 전 필수)
- [ ] JWT_SECRET 충분히 복잡함
- [ ] HTTPS 설정됨
- [ ] CORS 화이트리스트 설정됨
- [ ] Rate Limiting 활성화됨
- [ ] SQL Injection 방지 (파라미터화 쿼리)
- [ ] 개인정보 암호화 (password_hash, access_token)
- [ ] 에러 메시지에 시스템 정보 노출 안 됨
- [ ] 로그인 시도 감사 로그 기록됨

---

**작성일**: 2025-01-16  
**버전**: 1.0  
**상태**: Agent AI 지시용 To-Do 리스트  
**다음 단계**: Phase 1 Task 시작 (TASK-1-1부터)
