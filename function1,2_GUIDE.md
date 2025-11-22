# 모델 비교 & 타임라인 API 구현 완료

**작성일:** 2025-11-22  

---

## 로컬 DB로 돌릴 경우 .env에서 SQL 포트 3306으로 변경 필요. 그리고 .env에서 API용 내용 확인 필요

## 📦 구현 완료 기능

### 1️⃣ 기능 #1: 모델 성능 발전사 (타임라인)
GPT, Claude, Gemini 등 AI 모델 시리즈의 버전별 출시일, 성능 지표, 발전 추이를 제공

### 2️⃣ 기능 #2: 모델 간단 비교
두 AI 모델의 성능을 비교하고 강점/약점, 추천 정보를 제공

---

## 📁 제공 파일

### 서비스 로직
```
src/services/
├── comparison/
│   └── modelComparisonService_standalone.ts
└── timeline/
    └── modelTimelineService_standalone.ts
```

### API 라우터
```
src/routes/
├── comparison.routes.ts
└── timeline.routes.ts
```

---

## 🔧 설치 방법

### 1. 파일 배치
프로젝트의 해당 폴더에 파일 복사

### 2. app.ts 수정
**import 추가 (2줄):**
```typescript
import comparisonRouter from './routes/comparison.routes';
import timelineRouter from './routes/timeline.routes';
```

**라우터 등록 (2줄):**
```typescript
app.use('/api/v1/comparison', comparisonRouter);
app.use('/api/v1/timeline', timelineRouter);
```

### 3. 환경변수 확인
`.env` 파일에 아래 설정 있는지 확인:
```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=ai_model_app
DB_USER=ainus_user
DB_PASSWORD=qwer1234
```

---

## 🚀 API 엔드포인트

### 모델 비교 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/comparison/compare?modelA=xxx&modelB=yyy` | 두 모델 비교 |
| GET | `/api/v1/comparison/top/:category?limit=10` | 카테고리별 상위 모델 |
| GET | `/api/v1/comparison/quick-compare?nameA=GPT&nameB=Claude` | 모델명으로 간편 비교 |

**category 옵션:** `overall`, `intelligence`, `coding`, `math`

### 타임라인 API

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/timeline/series` | 사용 가능한 시리즈 목록 |
| GET | `/api/v1/timeline/:series?limit=20` | 특정 시리즈 타임라인 |
| GET | `/api/v1/timeline/compare?series=GPT,Claude` | 여러 시리즈 비교 |
| GET | `/api/v1/timeline/events?startDate=2024-01-01&endDate=2024-12-31` | 주요 출시 이벤트 |

---

## 📝 API 응답 예시

### 모델 비교
```json
{
  "success": true,
  "data": {
    "model_a": {
      "model_name": "GPT-4 Turbo",
      "overall_score": 89.5,
      "scores": {
        "intelligence": 90.0,
        "coding": 92.5,
        "math": 88.0
      }
    },
    "model_b": { ... },
    "comparison_summary": {
      "winner_overall": "GPT-4 Turbo",
      "recommendation": "GPT-4 Turbo이(가) 전반적으로 더 우수합니다. 특히 코딩 작업에 적합합니다."
    },
    "visual_data": {
      "bar_chart_data": [...],
      "radar_chart_data": { ... }
    }
  }
}
```

### 타임라인
```json
{
  "success": true,
  "data": {
    "series_name": "GPT",
    "total_versions": 5,
    "timeline": [
      {
        "model_name": "GPT-4",
        "release_date": "2023-03-14",
        "overall_score": 89.2,
        "is_major_release": true
      }
    ],
    "performance_trend": {
      "overall_improvement": 18.15,
      "development_speed": "Fast (평균 104일/버전)"
    }
  }
}
```

---

## 🧪 테스트 방법

### 서버 실행 후
```bash
npm run dev
```

**브라우저에서 테스트:**
```
http://localhost:3000/api/v1/timeline/series
http://localhost:3000/api/v1/comparison/top/overall?limit=5
```

---

## 💡 프론트엔드 연동 예시

```typescript
// 타임라인 조회
const timeline = await fetch('/api/v1/timeline/GPT?limit=10')
  .then(res => res.json());

// 모델 비교
const comparison = await fetch(
  '/api/v1/comparison/compare?modelA=gpt4&modelB=claude3'
).then(res => res.json());

// 상위 모델 조회
const topModels = await fetch('/api/v1/comparison/top/coding?limit=5')
  .then(res => res.json());
```

---

## ⚠️ 주의사항

1. **Docker MySQL 실행 필수**
   ```bash
   docker-compose up -d mysql
   ```

2. **DB에 데이터 있어야 함**
   - ai_models, model_overall_scores 테이블에 데이터 필요
   - Artificial Analysis 파이프라인 실행 필요 시: `npm run pipeline:aa`

3. **포트 충돌 확인**
   - MySQL: 3307 포트 사용 중
   - 서버: 3000 포트 (기본값)

---

## 📞 문의

- **DB/데이터 이슈:** 데이터베이스 담당자
- **API 연동 이슈:** 백엔드 개발자 (예병성)
- **UI 구현:** 프론트엔드 개발자 (박선우)

---

**구현 완료 ✅**  
**테스트 완료 ✅**  
**배포 준비 완료 ✅**
