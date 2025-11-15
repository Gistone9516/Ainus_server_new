# AinusUI API Integration Files

이 폴더는 AinusUI 리포지토리에 추가할 파일들입니다.

## 📁 파일 구조

```
UI_files/
├── .env                        # 환경 변수 설정
├── .env.example                # 환경 변수 예시
└── src/
    ├── contexts/
    │   └── AuthContext.tsx     # 실제 API 연동 (수정됨)
    ├── services/               # API 서비스 레이어 (8개 파일)
    │   ├── api.client.ts
    │   ├── auth.service.ts
    │   ├── community.service.ts
    │   ├── issue.service.ts
    │   ├── model.service.ts
    │   ├── news.service.ts
    │   ├── profile.service.ts
    │   └── index.ts
    └── types/                  # TypeScript 타입 정의 (8개 파일)
        ├── api.types.ts
        ├── auth.types.ts
        ├── community.types.ts
        ├── issue.types.ts
        ├── model.types.ts
        ├── news.types.ts
        ├── profile.types.ts
        └── index.ts
```

## 🚀 사용 방법

### 1. 이 브랜치 다운로드

```bash
git clone https://github.com/Gistone9516/Ainus_server_new.git
cd Ainus_server_new
git checkout UI_migration
```

### 2. AinusUI 리포지토리로 파일 복사

```bash
# AinusUI 리포지토리 위치로 이동
cd /path/to/AinusUI

# 파일 복사
cp -r /path/to/Ainus_server_new/UI_files/.env .
cp -r /path/to/Ainus_server_new/UI_files/.env.example .
cp -r /path/to/Ainus_server_new/UI_files/src/services src/
cp -r /path/to/Ainus_server_new/UI_files/src/types src/
cp /path/to/Ainus_server_new/UI_files/src/contexts/AuthContext.tsx src/contexts/
```

### 3. AinusUI 리포지토리에서 커밋 및 푸시

```bash
cd /path/to/AinusUI

git add .
git commit -m "feat: Add API integration layer and type definitions

서버 API 연동을 위한 전체 인프라 구축

새로 추가된 파일 (17개):
- src/types/* (8개) - TypeScript 타입 정의
- src/services/* (8개) - API 서비스 레이어
- .env, .env.example - 환경 변수 설정

수정된 파일:
- src/contexts/AuthContext.tsx - 실제 API 연동

주요 기능:
- Axios 기반 HTTP 클라이언트 (토큰 자동 추가)
- 모든 API 엔드포인트 서비스 함수 구현
- TypeScript 완전 지원
- 401 에러 시 자동 로그아웃
- AsyncStorage 기반 토큰 캐싱

서버 연동 준비 완료"

git push origin UI/#expo-Frame
```

## 📋 추가된 기능

### API 클라이언트 (src/services/api.client.ts)
- Axios 기반 HTTP 클라이언트
- 요청 인터셉터: 토큰 자동 추가
- 응답 인터셉터: 401 에러 시 자동 로그아웃
- 네트워크 에러 처리

### 타입 정의 (src/types/)
서버 API 응답 구조와 일치하는 TypeScript 타입:
- 인증 (로그인, 회원가입, 토큰)
- AI 모델 (조회, 추천, 비교)
- 커뮤니티 (게시글, 댓글, 좋아요)
- 이슈지수 및 히스토리
- 뉴스 및 추천
- 프로필 및 북마크

### API 서비스 함수 (src/services/)
모든 백엔드 API 엔드포인트에 대한 서비스 함수:
- `authService` - 로그인, 회원가입, 로그아웃
- `modelService` - 모델 조회, 추천, 비교
- `communityService` - 게시글/댓글 CRUD, 좋아요, 북마크
- `issueService` - 이슈지수 조회, 히스토리
- `newsService` - 뉴스 조회, 추천
- `profileService` - 프로필 관리, 북마크

### 환경 변수 (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_APP_NAME=Ainus
EXPO_PUBLIC_APP_VERSION=1.0.0
```

**실제 디바이스 테스트 시**:
```env
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000/api/v1
```
(192.168.0.10을 본인의 로컬 IP로 변경)

## 🔗 서버 연동

### 서버 실행
```bash
cd Ainus_server_new
npm run dev
```
서버가 http://localhost:3000 에서 실행됩니다.

### UI 실행
```bash
cd AinusUI
npm install
npm start
```

Expo QR 코드가 표시되면:
- iOS: 카메라로 QR 코드 스캔
- Android: Expo Go 앱에서 "Scan QR code"
- Web: 터미널에서 `w` 입력

## ✅ 연동 확인

1. UI에서 로그인 시도
2. 서버 터미널에서 `POST /api/v1/auth/login` 로그 확인
3. UI에서 로그인 성공 후 홈 화면 표시

## 📝 참고사항

- UI의 TypeScript 컴파일 에러는 무시해도 됩니다 (Expo가 자체 빌드 시스템 사용)
- `npm start` 실행 시 정상 작동합니다
- 서버와 UI가 같은 네트워크에 있어야 합니다 (실제 디바이스 테스트 시)
