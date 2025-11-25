# 데이터 수집 파이프라인 구현 (Data Collection Pipeline)

## 📋 개요
Naver 뉴스 API와 Artificial Analysis API를 통해 자동으로 데이터를 수집하고 DB에 저장하는 파이프라인을 구현했습니다.

---

## 📂 수정/추가된 파일

### 1. `src/cron/dataCollectionScheduler.ts` (신규)
**기능:** 데이터 수집 스케줄러 메인 로직
- Naver 뉴스 자동 수집 (매시간)
- Artificial Analysis 모델 데이터 자동 수집 (매일 새벽 1시)
- 24시간 이내 중복 뉴스 제거
- news_articles 테이블에 뉴스 원본 저장

**주요 메서드:**
- `executeNaverCollection()`: Naver API 호출 → 중복 체크 → DB 저장
- `executeAACollection()`: AA API 호출 → 점수 산출 → DB 저장
- `isDuplicateNews()`: 24시간 이내 중복 뉴스 체크
- `getLastArticleIndex()`: article_index 충돌 방지

---

### 2. `src/cron/cleanupScheduler.ts` (신규)
**기능:** 원본 데이터 자동 정리
- 30일 이상 된 원본 JSON 파일 자동 삭제 (매일 새벽 2시)
- 디스크 공간 관리

---

### 3. `src/cron/index.ts` (신규)
**기능:** 모든 스케줄러 통합 초기화
- 데이터 수집 스케줄러 시작
- 정리 스케줄러 시작
- 우아한 종료 처리

---

### 4. `src/utils/rawDataManager.ts` (신규)
**기능:** 원본 데이터 관리 유틸리티
- API 응답을 JSON 파일로 저장 (`data/raw/` 디렉토리)
- 타임스탬프 기반 파일명 생성
- 디렉토리 자동 생성

---

### 5. `src/services/collectors/artificialAnalysis.collector.v2.ts` (신규)
**기능:** Artificial Analysis API 수집기
- AA API에서 AI 모델 데이터 수집
- 최대 3회 재시도 로직
- 원본 데이터 자동 저장

---

### 6. `src/services/collectors/naver.collector.v2.ts` (신규)
**기능:** Naver 뉴스 API 수집기
- 키워드 기반 뉴스 검색
- 최대 3회 재시도 로직
- HTML 태그 제거 및 데이터 정제
- 원본 데이터 자동 저장

---

### 7. `src/test/testDataCollectionPipeline.ts` (신규)
**기능:** 데이터 수집 파이프라인 테스트 도구
- DB 연결 초기화
- Naver/AA 수집 개별 테스트
- 스케줄러 등록 테스트

**실행 방법:**
```bash
# Naver 수집만
npx ts-node -r tsconfig-paths/register src/test/testDataCollectionPipeline.ts naver

# AA 수집만
npx ts-node -r tsconfig-paths/register src/test/testDataCollectionPipeline.ts aa

# 전체 테스트
npx ts-node -r tsconfig-paths/register src/test/testDataCollectionPipeline.ts all
```

---

### 8. `src/index.ts` (수정)
**변경 내용:**
- 스케줄러 시스템 초기화 추가
- `initializeAllSchedulers()` 호출 (121번 줄)
- `stopAllSchedulers()` 호출 (149번 줄)
- 서버 시작 시 자동으로 스케줄러 실행

---

## 🗄️ 데이터베이스

### news_articles 테이블 (기존)
**용도:** 네이버 뉴스 원본 데이터 저장
- `collected_at`: 수집 시간 (1시간 단위)
- `article_index`: 기사 인덱스 (0~999)
- `title`, `link`, `description`, `pub_date`
- **중복 체크:** 24시간 이내 같은 link 제외

### 기타 테이블 (기존)
- `models`, `model_benchmarks`: AA 모델 데이터
- `clusters`, `cluster_snapshots`: 뉴스 클러스터링 결과
- `issue_index`: AI 이슈 지수

---

## ⚙️ 환경 변수

### .env 추가 항목
```env
# Naver 뉴스 수집
ENABLE_NAVER_COLLECTION=true
NAVER_SCHEDULE=0 * * * *
NAVER_KEYWORDS=AI
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret

# Artificial Analysis 수집
ENABLE_AA_COLLECTION=true
AA_SCHEDULE=0 1 * * *
ARTIFICIAL_ANALYSIS_API_KEY=your_api_key

# 원본 데이터 관리
SAVE_RAW_DATA=true
RAW_RETENTION_DAYS=30
ENABLE_RAW_DATA_CLEANUP=true
RAW_CLEANUP_SCHEDULE=0 2 * * *
```

---

## 🚀 동작 흐름

### 매시 정각 (Naver 뉴스)
```
1. Naver API 호출 (키워드: AI)
2. 100개 뉴스 수집
3. 원본 JSON 저장 (data/raw/)
4. 24시간 이내 중복 체크
5. news_articles 테이블 저장
6. 뉴스 클러스터링 파이프라인 트리거
```

### 매일 새벽 1시 (AA 모델)
```
1. AA API 호출
2. 모델 데이터 수집
3. 원본 JSON 저장
4. 점수 산출 (ModelDataProcessor)
5. DB 저장 (models, model_benchmarks 등)
```

### 매일 새벽 2시 (데이터 정리)
```
1. data/raw/ 디렉토리 스캔
2. 30일 이상 된 파일 삭제
3. 통계 로그 출력
```

---

## 🔍 주요 특징

### 1. 중복 제거
- 24시간 이내 같은 URL의 뉴스는 저장 안 함
- 오래된 뉴스는 재수집 허용 (통계 분석용)

### 2. 인덱스 충돌 방지
- 같은 시간대에 여러 번 실행해도 article_index 자동 증가
- 마지막 인덱스 조회 후 다음 번호부터 시작

### 3. 에러 처리
- API 호출 실패 시 최대 3회 재시도
- 실패해도 서버는 계속 실행
- 상세한 에러 로그 출력

### 4. 원본 데이터 보관
- 모든 API 응답을 JSON으로 저장
- 추후 데이터 검증 및 재처리 가능

---

## 📊 로그 예시

```
============================================================
  Ainus 스케줄러 시스템 초기화
============================================================

[1] 데이터 수집 스케줄러
------------------------------------------------------------
[Naver] 스케줄 등록: 0 * * * * (매시간)
[Naver] 키워드: AI
[AA] 스케줄 등록: 0 1 * * * (매일 새벽 1시)

[2] 원본 데이터 정리 스케줄러
------------------------------------------------------------
[Cleanup Scheduler] 스케줄 등록: 0 2 * * *

============================================================
  모든 스케줄러 초기화 완료
============================================================

[Naver Collection] 시작: 2025-11-25T17:00:00Z
[DB] 시작 인덱스: 0 (마지막 저장: -1)
[Naver Collector] 뉴스 수집 완료: 100개
[DB] 저장 완료: 45개 (중복 제외: 55개)

[Naver Collection] 완료
  전체 수집: 100개
  DB 저장: 45개
  중복 제외: 55개
  소요 시간: 2.45초
```

---

## 🧪 테스트 방법

### 1. Naver 수집 테스트
```bash
npx ts-node -r tsconfig-paths/register src/test/testDataCollectionPipeline.ts naver
```

### 2. DB 확인
```sql
-- 최근 수집된 뉴스
SELECT * FROM news_articles 
ORDER BY collected_at DESC, article_index 
LIMIT 10;

-- 시간대별 수집 개수
SELECT 
  collected_at,
  COUNT(*) as count
FROM news_articles
GROUP BY collected_at
ORDER BY collected_at DESC;
```

---

## 🚨 주의사항

1. **API 키 필수**: Naver, AA API 키가 .env에 있어야 작동
2. **DB 연결 필수**: MySQL 연결 필요
3. **서버 실행 중에만 작동**: 서버 종료 시 스케줄러도 중지
4. **디스크 공간**: 원본 데이터 저장으로 용량 사용 증가 (30일 후 자동 삭제)

---

## 📝 다음 단계

- [ ] 뉴스 클러스터링 파이프라인과 연동
- [ ] 에러 알림 시스템 추가
- [ ] 수집 통계 대시보드 구현
- [ ] 다른 뉴스 소스 추가 (Google News, 다음 등)

---

**작성일:** 2025-11-26  
**작성자:** [Your Name]  
**브랜치:** feature/data-collection-pipeline
