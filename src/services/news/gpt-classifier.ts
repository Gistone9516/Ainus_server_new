/**
 * OpenAI Assistants API를 사용한 뉴스 클러스터 분류
 *
 * Assistant ID: config.externalApis.openai.assistants.newsClassifier
 * (사전 프롬프트가 이미 입력되어 있음)
 *
 * 역할:
 * - 입력된 뉴스를 주제별로 분류 (최대 1000개)
 * - 40개 표준 태그 중 5개씩 할당
 * - 모든 기사를 정확히 하나의 클러스터에 할당
 */

import OpenAI from "openai";
import type { TextContentBlock } from "openai/resources/beta/threads/messages";
import { getConfig } from "../../config/environment";

const config = getConfig();

// ============ Type 정의 ============

interface GPTInputData {
  new_articles: Array<{ index: number; title: string }>;
  previous_clusters: Array<{
    cluster_id: string;
    topic_name: string;
    tags: string[];
    appearance_count: number;
    status: "active" | "inactive";
  }>;
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

// ============ OpenAI 클라이언트 초기화 ============

const openai = new OpenAI({
  apiKey: config.externalApis.openai.apiKey,
});

const ASSISTANT_ID = config.externalApis.openai.assistants.newsClassifier;

// ============ Assistants API 호출 ============

/**
 * Assistants API를 사용하여 뉴스 분류
 *
 * 프로세스:
 * 1. Thread 생성
 * 2. 전처리 데이터 전송
 * 3. Assistant가 응답할 때까지 대기
 * 4. 응답 추출
 *
 * @param gptInput 전처리된 입력 데이터
 * @returns 분류 결과
 */
async function callAssistantClassifier(
  gptInput: GPTInputData
): Promise<GPTClassificationResult> {
  console.log("🚀 Calling OpenAI Assistants API for classification...");
  console.log(`   - Articles: ${gptInput.new_articles.length}`);
  console.log(`   - Previous clusters: ${gptInput.previous_clusters.length}`);
  console.log(`   - Assistant ID: ${ASSISTANT_ID}\n`);

  try {
    // Step 1: Thread 생성
    console.log("📌 Creating thread...");
    const thread = await openai.beta.threads.create();
    console.log(`   ✅ Thread created: ${thread.id}\n`);

    // Step 2: 전처리 데이터를 메시지로 전송
    // (사전 프롬프트는 이미 Assistant에 입력되어 있으므로 데이터만 전송)
    console.log("📤 Sending data to Assistant...");
    const userMessage = JSON.stringify(gptInput, null, 2);

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });
    console.log(`   ✅ Data sent\n`);

    // Step 3: Assistant 실행
    console.log("⏳ Waiting for Assistant response...");
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // Run이 완료될 때까지 대기 (polling)
    let runStatus = run.status;
    let pollCount = 0;
    const maxPolls = 300; // 최대 5분 (1초마다 × 300회)

    while (
      runStatus === "queued" ||
      runStatus === "in_progress"
    ) {
      if (pollCount >= maxPolls) {
        throw new Error(
          `Assistant response timeout after ${maxPolls} seconds`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 대기
      const updatedRun = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id
      );
      runStatus = updatedRun.status;
      pollCount++;

      if (pollCount % 10 === 0) {
        console.log(`   ⏳ Waiting... (${pollCount}s) - Status: ${runStatus}`);
      }
    }

    if (runStatus === "failed") {
      throw new Error(`Assistant run failed: ${run.last_error}`);
    }

    if (runStatus === "expired") {
      throw new Error("Assistant run expired");
    }

    if (runStatus === "cancelled") {
      throw new Error("Assistant run was cancelled");
    }

    console.log(`   ✅ Assistant completed in ${pollCount}s\n`);

    // Step 4: 응답 추출
    console.log("📥 Extracting response...");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === "assistant"
    );

    if (!assistantMessage || assistantMessage.content.length === 0) {
      throw new Error("No response from Assistant");
    }

    const textContent = assistantMessage.content.find(
      (content): content is TextContentBlock => content.type === "text"
    );

    if (!textContent) {
      throw new Error("Assistant response is empty");
    }

    const rawResponse = textContent.text.value;

    console.log(
      `   ✅ Response extracted (${rawResponse.length} characters)\n`
    );

    return {
      clusters: [],
      raw_response: rawResponse,
      processed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Error calling Assistant:", error);
    throw error;
  }
}

// ============ 응답 파싱 ============

/**
 * Assistant 응답에서 JSON 배열 추출
 * - 마크다운 코드 블록 제거
 * - JSON 배열 추출
 *
 * @param rawResponse API 응답 텍스트
 * @returns 파싱된 JSON 배열
 */
function extractJSONFromResponse(rawResponse: string): GPTClusterOutput[] {
  console.log("📝 Extracting JSON from response...");

  let cleanedResponse = rawResponse;

  // 마크다운 코드 블록 제거 (```json ... ```)
  const jsonBlockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    cleanedResponse = jsonBlockMatch[1];
    console.log("   ✅ Removed markdown code block");
  }

  // JSON 배열 추출 ([ ... ] 패턴)
  const jsonArrayMatch = cleanedResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (!jsonArrayMatch) {
    throw new Error("No valid JSON array found in response");
  }

  const jsonString = jsonArrayMatch[0];
  const parsed = JSON.parse(jsonString) as GPTClusterOutput[];

  console.log(`   ✅ Successfully parsed ${parsed.length} clusters\n`);

  return parsed;
}

/**
 * GPT 출력 정제 (중복 제거 및 유효성 보정)
 * 
 * - 중복된 기사 인덱스 제거 (첫 번째 할당만 유지)
 * - 유효 범위를 벗어난 인덱스 제거
 * - article_count를 실제 article_indices 길이로 보정
 * 
 * @param clusters 파싱된 클러스터 배열
 * @param maxArticleIndex 최대 유효 인덱스 (기사 수 - 1)
 * @returns 정제된 클러스터 배열
 */
function sanitizeGPTOutput(clusters: GPTClusterOutput[], maxArticleIndex: number): GPTClusterOutput[] {
  console.log("🧹 Sanitizing GPT output...");
  
  const usedIndices = new Set<number>();
  let duplicatesRemoved = 0;
  let invalidIndicesRemoved = 0;
  
  const sanitizedClusters = clusters.map((cluster) => {
    const validIndices: number[] = [];
    
    cluster.article_indices.forEach((idx) => {
      // 유효 범위 체크 (0 ~ maxArticleIndex)
      if (idx < 0 || idx > maxArticleIndex) {
        invalidIndicesRemoved++;
        return;
      }
      
      // 중복 체크
      if (usedIndices.has(idx)) {
        duplicatesRemoved++;
        return;
      }
      
      usedIndices.add(idx);
      validIndices.push(idx);
    });
    
    return {
      ...cluster,
      article_indices: validIndices,
      article_count: validIndices.length,
    };
  });
  
  // 기사가 없는 클러스터 제거
  const nonEmptyClusters = sanitizedClusters.filter(c => c.article_indices.length > 0);
  const emptyClustersRemoved = sanitizedClusters.length - nonEmptyClusters.length;
  
  console.log(`   ✅ Sanitization complete:`);
  console.log(`      - Duplicate indices removed: ${duplicatesRemoved}`);
  console.log(`      - Invalid indices removed: ${invalidIndicesRemoved}`);
  console.log(`      - Empty clusters removed: ${emptyClustersRemoved}`);
  console.log(`      - Final clusters: ${nonEmptyClusters.length}\n`);
  
  return nonEmptyClusters;
}

/**
 * Assistant 출력 검증
 *
 * 검사 항목 (에러 - 파이프라인 중단):
 * - cluster_id, topic_name, tags 필수
 * - tags는 정확히 5개
 * - article_indices와 article_count 일치
 * - 중복 인덱스 없음
 * - appearance_count는 양수
 * 
 * 검사 항목 (경고 - 파이프라인 계속):
 * - 일부 기사가 할당되지 않음 (입력 기사 수와 불일치)
 *
 * @param clusters 파싱된 클러스터 배열
 * @param expectedArticleCount 입력된 기사 수
 * @returns 검증 결과
 */
function validateGPTOutput(clusters: GPTClusterOutput[], expectedArticleCount: number): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  console.log("🔍 Validating GPT output...");

  const errors: string[] = [];
  const warnings: string[] = [];

  // 빈 배열 체크
  if (clusters.length === 0) {
    errors.push("Cluster array is empty");
  }

  let totalArticles = 0;
  const usedIndices = new Set<number>();

  clusters.forEach((cluster, idx) => {
    // cluster_id 체크
    if (!cluster.cluster_id || typeof cluster.cluster_id !== "string") {
      errors.push(`[Cluster ${idx}] Missing or invalid cluster_id`);
    }

    // topic_name 체크
    if (!cluster.topic_name || typeof cluster.topic_name !== "string") {
      errors.push(`[Cluster ${idx}] Missing or invalid topic_name`);
    }

    // tags 체크 (정확히 5개)
    if (
      !Array.isArray(cluster.tags) ||
      cluster.tags.length !== 5 ||
      cluster.tags.some((tag) => typeof tag !== "string")
    ) {
      errors.push(
        `[Cluster ${cluster.cluster_id}] Tags must be exactly 5 strings, got ${cluster.tags?.length}`
      );
    }

    // article_indices 체크
    if (
      !Array.isArray(cluster.article_indices) ||
      cluster.article_indices.some((idx) => typeof idx !== "number")
    ) {
      errors.push(
        `[Cluster ${cluster.cluster_id}] article_indices must be an array of numbers`
      );
    }

    // article_count 체크
    if (cluster.article_count !== cluster.article_indices.length) {
      errors.push(
        `[Cluster ${cluster.cluster_id}] article_count (${cluster.article_count}) does not match article_indices length (${cluster.article_indices.length})`
      );
    }

    // appearance_count 체크
    if (
      typeof cluster.appearance_count !== "number" ||
      cluster.appearance_count < 1
    ) {
      errors.push(
        `[Cluster ${cluster.cluster_id}] appearance_count must be a positive number`
      );
    }

    // 중복 인덱스 체크
    cluster.article_indices.forEach((articleIdx) => {
      if (usedIndices.has(articleIdx)) {
        errors.push(
          `[Cluster ${cluster.cluster_id}] Duplicate article index: ${articleIdx}`
        );
      }
      usedIndices.add(articleIdx);
    });

    totalArticles += cluster.article_indices.length;
  });

  // 총 기사 수 체크 (경고 - 일부 기사 누락은 허용)
  if (totalArticles !== expectedArticleCount) {
    const diff = expectedArticleCount - totalArticles;
    warnings.push(`${diff} articles not classified (${totalArticles}/${expectedArticleCount})`);
  }

  const isValid = errors.length === 0;

  if (isValid && warnings.length === 0) {
    console.log("   ✅ All validations passed\n");
  } else {
    if (errors.length > 0) {
      console.log(`   ❌ ${errors.length} validation errors found:`);
      errors.forEach((error) => console.log(`      - ${error}`));
    }
    if (warnings.length > 0) {
      console.log(`   ⚠️ ${warnings.length} warnings:`);
      warnings.forEach((warning) => console.log(`      - ${warning}`));
    }
    console.log("");
  }

  return { isValid, errors, warnings };
}

// ============ 메인 함수 ============

/**
 * 전체 분류 파이프라인
 *
 * 프로세스:
 * 1. Assistants API 호출
 * 2. 응답 파싱
 * 3. GPT 출력 정제 (중복 제거 및 유효성 보정)
 * 4. 검증
 * 5. 최종 결과 반환
 *
 * @param gptInput 전처리된 입력 데이터
 * @returns 최종 분류 결과
 */
async function classifyNewsWithGPT(
  gptInput: GPTInputData
): Promise<GPTClassificationResult> {
  console.log(
    "\n========== Starting News Classification Pipeline ==========\n"
  );

  try {
    // Step 1: Assistants API 호출
    const result = await callAssistantClassifier(gptInput);

    // Step 2: JSON 응답 파싱
    const parsedClusters = extractJSONFromResponse(result.raw_response);

    // Step 3: GPT 출력 정제 (중복 제거 및 유효성 보정)
    const expectedArticleCount = gptInput.new_articles.length;
    const sanitizedClusters = sanitizeGPTOutput(parsedClusters, expectedArticleCount - 1);

    // Step 4: 검증 (입력된 기사 수 기준)
    const validation = validateGPTOutput(sanitizedClusters, expectedArticleCount);

    if (!validation.isValid) {
      console.error("\n❌ Validation failed!");
      console.error(validation.errors);
      throw new Error(
        `Validation failed: ${validation.errors.join(", ")}`
      );
    }

    // 경고가 있어도 파이프라인은 계속 진행
    if (validation.warnings.length > 0) {
      console.warn("\n⚠️ Validation warnings (pipeline continues):");
      validation.warnings.forEach((w) => console.warn(`   - ${w}`));
    }

    // Step 5: 최종 결과 반환
    const finalResult: GPTClassificationResult = {
      clusters: sanitizedClusters,
      raw_response: result.raw_response,
      processed_at: result.processed_at,
    };

    console.log("\n✅ Classification completed successfully!");
    console.log(`   - Clusters created: ${finalResult.clusters.length}`);
    console.log(
      `   - Total articles classified: ${finalResult.clusters.reduce((sum, c) => sum + c.article_count, 0)}`
    );
    console.log("");

    return finalResult;
  } catch (error) {
    console.error("\n❌ Classification pipeline failed:", error);
    throw error;
  }
}

// ============ Export ============

export {
  classifyNewsWithGPT,
  callAssistantClassifier,
  extractJSONFromResponse,
  sanitizeGPTOutput,
  validateGPTOutput,
  GPTClassificationResult,
  GPTClusterOutput,
  GPTInputData,
};
