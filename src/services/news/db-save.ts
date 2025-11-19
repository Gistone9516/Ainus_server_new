/**
 * GPT 분류 결과를 MySQL에 저장
 * - Clusters: 현재 클러스터 상태 유지
 * - Cluster_Snapshots: 매 수집 시점의 클러스터 스냅샷 기록 (활성 + 비활성)
 */

import { executeQuery, executeModify, getDatabasePool } from "../../database/mysql";
import { PoolConnection } from "mysql2/promise";

// ============ Type 정의 ============

interface HistoryEntry {
  collected_at: string;
  article_indices: number[];
  article_count: number;
}

interface ClusterDocument {
  cluster_id: string;
  topic_name: string;
  tags: string[]; // JSON parsed
  appearance_count: number;
  status: "active" | "inactive";
  history: HistoryEntry[]; // Derived from cluster_history table
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

// ============ 헬퍼 함수 ============

/**
 * 기존 클러스터 조회
 */
async function getExistingClusters(): Promise<ClusterDocument[]> {
  // 1. Fetch clusters
  const clustersSql = `
    SELECT * FROM clusters
  `;
  const clusters = await executeQuery<any>(clustersSql);

  // 2. Fetch history for each cluster (Optimization: could be done with JOIN or separate query per cluster if needed, 
  // but for now assuming reasonable number of clusters, we can fetch all history or just fetch on demand.
  // However, the original logic requires full history to be present in the object.
  // Let's fetch recent history or just keep it simple. 
  // The original code stored history in the document. Here it's in a separate table.
  // For the purpose of 'updateExistingCluster', we just need to append to history table.
  // We don't necessarily need to load all history into memory unless we use it.
  // Looking at usage: 'updateExistingCluster' appends to history.
  // So we can just return the cluster info without full history for now, 
  // or fetch history if strictly needed.
  // The 'ClusterDocument' interface has 'history'. Let's populate it.

  const result: ClusterDocument[] = [];

  for (const row of clusters) {
    // Fetch history
    const historySql = `
      SELECT collected_at, article_indices, article_count 
      FROM cluster_history 
      WHERE cluster_id = ? 
      ORDER BY collected_at DESC
    `;
    const historyRows = await executeQuery<any>(historySql, [row.cluster_id]);

    const history: HistoryEntry[] = historyRows.map((h: any) => ({
      collected_at: h.collected_at instanceof Date ? h.collected_at.toISOString() : h.collected_at,
      article_indices: typeof h.article_indices === 'string' ? JSON.parse(h.article_indices) : h.article_indices,
      article_count: h.article_count
    }));

    result.push({
      cluster_id: row.cluster_id,
      topic_name: row.topic_name,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      appearance_count: row.appearance_count,
      status: row.status,
      history: history,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    });
  }

  return result;
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
 * - clusters 테이블 업데이트
 * - cluster_history 테이블에 새 항목 추가
 */
async function updateExistingCluster(
  connection: PoolConnection,
  existingCluster: ClusterDocument,
  gptCluster: GPTClusterOutput,
  collectedAt: string
): Promise<void> {
  // 1. Update clusters table
  const updateSql = `
    UPDATE clusters 
    SET 
      topic_name = ?, 
      tags = ?, 
      appearance_count = ?, 
      status = 'active', 
      updated_at = NOW()
    WHERE cluster_id = ?
  `;
  await connection.execute(updateSql, [
    gptCluster.topic_name,
    JSON.stringify(gptCluster.tags),
    gptCluster.appearance_count,
    gptCluster.cluster_id
  ]);

  // 2. Insert into cluster_history
  const historySql = `
    INSERT INTO cluster_history (cluster_id, collected_at, article_indices, article_count)
    VALUES (?, ?, ?, ?)
  `;
  await connection.execute(historySql, [
    gptCluster.cluster_id,
    collectedAt,
    JSON.stringify(gptCluster.article_indices),
    gptCluster.article_count
  ]);

  console.log(
    `   ✏️  Updated cluster: ${gptCluster.cluster_id} (appearance: ${gptCluster.appearance_count})`
  );
}

/**
 * 새로운 클러스터 생성
 */
async function createNewCluster(
  connection: PoolConnection,
  gptCluster: GPTClusterOutput,
  collectedAt: string
): Promise<void> {
  // 1. Insert into clusters table
  const insertSql = `
    INSERT INTO clusters (cluster_id, topic_name, tags, appearance_count, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', NOW(), NOW())
  `;
  await connection.execute(insertSql, [
    gptCluster.cluster_id,
    gptCluster.topic_name,
    JSON.stringify(gptCluster.tags),
    gptCluster.appearance_count
  ]);

  // 2. Insert into cluster_history
  const historySql = `
    INSERT INTO cluster_history (cluster_id, collected_at, article_indices, article_count)
    VALUES (?, ?, ?, ?)
  `;
  await connection.execute(historySql, [
    gptCluster.cluster_id,
    collectedAt,
    JSON.stringify(gptCluster.article_indices),
    gptCluster.article_count
  ]);

  console.log(`   ✨ Created new cluster: ${gptCluster.cluster_id}`);
}

/**
 * 비활성 클러스터 처리
 * - GPT 출력에 없는 기존 클러스터를 inactive로 변경
 * - Cluster_Snapshots에 비활성 기록 저장
 */
async function deactivateMissingClusters(
  connection: PoolConnection,
  gptClusterIds: Set<string>,
  collectedAt: string
): Promise<void> {
  // Get active clusters that are NOT in gptClusterIds
  // We can do this by querying DB or filtering the 'existingClusters' we fetched earlier.
  // Let's use the DB to be safe and consistent within transaction if possible, 
  // but we need to iterate to insert snapshots.

  // Fetch currently active clusters
  const [activeRows] = await connection.execute<any>(`SELECT * FROM clusters WHERE status = 'active'`);

  for (const cluster of activeRows) {
    if (!gptClusterIds.has(cluster.cluster_id)) {
      // 1. Update status to inactive
      await connection.execute(
        `UPDATE clusters SET status = 'inactive', updated_at = NOW() WHERE cluster_id = ?`,
        [cluster.cluster_id]
      );

      // 2. Insert inactive snapshot
      const inactiveSnapshotSql = `
        INSERT INTO cluster_snapshots 
        (collected_at, cluster_id, topic_name, tags, appearance_count, article_count, article_indices, status, cluster_score)
        VALUES (?, ?, ?, ?, ?, 0, '[]', 'inactive', 0)
      `;
      await connection.execute(inactiveSnapshotSql, [
        collectedAt,
        cluster.cluster_id,
        cluster.topic_name,
        typeof cluster.tags === 'string' ? cluster.tags : JSON.stringify(cluster.tags),
        cluster.appearance_count
      ]);

      console.log(`   ⛔ Deactivated cluster: ${cluster.cluster_id}`);
    }
  }
}

/**
 * Cluster_Snapshots에 현재 상태 기록
 * - 활성 클러스터만 저장
 */
async function saveClusterSnapshots(
  connection: PoolConnection,
  gptClusters: GPTClusterOutput[],
  collectedAt: string
): Promise<void> {
  const sql = `
    INSERT INTO cluster_snapshots 
    (collected_at, cluster_id, topic_name, tags, appearance_count, article_count, article_indices, status, cluster_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `;

  for (const cluster of gptClusters) {
    await connection.execute(sql, [
      collectedAt,
      cluster.cluster_id,
      cluster.topic_name,
      JSON.stringify(cluster.tags),
      cluster.appearance_count,
      cluster.article_count,
      JSON.stringify(cluster.article_indices),
      calculateClusterScore(cluster.appearance_count)
    ]);
  }

  console.log(`   📸 Saved ${gptClusters.length} cluster snapshots`);
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
  console.log("\n========== Saving Classification Results to DB (MySQL) ==========\n");

  const collectedAt = classificationResult.processed_at;
  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: 기존 클러스터 조회 (for logic check)
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
        await updateExistingCluster(connection, existingCluster, gptCluster, collectedAt);
      } else {
        // 생성
        await createNewCluster(connection, gptCluster, collectedAt);
      }
    }
    console.log("");

    // Step 3: 비활성화 처리
    console.log("⛔ Deactivating missing clusters...");
    await deactivateMissingClusters(connection, gptClusterIds, collectedAt);
    console.log("");

    // Step 4: Snapshots 저장 (활성 클러스터)
    console.log("📸 Saving cluster snapshots...");
    await saveClusterSnapshots(connection, classificationResult.clusters, collectedAt);
    console.log("");

    await connection.commit();
    console.log("✅ DB save completed successfully!\n");

    // 통계
    const updatedCount = classificationResult.clusters.filter((c) =>
      clusterMap.has(c.cluster_id)
    ).length;
    const createdCount = classificationResult.clusters.length - updatedCount;

    // Note: This deactivated count is an approximation based on what we fetched initially.
    // The actual deactivated count is logged in deactivateMissingClusters.
    const deactivatedCount = existingClusters.filter(c => c.status === 'active' && !gptClusterIds.has(c.cluster_id)).length;

    console.log("📊 Summary:");
    console.log(`   - Updated: ${updatedCount}`);
    console.log(`   - Created: ${createdCount}`);
    console.log(`   - Deactivated: ${deactivatedCount}`);
    console.log(`   - Current active: ${classificationResult.clusters.length}`);

  } catch (error) {
    await connection.rollback();
    console.error("❌ Error saving to DB:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// ============ Export ============

export {
  saveClassificationResultToDB,
  calculateClusterScore,
  ClusterDocument,
  ClusterSnapshot,
  GPTClusterOutput,
  GPTClassificationResult,
};
