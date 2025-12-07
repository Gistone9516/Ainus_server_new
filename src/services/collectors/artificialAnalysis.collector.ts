import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface ArtificialAnalysisModel {
  [key: string]: any;
}

interface ArtificialAnalysisResponse {
  data: ArtificialAnalysisModel[];
  [key: string]: any;
}

export class ArtificialAnalysisCollector {
  private apiKey: string;
  private baseUrl: string = 'https://artificialanalysis.ai/api/v2/data/llms';

  constructor() {
    this.apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ARTIFICIAL_ANALYSIS_API_KEY가 설정되지 않았습니다');
    }
  }

  /**
   * 모델 목록 수집
   */
  async collectModels(): Promise<ArtificialAnalysisResponse> {
    try {
      console.log('🤖 Artificial Analysis: 모델 데이터 수집 시작...');
      
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'x-api-key': this.apiKey  // ← 수정됨!
        },
        timeout: 30000
      });

      const data = response.data;
      
      // 원본 데이터 저장
      this.saveRawData('artificial_analysis_models', data);
      
      console.log('✅ 모델 데이터 수집 완료');
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`   총 ${data.data.length}개 모델`);
        
        // 첫 번째 모델의 키 출력
        if (data.data.length > 0) {
          const sampleKeys = Object.keys(data.data[0]).slice(0, 10);
          console.log('   데이터 필드:', sampleKeys.join(', '));
        }
      }
      
      return data;
    } catch (error) {
      console.error('❌ Artificial Analysis API 오류:', error);
      if (axios.isAxiosError(error)) {
        console.error('  상태 코드:', error.response?.status);
        console.error('  응답:', error.response?.data);
      }
      throw error;
    }
  }

  /**
   * 벤치마크 데이터 수집 (있다면)
   */
  async collectBenchmarks(): Promise<any> {
    try {
      console.log('📊 Artificial Analysis: 벤치마크 데이터 수집 시작...');
      
      const response = await axios.get(`${this.baseUrl}/benchmarks`, {
        headers: {
          'x-api-key': this.apiKey
        },
        timeout: 30000
      });

      const data = response.data;
      
      // 원본 데이터 저장
      this.saveRawData('artificial_analysis_benchmarks', data);
      
      console.log('✅ 벤치마크 데이터 수집 완료');
      
      return data;
    } catch (error) {
      // 벤치마크 엔드포인트가 없을 수도 있음
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('⚠️ 벤치마크 엔드포인트 없음 (모델 데이터에 포함되어 있을 수 있음)');
        return null;
      }
      console.error('❌ 벤치마크 수집 오류:', error);
      throw error;
    }
  }

  /**
   * 원본 데이터 저장
   */
  private saveRawData(filename: string, data: any): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = path.join(
      process.cwd(), 
      'data', 
      'raw', 
      `${filename}_${timestamp}.json`
    );

    // 디렉토리 생성
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 데이터 저장
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 원본 데이터 저장: ${filepath}`);
  }

  /**
   * API 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Artificial Analysis API 연결 테스트...');
      
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'x-api-key': this.apiKey
        },
        timeout: 10000,
        // 데이터 양을 줄이기 위해 헤드 요청 시도
        params: {
          limit: 1
        }
      });

      console.log('✅ API 연결 성공:', response.status);
      return true;
    } catch (error) {
      console.error('❌ API 연결 실패');
      if (axios.isAxiosError(error)) {
        console.error('  상태:', error.response?.status);
        console.error('  메시지:', error.message);
      }
      return false;
    }
  }

  /**
   * 데이터 구조 분석
   */
  async analyzeDataStructure(): Promise<void> {
    try {
      const data = await this.collectModels();
      
      console.log('\n📊 데이터 구조 분석:');
      console.log('='.repeat(60));
      
      if (data.data && data.data.length > 0) {
        const sample = data.data[0];
        
        console.log('\n모델 데이터 필드:');
        Object.keys(sample).forEach(key => {
          const value = sample[key];
          const type = Array.isArray(value) 
            ? `Array(${value.length})` 
            : typeof value;
          console.log(`  - ${key}: ${type}`);
        });
        
        console.log('\n샘플 데이터 (첫 번째 모델):');
        console.log(JSON.stringify(sample, null, 2).substring(0, 1000));
        console.log('...');
      }
      
      console.log('='.repeat(60));
    } catch (error) {
      console.error('데이터 구조 분석 실패:', error);
    }
  }
}