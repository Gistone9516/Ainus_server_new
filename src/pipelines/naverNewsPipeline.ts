import { NaverCollector } from '../services/collectors/naver.collector';
import { NewsRepository, NewsArticle } from '../services/repositories/newsRepository';

export class NaverNewsPipeline {
  private collector: NaverCollector;
  private newsRepo: NewsRepository;

  constructor() {
    this.collector = new NaverCollector();
    this.newsRepo = new NewsRepository();
  }

  private toMySQLDateTime(date: Date = new Date()): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  private parseNaverDate(naverDateStr: string): string {
    // Naver pubDate 형식: "Mon, 18 Nov 2024 10:30:00 +0900"
    const date = new Date(naverDateStr);
    return this.toMySQLDateTime(date);
  }

  private stripHtmlTags(html: string): string {
    // HTML 태그 제거
    return html.replace(/<\/?b>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }

  async run(): Promise<void> {
    const startTime = Date.now();
    const collectedAt = this.toMySQLDateTime();

    console.log('\n' + '='.repeat(70));
    console.log('NAVER NEWS COLLECTION PIPELINE START');
    console.log('='.repeat(70));
    console.log(`시작 시간: ${new Date().toLocaleString('ko-KR')}`);
    console.log(`수집 시간: ${collectedAt}\n`);

    try {
      console.log('Step 1: Naver News API 호출');
      console.log('-'.repeat(70));
      const apiResponse = await this.collector.collectAINews({
        query: 'AI',
        display: 100,
        sort: 'date'
      });
      console.log(`API 호출 완료: ${apiResponse.items.length}개 기사 수집\n`);

      console.log('Step 2: 데이터베이스 연결');
      console.log('-'.repeat(70));
      await this.newsRepo.connect();
      console.log('MySQL 연결 완료\n');

      console.log('Step 3: 데이터 변환 및 저장');
      console.log('-'.repeat(70));
      
      const articles: NewsArticle[] = apiResponse.items.map((item, index) => ({
        collected_at: collectedAt,
        article_index: index,
        source: 'naver',
        title: this.stripHtmlTags(item.title),
        link: item.link,
        description: item.description ? this.stripHtmlTags(item.description) : null,
        pub_date: this.parseNaverDate(item.pubDate)
      }));

      console.log(`변환 완료: ${articles.length}개 기사`);
      
      const insertedCount = await this.newsRepo.saveArticles(articles);
      console.log(`저장 완료: ${insertedCount}개 기사 (중복 제외)\n`);

      console.log('Step 4: 저장 결과 확인');
      console.log('-'.repeat(70));
      await this.printStats(collectedAt);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n' + '='.repeat(70));
      console.log('PIPELINE COMPLETE');
      console.log('='.repeat(70));
      console.log(`종료 시간: ${new Date().toLocaleString('ko-KR')}`);
      console.log(`소요 시간: ${duration}초`);
      console.log('='.repeat(70) + '\n');

    } catch (error) {
      console.error('\n' + '='.repeat(70));
      console.error('PIPELINE FAILED');
      console.error('='.repeat(70));
      console.error('Error:', error);
      throw error;
    } finally {
      await this.newsRepo.disconnect();
    }
  }

  private async printStats(collectedAt: string): Promise<void> {
    try {
      // 현재 수집 건수
      const currentCount = await this.newsRepo.getArticleCount(collectedAt);
      console.log(`현재 수집 건수: ${currentCount}개`);

      // 전체 기사 수
      const totalCount = await this.newsRepo.getTotalArticleCount();
      console.log(`전체 기사 수: ${totalCount}개`);

      // 최근 수집 시간 목록
      const recentCollections = await this.newsRepo.getCollectedAtList(5);
      console.log(`\n최근 수집 시간 (최대 5개):`);
      recentCollections.forEach((time, index) => {
        console.log(`  ${index + 1}. ${time}`);
      });

      // 샘플 기사 출력
      const sampleArticles = await this.newsRepo.getArticlesByIndices(collectedAt, [0, 1, 2]);
      if (sampleArticles.length > 0) {
        console.log(`\n샘플 기사 (처음 3개):`);
        sampleArticles.forEach((article, index) => {
          console.log(`  ${index + 1}. [${article.article_index}] ${article.title}`);
          console.log(`     발행: ${article.pub_date}`);
        });
      }

    } catch (error) {
      console.error('통계 출력 중 오류:', error);
    }
  }

  async testConnection(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('CONNECTION TEST');
    console.log('='.repeat(70));

    try {
      // Naver API 테스트
      console.log('\n1. Naver API 연결 테스트');
      console.log('-'.repeat(70));
      const naverConnected = await this.collector.testConnection();
      if (naverConnected) {
        console.log('Naver API 연결 성공');
      } else {
        console.log('Naver API 연결 실패');
      }

      // MySQL 테스트
      console.log('\n2. MySQL 연결 테스트');
      console.log('-'.repeat(70));
      await this.newsRepo.connect();
      console.log('MySQL 연결 성공');

      console.log('\n' + '='.repeat(70));
      console.log('모든 연결 테스트 완료');
      console.log('='.repeat(70) + '\n');

    } catch (error) {
      console.error('\n연결 테스트 실패:', error);
      throw error;
    } finally {
      await this.newsRepo.disconnect();
    }
  }
}

if (require.main === module) {
  const pipeline = new NaverNewsPipeline();

  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'test') {
    // 연결 테스트만 실행
    pipeline
      .testConnection()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    // 전체 파이프라인 실행
    pipeline
      .run()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  }
}

export default NaverNewsPipeline;
