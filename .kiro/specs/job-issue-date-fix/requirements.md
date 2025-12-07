# 직업별 이슈 지수 날짜 미스매칭 문제 해결 방안

## 1. 문제 요약

**현상**: 직업별 이슈 지수 페이지에서 데이터가 출력되지 않음

**원인**: 프론트엔드에서 백엔드로 전송하는 `collected_at` 파라미터가 백엔드 DB에 저장된 형식과 일치하지 않아, 백엔드가 해당 데이터를 찾지 못하고 빈 데이터를 반환

---

## 2. 상세 분석

### 2.1 날짜 형식 불일치 문제

| 구분 | 형식 | 예시 |
|------|------|------|
| 프론트엔드 전송 | ISO 8601 전체 형식 | `2025-01-15T14:30:00.000Z` |
| 백엔드 DB 저장 | MySQL DATETIME | `2025-01-15 17:00:46` |

### 2.2 데이터 흐름 분석

```
[프론트엔드]
1. /api/issue-index/current 호출
2. 응답에서 collected_at 수신 (예: "2025-01-15T08:00:46.000Z")
   ↓
3. /api/issue-index/jobs/all?collected_at=2025-01-15T08:00:46.000Z 호출
   ↓
[백엔드]
4. job_issue_index 테이블에서 WHERE collected_at = '2025-01-15T08:00:46.000Z' 조회
   ↓
5. DB에는 '2025-01-15 17:00:46' 형식으로 저장되어 있음
   ↓
6. 매칭 실패 → 빈 결과 반환
```

### 2.3 코드 분석

#### 백엔드 - 저장 시 (save-job-issue-index.ts)
```typescript
// ISO 8601 → MySQL DATETIME 변환
function toMySQLDatetime(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
  // 결과: "2025-01-15 17:00:46"
}
```

#### 백엔드 - 조회 시 (job-news.controller.ts)
```typescript
// getAllJobIssueIndexes 함수
if (collectedAt) {
  query = `
    SELECT ... FROM job_issue_index
    WHERE collected_at = ?  // ← 프론트엔드에서 받은 값 그대로 사용
  `;
  params = [collectedAt];  // ← ISO 8601 형식 그대로 전달
}
```

**문제점**: 프론트엔드에서 받은 ISO 8601 형식(`2025-01-15T08:00:46.000Z`)을 MySQL DATETIME 형식으로 변환하지 않고 그대로 쿼리에 사용

---

## 3. 해결 방안

### 3.1 백엔드 수정 (권장)

**파일**: `src/api/job-news.controller.ts`

**수정 위치**: `getAllJobIssueIndexes` 함수 내 `collectedAt` 파라미터 처리 부분

**수정 내용**:
```typescript
// 기존 코드
if (collectedAt) {
  query = `...WHERE collected_at = ?...`;
  params = [collectedAt];
}

// 수정 코드
if (collectedAt) {
  // ISO 8601 형식을 MySQL DATETIME 형식으로 변환
  const mysqlDatetime = new Date(collectedAt).toISOString().slice(0, 19).replace('T', ' ');
  query = `...WHERE collected_at = ?...`;
  params = [mysqlDatetime];
}
```

**동일하게 수정해야 할 함수들**:
1. `getJobIssueIndex` - 특정 직업 이슈 지수 조회
2. `getAllJobIssueIndexes` - 전체 직업 이슈 지수 조회
3. `getJobMatchedClusters` - 직업별 매칭 클러스터 조회
4. `getJobMatchedArticles` - 직업별 매칭 기사 조회

### 3.2 프론트엔드 수정 (대안)

프론트엔드에서 API 호출 전에 날짜 형식을 변환하는 방법도 있으나, 백엔드에서 처리하는 것이 더 적절합니다.

**이유**:
- 백엔드가 데이터 저장 형식을 알고 있음
- 다른 클라이언트(모바일 앱 등)에서도 동일한 문제 방지
- API 계약의 일관성 유지

---

## 4. 수정 코드 상세

### 4.1 job-news.controller.ts 수정

```typescript
// 파일 상단에 헬퍼 함수 추가 (기존 correctMySQLDateToUTC 함수 근처)

/**
 * ISO 8601 문자열을 MySQL DATETIME 형식으로 변환
 * '2025-01-15T08:00:46.000Z' → '2025-01-15 08:00:46'
 */
function toMySQLDatetime(isoString: string): string {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
```

#### 4.1.1 getJobIssueIndex 함수 수정

```typescript
// 기존 (Line 68-69 근처)
if (collectedAt) {
  query = `...WHERE job_category = ? AND collected_at = ?`;
  params = [category, collectedAt];
}

// 수정
if (collectedAt) {
  const mysqlDatetime = toMySQLDatetime(collectedAt);
  query = `...WHERE job_category = ? AND collected_at = ?`;
  params = [category, mysqlDatetime];
}
```

#### 4.1.2 getAllJobIssueIndexes 함수 수정

```typescript
// 기존 (Line 117-125 근처)
if (collectedAt) {
  query = `...WHERE collected_at = ?...`;
  params = [collectedAt];
}

// 수정
if (collectedAt) {
  const mysqlDatetime = toMySQLDatetime(collectedAt);
  query = `...WHERE collected_at = ?...`;
  params = [mysqlDatetime];
}
```

#### 4.1.3 getJobMatchedClusters 함수 수정

```typescript
// 기존 (Line 178-179 근처)
if (collectedAt) {
  targetCollectedAt = collectedAt;
}

// 수정
if (collectedAt) {
  targetCollectedAt = toMySQLDatetime(collectedAt);
}
```

#### 4.1.4 getJobMatchedArticles 함수 수정

```typescript
// 기존 (Line 253-254 근처)
if (collectedAt) {
  targetCollectedAt = collectedAt;
}

// 수정
if (collectedAt) {
  targetCollectedAt = toMySQLDatetime(collectedAt);
}
```

---

## 5. 테스트 방법

### 5.1 수정 전 테스트 (현재 상태 확인)

```bash
# 1. 현재 이슈 지수 조회
curl "http://localhost:3000/api/issue-index/current"
# 응답에서 collected_at 값 확인 (예: "2025-01-15T08:00:46.000Z")

# 2. 직업별 이슈 지수 조회 (빈 결과 예상)
curl "http://localhost:3000/api/issue-index/jobs/all?collected_at=2025-01-15T08:00:46.000Z"
```

### 5.2 수정 후 테스트

```bash
# 동일한 요청으로 데이터가 정상 반환되는지 확인
curl "http://localhost:3000/api/issue-index/jobs/all?collected_at=2025-01-15T08:00:46.000Z"
# 응답에 jobs 배열에 데이터가 포함되어야 함
```

---

## 6. 영향 범위

### 6.1 수정 파일
- `src/api/job-news.controller.ts` (1개 파일)

### 6.2 영향받는 API 엔드포인트
- `GET /api/issue-index/job/:category`
- `GET /api/issue-index/jobs/all`
- `GET /api/issue-index/job/:category/clusters`
- `GET /api/issue-index/job/:category/articles`

### 6.3 프론트엔드 수정
- **수정 불필요**: 백엔드에서 날짜 형식 변환을 처리하므로 프론트엔드 코드 변경 없음

---

## 7. 추가 권장 사항

### 7.1 일관성 있는 날짜 처리
향후 유사한 문제 방지를 위해 다음을 권장합니다:

1. **공통 유틸리티 함수 사용**: `toMySQLDatetime` 함수를 별도 유틸리티 파일로 분리하여 모든 컨트롤러에서 재사용

2. **API 문서화**: collected_at 파라미터가 ISO 8601 형식을 받아들인다는 것을 API 문서에 명시

3. **입력 검증 강화**: 잘못된 날짜 형식이 들어올 경우 명확한 에러 메시지 반환

---

## 8. 결론

이 문제는 **백엔드의 `job-news.controller.ts` 파일 하나만 수정**하면 해결됩니다. 프론트엔드 수정은 필요하지 않으며, 기존 API 계약을 유지하면서 내부적으로 날짜 형식을 변환하는 방식으로 처리합니다.
