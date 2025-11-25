import axios from "axios";
import dotenv from "dotenv";
import { RawDataManager } from "../../utils/rawDataManager";

dotenv.config();

export interface ArtificialAnalysisModel {
  id: string;
  name: string;
  slug: string;
  release_date: string;
  model_creator: {
    id: string;
    name: string;
    slug: string;
  };
  evaluations: {
    [key: string]: number | null;
  };
  pricing: {
    price_1m_blended_3_to_1?: number;
    price_1m_input_tokens?: number;
    price_1m_output_tokens?: number;
  };
  median_output_tokens_per_second?: number;
  median_time_to_first_token_seconds?: number;
  median_time_to_first_answer_token?: number;
}

export interface ArtificialAnalysisResponse {
  data: ArtificialAnalysisModel[];
  [key: string]: any;
}

export class ArtificialAnalysisCollector {
  private apiKey: string;
  private baseUrl: string = "https://artificialanalysis.ai/api/v2/data/llms";
  private rawDataManager: RawDataManager;
  private maxRetries: number = 3;
  private retryDelay: number = 2000;

  constructor() {
    this.apiKey = process.env.ARTIFICIAL_ANALYSIS_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("ARTIFICIAL_ANALYSIS_API_KEY가 설정되지 않았습니다");
    }

    this.rawDataManager = new RawDataManager();
  }

  /**
   * 모델 목록 수집 (재시도 로직 포함)
   */
  async collectModels(): Promise<ArtificialAnalysisResponse> {
    console.log("[AA Collector] 모델 데이터 수집 시작...");

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}/models`, {
          headers: {
            "x-api-key": this.apiKey,
          },
          timeout: 30000,
        });

        const data = response.data;

        // 원본 데이터 저장 (조건부)
        this.rawDataManager.saveRawData("artificial_analysis_models", data);

        console.log("[AA Collector] 모델 데이터 수집 완료");

        if (data.data && Array.isArray(data.data)) {
          console.log(`   총 ${data.data.length}개 모델`);

          if (data.data.length > 0) {
            const sampleKeys = Object.keys(data.data[0]).slice(0, 10);
            console.log("   데이터 필드:", sampleKeys.join(", "));
          }
        }

        return data;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries - 1;

        console.error(
          `[AA Collector] API 오류 (시도 ${attempt + 1}/${this.maxRetries}):`,
          error
        );

        if (axios.isAxiosError(error)) {
          console.error("  상태 코드:", error.response?.status);
          console.error("  응답:", error.response?.data);
        }

        if (!isLastAttempt) {
          const delay = this.retryDelay * (attempt + 1);
          console.log(`[AA Collector] ${delay}ms 후 재시도...`);
          await this.delay(delay);
        } else {
          throw error;
        }
      }
    }

    throw new Error("모든 재시도 실패");
  }

  /**
   * 벤치마크 데이터 수집
   */
  async collectBenchmarks(): Promise<any> {
    console.log("[AA Collector] 벤치마크 데이터 수집 시작...");

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}/benchmarks`, {
          headers: {
            "x-api-key": this.apiKey,
          },
          timeout: 30000,
        });

        const data = response.data;

        this.rawDataManager.saveRawData("artificial_analysis_benchmarks", data);

        console.log("[AA Collector] 벤치마크 데이터 수집 완료");

        return data;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log("[AA Collector] 벤치마크 엔드포인트 없음");
          return null;
        }

        const isLastAttempt = attempt === this.maxRetries - 1;

        if (!isLastAttempt) {
          const delay = this.retryDelay * (attempt + 1);
          console.log(`[AA Collector] ${delay}ms 후 재시도...`);
          await this.delay(delay);
        } else {
          console.error("[AA Collector] 벤치마크 수집 오류:", error);
          throw error;
        }
      }
    }

    return null;
  }

  /**
   * API 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log("[AA Collector] API 연결 테스트...");

      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          "x-api-key": this.apiKey,
        },
        timeout: 10000,
        params: {
          limit: 1,
        },
      });

      console.log("[AA Collector] API 연결 성공:", response.status);
      return true;
    } catch (error) {
      console.error("[AA Collector] API 연결 실패");
      if (axios.isAxiosError(error)) {
        console.error("  상태:", error.response?.status);
        console.error("  메시지:", error.message);
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

      console.log("\n[AA Collector] 데이터 구조 분석:");
      console.log("=".repeat(60));

      if (data.data && data.data.length > 0) {
        const sample = data.data[0];

        console.log("\n모델 데이터 필드:");
        Object.keys(sample).forEach((key) => {
          const value = (sample as any)[key];
          const type = Array.isArray(value)
            ? `Array(${value.length})`
            : typeof value;
          console.log(`  - ${key}: ${type}`);
        });

        console.log("\n샘플 데이터 (첫 번째 모델):");
        console.log(JSON.stringify(sample, null, 2).substring(0, 1000));
        console.log("...");
      }

      console.log("=".repeat(60));
    } catch (error) {
      console.error("[AA Collector] 데이터 구조 분석 실패:", error);
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
    console.log("[AA Collector] 원본 데이터 정리 시작");
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
