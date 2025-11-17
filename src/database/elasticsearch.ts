/**
 * ElasticSearch 클라이언트
 *
 * 역할:
 * - ElasticSearch 연결 관리
 * - 1000개 최신 기사 조회
 * - 특정 인덱스의 기사 조회
 */

import { Client } from "@elastic/elasticsearch";

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

// ============ ElasticSearch 클라이언트 ============

let esClient: Client | null = null;

/**
 * ElasticSearch 클라이언트 초기화
 */
function getElasticsearchClient(): Client {
  if (esClient) {
    return esClient;
  }

  const host = process.env.ELASTICSEARCH_HOST || "http://localhost:9200";

  esClient = new Client({ node: host });

  console.log(`✅ ElasticSearch client initialized: ${host}`);

  return esClient;
}

/**
 * ElasticSearch 연결 종료
 */
async function closeElasticsearchClient(): Promise<void> {
  if (esClient) {
    await esClient.close();
    esClient = null;
    console.log(`✅ ElasticSearch client closed`);
  }
}

// ============ 조회 함수 ============

/**
 * ElasticSearch에서 최신 1000개 기사 조회
 *
 * articles 인덱스에서:
 * - 가장 최신 수집 시점의 문서 1개 조회
 * - 그 문서 내 articles 배열에 1000개 기사가 있음
 *
 * @returns 최신 기사 컬렉션
 */
async function getLatestArticlesFromES(): Promise<ArticlesCollection> {
  console.log("📰 Fetching latest articles from ElasticSearch...");

  const client = getElasticsearchClient();

  try {
    const response = await client.search({
      index: "articles",
      sort: [{ collected_at: { order: "desc" } }],
      size: 1,
    });

    if (response.hits.hits.length === 0) {
      throw new Error("No articles found in ElasticSearch");
    }

    const document = response.hits.hits[0]._source as any;

    const articlesData: ArticlesCollection = {
      collected_at: document.collected_at,
      source: document.source,
      articles: document.articles,
    };

    console.log(
      `   ✅ Fetched articles: collected_at=${articlesData.collected_at}, count=${articlesData.articles.length}`
    );

    return articlesData;
  } catch (error) {
    console.error("❌ Error fetching articles from ElasticSearch:", error);
    throw error;
  }
}

/**
 * ElasticSearch에서 특정 인덱스의 기사들 조회
 *
 * 가장 최신 문서에서 지정된 인덱스의 기사들만 추출
 *
 * @param indices 기사 인덱스 배열 (예: [0, 4, 15, 67])
 * @returns 해당 기사들
 */
async function getArticlesByIndices(indices: number[]): Promise<Article[]> {
  console.log(`📰 Fetching articles by indices: ${indices.join(", ")}`);

  try {
    // 최신 문서 조회
    const articlesCollection = await getLatestArticlesFromES();

    // 지정된 인덱스의 기사들만 필터링
    const articles = indices
      .map((idx) => {
        const article = articlesCollection.articles[idx];
        if (!article) {
          console.warn(`   ⚠️  Article index ${idx} not found`);
          return null;
        }
        return article;
      })
      .filter((a): a is Article => a !== null);

    console.log(`   ✅ Fetched ${articles.length} articles`);

    return articles;
  } catch (error) {
    console.error("❌ Error fetching articles by indices:", error);
    throw error;
  }
}

/**
 * ElasticSearch 연결 테스트
 */
async function testElasticsearchConnection(): Promise<boolean> {
  console.log("🔌 Testing ElasticSearch connection...");

  const client = getElasticsearchClient();

  try {
    const info = await client.info();
    console.log(`   ✅ Connected to ElasticSearch ${info.version.number}`);
    return true;
  } catch (error) {
    console.error("❌ ElasticSearch connection failed:", error);
    return false;
  }
}

// ============ Export ============

export {
  getLatestArticlesFromES,
  getArticlesByIndices,
  testElasticsearchConnection,
  closeElasticsearchClient,
  getElasticsearchClient,
  Article,
  ArticlesCollection,
};
