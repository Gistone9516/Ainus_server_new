// 파이프라인 체크 스크립트
// 목적: v2에서 옮긴 collectors, processors, repositories가 정상 작동하는지 확인

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  exists: boolean;
  type?: 'file' | 'directory';
  path?: string;
  error?: string;
}

class PipelineChecker {
  private results: CheckResult[] = [];
  private basePath: string;

  constructor() {
    this.basePath = process.cwd();
  }

  private checkPath(relativePath: string, name: string): CheckResult {
    const fullPath = path.join(this.basePath, relativePath);
    
    try {
      const stats = fs.statSync(fullPath);
      return {
        name,
        exists: true,
        type: stats.isDirectory() ? 'directory' : 'file',
        path: fullPath
      };
    } catch (error) {
      return {
        name,
        exists: false,
        path: fullPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkStructure(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('PIPELINE STRUCTURE CHECK');
    console.log('='.repeat(70));
    console.log(`작업 디렉토리: ${this.basePath}\n`);

    // 1. 폴더 구조 체크
    console.log('1. 폴더 구조 체크');
    console.log('-'.repeat(70));

    const folders = [
      { path: 'src/services', name: 'services 폴더' },
      { path: 'src/services/collectors', name: 'collectors 폴더' },
      { path: 'src/services/processors', name: 'processors 폴더' },
      { path: 'src/services/repositories', name: 'repositories 폴더' },
      { path: 'src/config', name: 'config 폴더' },
      { path: 'src/pipelines', name: 'pipelines 폴더' }
    ];

    folders.forEach(({ path: folderPath, name }) => {
      const result = this.checkPath(folderPath, name);
      this.results.push(result);
      
      if (result.exists) {
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name} - 존재하지 않음`);
      }
    });

    // 2. Collectors 파일 체크
    console.log('\n2. Collectors 파일 체크');
    console.log('-'.repeat(70));

    const collectorFiles = [
      { path: 'src/services/collectors/artificialAnalysis.collector.ts', name: 'ArtificialAnalysisCollector' },
      { path: 'src/services/collectors/naver.collector.ts', name: 'NaverCollector' },
      { path: 'src/services/collectors/trends.collector.ts', name: 'TrendsCollector' }
    ];

    collectorFiles.forEach(({ path: filePath, name }) => {
      const result = this.checkPath(filePath, name);
      this.results.push(result);
      
      if (result.exists) {
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name} - 파일 없음`);
      }
    });

    // 3. Processors 파일 체크
    console.log('\n3. Processors 파일 체크');
    console.log('-'.repeat(70));

    const processorFiles = [
      { path: 'src/services/processors/modelDataProcessor.ts', name: 'ModelDataProcessor' },
      { path: 'src/services/processors/scoreCalculator.ts', name: 'ScoreCalculator' }
    ];

    processorFiles.forEach(({ path: filePath, name }) => {
      const result = this.checkPath(filePath, name);
      this.results.push(result);
      
      if (result.exists) {
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name} - 파일 없음`);
      }
    });

    // 4. Repositories 파일 체크
    console.log('\n4. Repositories 파일 체크');
    console.log('-'.repeat(70));

    const repositoryFiles = [
      { path: 'src/services/repositories/modelRepository.ts', name: 'ModelRepository' },
      { path: 'src/services/repositories/scoreRepository.ts', name: 'ScoreRepository' }
    ];

    repositoryFiles.forEach(({ path: filePath, name }) => {
      const result = this.checkPath(filePath, name);
      this.results.push(result);
      
      if (result.exists) {
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name} - 파일 없음`);
      }
    });

    // 5. 필수 설정 파일 체크
    console.log('\n5. 필수 설정 파일 체크');
    console.log('-'.repeat(70));

    const configFiles = [
      { path: 'src/config/database.ts', name: 'database.ts' },
      { path: '.env', name: '.env' },
      { path: 'package.json', name: 'package.json' },
      { path: 'tsconfig.json', name: 'tsconfig.json' }
    ];

    configFiles.forEach(({ path: filePath, name }) => {
      const result = this.checkPath(filePath, name);
      this.results.push(result);
      
      if (result.exists) {
        console.log(`✅ ${name}`);
      } else {
        console.log(`❌ ${name} - 파일 없음`);
      }
    });

    // 6. Pipeline 파일 체크
    console.log('\n6. Pipeline 파일 체크');
    console.log('-'.repeat(70));

    const pipelineFile = this.checkPath('src/pipelines/artificialAnalysisPipeline.ts', 'artificialAnalysisPipeline.ts');
    this.results.push(pipelineFile);

    if (pipelineFile.exists) {
      console.log(`✅ artificialAnalysisPipeline.ts`);
    } else {
      console.log(`❌ artificialAnalysisPipeline.ts - 파일 없음`);
      console.log(`   ℹ️  v2에서 복사 필요: src/pipelines/artificialAnalysisPipeline.ts`);
    }
  }

  async checkImports(): Promise<void> {
    console.log('\n7. Import 경로 체크');
    console.log('-'.repeat(70));

    const filesToCheck = [
      'src/services/collectors/artificialAnalysis.collector.ts',
      'src/services/processors/modelDataProcessor.ts',
      'src/services/processors/scoreCalculator.ts',
      'src/services/repositories/modelRepository.ts',
      'src/services/repositories/scoreRepository.ts'
    ];

    for (const filePath of filesToCheck) {
      const fullPath = path.join(this.basePath, filePath);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`⏭️  ${path.basename(filePath)} - 파일 없음, 건너뜀`);
        continue;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const fileName = path.basename(filePath);
        
        // database.ts import 체크
        if (content.includes('from \'../config/database\'') || 
            content.includes('from "../config/database"')) {
          console.log(`✅ ${fileName} - database.ts import 경로 확인`);
        } else if (content.includes('config/database')) {
          console.log(`⚠️  ${fileName} - database.ts import 경로 확인 필요`);
        }

        // dotenv import 체크
        if (content.includes('dotenv')) {
          console.log(`✅ ${fileName} - dotenv 사용`);
        }

      } catch (error) {
        console.log(`❌ ${path.basename(filePath)} - 읽기 실패`);
      }
    }
  }

  async checkDependencies(): Promise<void> {
    console.log('\n8. 의존성 패키지 체크');
    console.log('-'.repeat(70));

    const packageJsonPath = path.join(this.basePath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log('❌ package.json을 찾을 수 없습니다');
      return;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const requiredPackages = [
        { name: 'mysql2', purpose: 'MySQL 연결' },
        { name: '@elastic/elasticsearch', purpose: 'Elasticsearch (v2용, v3에서 제거 예정)' },
        { name: 'redis', purpose: 'Redis 캐싱' },
        { name: 'axios', purpose: 'HTTP 요청' },
        { name: 'dotenv', purpose: '환경변수' },
        { name: 'typescript', purpose: 'TypeScript', dev: true },
        { name: 'ts-node', purpose: 'TypeScript 실행', dev: true }
      ];

      requiredPackages.forEach(({ name, purpose, dev }) => {
        if (dependencies[name]) {
          console.log(`✅ ${name} (${purpose}) - v${dependencies[name]}`);
        } else {
          console.log(`❌ ${name} (${purpose}) - 설치 필요`);
        }
      });

    } catch (error) {
      console.log('❌ package.json 파싱 실패');
    }
  }

  async checkEnvFile(): Promise<void> {
    console.log('\n9. 환경변수 파일 체크');
    console.log('-'.repeat(70));

    const envPath = path.join(this.basePath, '.env');
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env 파일이 없습니다');
      console.log('   ℹ️  .env.example을 복사하여 .env 생성 필요');
      return;
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      
      const requiredVars = [
        { key: 'MYSQL_HOST', purpose: 'MySQL 호스트' },
        { key: 'MYSQL_PORT', purpose: 'MySQL 포트 (3307)' },
        { key: 'MYSQL_DATABASE', purpose: 'MySQL 데이터베이스명' },
        { key: 'MYSQL_USER', purpose: 'MySQL 사용자' },
        { key: 'MYSQL_PASSWORD', purpose: 'MySQL 비밀번호' },
        { key: 'ARTIFICIAL_ANALYSIS_API_KEY', purpose: 'Artificial Analysis API 키' }
      ];

      requiredVars.forEach(({ key, purpose }) => {
        const regex = new RegExp(`^${key}=.+`, 'm');
        if (regex.test(envContent)) {
          console.log(`✅ ${key} (${purpose})`);
        } else {
          console.log(`❌ ${key} (${purpose}) - 설정 필요`);
        }
      });

    } catch (error) {
      console.log('❌ .env 파일 읽기 실패');
    }
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(70));
    console.log('체크 결과 요약');
    console.log('='.repeat(70));

    const totalChecks = this.results.length;
    const passedChecks = this.results.filter(r => r.exists).length;
    const failedChecks = totalChecks - passedChecks;

    console.log(`총 체크 항목: ${totalChecks}개`);
    console.log(`✅ 통과: ${passedChecks}개`);
    console.log(`❌ 실패: ${failedChecks}개`);

    if (failedChecks === 0) {
      console.log('\n🎉 모든 체크 통과! 파이프라인 실행 가능합니다.');
    } else {
      console.log('\n⚠️  일부 파일/폴더가 누락되었습니다.');
      console.log('   누락된 항목을 확인하고 v2에서 복사해주세요.');
    }

    console.log('='.repeat(70) + '\n');
  }

  printNextSteps(): void {
    console.log('다음 단계:');
    console.log('-'.repeat(70));
    console.log('1. 누락된 파일이 있다면 v2 프로젝트에서 복사');
    console.log('2. .env 파일 설정 확인 (특히 API 키)');
    console.log('3. Docker 컨테이너 실행: docker-compose up -d');
    console.log('4. 의존성 설치: npm install');
    console.log('5. 파이프라인 테스트 실행: npm run pipeline:aa');
    console.log('\n파이프라인 실행 명령어:');
    console.log('  - npm run pipeline:aa              (전체 파이프라인)');
    console.log('  - npm run collect:aa               (데이터 수집만)');
    console.log('  - npm run db:check                 (DB 상태 확인)');
    console.log('='.repeat(70) + '\n');
  }

  async run(): Promise<void> {
    await this.checkStructure();
    await this.checkImports();
    await this.checkDependencies();
    await this.checkEnvFile();
    this.printSummary();
    this.printNextSteps();
  }
}

if (require.main === module) {
  const checker = new PipelineChecker();
  checker.run()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('체크 중 오류 발생:', error);
      process.exit(1);
    });
}

export default PipelineChecker;
