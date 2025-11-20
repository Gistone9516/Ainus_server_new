/**
 * 40개 표준 AI 뉴스 태그 초기 데이터 삽입
 *
 * 실행 방법:
 * - migrations.ts에서 자동 실행되도록 추가
 * - 또는 직접 실행: node -r ts-node/register src/database/seed-interest-tags.ts
 */

import { executeModify, executeQuery } from './mysql';
import { Logger } from './logger';

const logger = new Logger('SeedInterestTags');

interface TagData {
  tag_name: string;
  tag_code: string;
  description: string;
}

/**
 * 40개 표준 태그 정의
 */
const STANDARD_TAGS: TagData[] = [
  // ============ 기술 중심 (12개) ============
  {
    tag_name: 'LLM',
    tag_code: 'LLM',
    description: 'Large Language Model - 대규모 언어 모델 (GPT, Claude 등)',
  },
  {
    tag_name: '컴퓨터비전',
    tag_code: 'COMPUTER_VISION',
    description: 'Computer Vision - 이미지/영상 인식 및 처리 기술',
  },
  {
    tag_name: '자연어처리',
    tag_code: 'NLP',
    description: 'Natural Language Processing - 자연어 이해 및 생성',
  },
  {
    tag_name: '머신러닝',
    tag_code: 'MACHINE_LEARNING',
    description: 'Machine Learning - 기계 학습 일반',
  },
  {
    tag_name: '강화학습',
    tag_code: 'REINFORCEMENT_LEARNING',
    description: 'Reinforcement Learning - 보상 기반 학습',
  },
  {
    tag_name: '연합학습',
    tag_code: 'FEDERATED_LEARNING',
    description: 'Federated Learning - 분산 데이터 학습',
  },
  {
    tag_name: '모델경량화',
    tag_code: 'MODEL_OPTIMIZATION',
    description: 'Model Optimization - 모델 압축 및 최적화',
  },
  {
    tag_name: '프롬프트엔지니어링',
    tag_code: 'PROMPT_ENGINEERING',
    description: 'Prompt Engineering - 프롬프트 설계 및 최적화',
  },
  {
    tag_name: '에지AI',
    tag_code: 'EDGE_AI',
    description: 'Edge AI - 엣지 디바이스에서 동작하는 AI',
  },
  {
    tag_name: '윤리AI',
    tag_code: 'ETHICAL_AI',
    description: 'Ethical AI - AI 윤리 및 공정성',
  },
  {
    tag_name: 'AI보안',
    tag_code: 'AI_SECURITY',
    description: 'AI Security - AI 보안 및 적대적 공격 방어',
  },
  {
    tag_name: '개인화추천',
    tag_code: 'PERSONALIZATION',
    description: 'Personalization - 개인화 추천 시스템',
  },

  // ============ 산업/응용 중심 (18개) ============
  {
    tag_name: '콘텐츠생성',
    tag_code: 'CONTENT_CREATION',
    description: 'Content Creation - 콘텐츠 자동 생성',
  },
  {
    tag_name: '이미지생성',
    tag_code: 'IMAGE_GENERATION',
    description: 'Image Generation - 이미지 생성 AI (DALL-E, Midjourney 등)',
  },
  {
    tag_name: '영상생성',
    tag_code: 'VIDEO_GENERATION',
    description: 'Video Generation - 영상 생성 AI (Sora 등)',
  },
  {
    tag_name: '코드생성',
    tag_code: 'CODE_GENERATION',
    description: 'Code Generation - 코드 자동 생성 (Copilot 등)',
  },
  {
    tag_name: '글쓰기지원',
    tag_code: 'WRITING_ASSISTANT',
    description: 'Writing Assistant - 글쓰기 도구 및 편집 지원',
  },
  {
    tag_name: '번역',
    tag_code: 'TRANSLATION',
    description: 'Translation - 기계 번역',
  },
  {
    tag_name: '음성합성',
    tag_code: 'VOICE_SYNTHESIS',
    description: 'Voice Synthesis - 음성 합성 (TTS)',
  },
  {
    tag_name: '음성인식',
    tag_code: 'SPEECH_RECOGNITION',
    description: 'Speech Recognition - 음성 인식 (STT)',
  },
  {
    tag_name: '채팅봇',
    tag_code: 'CHATBOT',
    description: 'Chatbot - 대화형 AI 챗봇',
  },
  {
    tag_name: '감정분석',
    tag_code: 'SENTIMENT_ANALYSIS',
    description: 'Sentiment Analysis - 감정 및 의견 분석',
  },
  {
    tag_name: '데이터분석',
    tag_code: 'DATA_ANALYSIS',
    description: 'Data Analysis - AI 기반 데이터 분석',
  },
  {
    tag_name: '예측분석',
    tag_code: 'PREDICTIVE_ANALYTICS',
    description: 'Predictive Analytics - 예측 모델링',
  },
  {
    tag_name: '자동화',
    tag_code: 'AUTOMATION',
    description: 'Automation - 업무 프로세스 자동화',
  },
  {
    tag_name: '업무효율화',
    tag_code: 'PRODUCTIVITY',
    description: 'Productivity - 생산성 향상 도구',
  },
  {
    tag_name: '의사결정지원',
    tag_code: 'DECISION_SUPPORT',
    description: 'Decision Support - 의사결정 지원 시스템',
  },
  {
    tag_name: '마케팅자동화',
    tag_code: 'MARKETING_AUTOMATION',
    description: 'Marketing Automation - 마케팅 자동화',
  },
  {
    tag_name: '검색최적화',
    tag_code: 'SEO',
    description: 'Search Engine Optimization - 검색 최적화',
  },
  {
    tag_name: '가격결정',
    tag_code: 'PRICING_OPTIMIZATION',
    description: 'Pricing Optimization - 가격 최적화',
  },

  // ============ 트렌드/산업이슈 중심 (10개) ============
  {
    tag_name: 'AI일자리',
    tag_code: 'JOB_IMPACT',
    description: 'Job Impact - AI가 일자리에 미치는 영향',
  },
  {
    tag_name: 'AI윤리',
    tag_code: 'AI_ETHICS',
    description: 'AI Ethics - AI 윤리 및 책임 문제',
  },
  {
    tag_name: 'AI규제',
    tag_code: 'REGULATION',
    description: 'Regulation - AI 규제 및 정책',
  },
  {
    tag_name: 'AI성능',
    tag_code: 'PERFORMANCE',
    description: 'Performance - AI 모델 성능 및 벤치마크',
  },
  {
    tag_name: '모델출시',
    tag_code: 'MODEL_RELEASE',
    description: 'Model Release - 새로운 AI 모델 출시',
  },
  {
    tag_name: '오픈소스',
    tag_code: 'OPEN_SOURCE',
    description: 'Open Source - 오픈소스 AI 프로젝트',
  },
  {
    tag_name: '의료진단',
    tag_code: 'MEDICAL_DIAGNOSIS',
    description: 'Medical Diagnosis - 의료 진단 AI',
  },
  {
    tag_name: '교육지원',
    tag_code: 'LEARNING_SUPPORT',
    description: 'Learning Support - 교육 지원 AI',
  },
  {
    tag_name: '비용절감',
    tag_code: 'COST_REDUCTION',
    description: 'Cost Reduction - 비용 절감 효과',
  },
  {
    tag_name: '기술트렌드',
    tag_code: 'TECH_TREND',
    description: 'Tech Trend - AI 기술 트렌드 및 동향',
  },
];

/**
 * 40개 표준 태그를 interest_tags 테이블에 삽입
 *
 * ON DUPLICATE KEY UPDATE:
 * - tag_code는 UNIQUE이므로 중복 시 업데이트
 * - 기존 데이터 유지하면서 description만 업데이트
 */
export async function seedInterestTags(): Promise<void> {
  logger.info('Starting interest_tags seeding...');

  try {
    // 기존 태그 수 확인
    const existingTags = await executeQuery<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM interest_tags'
    );
    const existingCount = existingTags[0].count;

    logger.info(`Found ${existingCount} existing tags`);

    // Bulk INSERT with ON DUPLICATE KEY UPDATE
    const sql = `
      INSERT INTO interest_tags (tag_name, tag_code, description)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        tag_name = VALUES(tag_name),
        description = VALUES(description)
    `;

    const values = STANDARD_TAGS.map(tag => [
      tag.tag_name,
      tag.tag_code,
      tag.description,
    ]);

    await executeModify(sql, [values]);

    // 최종 태그 수 확인
    const finalTags = await executeQuery<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM interest_tags'
    );
    const finalCount = finalTags[0].count;

    logger.info(`Successfully seeded interest tags`);
    logger.info(`  - Expected: ${STANDARD_TAGS.length}`);
    logger.info(`  - Before: ${existingCount}`);
    logger.info(`  - After: ${finalCount}`);
    logger.info(`  - Inserted/Updated: ${finalCount - existingCount >= 0 ? finalCount - existingCount : 0}`);

  } catch (error) {
    logger.error('Failed to seed interest_tags', error);
    throw error;
  }
}

/**
 * 태그 목록 조회 (검증용)
 */
export async function listInterestTags(): Promise<void> {
  try {
    const tags = await executeQuery<TagData[]>(
      'SELECT tag_name, tag_code, description FROM interest_tags ORDER BY interest_tag_id ASC'
    );

    logger.info(`\n=== Interest Tags (Total: ${tags.length}) ===\n`);

    tags.forEach((tag, index) => {
      logger.info(`${index + 1}. [${tag.tag_code}] ${tag.tag_name}`);
      logger.info(`   ${tag.description}\n`);
    });

  } catch (error) {
    logger.error('Failed to list interest_tags', error);
    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  (async () => {
    try {
      await seedInterestTags();
      await listInterestTags();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}
