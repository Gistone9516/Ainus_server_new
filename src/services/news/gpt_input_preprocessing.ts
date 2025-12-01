/**
 * GPT 입력 데이터 전처리
 *
 * 프로세스:
 * 1. MySQL news_articles에서 최신 기사 조회 (최대 1000개)
 * 2. MySQL clusters에서 active 클러스터 + 30일 이내 비활성 클러스터 조회
 * 3. GPT 입력 형식으로 변환
 */

import { executeQuery } from "../../database/mysql";

// ============ Type 정의 ============

interface Article {
  index: number;
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

interface ArticlesCollection {
  collected_at: string;
  source: string;
  articles: Article[];
}

interface Cluster {
  cluster_id: string;
  topic_name: string;
  tags: string[];
  appearance_count: number;
  status: "active" | "inactive";
  history: Array<{
    collected_at: string;
    article_indices: number[];
    article_count: number;
  }>;
  created_at: string;
  updated_at: string;
}

interface PreviousCluster {
  cluster_id: string;
  topic_name: string;
  tags: string[];
  appearance_count: number;
  status: "active" | "inactive";
}

interface GPTInputData {
  new_articles: Array<{ index: number; title: string }>;
  previous_clusters: PreviousCluster[];
  articles_collected_at: string; // 기사가 실제로 수집된 시간 (news_articles.collected_at)
}

// ============ MySQL 쿼리 함수 ============

/**
 * MySQL에서 최신 기사 조회 (최대 1000개)
 *
 * @returns 가장 최근 수집된 기사들
 */
async function getLatestArticlesFromMySQL(): Promise<ArticlesCollection> {
  console.log("📰 Fetching latest articles from MySQL...");

  // 가장 최근 collected_at을 찾아서 그 시간대의 기사들을 가져옴
  const latestTimeSql = `
    SELECT collected_at 
    FROM news_articles 
    ORDER BY collected_at DESC 
    LIMIT 1
  `;
  const latestTimeRows = await executeQuery<any>(latestTimeSql);

  if (latestTimeRows.length === 0) {
    console.log("   ⚠️ No articles found in DB");
    return {
      collected_at: new Date().toISOString(),
      source: "naver",
      articles: []
    };
  }

  const collectedAt = latestTimeRows[0].collected_at;

  // 해당 시간대의 기사 조회 (인덱스 순)
  const articlesSql = `
    SELECT article_index, title, link, description, pub_date
    FROM news_articles
    WHERE collected_at = ?
    ORDER BY article_index ASC
  `;

  const rows = await executeQuery<any>(articlesSql, [collectedAt]);

  const articles: Article[] = rows.map((row: any) => ({
    index: row.article_index,
    title: row.title,
    link: row.link,
    description: row.description,
    pubDate: row.pub_date instanceof Date ? row.pub_date.toISOString() : row.pub_date
  }));

  const articlesData: ArticlesCollection = {
    collected_at: collectedAt instanceof Date ? collectedAt.toISOString() : collectedAt,
    source: "naver", // Defaulting to naver as per schema default
    articles: articles,
  };

  console.log(`   ✅ Fetched ${articlesData.articles.length} articles from ${articlesData.collected_at}`);
  return articlesData;
}

/**
 * 기사 개수 검증 (최소 1개, 최대 1000개)
 */
function validateArticleCount(articles: Article[]): boolean {
  if (articles.length === 0) {
    console.error(`   ❌ No articles found`);
    return false;
  }
  if (articles.length > 1000) {
    console.error(
      `   ❌ Too many articles: expected max 1000, but got ${articles.length}`
    );
    return false;
  }
  console.log(`   ✅ Article count validated: ${articles.length} (max 1000)`);
  return true;
}

/**
 * 기사 인덱스 검증 (0부터 연속적인 인덱스)
 */
function validateArticleIndices(articles: Article[]): boolean {
  for (let i = 0; i < articles.length; i++) {
    if (articles[i].index !== i) {
      console.error(
        `   ❌ Index mismatch: Expected ${i}, but got ${articles[i].index}`
      );
      return false;
    }
  }
  console.log(`   ✅ Article indices validated (0-${articles.length - 1})`);
  return true;
}

// ============ 클러스터 조회 함수 ============

/**
 * MySQL에서 active 클러스터 조회
 */
async function getActiveClustersFromDB(): Promise<Cluster[]> {
  console.log("📚 Fetching active clusters from MySQL...");

  const sql = `SELECT * FROM clusters WHERE status = 'active'`;
  const rows = await executeQuery<any>(sql);

  const clusters: Cluster[] = rows.map((row: any) => ({
    cluster_id: row.cluster_id,
    topic_name: row.topic_name,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
    appearance_count: row.appearance_count,
    status: row.status,
    history: [], // History not needed for GPT input, saving query cost
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }));

  console.log(`   ✅ Fetched ${clusters.length} active clusters`);
  return clusters;
}

/**
 * MySQL에서 30일 이내 비활성 클러스터 조회
 */
async function getRecentInactiveClustersFromDB(): Promise<Cluster[]> {
  console.log("📚 Fetching recent inactive clusters (≤30 days) from MySQL...");

  const sql = `
    SELECT * FROM clusters 
    WHERE status = 'inactive' 
    AND updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  `;
  const rows = await executeQuery<any>(sql);

  const clusters: Cluster[] = rows.map((row: any) => ({
    cluster_id: row.cluster_id,
    topic_name: row.topic_name,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
    appearance_count: row.appearance_count,
    status: row.status,
    history: [],
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  }));

  console.log(`   ✅ Fetched ${clusters.length} recent inactive clusters`);
  return clusters;
}

// ============ 전처리 함수 ============

/**
 * Articles 배열을 GPT 입력 형식으로 변환
 */
function transformArticlesToGPTFormat(
  articles: Article[]
): Array<{ index: number; title: string }> {
  return articles.map((article) => ({
    index: article.index,
    title: article.title,
  }));
}

/**
 * Clusters 배열을 GPT 입력 형식으로 변환
 */
function transformClustersToGPTFormat(
  clusters: Cluster[]
): PreviousCluster[] {
  return clusters.map((cluster) => ({
    cluster_id: cluster.cluster_id,
    topic_name: cluster.topic_name,
    tags: cluster.tags,
    appearance_count: cluster.appearance_count,
    status: cluster.status,
  }));
}

/**
 * Active + 30일 이내 Inactive 클러스터 결합
 */
function combineClusters(
  activeClusters: Cluster[],
  inactiveClusters: Cluster[]
): Cluster[] {
  return [...activeClusters, ...inactiveClusters];
}

// ============ 메인 전처리 함수 ============

/**
 * GPT 입력 데이터 전처리
 *
 * 프로세스:
 * 1. MySQL에서 최신 기사 조회 (최대 1000개)
 * 2. MySQL에서 active + 30일 이내 비활성 클러스터 조회
 * 3. 검증 (최소 1개, 최대 1000개)
 * 4. GPT 입력 형식으로 변환
 *
 * @returns GPT에 전송할 입력 데이터
 */
async function preprocessGPTInputData(): Promise<GPTInputData> {
  console.log("\n========== GPT Input Data Preprocessing (MySQL) ==========\n");

  try {
    // Step 1: MySQL에서 기사 조회
    console.log("📰 Step 1: Fetching articles...\n");
    const articlesCollection = await getLatestArticlesFromMySQL();
    const articles = articlesCollection.articles;

    // Step 2: 기사 데이터 검증
    console.log("\n✅ Step 2: Validating article data...\n");
    if (!validateArticleCount(articles)) {
      throw new Error("Article count validation failed");
    }
    if (!validateArticleIndices(articles)) {
      throw new Error("Article index validation failed");
    }

    // Step 3: MySQL에서 클러스터 조회
    console.log("\n📚 Step 3: Fetching clusters...\n");
    const activeClusters = await getActiveClustersFromDB();
    const inactiveClusters = await getRecentInactiveClustersFromDB();
    const allClusters = combineClusters(activeClusters, inactiveClusters);

    console.log(`✅ Clusters fetched:`);
    console.log(`   - Active: ${activeClusters.length}`);
    console.log(`   - Recent Inactive (30 days): ${inactiveClusters.length}`);
    console.log(`   - Total: ${allClusters.length}\n`);

    // Step 4: GPT 입력 형식으로 변환
    console.log("🔄 Step 4: Transforming to GPT format...\n");
    const newArticles = transformArticlesToGPTFormat(articles);
    const previousClusters = transformClustersToGPTFormat(allClusters);

    console.log("✅ Data transformation completed\n");

    // Step 5: 최종 GPT 입력 데이터 생성
    const gptInput: GPTInputData = {
      new_articles: newArticles,
      previous_clusters: previousClusters,
      articles_collected_at: articlesCollection.collected_at, // 기사의 실제 수집 시간
    };

    console.log("========== Preprocessing Complete ==========");
    console.log(`✅ New articles: ${gptInput.new_articles.length}`);
    console.log(`✅ Previous clusters: ${gptInput.previous_clusters.length}`);
    console.log(`✅ Articles collected at: ${gptInput.articles_collected_at}\n`);

    return gptInput;
  } catch (error) {
    console.error("❌ Error during preprocessing:", error);
    throw error;
  }
}

// ============ Export ============

export {
  GPTInputData,
  ArticlesCollection,
  Cluster,
  PreviousCluster,
  Article,
  preprocessGPTInputData,
  getLatestArticlesFromMySQL,
  getActiveClustersFromDB,
  getRecentInactiveClustersFromDB,
  transformArticlesToGPTFormat,
  transformClustersToGPTFormat,
  combineClusters,
};
