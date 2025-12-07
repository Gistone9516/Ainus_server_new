/**
 * AI 뉴스 기사 태그 분류 - GPT Assistant API 호출
 *
 * 역할:
 * - OpenAI Assistants API를 사용하여 기사 태그 분류
 * - 사전 정의된 Assistant 사용 (프롬프트 입력 완료)
 * - JSON 응답 파싱 및 반환
 */

import OpenAI from 'openai';
import type { TextContentBlock } from 'openai/resources/beta/threads/messages';
import { getConfig } from '../../config/environment';
import {
  TaggingGPTInput,
  GPTTaggingResponse,
  TaggingResult,
  PreprocessedArticleForTagging,
} from '@/types/news-tagging';

// ============ 설정 ============

const config = getConfig();

const openai = new OpenAI({
  apiKey: config.externalApis.openai.apiKey,
});

/**
 * 사전 정의된 GPT Assistant ID
 * 프롬프트가 이미 입력되어 있음
 */
const TAGGING_ASSISTANT_ID = config.externalApis.openai.assistants.tagging;

// ============ GPT API 호출 ============

/**
 * GPT Assistant를 사용하여 기사 태그 분류
 *
 * 프로세스:
 * 1. Thread 생성
 * 2. 전처리된 데이터를 메시지로 전송
 * 3. Assistant 실행
 * 4. 완료 대기 (polling)
 * 5. 응답 추출
 *
 * @param input - 전처리된 기사 데이터
 * @returns 분류 결과
 */
export async function classifyArticlesWithGPT(
  input: TaggingGPTInput
): Promise<GPTTaggingResponse> {
  console.log('🤖 Calling GPT Assistant for tagging...');
  console.log(`   - Articles: ${input.articles.length}`);
  console.log(`   - Assistant ID: ${TAGGING_ASSISTANT_ID}\n`);

  try {
    // Step 1: Thread 생성
    console.log('📌 Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log(`   ✅ Thread created: ${thread.id}\n`);

    // Step 2: 메시지 전송
    console.log('📤 Sending data to Assistant...');
    const userMessage = JSON.stringify(input, null, 2);

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage,
    });
    console.log(`   ✅ Data sent (${userMessage.length} chars)\n`);

    // Step 3: Assistant 실행
    console.log('⏳ Waiting for Assistant response...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: TAGGING_ASSISTANT_ID,
    });

    // Step 4: 완료 대기 (polling)
    let runStatus = run.status;
    let pollCount = 0;
    const maxPolls = 300; // 최대 5분 (1초마다 × 300회)

    while (runStatus === 'queued' || runStatus === 'in_progress') {
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

    if (runStatus === 'failed') {
      throw new Error(`Assistant run failed: ${run.last_error}`);
    }

    if (runStatus === 'expired') {
      throw new Error('Assistant run expired');
    }

    if (runStatus === 'cancelled') {
      throw new Error('Assistant run was cancelled');
    }

    console.log(`   ✅ Assistant completed in ${pollCount}s\n`);

    // Step 5: 응답 추출
    console.log('📥 Extracting response...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === 'assistant'
    );

    if (!assistantMessage || assistantMessage.content.length === 0) {
      throw new Error('No response from Assistant');
    }

    const textContent = assistantMessage.content.find(
      (content): content is TextContentBlock => content.type === 'text'
    );

    if (!textContent) {
      throw new Error('Assistant response is empty');
    }

    const rawResponse = textContent.text.value;
    console.log(`   ✅ Response extracted (${rawResponse.length} chars)\n`);

    // Step 6: JSON 파싱
    const parsedResult = extractJSONFromResponse(rawResponse);

    return {
      classifications: parsedResult.classifications,
      raw_response: rawResponse,
      processed_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error calling Assistant:', error);
    throw error;
  }
}

// ============ 응답 파싱 ============

/**
 * Assistant 응답에서 JSON 추출
 *
 * - 마크다운 코드 블록 제거
 * - JSON 객체 추출
 *
 * @param rawResponse - API 응답 텍스트
 * @returns 파싱된 JSON
 */
function extractJSONFromResponse(
  rawResponse: string
): { classifications: TaggingResult[] } {
  console.log('📝 Extracting JSON from response...');

  let cleanedResponse = rawResponse;

  // 마크다운 코드 블록 제거 (```json ... ```)
  const jsonBlockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    cleanedResponse = jsonBlockMatch[1];
    console.log('   ✅ Removed markdown code block');
  }

  // JSON 객체 추출 ({ ... "classifications" ... })
  const jsonMatch = cleanedResponse.match(/\{[\s\S]*"classifications"[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('   ❌ No valid JSON found');
    console.error('   Raw response preview:', rawResponse.substring(0, 500));
    throw new Error('No valid JSON found in response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      classifications: TaggingResult[];
    };

    console.log(
      `   ✅ Successfully parsed ${parsed.classifications.length} classifications\n`
    );

    return parsed;
  } catch (error) {
    console.error('   ❌ JSON parsing failed');
    console.error('   Attempted to parse:', jsonMatch[0].substring(0, 500));
    throw new Error(`JSON parsing failed: ${error}`);
  }
}

// ============ 배치 처리 ============

/**
 * 대량 기사 처리를 위한 배치 분류
 *
 * @param input - 전처리된 기사 데이터
 * @param batchSize - 배치당 처리할 기사 수 (기본 1000)
 * @returns 전체 분류 결과
 */
export async function classifyArticlesInBatches(
  input: TaggingGPTInput,
  batchSize: number = 1000
): Promise<GPTTaggingResponse> {
  const totalArticles = input.articles.length;

  console.log('🤖 Starting batch classification...');
  console.log(`   - Total articles: ${totalArticles}`);
  console.log(`   - Batch size: ${batchSize}`);
  console.log(`   - Batches: ${Math.ceil(totalArticles / batchSize)}\n`);

  // 배치가 필요 없으면 바로 처리
  if (totalArticles <= batchSize) {
    return await classifyArticlesWithGPT(input);
  }

  // 배치로 나누기
  const batches: PreprocessedArticleForTagging[][] = [];
  for (let i = 0; i < totalArticles; i += batchSize) {
    batches.push(input.articles.slice(i, i + batchSize));
  }

  // 각 배치 처리
  const allClassifications: TaggingResult[] = [];
  const allRawResponses: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(
      `📦 Processing batch ${i + 1}/${batches.length} (${batch.length} articles)...`
    );

    const batchInput: TaggingGPTInput = {
      articles: batch,
    };

    try {
      const result = await classifyArticlesWithGPT(batchInput);
      allClassifications.push(...result.classifications);
      allRawResponses.push(result.raw_response);

      console.log(`   ✅ Batch ${i + 1} completed\n`);

      // API Rate Limit 고려 (배치 간 1초 대기)
      if (i < batches.length - 1) {
        console.log('   ⏳ Waiting 1s before next batch...\n');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ Batch ${i + 1} failed:`, error);
      throw new Error(`Batch ${i + 1} classification failed: ${error}`);
    }
  }

  return {
    classifications: allClassifications,
    raw_response: allRawResponses.join('\n---BATCH_SEPARATOR---\n'),
    processed_at: new Date().toISOString(),
  };
}

// ============ Export ============

export { TAGGING_ASSISTANT_ID, extractJSONFromResponse };
