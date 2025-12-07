import * as fs from "fs";
import * as path from "path";

export interface RawDataConfig {
  enabled: boolean;
  retentionDays: number;
  baseDir: string;
}

export class RawDataManager {
  private config: RawDataConfig;

  constructor(config?: Partial<RawDataConfig>) {
    this.config = {
      enabled: process.env.SAVE_RAW_DATA === "true",
      retentionDays: parseInt(process.env.RAW_RETENTION_DAYS || "30"),
      baseDir: path.join(process.cwd(), "data", "raw"),
      ...config,
    };

    this.ensureDirectoryExists();
  }

  /**
   * 디렉토리 존재 확인 및 생성
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.config.baseDir)) {
      fs.mkdirSync(this.config.baseDir, { recursive: true });
    }
  }

  /**
   * 원본 데이터 저장
   */
  saveRawData(filename: string, data: any): string | null {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filepath = path.join(
        this.config.baseDir,
        `${filename}_${timestamp}.json`
      );

      fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
      console.log(`[RawDataManager] 원본 데이터 저장: ${filepath}`);

      return filepath;
    } catch (error) {
      console.error("[RawDataManager] 원본 데이터 저장 실패:", error);
      return null;
    }
  }

  /**
   * 오래된 파일 자동 삭제
   */
  cleanupOldFiles(): {
    deletedCount: number;
    errorCount: number;
    totalSize: number;
  } {
    if (!this.config.enabled) {
      console.log("[RawDataManager] 원본 데이터 저장 비활성화 상태");
      return { deletedCount: 0, errorCount: 0, totalSize: 0 };
    }

    console.log(
      `[RawDataManager] 원본 데이터 정리 시작 (${this.config.retentionDays}일 이상)`
    );

    const now = Date.now();
    const maxAge = this.config.retentionDays * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    let errorCount = 0;
    let totalSize = 0;

    try {
      const files = fs.readdirSync(this.config.baseDir);

      for (const file of files) {
        // JSON 파일만 처리
        if (!file.endsWith(".json")) continue;

        const filepath = path.join(this.config.baseDir, file);

        try {
          const stats = fs.statSync(filepath);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            const fileSize = stats.size;
            fs.unlinkSync(filepath);
            deletedCount++;
            totalSize += fileSize;

            const ageInDays = (age / (1000 * 60 * 60 * 24)).toFixed(1);
            console.log(
              `[RawDataManager] 삭제: ${file} (${ageInDays}일 경과, ${this.formatBytes(fileSize)})`
            );
          }
        } catch (error) {
          errorCount++;
          console.error(`[RawDataManager] 파일 처리 오류: ${file}`, error);
        }
      }

      console.log(
        `[RawDataManager] 정리 완료: ${deletedCount}개 삭제, ${this.formatBytes(totalSize)} 확보`
      );

      if (errorCount > 0) {
        console.warn(`[RawDataManager] 오류 발생: ${errorCount}개 파일`);
      }
    } catch (error) {
      console.error("[RawDataManager] 디렉토리 읽기 오류:", error);
    }

    return { deletedCount, errorCount, totalSize };
  }

  /**
   * 현재 저장된 파일 통계
   */
  getStatistics(): {
    totalFiles: number;
    totalSize: number;
    oldestFile: string | null;
    newestFile: string | null;
  } {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      oldestFile: null as string | null,
      newestFile: null as string | null,
    };

    if (!fs.existsSync(this.config.baseDir)) {
      return stats;
    }

    try {
      const files = fs
        .readdirSync(this.config.baseDir)
        .filter((f) => f.endsWith(".json"));

      stats.totalFiles = files.length;

      if (files.length === 0) {
        return stats;
      }

      let oldestTime = Infinity;
      let newestTime = 0;

      for (const file of files) {
        const filepath = path.join(this.config.baseDir, file);
        const fileStats = fs.statSync(filepath);

        stats.totalSize += fileStats.size;

        if (fileStats.mtime.getTime() < oldestTime) {
          oldestTime = fileStats.mtime.getTime();
          stats.oldestFile = file;
        }

        if (fileStats.mtime.getTime() > newestTime) {
          newestTime = fileStats.mtime.getTime();
          stats.newestFile = file;
        }
      }
    } catch (error) {
      console.error("[RawDataManager] 통계 수집 오류:", error);
    }

    return stats;
  }

  /**
   * 바이트를 읽기 쉬운 형식으로 변환
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * 특정 파일 삭제
   */
  deleteFile(filename: string): boolean {
    try {
      const filepath = path.join(this.config.baseDir, filename);

      if (!fs.existsSync(filepath)) {
        console.warn(`[RawDataManager] 파일 없음: ${filename}`);
        return false;
      }

      fs.unlinkSync(filepath);
      console.log(`[RawDataManager] 파일 삭제: ${filename}`);
      return true;
    } catch (error) {
      console.error(`[RawDataManager] 파일 삭제 실패: ${filename}`, error);
      return false;
    }
  }

  /**
   * 모든 파일 삭제 (주의!)
   */
  deleteAllFiles(): number {
    if (!fs.existsSync(this.config.baseDir)) {
      return 0;
    }

    let deletedCount = 0;

    try {
      const files = fs
        .readdirSync(this.config.baseDir)
        .filter((f) => f.endsWith(".json"));

      for (const file of files) {
        const filepath = path.join(this.config.baseDir, file);
        fs.unlinkSync(filepath);
        deletedCount++;
      }

      console.log(`[RawDataManager] 전체 삭제 완료: ${deletedCount}개 파일`);
    } catch (error) {
      console.error("[RawDataManager] 전체 삭제 오류:", error);
    }

    return deletedCount;
  }

  /**
   * 설정 정보 반환
   */
  getConfig(): RawDataConfig {
    return { ...this.config };
  }
}
