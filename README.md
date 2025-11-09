# 🤖 Ainus AI Model Analysis Server

AI 모델의 벤치마크, 업데이트, 트렌드 정보를 한눈에 볼 수 있는 통합 백엔드 서버

## 📋 개요

- **9개의 핵심 기능** 제공
- **메서드 단위 예외 처리** 전략으로 안정성 확보
- **Redis 캐싱**과 **데이터베이스 최적화**로 높은 성능 보장
- **TypeScript + Express.js**로 타입 안전성 제공

## 🏗️ 프로젝트 구조

```
src/
├── config/              # 환경 설정
│   └── environment.ts   # 환경 변수 로더
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
│   └── errorHandler.ts  # 통합 에러 핸들링
├── services/            # 비즈니스 로직
├── routes/              # API 라우트
├── types/               # TypeScript 타입 정의
├── utils/               # 유틸리티 함수
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
# .env 파일에서 필요한 값들을 설정해주세요
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
| **데이터베이스** | MySQL 8.0, Redis 7.0, MongoDB 6.0, Elasticsearch 8.x |
| **인증** | JWT (Bearer Token) |
| **비동기 처리** | Bull (Job Queue), Node-cron (스케줄) |
| **로깅** | Winston / Pino |
| **테스트** | Jest, Supertest |
| **배포** | Docker, PM2 |

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

## 🔄 개발 단계 (Phase)

| Phase | 기간 | 내용 | 상태 |
|-------|------|------|------|
| **Phase 1** | 1-2주 | 기초 인프라 (DB, 인증, 캐싱) | ✅ 진행 중 |
| **Phase 2** | 2-3주 | 핵심 API 개발 | 📋 예정 |
| **Phase 3** | 2주 | 배치 작업 (뉴스 수집, 분류) | 📋 예정 |
| **Phase 4** | 1주 | 관심 모델 관리 및 통합 | 📋 예정 |
| **Phase 5** | 1주 | 성능 최적화 및 테스트 | 📋 예정 |
| **Phase 6** | 1주 | Docker 배포 및 안정화 | 📋 예정 |

## 📚 9개의 핵심 기능

1. **타임라인 시각화** - AI 모델 발전사를 버전별로 시각화
2. **모델 간단 비교** - 두 모델을 벤치마크로 비교
3. **커뮤니티** - 사용자 소통 공간
4. **AI 모델 추천** - 직업과 관심사 기반 추천
5. **AI 이슈 지수** - 뉴스 기반 트렌드 지수
6. **모델 업데이트 내역** - 버전 출시 및 개선 사항 추적
7. **뉴스 수집** - Naver API를 통한 자동 수집
8. **개인화 피드** - 관심 모델 맞춤형 피드
9. **AI 이슈 분류** - SLM을 활용한 자동 태그 분류

## 🧪 API 엔드포인트

> 향후 각 기능 구현 시 상세 작성 예정

### 모델 관련
- `GET /api/v1/models/:modelId/timeline` - 모델 타임라인
- `GET /api/v1/models/compare` - 모델 비교
- `GET /api/v1/models/search` - 모델 검색

### 이슈 관련
- `GET /api/v1/models/issue-index/latest` - 최신 이슈 지수
- `GET /api/v1/models/issue-index/by-category` - 카테고리별 이슈 지수

### 커뮤니티
- `POST /api/v1/community/posts` - 게시글 작성
- `GET /api/v1/community/posts` - 게시글 조회
- `POST /api/v1/community/posts/:postId/like` - 좋아요

## 📖 문서

- [개발 계획서](./Ainus%20서버%20개발%20계획서.md)
- [예외 처리 가이드](./agent_exception_handling_guide.md)

## 📝 라이선스

MIT

---

**개발팀:** Ainus AI Development Team
**시작 날짜:** 2025-11-09
**예상 완료:** 2025-12-21