/**
 * GPT 분류 결과를 MongoDB에 저장
 * - Clusters: 현재 클러스터 상태 유지
 * - Cluster_Snapshots: 매 수집 시점의 클러스터 스냅샷 기록 (활성 + 비활성)
 */

import { MongoClient, Db, Collection } from "mongodb";

// ============ Type 정의 ============

interface HistoryEntry {
  collected_at: string;
  article_indices: number[];
  article_count: number;
}

interface ClusterDocument {
  cluster_id: string;
  topic_name: string;
  tags: string[];
  appearance_count: number;
  status: "active" | "inactive";
  history: HistoryEntry[];
  created_at: string;
  updated_at: string;
}

interface ClusterSnapshot {
  collected_at: string;
  cluster_id: string;
  topic_name: string;
  tags: string[];
  appearance_count: number;
  article_count: number;
  article_indices: number[];
  status: "active" | "inactive";
  cluster_score: number;
}

interface GPTClusterOutput {
  cluster_id: string;
  topic_name: string;
  tags: string[];
  article_indices: number[];
  article_count: number;
  appearance_count: number;
}

interface GPTClassificationResult {
  clusters: GPTClusterOutput[];
  raw_response: string;
  processed_at: string;
}

// ============ MongoDB 연결 ============

let mongoClient: MongoClient | null = null;
let db: Db | null = null;

/**
 * MongoDB 연결 초기화
 */
async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB_NAME || "ai_news_classifier";

  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();

  db = mongoClient.db(dbName);

  console.log(`✅ Connected to MongoDB: ${dbName}`);

  return db;
}

/**
 * MongoDB 연결 종료
 */
async function closeMongoDBConnection(): Promise<void> {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    db = null;
    console.log(`✅ MongoDB connection closed`);
  }
}

// ============ 컬렉션 참조 ============

/**
 * clusters 컬렉션 참조
 */
async function getClustersCollection(): Promise<Collection<ClusterDocument>> {
  const database = await connectToMongoDB();
  return database.collection<ClusterDocument>("clusters");
}

/**
 * cluster_snapshots 컬렉션 참조
 */
async function getSnapshotsCollection(): Promise<Collection<ClusterSnapshot>> {
  const database = await connectToMongoDB();
  return database.collection<ClusterSnapshot>("cluster_snapshots");
}

// ============ 헬퍼 함수 ============

/**
 * 기존 클러스터 조회
 */
async function getExistingClusters(): Promise<ClusterDocument[]> {
  const collection = await getClustersCollection();
  return collection.find({}).toArray();
}

/**
 * 기존 클러스터를 Map으로 변환 (빠른 조회용)
 */
function createClusterMap(
  clusters: ClusterDocument[]
): Map<string, ClusterDocument> {
  const map = new Map<string, ClusterDocument>();
  clusters.forEach((cluster) => {
    map.set(cluster.cluster_id, cluster);
  });
  return map;
}

/**
 * 클러스터 점수 계산 (로그 함수 기반)
 * 공식: 20 + (80 × log(appearance_count)) / log(720)
 * - 초기값: 20점 (appearance_count = 1)
 * - 최대값: 100점 (appearance_count = 720)
 */
function calculateClusterScore(appearanceCount: number): number {
  if (appearanceCount <= 0) {
    return 20;
  }
  return 20 + (80 * Math.log(appearanceCount)) / Math.log(720);
}

// ============ 저장 로직 ============

/**
 * 기존 클러스터 업데이트
 * - history에 새 항목 추가
 * - appearance_count 업데이트
 * - status: active 유지
 */
async function updateExistingCluster(
  existingCluster: ClusterDocument,
  gptCluster: GPTClusterOutput,
  collectedAt: string
): Promise<void> {
  const collection = await getClustersCollection();

  const updatedHistory: HistoryEntry[] = [
    ...existingCluster.history,
    {
      collected_at: collectedAt,
      article_indices: gptCluster.article_indices,
      article_count: gptCluster.article_count,
    },
  ];

  await collection.updateOne(
    { cluster_id: gptCluster.cluster_id },
    {
      $set: {
        topic_name: gptCluster.topic_name,
        tags: gptCluster.tags,
        appearance_count: gptCluster.appearance_count,
        history: updatedHistory,
        status: "active",
        updated_at: new Date().toISOString(),
      },
    }
  );

  console.log(
    `   ✏️  Updated cluster: ${gptCluster.cluster_id} (appearance: ${gptCluster.appearance_count})`
  );
}

/**
 * 새로운 클러스터 생성
 */
async function createNewCluster(
  gptCluster: GPTClusterOutput,
  collectedAt: string
): Promise<void> {
  const collection = await getClustersCollection();

  const newCluster: ClusterDocument = {
    cluster_id: gptCluster.cluster_id,
    topic_name: gptCluster.topic_name,
    tags: gptCluster.tags,
    appearance_count: gptCluster.appearance_count,
    status: "active",
    history: [
      {
        collected_at: collectedAt,
        article_indices: gptCluster.article_indices,
        article_count: gptCluster.article_count,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await collection.insertOne(newCluster);

  console.log(`   ✨ Created new cluster: ${gptCluster.cluster_id}`);
}

/**
 * 비활성 클러스터 처리
 * - GPT 출력에 없는 기존 클러스터를 inactive로 변경
 * - Cluster_Snapshots에 비활성 기록 저장
 */
async function deactivateMissingClusters(
  gptClusterIds: Set<string>,
  collectedAt: string
): Promise<void> {
  const clustersCollection = await getClustersCollection();
  const snapshotsCollection = await getSnapshotsCollection();

  const existingClusters = await clustersCollection
    .find({ status: "active" })
    .toArray();

  for (const cluster of existingClusters) {
    if (!gptClusterIds.has(cluster.cluster_id)) {
      // 1. Clusters 테이블 업데이트
      await clustersCollection.updateOne(
        { cluster_id: cluster.cluster_id },
        {
          $set: {
            status: "inactive",
            updated_at: new Date().toISOString(),
          },
        }
      );

      // 2. Cluster_Snapshots에 비활성 기록 저장
      const inactiveSnapshot: ClusterSnapshot = {
        collected_at: collectedAt,
        cluster_id: cluster.cluster_id,
        topic_name: cluster.topic_name,
        tags: cluster.tags,
        appearance_count: cluster.appearance_count,
        article_count: 0,
        article_indices: [], // 빈 배열
        status: "inactive",
        cluster_score: 0, // 비활성이므로 점수 0
      };

      await snapshotsCollection.insertOne(inactiveSnapshot);

      console.log(`   ⛔ Deactivated cluster: ${cluster.cluster_id}`);
    }
  }
}

/**
 * Cluster_Snapshots에 현재 상태 기록
 * - 활성 클러스터만 저장
 */
async function saveClusterSnapshots(
  gptClusters: GPTClusterOutput[],
  collectedAt: string
): Promise<void> {
  const snapshotsCollection = await getSnapshotsCollection();

  const snapshots: ClusterSnapshot[] = gptClusters.map((cluster) => ({
    collected_at: collectedAt,
    cluster_id: cluster.cluster_id,
    topic_name: cluster.topic_name,
    tags: cluster.tags,
    appearance_count: cluster.appearance_count,
    article_count: cluster.article_count,
    article_indices: cluster.article_indices,
    status: "active",
    cluster_score: calculateClusterScore(cluster.appearance_count),
  }));

  await snapshotsCollection.insertMany(snapshots);

  console.log(`   📸 Saved ${snapshots.length} cluster snapshots`);
}

// ============ 메인 저장 함수 ============

/**
 * GPT 분류 결과를 DB에 저장
 * 1. 기존 클러스터 조회
 * 2. 각 GPT 클러스터에 대해:
 *    - 기존이면 → update
 *    - 새것이면 → create
 * 3. 비활성화할 클러스터 처리
 * 4. Cluster_Snapshots에 기록 (활성 + 비활성)
 */
async function saveClassificationResultToDB(
  classificationResult: GPTClassificationResult
): Promise<void> {
  console.log("\n========== Saving Classification Results to DB ==========\n");

  const collectedAt = classificationResult.processed_at;

  try {
    // Step 1: 기존 클러스터 조회
    console.log("📚 Fetching existing clusters...");
    const existingClusters = await getExistingClusters();
    const clusterMap = createClusterMap(existingClusters);
    console.log(
      `   ✅ Found ${existingClusters.length} existing clusters\n`
    );

    // Step 2: GPT 클러스터 처리
    console.log("🔄 Processing GPT clusters...");
    const gptClusterIds = new Set<string>();

    for (const gptCluster of classificationResult.clusters) {
      gptClusterIds.add(gptCluster.cluster_id);

      const existingCluster = clusterMap.get(gptCluster.cluster_id);

      if (existingCluster) {
        // 업데이트
        await updateExistingCluster(existingCluster, gptCluster, collectedAt);
      } else {
        // 생성
        await createNewCluster(gptCluster, collectedAt);
      }
    }
    console.log("");

    // Step 3: 비활성화 처리
    console.log("⛔ Deactivating missing clusters...");
    await deactivateMissingClusters(gptClusterIds, collectedAt);
    console.log("");

    // Step 4: Snapshots 저장 (활성 클러스터)
    console.log("📸 Saving cluster snapshots...");
    await saveClusterSnapshots(classificationResult.clusters, collectedAt);
    console.log("");

    console.log("✅ DB save completed successfully!\n");

    // 통계
    const updatedCount = classificationResult.clusters.filter((c) =>
      clusterMap.has(c.cluster_id)
    ).length;
    const createdCount = classificationResult.clusters.length - updatedCount;
    const deactivatedCount =
      existingClusters.length - classificationResult.clusters.length;

    console.log("📊 Summary:");
    console.log(`   - Updated: ${updatedCount}`);
    console.log(`   - Created: ${createdCount}`);
    console.log(`   - Deactivated: ${deactivatedCount}`);
    console.log(`   - Current active: ${classificationResult.clusters.length}`);
  } catch (error) {
    console.error("❌ Error saving to DB:", error);
    throw error;
  }
}

// ============ Export ============

export {
  saveClassificationResultToDB,
  connectToMongoDB,
  closeMongoDBConnection,
  getClustersCollection,
  getSnapshotsCollection,
  calculateClusterScore,
  ClusterDocument,
  ClusterSnapshot,
  GPTClusterOutput,
  GPTClassificationResult,
};
