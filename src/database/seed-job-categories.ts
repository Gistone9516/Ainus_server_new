/**
 * 13개 직업 카테고리 시드 데이터
 *
 * 실행 방법:
 * - migrations.ts에서 자동 실행되도록 추가
 * - 또는 직접 실행: npx ts-node src/database/seed-job-categories.ts
 */

import { executeModify, executeQuery } from './mysql';
import { Logger } from './logger';

const logger = new Logger('SeedJobCategories');

interface JobCategoryData {
  category_code: string;
  job_name: string;
  description: string;
}

/**
 * 13개 직업 카테고리 정의
 */
const JOB_CATEGORIES: JobCategoryData[] = [
  {
    category_code: 'TECH_DEV',
    job_name: '기술/개발',
    description: '소프트웨어 개발자, 엔지니어, 프로그래머, 데이터 과학자 등 기술 및 개발 직군',
  },
  {
    category_code: 'CREATIVE',
    job_name: '창작/콘텐츠',
    description: '작가, 디자이너, 영상 크리에이터, 마케터, 콘텐츠 제작자 등 창작 직군',
  },
  {
    category_code: 'OFFICE',
    job_name: '분석/사무',
    description: '사무직, 데이터 분석가, 기획자, 컨설턴트 등 사무 및 분석 직군',
  },
  {
    category_code: 'MEDICAL',
    job_name: '의료/과학',
    description: '의사, 간호사, 연구원, 과학자, 약사 등 의료 및 과학 직군',
  },
  {
    category_code: 'EDUCATION',
    job_name: '교육',
    description: '교사, 강사, 교수, 교육 관련 종사자',
  },
  {
    category_code: 'BUSINESS',
    job_name: '비즈니스',
    description: '경영자, 관리자, 세일즈, 금융 전문가 등 비즈니스 직군',
  },
  {
    category_code: 'MANUFACTURING',
    job_name: '제조/건설',
    description: '제조업 종사자, 건설 관련 직군, 생산 관리자 등',
  },
  {
    category_code: 'SERVICE',
    job_name: '서비스',
    description: '고객 서비스, 영업, 상담, 접객 등 서비스 직군',
  },
  {
    category_code: 'STARTUP',
    job_name: '창업/자영업',
    description: '창업가, 자영업자, 프리랜서 등',
  },
  {
    category_code: 'AGRICULTURE',
    job_name: '농업/축산업',
    description: '농업, 축산업, 원예 등 1차 산업 종사자',
  },
  {
    category_code: 'FISHERY',
    job_name: '어업/해상업',
    description: '어업, 해운, 항만 등 해상 관련 직군',
  },
  {
    category_code: 'STUDENT',
    job_name: '학생',
    description: '대학생, 대학원생, 취업 준비생 등',
  },
  {
    category_code: 'OTHER',
    job_name: '기타',
    description: '기타 직업 또는 미분류',
  },
];

/**
 * 직업 카테고리를 job_categories 테이블에 삽입
 *
 * ON DUPLICATE KEY UPDATE:
 * - category_code는 UNIQUE이므로 중복 시 업데이트
 */
export async function seedJobCategories(): Promise<void> {
  logger.info('Starting job_categories seeding...');

  try {
    // 기존 카테고리 수 확인
    const existingCategories = await executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM job_categories'
    );
    const existingCount = existingCategories[0]?.count ?? 0;

    logger.info(`Found ${existingCount} existing categories`);

    // Bulk INSERT with ON DUPLICATE KEY UPDATE
    const sql = `
      INSERT INTO job_categories (category_code, job_name, description)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        job_name = VALUES(job_name),
        description = VALUES(description)
    `;

    const values = JOB_CATEGORIES.map(category => [
      category.category_code,
      category.job_name,
      category.description,
    ]);

    await executeModify(sql, [values]);

    // 최종 카테고리 수 확인
    const finalCategories = await executeQuery<{ count: number }>(
      'SELECT COUNT(*) as count FROM job_categories'
    );
    const finalCount = finalCategories[0]?.count ?? 0;

    logger.info(`Successfully seeded job categories`);
    logger.info(`  - Expected: ${JOB_CATEGORIES.length}`);
    logger.info(`  - Before: ${existingCount}`);
    logger.info(`  - After: ${finalCount}`);
    logger.info(`  - Inserted/Updated: ${Math.abs(finalCount - existingCount)}`);

  } catch (error) {
    logger.error('Failed to seed job_categories', error);
    throw error;
  }
}

/**
 * 카테고리 목록 조회 (검증용)
 */
export async function listJobCategories(): Promise<void> {
  try {
    const categories = await executeQuery<JobCategoryData & { job_category_id: number }>(
      'SELECT job_category_id, category_code, job_name, description FROM job_categories ORDER BY job_category_id ASC'
    );

    logger.info(`\n=== Job Categories (Total: ${categories.length}) ===\n`);

    categories.forEach((category) => {
      logger.info(`${category.job_category_id}. [${category.category_code}] ${category.job_name}`);
      logger.info(`   ${category.description}\n`);
    });

  } catch (error) {
    logger.error('Failed to list job_categories', error);
    throw error;
  }
}

// 직접 실행 시
if (require.main === module) {
  (async () => {
    try {
      await seedJobCategories();
      await listJobCategories();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}
