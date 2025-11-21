import { ArtificialAnalysisCollector } from '../services/collectors/artificialAnalysis.collector';
import { ModelDataProcessor } from '../services/processors/modelDataProcessor';
import { ScoreCalculator, ModelEvaluations } from '../services/processors/scoreCalculator';
import { ModelRepository } from '../services/repositories/modelRepository';
import { ScoreRepository, OverallScore } from '../services/repositories/scoreRepository';

export class ArtificialAnalysisPipeline {
  private collector: ArtificialAnalysisCollector;
  private modelRepo: ModelRepository;
  private scoreRepo: ScoreRepository;
  private processor: ModelDataProcessor;

  constructor() {
    this.collector = new ArtificialAnalysisCollector();
    this.modelRepo = new ModelRepository();
    this.scoreRepo = new ScoreRepository();
    this.processor = new ModelDataProcessor(this.modelRepo);
  }

  private toMySQLDateTime(date: Date = new Date()): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  async run(): Promise<void> {
    const startTime = Date.now();

    console.log('\n' + '='.repeat(70));
    console.log('ARTIFICIAL ANALYSIS PIPELINE START');
    console.log('='.repeat(70));
    console.log(`시작 시간: ${new Date().toLocaleString('ko-KR')}\n`);

    try {
      console.log('Step 1: API 데이터 수집');
      console.log('-'.repeat(70));
      const apiData = await this.collector.collectModels();
      console.log(`✅ ${apiData.data.length}개 모델 수집 완료\n`);

      console.log('Step 2: 데이터베이스 연결');
      console.log('-'.repeat(70));
      await this.modelRepo.connect();
      await this.scoreRepo.connect();
      console.log('✅ MySQL 연결 완료\n');

      console.log('Step 3: 모델 데이터 저장');
      console.log('-'.repeat(70));
      await this.processor.processAndSave(apiData);
      console.log('✅ 모델 데이터 저장 완료\n');

      console.log('Step 4: 종합 점수 계산');
      console.log('-'.repeat(70));
      await this.calculateAndSaveScores(apiData.data);
      console.log('✅ 종합 점수 계산 완료\n');

      console.log('Step 5: 저장된 데이터 통계');
      console.log('-'.repeat(70));
      await this.printStats();

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
      await this.modelRepo.disconnect();
      await this.scoreRepo.disconnect();
    }
  }

  private async calculateAndSaveScores(models: any[]): Promise<void> {
    console.log(`${models.length}개 모델의 점수 계산 중...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const model of models) {
      try {
        const calculatedScore = ScoreCalculator.calculatePerformanceScore(
          model.evaluations as ModelEvaluations,
          model.name
        );

        if (!ScoreCalculator.validateScore(calculatedScore)) {
          console.warn(`  ⚠️  ${model.name}: 점수 유효성 검증 실패`);
          errorCount++;
          continue;
        }

        const overallScore: OverallScore = {
          model_id: model.id,
          overall_score: calculatedScore.overall_score,
          intelligence_index: calculatedScore.intelligence_index,
          coding_index: calculatedScore.coding_index,
          math_index: calculatedScore.math_index,
          reasoning_index: calculatedScore.reasoning_index,
          language_index: calculatedScore.language_index,
          calculated_at: this.toMySQLDateTime(),
          version: 1,
        };

        await this.scoreRepo.saveOverallScore(overallScore);
        successCount++;

        if (successCount % 50 === 0) {
          console.log(`  진행: ${successCount}/${models.length}...`);
        }

      } catch (error) {
        errorCount++;
        console.error(`  ❌ ${model.name} 점수 계산 실패:`, error);
      }
    }

    console.log(`\n점수 계산 완료:`);
    console.log(`  성공: ${successCount}개`);
    console.log(`  실패: ${errorCount}개`);
  }

  private async printStats(): Promise<void> {
    try {
      // 모델 통계
      const modelStats = await this.processor.getStats();
      console.log('모델 통계:');
      console.log(`  제공사: ${modelStats.creators}개`);
      console.log(`  모델: ${modelStats.models}개`);
      console.log(`  벤치마크 점수: ${modelStats.evaluations}개\n`);

      // 점수 통계
      const scoreStats = await this.scoreRepo.getScoreStats();
      
      // 타입 변환 (MySQL이 문자열로 반환할 수 있음)
      const avgScore = Number(scoreStats.avg_score) || 0;
      const maxScore = Number(scoreStats.max_score) || 0;
      const minScore = Number(scoreStats.min_score) || 0;
      
      console.log('점수 통계:');
      console.log(`  평균 점수: ${avgScore.toFixed(2)}`);
      console.log(`  최고 점수: ${maxScore.toFixed(2)}`);
      console.log(`  최저 점수: ${minScore.toFixed(2)}\n`);

      // 상위 모델
      const topModels = await this.scoreRepo.getTopModels(10);
      console.log('상위 10개 모델:');
      
      if (topModels.length === 0) {
        console.log('  (데이터 없음)\n');
        return;
      }
      
      topModels.forEach((model, index) => {
        const score = Number(model.overall_score) || 0;
        console.log(
          `  ${index + 1}. ${model.model_name} (${model.creator_name}) - ${score.toFixed(2)}점`
        );
      });
      
    } catch (error) {
      console.error('통계 출력 중 오류:', error);
      // 오류가 발생해도 파이프라인은 계속 진행
    }
  }

  async recalculateScore(modelId: string): Promise<void> {
    console.log(`\n모델 ${modelId}의 점수 재계산 중...`);

    await this.modelRepo.connect();
    await this.scoreRepo.connect();

    try {
      const model = await this.modelRepo.getModelById(modelId);
      if (!model) {
        throw new Error(`모델 ${modelId}를 찾을 수 없습니다`);
      }

      const rawData = JSON.parse(model.raw_data);

      const calculatedScore = ScoreCalculator.calculatePerformanceScore(
        rawData.evaluations as ModelEvaluations,
        rawData.name
      );

      const overallScore: OverallScore = {
        model_id: modelId,
        overall_score: calculatedScore.overall_score,
        intelligence_index: calculatedScore.intelligence_index,
        coding_index: calculatedScore.coding_index,
        math_index: calculatedScore.math_index,
        reasoning_index: calculatedScore.reasoning_index,
        language_index: calculatedScore.language_index,
        calculated_at: this.toMySQLDateTime(),
        version: 1,
      };

      await this.scoreRepo.saveOverallScore(overallScore);

      console.log(`✅ 점수 재계산 완료:`);
      console.log(`   종합 점수: ${calculatedScore.overall_score}`);
      console.log(`   지능 지수: ${calculatedScore.intelligence_index}`);
      console.log(`   코딩 지수: ${calculatedScore.coding_index}`);
      console.log(`   수학 지수: ${calculatedScore.math_index}`);

    } finally {
      await this.modelRepo.disconnect();
      await this.scoreRepo.disconnect();
    }
  }
}

if (require.main === module) {
  const pipeline = new ArtificialAnalysisPipeline();

  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'recalculate' && args[1]) {
    pipeline
      .recalculateScore(args[1])
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  } else {
    pipeline
      .run()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  }
}

export default ArtificialAnalysisPipeline;