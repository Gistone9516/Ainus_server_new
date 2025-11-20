import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export class TrendsCollector {
  private pythonScript: string;

  constructor() {
    this.pythonScript = path.join(process.cwd(), 'scripts', 'collect_trends.py');
  }

  /**
   * Google Trends 데이터 수집
   */
  async collectTrends(keywords: string[]): Promise<any> {
    try {
      console.log(` Google Trends: ${keywords.length}개 키워드 수집 시작...`);
      
      // Python 스크립트 실행
      const keywordsParam = keywords.join(',');
      const command = `python ${this.pythonScript} "${keywordsParam}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr) {
        console.warn(' Python 경고:', stderr);
      }
      
      console.log(' Trends 수집 완료');
      console.log(stdout);
      
      // 결과 파일 읽기
      const resultPath = path.join(process.cwd(), 'data', 'raw', 'trends_latest.json');
      if (fs.existsSync(resultPath)) {
        const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
        return data;
      }
      
      return null;
    } catch (error) {
      console.error(' Google Trends 수집 오류:', error);
      throw error;
    }
  }

  /**
   * Python 환경 확인
   */
  async checkPythonEnvironment(): Promise<boolean> {
    try {
      console.log(' Python 환경 확인...');
      
      const { stdout } = await execAsync('python --version');
      console.log(' Python 버전:', stdout.trim());
      
      // pytrends 설치 확인
      try {
        await execAsync('python -c "import pytrends"');
        console.log(' pytrends 패키지 설치됨');
        return true;
      } catch {
        console.warn(' pytrends 패키지 미설치');
        console.log('설치 명령어: pip install pytrends');
        return false;
      }
    } catch (error) {
      console.error(' Python 환경 확인 실패');
      console.log('Python 3.x를 설치해주세요: https://www.python.org/downloads/');
      return false;
    }
  }
}