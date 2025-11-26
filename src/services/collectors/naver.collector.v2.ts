import axios from "axios";
import { getConfig } from "../../config/environment";
import { RawDataManager } from "../../utils/rawDataManager";

const config = getConfig();

export interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}

export class NaverCollector {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string = "https://openapi.naver.com/v1/search";
  private rawDataManager: RawDataManager;
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  constructor() {
    this.clientId = config.externalApis.naverNews.clientId;
    this.clientSecret = config.externalApis.naverNews.clientSecret;

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Naver API 키가 설정되지 않았습니다");
    }

    this.rawDataManager = new RawDataManager();
  }

  /**
   * AI 관련 뉴스 수집 (재시도 로직 포함)
   */
  async collectAINews(
    options: {
      query?: string;
      display?: number;
      start?: number;
      sort?: "sim" | "date";
    } = {}
  ): Promise<NaverSearchResponse> {
    const {
      query = "AI 인공지능",
      display = 100,
      start = 1,
      sort = "date",
    } = options;

    console.log(`[Naver Collector] "${query}" 검색 시작...`);

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}/news.json`, {
          params: {
            query,
            display,
            start,
            sort,
          },
          headers: {
            "X-Naver-Client-Id": this.clientId,
            "X-Naver-Client-Secret": this.clientSecret,
          },
          timeout: config.security.apiTimeout,
        });

        const data = response.data;

        // 원본 데이터 저장 (조건부)
        this.rawDataManager.saveRawData(
          `naver_news_${query.replace(/\s+/g, "_")}`,
          data
        );

        console.log(
          "[Naver Collector] 뉴스 수집 완료:",
          data.items.length,
          "개"
        );
        console.log("  전체:", data.total, "개");
        console.log("  수집 시작:", data.start);

        return data;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries - 1;

        console.error(
          `[Naver Collector] API 오류 (시도 ${attempt + 1}/${this.maxRetries}):`,
          error
        );

        if (axios.isAxiosError(error)) {
          console.error("  상태:", error.response?.status);
          console.error("  응답:", error.response?.data);
        }

        if (!isLastAttempt) {
          const delay = this.retryDelay * (attempt + 1);
          console.log(`[Naver Collector] ${delay}ms 후 재시도...`);
          await this.delay(delay);
        } else {
          throw error;
        }
      }
    }

    throw new Error("모든 재시도 실패");
  }

  /**
   * 여러 키워드로 뉴스 수집 (배치)
   */
  async collectMultipleKeywords(
    keywords: string[]
  ): Promise<Map<string, NaverSearchResponse>> {
    console.log(
      `[Naver Collector] ${keywords.length}개 키워드 배치 수집 시작...`
    );

    const results = new Map<string, NaverSearchResponse>();
    let successCount = 0;
    let errorCount = 0;

    for (const keyword of keywords) {
      try {
        // API 호출 제한 고려 (초당 10회)
        await this.delay(100);

        const data = await this.collectAINews({ query: keyword, display: 100 });
        results.set(keyword, data);
        successCount++;

        if (successCount % 10 === 0) {
          console.log(
            `[Naver Collector] 진행: ${successCount}/${keywords.length}`
          );
        }
      } catch (error) {
        errorCount++;
        console.error(`[Naver Collector] "${keyword}" 수집 실패:`, error);
      }
    }

    console.log(`[Naver Collector] 배치 수집 완료`);
    console.log(`  성공: ${successCount}개`);
    console.log(`  실패: ${errorCount}개`);

    return results;
  }

  /**
   * API 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log("[Naver Collector] API 연결 테스트...");

      const response = await axios.get(`${this.baseUrl}/news.json`, {
        params: {
          query: "test",
          display: 1,
        },
        headers: {
          "X-Naver-Client-Id": this.clientId,
          "X-Naver-Client-Secret": this.clientSecret,
        },
        timeout: 10000, // 테스트는 짧게 유지
      });

      console.log("[Naver Collector] API 연결 성공:", response.status);
      return true;
    } catch (error) {
      console.error("[Naver Collector] API 연결 실패");
      return false;
    }
  }

  /**
   * 원본 데이터 정리
   */
  cleanupRawData(): {
    deletedCount: number;
    errorCount: number;
    totalSize: number;
  } {
    console.log("[Naver Collector] 원본 데이터 정리 시작");
    return this.rawDataManager.cleanupOldFiles();
  }

  /**
   * 원본 데이터 통계
   */
  getRawDataStatistics() {
    return this.rawDataManager.getStatistics();
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
