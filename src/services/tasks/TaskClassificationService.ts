/**
 * 작업 분류 서비스 - GPT Assistant API 호출
 *
 * 역할:
 * - OpenAI Assistants API를 사용하여 사용자 입력을 25개 작업 카테고리 중 하나로 분류
 * - 사전 정의된 Assistant 사용 (프롬프트 입력 완료)
 * - JSON 응답 파싱 및 반환
 */

import OpenAI from 'openai';
import type { TextContentBlock } from 'openai/resources/beta/threads/messages';
import {
  GPTClassificationInput,
  GPTClassificationRawResponse,
  TaskClassificationResult,
} from '@/types/task.types';
import { taskRepository } from '@/services/repositories/taskRepository';

// ============ 설정 ============

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 사전 정의된 GPT Assistant ID
 * 25개 작업 카테고리 분류 프롬프트가 이미 입력되어 있음
 */
const TASK_CLASSIFICATION_ASSISTANT_ID = 'asst_Gcnizfrb5zBdESEl3C03Su2o';

// ============ GPT API 호출 ============

/**
 * GPT Assistant를 사용하여 작업 분류
 *
 * 프로세스:
 * 1. Thread 생성
 * 2. 사용자 입력을 메시지로 전송
 * 3. Assistant 실행
 * 4. 완료 대기 (polling)
 * 5. 응답 추출
 *
 * @param userInput - 사용자 입력 텍스트
 * @returns GPT 분류 결과
 */
async function callGPTAssistant(
  userInput: string
): Promise<GPTClassificationRawResponse> {
  console.log('🤖 Calling GPT Assistant for task classification...');
  console.log(`   - User input: "${userInput}"`);
  console.log(`   - Assistant ID: ${TASK_CLASSIFICATION_ASSISTANT_ID}\n`);

  try {
    // Step 1: Thread 생성
    console.log('📌 Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log(`   ✅ Thread created: ${thread.id}\n`);

    // Step 2: 메시지 전송
    console.log('📤 Sending user input to Assistant...');
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userInput,
    });
    console.log(`   ✅ Message sent\n`);

    // Step 3: Assistant 실행
    console.log('⏳ Waiting for Assistant response...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: TASK_CLASSIFICATION_ASSISTANT_ID,
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

    return parsedResult;
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
): GPTClassificationRawResponse {
  console.log('📝 Extracting JSON from response...');

  let cleanedResponse = rawResponse;

  // 마크다운 코드 블록 제거 (```json ... ```)
  const jsonBlockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    cleanedResponse = jsonBlockMatch[1];
    console.log('   ✅ Removed markdown code block');
  }

  // JSON 객체 추출 ({ ... })
  const jsonMatch = cleanedResponse.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) {
    console.error('   ❌ No valid JSON found');
    console.error('   Raw response preview:', rawResponse.substring(0, 500));
    throw new Error('No valid JSON found in response');
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as GPTClassificationRawResponse;

    // 필수 필드 검증
    if (!parsed.category_code || typeof parsed.category_code !== 'string') {
      throw new Error('Missing or invalid category_code in response');
    }

    if (
      parsed.confidence_score === undefined ||
      typeof parsed.confidence_score !== 'number'
    ) {
      throw new Error('Missing or invalid confidence_score in response');
    }

    console.log(
      `   ✅ Successfully parsed: ${parsed.category_code} (${parsed.confidence_score}% confidence)\n`
    );

    return parsed;
  } catch (error) {
    console.error('   ❌ JSON parsing failed');
    console.error('   Attempted to parse:', jsonMatch[0].substring(0, 500));
    throw new Error(`JSON parsing failed: ${error}`);
  }
}

// ============ 메인 함수 ============

/**
 * 사용자 입력을 25개 작업 카테고리로 분류
 *
 * 프로세스:
 * 1. GPT Assistant 호출
 * 2. DB에서 카테고리 정보 조회
 * 3. 최종 결과 반환
 *
 * @param userInput - 사용자 입력 텍스트
 * @returns 작업 분류 결과
 */
export async function classifyTask(
  userInput: string
): Promise<TaskClassificationResult> {
  console.log(
    '\n========== Starting Task Classification ==========\n'
  );
  console.log(`User input: "${userInput}"\n`);

  try {
    // Step 1: GPT Assistant 호출
    const gptResponse = await callGPTAssistant(userInput);

    // Step 2: DB에서 카테고리 정보 조회
    console.log('🔍 Looking up category in database...');
    const category = await taskRepository.getCategoryByCode(
      gptResponse.category_code
    );

    if (!category) {
      throw new Error(
        `Category not found in database: ${gptResponse.category_code}`
      );
    }

    console.log(
      `   ✅ Category found: ${category.category_name_ko} (${category.category_code})\n`
    );

    // Step 3: 최종 결과 반환
    const result: TaskClassificationResult = {
      task_category_id: category.task_category_id,
      category_code: category.category_code,
      category_name_ko: category.category_name_ko,
      category_name_en: category.category_name_en,
      confidence_score: gptResponse.confidence_score,
      reasoning: gptResponse.reasoning || '',
    };

    console.log('✅ Classification completed successfully!');
    console.log(`   - Category: ${result.category_name_ko}`);
    console.log(`   - Confidence: ${result.confidence_score}%\n`);

    return result;
  } catch (error) {
    console.error('\n❌ Classification failed:', error);
    throw error;
  }
}

// ============ Export ============

export { TASK_CLASSIFICATION_ASSISTANT_ID, extractJSONFromResponse };
