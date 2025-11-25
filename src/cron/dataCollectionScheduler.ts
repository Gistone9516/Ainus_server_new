import cron from "node-cron";
import { ArtificialAnalysisCollector } from "../services/collectors/artificialAnalysis.collector.v2";
import { NaverCollector } from "../services/collectors/naver.collector.v2";
import { ModelDataProcessor } from "../services/processors/modelDataProcessor";
import { ModelRepository } from "../services/repositories/modelRepository";
import { executeModify, executeQuery } from "../database/mysql";

export interface DataCollectionConfig {
  enableNaverCollection: boolean;
  enableAACollection: boolean;
  naverSchedule: string;
  aaSchedule: string;
  naverKeywords: string[];
}

export class DataCollectionScheduler {
  private config: DataCollectionConfig;
  private naverTask: cron.ScheduledTask | null = null;
  private aaTask: cron.ScheduledTask | null = null;

  constructor(config?: Partial<DataCollectionConfig>) {
    this.config = {
      enableNaverCollection: process.env.ENABLE_NAVER_COLLECTION !== "false",
      enableAACollection: process.env.ENABLE_AA_COLLECTION !== "false",
      naverSchedule: process.env.NAVER_SCHEDULE || "0 * * * *",
      aaSchedule: process.env.AA_SCHEDULE || "0 1 * * *",
      naverKeywords: (
        process.env.NAVER_KEYWORDS || "AI,인공지능,ChatGPT,Claude"
      ).split(","),
      ...config,
    };
  }

  start(): void {
    console.log("[Data Collection Scheduler] 스케줄러 시작");
    console.log("=".repeat(60));

    if (this.config.enableNaverCollection) {
      this.startNaverSchedule();
    } else {
      console.log("[Naver] 수집 비활성화");
    }

    if (this.config.enableAACollection) {
      this.startAASchedule();
    } else {
      console.log("[AA] 수집 비활성화");
    }

    console.log("=".repeat(60));
  }

  private startNaverSchedule(): void {
    console.log(`[Naver] 스케줄 등록: ${this.config.naverSchedule} (매시간)`);
    console.log(`[Naver] 키워드: ${this.config.naverKeywords.join(", ")}`);

    this.naverTask = cron.schedule(
      this.config.naverSchedule,
      async () => {
        await this.executeNaverCollection();
      },
      {
        scheduled: true,
        timezone: "Asia/Seoul",
      }
    );
  }

  private startAASchedule(): void {
    console.log(`[AA] 스케줄 등록: ${this.config.aaSchedule} (매일 새벽 1시)`);

    this.aaTask = cron.schedule(
      this.config.aaSchedule,
      async () => {
        await this.executeAACollection();
      },
      {
        scheduled: true,
        timezone: "Asia/Seoul",
      }
    );
  }

  private async executeNaverCollection(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("[Naver Collection] 시작:", new Date().toISOString());
    console.log("=".repeat(60));

    const startTime = Date.now();
    let totalCollected = 0;
    let totalSavedToDB = 0;
    let totalDuplicates = 0;
    let errorCount = 0;

    // collected_at: 1시간 단위로 정규화 (분, 초, 밀리초 제거)
    const collectedAt = new Date();
    collectedAt.setMinutes(0, 0, 0);
    const collectedAtStr = collectedAt
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    try {
      const collector = new NaverCollector();

      // 해당 시간대의 마지막 인덱스 조회
      const lastIndex = await this.getLastArticleIndex(collectedAtStr);
      let currentStartIndex = lastIndex + 1;
      console.log(
        `[DB] 시작 인덱스: ${currentStartIndex} (마지막 저장: ${lastIndex})\n`
      );

      for (const keyword of this.config.naverKeywords) {
        try {
          console.log(`[Naver] 키워드 수집: "${keyword}"`);

          const result = await collector.collectAINews({
            query: keyword,
            display: 100,
            sort: "date",
          });

          totalCollected += result.items.length;
          console.log(
            `[Naver Collector] 뉴스 수집 완료: ${result.items.length}개`
          );

          // DB 저장 (중복 체크 포함)
          if (result.items.length > 0) {
            const { saved, duplicates } = await this.saveNewsToDatabase(
              result.items,
              collectedAtStr,
              currentStartIndex
            );
            currentStartIndex += saved; // 저장된 개수만큼 인덱스 증가
            totalSavedToDB += saved;
            totalDuplicates += duplicates;
            console.log(
              `[DB] 저장 완료: ${saved}개 (중복 제외: ${duplicates}개)`
            );
          }

          await this.delay(100);
        } catch (error) {
          errorCount++;
          console.error(`[Naver] 키워드 "${keyword}" 수집 실패:`, error);
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log("\n[Naver Collection] 완료");
      console.log(`  전체 수집: ${totalCollected}개`);
      console.log(`  DB 저장: ${totalSavedToDB}개`);
      console.log(`  중복 제외: ${totalDuplicates}개`);
      console.log(`  오류: ${errorCount}개`);
      console.log(`  소요 시간: ${duration}초`);
    } catch (error) {
      console.error("[Naver Collection] 실패:", error);
    }

    console.log("=".repeat(60) + "\n");
  }

  /**
   * 24시간 이내 같은 link 존재 여부 확인
   */
  private async isDuplicateNews(link: string): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM news_articles 
        WHERE link = ? 
          AND collected_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;

      const result = await executeQuery<{ count: number }>(query, [link]);
      return result[0].count > 0;
    } catch (error) {
      console.error("[중복 체크 오류]", error);
      return false; // 오류 발생 시 중복 아님으로 처리
    }
  }

  /**
   * 특정 시간대의 마지막 article_index 조회
   */
  private async getLastArticleIndex(collectedAt: string): Promise<number> {
    try {
      const query = `
        SELECT COALESCE(MAX(article_index), -1) as last_index
        FROM news_articles
        WHERE collected_at = ?
      `;

      const result = await executeQuery<{ last_index: number }>(query, [
        collectedAt,
      ]);
      return result[0].last_index;
    } catch (error) {
      console.error("[인덱스 조회 오류]", error);
      return -1; // 오류 발생 시 0부터 시작
    }
  }

  /**
   * 뉴스 데이터를 news_articles 테이블에 저장 (중복 체크 포함)
   */
  private async saveNewsToDatabase(
    items: any[],
    collectedAt: string,
    startIndex: number
  ): Promise<{ saved: number; duplicates: number }> {
    let savedCount = 0;
    let duplicateCount = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 중복 체크 (24시간 이내)
        if (await this.isDuplicateNews(item.link)) {
          duplicateCount++;
          continue; // 중복이면 건너뛰기
        }

        const articleIndex = startIndex + savedCount; // 저장된 개수 기준으로 인덱스 할당

        // HTML 태그 제거
        const cleanTitle = this.stripHtmlTags(item.title);
        const cleanDescription = item.description
          ? this.stripHtmlTags(item.description)
          : null;

        // pub_date 파싱 (RFC 2822 형식)
        const pubDate = this.parseNaverDate(item.pubDate);

        const query = `
          INSERT INTO news_articles 
            (collected_at, article_index, source, title, link, description, pub_date)
          VALUES 
            (?, ?, ?, ?, ?, ?, ?)
        `;

        await executeModify(query, [
          collectedAt,
          articleIndex,
          "naver",
          cleanTitle,
          item.link,
          cleanDescription,
          pubDate,
        ]);

        savedCount++;
      }
    } catch (error) {
      console.error("[DB] 저장 중 오류:", error);
      throw error;
    }

    return { saved: savedCount, duplicates: duplicateCount };
  }

  /**
   * HTML 태그 제거
   */
  private stripHtmlTags(text: string): string {
    return text
      .replace(/<\/?b>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Naver 날짜 파싱 (RFC 2822 -> MySQL DATETIME)
   * 예: "Wed, 26 Nov 2025 01:18:00 +0900" -> "2025-11-26 01:18:00"
   */
  private parseNaverDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().slice(0, 19).replace("T", " ");
    } catch (error) {
      console.error("[날짜 파싱 오류]", dateStr, error);
      return new Date().toISOString().slice(0, 19).replace("T", " ");
    }
  }

  private async executeAACollection(): Promise<void> {
    console.log("\n" + "=".repeat(60));
    console.log("[AA Collection] 시작:", new Date().toISOString());
    console.log("=".repeat(60));

    const startTime = Date.now();

    try {
      console.log("\n[1/3] API 호출 시작...");
      const collector = new ArtificialAnalysisCollector();
      const apiResponse = await collector.collectModels();

      console.log(`[1/3] 수집 완료: ${apiResponse.data?.length || 0}개 모델`);

      console.log("\n[2/3] 데이터 정제 및 DB 저장 시작...");
      const repository = new ModelRepository();
      await repository.connect();

      const processor = new ModelDataProcessor(repository);
      await processor.processAndSave(apiResponse);

      console.log("[2/3] DB 저장 완료");

      console.log("\n[3/3] 저장 결과 확인...");
      const stats = await processor.getStats();
      console.log("  제작사:", stats.creators, "개");
      console.log("  모델:", stats.models, "개");
      console.log("  벤치마크:", stats.evaluations, "개");

      await repository.disconnect();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log("\n[AA Collection] 완료");
      console.log(`  소요 시간: ${duration}초`);
    } catch (error) {
      console.error("[AA Collection] 실패:", error);
    }

    console.log("=".repeat(60) + "\n");
  }

  async runNaverCollectionNow(): Promise<void> {
    console.log("[Data Collection Scheduler] Naver 수동 실행");
    await this.executeNaverCollection();
  }

  async runAACollectionNow(): Promise<void> {
    console.log("[Data Collection Scheduler] AA 수동 실행");
    await this.executeAACollection();
  }

  stop(): void {
    console.log("[Data Collection Scheduler] 스케줄러 중지");

    if (this.naverTask) {
      this.naverTask.stop();
      console.log("  Naver 스케줄 중지");
    }

    if (this.aaTask) {
      this.aaTask.stop();
      console.log("  AA 스케줄 중지");
    }
  }

  getScheduleInfo() {
    return {
      naver: {
        enabled: this.config.enableNaverCollection,
        schedule: this.config.naverSchedule,
        keywords: this.config.naverKeywords,
        isRunning: this.naverTask !== null,
      },
      aa: {
        enabled: this.config.enableAACollection,
        schedule: this.config.aaSchedule,
        isRunning: this.aaTask !== null,
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

let schedulerInstance: DataCollectionScheduler | null = null;

export function initializeDataCollectionScheduler(
  config?: Partial<DataCollectionConfig>
): DataCollectionScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new DataCollectionScheduler(config);
    schedulerInstance.start();
  }
  return schedulerInstance;
}

export function getDataCollectionScheduler(): DataCollectionScheduler | null {
  return schedulerInstance;
}

export function stopDataCollectionScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}
