import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../../config/environment';

const config = getConfig();

interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

export class NaverCollector {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string = 'https://openapi.naver.com/v1/search';

  constructor() {
    this.clientId = config.externalApis.naverNews.clientId;
    this.clientSecret = config.externalApis.naverNews.clientSecret;
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Naver API 키가 설정되지 않았습니다');
    }
  }

  /**
   * AI 관련 뉴스 수집
   */
  async collectAINews(options: {
    query?: string;
    display?: number;
    start?: number;
    sort?: 'sim' | 'date';
  } = {}): Promise<NaverSearchResponse> {
    try {
      const {
        query = 'AI 인공지능',
        display = 100,
        start = 1,
        sort = 'date'
      } = options;

      console.log(` Naver News API: "${query}" 검색 시작...`);
      
      const response = await axios.get(`${this.baseUrl}/news.json`, {
        params: {
          query,
          display,
          start,
          sort
        },
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret
        },
        timeout: config.security.apiTimeout
      });

      const data = response.data;
      
      // 원본 데이터 저장
      this.saveRawData(`naver_news_${query.replace(/\s+/g, '_')}`, data);
      
      console.log(' 뉴스 수집 완료:', data.items.length, '개');
      console.log('  전체:', data.total, '개');
      console.log('  수집 시작:', data.start);
      
      return data;
    } catch (error) {
      console.error(' Naver News API 오류:', error);
      if (axios.isAxiosError(error)) {
        console.error('  상태:', error.response?.status);
        console.error('  응답:', error.response?.data);
      }
      throw error;
    }
  }

  /**
   * 여러 키워드로 뉴스 수집
   */
  async collectMultipleKeywords(keywords: string[]): Promise<Map<string, NaverSearchResponse>> {
    console.log(` ${keywords.length}개 키워드로 뉴스 수집 시작...`);
    
    const results = new Map<string, NaverSearchResponse>();
    
    for (const keyword of keywords) {
      try {
        // API 호출 제한 고려 (초당 10회)
        await this.delay(100);
        
        const data = await this.collectAINews({ query: keyword, display: 100 });
        results.set(keyword, data);
      } catch (error) {
        console.error(` "${keyword}" 수집 실패:`, error);
      }
    }
    
    console.log(` 총 ${results.size}개 키워드 수집 완료`);
    return results;
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

    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(` 원본 데이터 저장: ${filepath}`);
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(' Naver API 연결 테스트...');
      
      const response = await axios.get(`${this.baseUrl}/news.json`, {
        params: {
          query: 'test',
          display: 1
        },
        headers: {
          'X-Naver-Client-Id': this.clientId,
          'X-Naver-Client-Secret': this.clientSecret
        },
        timeout: 10000
      });

      console.log(' Naver API 연결 성공:', response.status);
      return true;
    } catch (error) {
      console.error(' Naver API 연결 실패');
      return false;
    }
  }
}
