# Requirements Document

## Introduction

이 기능은 개발자가 다양한 파이프라인과 서비스를 쉽게 테스트할 수 있도록 npm 스크립트 명령어를 제공합니다. 현재 `src/test/testDataCollectionPipeline.ts` 파일이 존재하지만 `package.json`에 해당 스크립트가 등록되어 있지 않아 실행이 불편한 상황입니다. 이 기능을 통해 `npm run test:pipeline`, `npm run test:clustering` 등의 명령어로 각 파이프라인을 손쉽게 테스트할 수 있게 됩니다.

### 현재 코드 구조 호환성

- **DatabasePool**: `src/database/mysql.ts`의 `getDatabasePool()` 사용, `initialize()` 및 `close()` 메서드 지원
- **환경 변수**: `src/config/environment.ts`의 `loadConfig()` 사용, 필수 변수 검증 내장 (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET)
- **기존 테스트 파일**: `src/test/testDataCollectionPipeline.ts`에 이미 모드별 테스트 함수 구현됨 (all, schedule, naver, aa)
- **파이프라인 함수**: 
  - `runPipelineManually()` - news-clustering-pipeline.ts
  - `runTaggingPipelineManually()` - news-tagging-pipeline.ts
  - `DataCollectionScheduler` 클래스 - dataCollectionScheduler.ts

## Glossary

- **Test_Command_System**: npm 스크립트를 통해 파이프라인 테스트를 실행하는 시스템
- **Data_Collection_Pipeline**: Naver 뉴스 및 AA 모델 데이터를 수집하는 파이프라인 (DataCollectionScheduler 클래스)
- **News_Clustering_Pipeline**: 수집된 뉴스를 GPT로 분류하고 이슈 지수를 계산하는 파이프라인 (runPipelineManually 함수)
- **News_Tagging_Pipeline**: 뉴스 기사에 태그를 분류하는 파이프라인 (runTaggingPipelineManually 함수)
- **Test_Mode**: 테스트 실행 시 선택할 수 있는 모드 (all, schedule, naver, aa 등)
- **DatabasePool**: MySQL 연결 풀 관리 싱글톤 클래스

## Requirements

### Requirement 1

**User Story:** As a developer, I want to run data collection pipeline tests via npm commands, so that I can quickly verify the data collection functionality without manually executing TypeScript files.

#### Acceptance Criteria

1. WHEN a developer executes `npm run test:pipeline`, THE Test_Command_System SHALL run the full data collection pipeline test with all modes
2. WHEN a developer executes `npm run test:pipeline -- naver`, THE Test_Command_System SHALL run only the Naver news collection test
3. WHEN a developer executes `npm run test:pipeline -- aa`, THE Test_Command_System SHALL run only the AA model collection test
4. WHEN a developer executes `npm run test:pipeline -- schedule`, THE Test_Command_System SHALL run only the scheduler registration test without actual data collection

### Requirement 2

**User Story:** As a developer, I want to run news clustering pipeline tests via npm commands, so that I can verify the GPT classification and issue index calculation functionality.

#### Acceptance Criteria

1. WHEN a developer executes `npm run test:clustering`, THE Test_Command_System SHALL run the news clustering pipeline manually
2. WHEN the clustering pipeline test completes successfully, THE Test_Command_System SHALL display the execution duration and issue index result

### Requirement 3

**User Story:** As a developer, I want to run news tagging pipeline tests via npm commands, so that I can verify the article tagging functionality.

#### Acceptance Criteria

1. WHEN a developer executes `npm run test:tagging`, THE Test_Command_System SHALL run the news tagging pipeline manually
2. WHEN the tagging pipeline test completes successfully, THE Test_Command_System SHALL display the number of articles processed and tags mapped

### Requirement 4

**User Story:** As a developer, I want a unified test command that shows available test options, so that I can discover and run different tests easily.

#### Acceptance Criteria

1. WHEN a developer executes `npm run test:help`, THE Test_Command_System SHALL display a list of all available test commands with descriptions
2. WHEN a developer executes an invalid test command, THE Test_Command_System SHALL display an error message and suggest valid commands

### Requirement 5

**User Story:** As a developer, I want test commands to handle errors gracefully, so that I can understand what went wrong when tests fail.

#### Acceptance Criteria

1. IF a test command fails due to database connection issues, THEN THE Test_Command_System SHALL display a clear error message indicating the connection problem
2. IF a test command fails due to missing environment variables, THEN THE Test_Command_System SHALL display which variables are missing
3. WHEN a test command encounters an error, THE Test_Command_System SHALL exit with a non-zero exit code
