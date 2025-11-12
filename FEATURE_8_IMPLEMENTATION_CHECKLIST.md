# Feature #8: 개인화된 AI 트렌드 모니터링 - 구현 체크리스트

**상태**: ✅ 완료
**버전**: 1.0
**마지막 업데이트**: 2025-11-12

---

## 📋 백엔드 개발 항목

### 데이터베이스

- [x] **jobs 테이블** - 13개 직업 카테고리
  - 파일: `src/database/migrations.ts` (createJobsTable)
  - 초기 데이터: 13개 직업 자동 삽입
  - 인덱스: job_code (UNIQUE), is_active

- [x] **interest_tags 테이블** - 40개 표준 관심사 태그
  - 파일: `src/database/migrations.ts` (createInterestTagsTable)
  - 기존 테이블 활용
  - 인덱스: tag_code (UNIQUE), category_id

- [x] **user_interest_tags 테이블** - 사용자가 선택한 태그
  - 파일: `src/database/migrations.ts` (createUserInterestTagsTable)
  - 사용자-태그 N:M 관계
  - 인덱스: user_id, tag_id (UNIQUE)
  - Foreign Key: users(user_id), interest_tags(interest_tag_id)

- [x] **user_profiles 테이블 확장** - job_category_id 추가
  - 파일: `src/database/migrations.ts` (createUserInterestTagsTable 내)
  - ALTER 문으로 컬럼 추가
  - Foreign Key: jobs(id)

- [x] **job_to_interest_tags 테이블** - 직업별 추천 태그
  - 파일: `src/database/migrations.ts` (createJobToInterestTagsTable)
  - 직업-태그 N:M 관계
  - recommendation_rank로 정렬
  - Foreign Key: jobs(id), interest_tags(interest_tag_id)

- [x] **job_occupation_to_tasks 테이블** - 기존 테이블
  - 파일: `src/database/migrations.ts` (createJobOccupationToTasksTable)
  - 직업별 작업 카테고리 + 가중치
  - boost_weight (1.0~2.0)

- [x] **issue_index_by_category 테이블** - 직업별 이슈 지수
  - 파일: `src/database/migrations.ts` (createIssueIndexByCategoryTable)
  - 기존 테이블 활용

### 서비스 계층

- [x] **TrendMonitoringService.ts** - 메인 비즈니스 로직
  - 파일: `src/services/TrendMonitoringService.ts`
  - 메서드 단위 예외 처리 준수
  - Redis 캐싱 통합

#### Method 1: getJobs() ✅
- [x] 직업 목록 조회
- [x] 각 직업별 추천 태그 조회
- [x] Redis 캐시 (24시간)
- [x] DatabaseException, ValidationException 처리
- [x] 부분 실패 허용 (태그 조회 실패해도 직업 반환)

#### Method 2: saveUserJobAndTags() ✅
- [x] 입력 검증 (job_category_id: 1-13, tags: 1-40개)
- [x] 사용자 프로필 생성/업데이트
- [x] 기존 태그 삭제 후 새 태그 삽입
- [x] 프로필 조회 및 반환
- [x] 캐시 무효화 (user_profile, news:user)
- [x] ValidationException, DatabaseException 처리

#### Method 3: getJobIssueIndex() ✅
- [x] 입력 검증 (job_category_id: 1-13, days: 1-365)
- [x] 직업 정보 조회
- [x] 이슈 지수 조회 (오늘 기준)
- [x] 트렌드 데이터 조회 (N일 기준)
- [x] 이전값 대비 변화율 계산
- [x] Redis 캐시 (6시간)
- [x] 더미 데이터 반환 (배치 작업 미완성)

#### Method 4: getNewsByTags() ✅
- [x] 입력 검증 (limit: 1-50, offset: >=0, days: 1-90)
- [x] 사용자 관심 태그 조회
- [x] 태그 매칭된 뉴스 필터링
- [x] 페이지네이션 적용
- [x] 정렬 옵션 (published_at, relevance)
- [x] Redis 캐시 (1시간)
- [x] 빈 결과 처리

#### Method 5: getRecommendedTools() ✅
- [x] 입력 검증 (job_category_id: 1-13)
- [x] 직업 정보 조회
- [x] 추천 도구 정보 조회 (더미)
- [x] Redis 캐시 (24시간)
- [x] 도구 카테고리별 구성

### API 라우터

- [x] **trendMonitoring.ts** - API 엔드포인트
  - 파일: `src/routes/trendMonitoring.ts`
  - 5개 엔드포인트 구현

#### Endpoint 1: GET /api/v1/jobs ✅
- [x] 라우트: `router.get('/')`
- [x] 인증: 선택
- [x] Rate Limit: 분당 100 요청
- [x] 응답 포맷: { success, status, data, timestamp }
- [x] 에러 처리: asyncHandler

#### Endpoint 2: PUT /api/v1/users/profile/job-and-tags ✅
- [x] 라우트: `router.put('/job-and-tags')`
- [x] 인증: requireAuth (필수)
- [x] Rate Limit: 분당 20 요청
- [x] 입력 검증: job_category_id, interest_tag_ids
- [x] 응답 포맷: { success, status, data, timestamp }
- [x] 에러 처리: asyncHandler, ValidationException

#### Endpoint 3: GET /api/v1/jobs/{job_category_id}/issue-index ✅
- [x] 라우트: `router.get('/:job_category_id/issue-index')`
- [x] 인증: requireAuth (필수)
- [x] 쿼리: days (1-365)
- [x] Rate Limit: 분당 60 요청
- [x] 입력 검증: job_category_id 파싱 및 범위 확인
- [x] 응답 포맷: { success, status, data, timestamp }
- [x] 에러 처리: ValidationException

#### Endpoint 4: GET /api/v1/news/by-tags ✅
- [x] 라우트: `router.get('/by-tags')`
- [x] 인증: requireAuth (필수)
- [x] 쿼리: limit, offset, sort_by, days
- [x] Rate Limit: 분당 60 요청
- [x] 입력 검증: 쿼리 파라미터 파싱
- [x] 응답 포맷: { success, status, data, timestamp }
- [x] 에러 처리: ValidationException

#### Endpoint 5: GET /api/v1/jobs/{job_category_id}/recommended-tools ✅
- [x] 라우트: `router.get('/:job_category_id/recommended-tools')`
- [x] 인증: 선택
- [x] Rate Limit: 분당 60 요청
- [x] 입력 검증: job_category_id 파싱 및 범위 확인
- [x] 응답 포맷: { success, status, data, timestamp }
- [x] 에러 처리: ValidationException

### 애플리케이션 통합

- [x] **app.ts** - 라우터 마운트
  - 파일: `src/app.ts`
  - import: `import trendMonitoringRouter from './routes/trendMonitoring';`
  - 마운트:
    ```typescript
    app.use('/api/v1/jobs', trendMonitoringRouter);
    app.use('/api/v1/users/profile', trendMonitoringRouter);
    app.use('/api/v1/news', trendMonitoringRouter);
    ```

- [x] **migrations.ts** - 마이그레이션 통합
  - 파일: `src/database/migrations.ts`
  - 함수 호출:
    ```typescript
    await createJobsTable();
    await createJobToInterestTagsTable();
    await createUserInterestTagsTable();
    ```

### 예외 처리

- [x] **ValidationException** - 입력 검증 실패 (400)
  - 직업 ID 범위: 1-13
  - 태그 개수: 1-40
  - 태그 ID 유효성
  - 쿼리 파라미터 범위

- [x] **DatabaseException** - DB 작업 실패 (500, 재시도 가능)
  - DB 연결 실패
  - 쿼리 실행 실패
  - 트랜잭션 실패

- [x] **로깅** - 구조화된 로깅
  - 메서드명 기록
  - 에러 코드 기록
  - 타임스탬프 기록
  - 심각도 판단

### 캐싱 전략

- [x] **Redis 캐싱**
  - `jobs:all` (24시간)
  - `job_index:{job_id}:{date}` (6시간)
  - `news:user:{user_id}` (1시간)
  - `user_profile:{user_id}` (1시간)

- [x] **캐시 무효화**
  - 프로필 변경 시: `user_profile:{user_id}` 삭제
  - 프로필 변경 시: `news:user:{user_id}` 삭제
  - 캐시 미스 시: DB 직접 조회

---

## 🧪 테스트 항목

### 단위 테스트 (준비 필요)

- [ ] `getJobs()` - 직업 목록 조회
  - [ ] 정상 조회
  - [ ] 빈 결과 처리
  - [ ] Redis 캐시 확인

- [ ] `saveUserJobAndTags()` - 프로필 저장
  - [ ] 유효한 입력
  - [ ] job_category_id 범위 오류 (400)
  - [ ] 태그 개수 오류 (1-40)
  - [ ] 유효하지 않은 태그 ID (400)
  - [ ] 캐시 무효화 확인

- [ ] `getJobIssueIndex()` - 이슈 지수 조회
  - [ ] 유효한 job_category_id
  - [ ] 범위 오류 (1-13)
  - [ ] days 범위 오류 (1-365)
  - [ ] 데이터 없음 처리

- [ ] `getNewsByTags()` - 뉴스 피드
  - [ ] limit/offset 검증
  - [ ] sort_by 옵션 확인
  - [ ] 관심 태그 없음 처리

- [ ] `getRecommendedTools()` - 추천 도구
  - [ ] 유효한 job_category_id
  - [ ] 범위 오류 처리

### 통합 테스트 (준비 필요)

- [ ] 온보딩 흐름
  - [ ] 직업 목록 조회 (GET /api/v1/jobs)
  - [ ] 프로필 저장 (PUT /api/v1/users/profile/job-and-tags)
  - [ ] 데이터 일관성 확인

- [ ] 개인화 대시보드
  - [ ] 이슈 지수 조회
  - [ ] 뉴스 피드 조회
  - [ ] 도구 추천 조회
  - [ ] 캐시 활용 확인

### API 테스트 (준비 필요)

- [ ] 직업 목록 - 200 OK
- [ ] 프로필 저장 (유효) - 200 OK
- [ ] 프로필 저장 (무효) - 400 Bad Request
- [ ] 이슈 지수 - 200 OK
- [ ] 뉴스 피드 - 200 OK
- [ ] 추천 도구 - 200 OK
- [ ] 인증 없음 - 401 Unauthorized (보호된 엔드포인트)
- [ ] Rate Limit - 429 Too Many Requests

---

## 📚 문서

- [x] **FEATURE_8_GUIDE.md** - 개발 가이드
  - 설치 및 마이그레이션
  - API 엔드포인트 스펙
  - 파일 구조
  - 예외 처리
  - 캐싱 전략
  - 테스트 방법

- [x] **agent_exception_handling_guide.md** - 예외처리 가이드 (준수)
  - 메서드 단위 예외 처리
  - 부분 성공 허용
  - 재시도 가능 여부
  - 에러 로깅

- [x] **기능_명세서_8번_통합양식.md** - 기능 명세서 (참고)
  - API 스펙 정의
  - 데이터 모델
  - 비즈니스 로직

---

## 🚀 배포 준비

### 배포 전 필수 항목

- [ ] 모든 테스트 통과
- [ ] 에러 핸들링 확인
- [ ] Redis 설정 확인
- [ ] 데이터베이스 마이그레이션 검증
- [ ] 환경 변수 설정
- [ ] 보안 검수 (SQL Injection, XSS, CSRF)
- [ ] 성능 테스트 (캐싱, 응답 시간)

### 배포 후 모니터링

- [ ] API 응답 시간 모니터링
- [ ] 에러율 모니터링
- [ ] 캐시 히트율 모니터링
- [ ] 데이터베이스 연결 풀 모니터링
- [ ] Redis 메모리 사용량 모니터링

---

## 🔄 추가 개발 항목

### Phase 2 (별도 PR)

1. **뉴스 시스템 연동**
   - [ ] news_articles 테이블 연동
   - [ ] news_tags 매핑
   - [ ] 이슈 지수 배치 작업

2. **추천 도구 데이터**
   - [ ] tools 테이블 생성
   - [ ] job_to_tools 매핑
   - [ ] 도구 카테고리 정의

3. **프론트엔드 통합**
   - [ ] UI/UX 디자인
   - [ ] API 호출 로직
   - [ ] 상태 관리
   - [ ] 에러 처리 UI

4. **배치 작업**
   - [ ] 이슈 지수 계산 (6시간 단위)
   - [ ] 뉴스 수집 및 태깅
   - [ ] 캐시 갱신

---

## ✅ 최종 검증

**상태**: ✅ 완료

- [x] 모든 백엔드 구현 완료
- [x] 예외 처리 가이드 준수
- [x] Redis 캐싱 통합
- [x] API 라우터 마운트
- [x] 마이그레이션 통합
- [x] 문서 작성

**다음 단계**: 단위 테스트 및 통합 테스트 작성

---

**작성자**: 최수안 (백엔드 팀장)
**리뷰자**: [팀장]
**승인 여부**: [ ] 승인 [ ] 수정 필요 [ ] 반려
**최종 업데이트**: 2025-11-12
