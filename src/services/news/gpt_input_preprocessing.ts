/**
 * GPT 입력 데이터 전처리
 *
 * 프로세스:
 * 1. ElasticSearch에서 최신 1000개 기사 조회
 * 2. MongoDB에서 active 클러스터 + 30일 이내 비활성 클러스터 조회
 * 3. GPT 입력 형식으로 변환
 */

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
}

// ============ ElasticSearch 쿼리 함수 ============

/**
 * ElasticSearch에서 최신 1000개 기사 조회
 *
 * @returns 가장 최근 수집된 1000개 기사
 */
async function getLatestArticlesFromES(): Promise<ArticlesCollection> {
  // 실제 구현: ElasticSearch 클라이언트 사용
  // const { Client } = require("@elastic/elasticsearch");
  // const client = new Client({ node: process.env.ELASTICSEARCH_HOST });

  console.log("📰 Fetching latest articles from ElasticSearch...");

  // TODO: 실제 ElasticSearch 쿼리로 대체
  const articlesData: ArticlesCollection = {
    collected_at: new Date().toISOString(),
    source: "naver",
    articles: [
      // 1000개 기사 배열이 여기 들어갈 예정
    ],
  };

  console.log(`   ✅ Fetched ${articlesData.articles.length} articles`);
  return articlesData;
}

/**
 * ElasticSearch에서 1000개 기사가 정확히 있는지 검증
 */
function validateArticleCount(articles: Article[]): boolean {
  if (articles.length !== 1000) {
    console.error(
      `   ❌ Expected 1000 articles, but got ${articles.length}`
    );
    return false;
  }
  console.log(`   ✅ Article count validated: ${articles.length}`);
  return true;
}

/**
 * ElasticSearch에서 기사 인덱스 확인 (0~999가 연속인지)
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
  console.log(`   ✅ Article indices validated (0-999)`);
  return true;
}

// ============ MongoDB 쿼리 함수 ============

/**
 * MongoDB에서 active 클러스터 조회
 *
 * @returns 모든 active 클러스터
 */
async function getActiveClustersFromDB(): Promise<Cluster[]> {
  // 실제 구현: MongoDB 클라이언트 사용
  // const db = await connectToMongoDB();
  // return db.collection("clusters").find({ status: "active" }).toArray();

  console.log("📚 Fetching active clusters from MongoDB...");

  // TODO: 실제 MongoDB 쿼리로 대체
  const activeClusters: Cluster[] = [];

  console.log(`   ✅ Fetched ${activeClusters.length} active clusters`);
  return activeClusters;
}

/**
 * MongoDB에서 30일 이내 비활성 클러스터 조회
 *
 * collected_at 기준으로 30일 이내에 비활성화된 클러스터 조회
 *
 * @returns 30일 이내에 비활성화된 클러스터
 */
async function getRecentInactiveClustersFromDB(): Promise<Cluster[]> {
  console.log("📚 Fetching recent inactive clusters (≤30 days) from MongoDB...");

  // 30일 = 24시간 × 30 = 86400000ms × 30
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = new Date(Date.now() - thirtyDaysMs);

  // 실제 구현: MongoDB 클라이언트 사용
  // const db = await connectToMongoDB();
  // return db.collection("clusters").find({
  //   status: "inactive",
  //   updated_at: { $gte: thirtyDaysAgo.toISOString() }
  // }).toArray();

  // TODO: 실제 MongoDB 쿼리로 대체
  const inactiveClusters: Cluster[] = [];

  console.log(`   ✅ Fetched ${inactiveClusters.length} recent inactive clusters`);
  return inactiveClusters;
}

// ============ 전처리 함수 ============

/**
 * Articles 배열을 GPT 입력 형식으로 변환
 * 제목과 인덱스만 추출
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
 * cluster_id, topic_name, tags, appearance_count, status만 포함
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
 * 1. ElasticSearch에서 최신 1000개 기사 조회
 * 2. MongoDB에서 active + 30일 이내 비활성 클러스터 조회
 * 3. 검증
 * 4. GPT 입력 형식으로 변환
 *
 * @returns GPT에 전송할 입력 데이터
 */
async function preprocessGPTInputData(): Promise<GPTInputData> {
  console.log("\n========== GPT Input Data Preprocessing ==========\n");

  try {
    // Step 1: ElasticSearch에서 기사 조회
    console.log("📰 Step 1: Fetching articles...\n");
    const articlesCollection = await getLatestArticlesFromES();
    const articles = articlesCollection.articles;

    // Step 2: 기사 데이터 검증
    console.log("\n✅ Step 2: Validating article data...\n");
    if (!validateArticleCount(articles)) {
      throw new Error("Article count validation failed");
    }
    if (!validateArticleIndices(articles)) {
      throw new Error("Article index validation failed");
    }

    // Step 3: MongoDB에서 클러스터 조회
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
    };

    console.log("========== Preprocessing Complete ==========");
    console.log(`✅ New articles: ${gptInput.new_articles.length}`);
    console.log(`✅ Previous clusters: ${gptInput.previous_clusters.length}\n`);

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
  getLatestArticlesFromES,
  getActiveClustersFromDB,
  getRecentInactiveClustersFromDB,
  transformArticlesToGPTFormat,
  transformClustersToGPTFormat,
  combineClusters,
};
