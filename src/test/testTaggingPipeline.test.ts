import * as fc from "fast-check";
import { formatTaggingResult } from "./testTaggingPipeline";
import { TaggingPipelineResult } from "../types/news-tagging";

/**
 * Property-Based Tests for Tagging Pipeline
 * 
 * **Feature: test-commands, Property 2: Successful result output contains required information**
 * **Validates: Requirements 3.2**
 */
describe("Tagging Pipeline Output Formatting", () => {
  /**
   * Arbitrary generator for valid ISO date strings
   * Using integer timestamps to avoid invalid date issues
   */
  const validDateArb = fc.integer({
    min: new Date("2000-01-01").getTime(),
    max: new Date("2100-01-01").getTime(),
  }).map((timestamp) => new Date(timestamp).toISOString());

  /**
   * Arbitrary generator for successful TaggingPipelineResult
   */
  const successfulTaggingResultArb: fc.Arbitrary<TaggingPipelineResult> = fc.record({
    status: fc.constant("success" as const),
    message: fc.string(),
    executedAt: validDateArb,
    duration: fc.integer({ min: 0, max: 1000000 }),
    articlesProcessed: fc.integer({ min: 0, max: 10000 }),
    tagsMapped: fc.integer({ min: 0, max: 50000 }),
  });

  /**
   * Arbitrary generator for failed TaggingPipelineResult
   */
  const failedTaggingResultArb: fc.Arbitrary<TaggingPipelineResult> = fc.record({
    status: fc.constant("failure" as const),
    message: fc.string(),
    executedAt: validDateArb,
    duration: fc.integer({ min: 0, max: 1000000 }),
    articlesProcessed: fc.constant(0),
    tagsMapped: fc.constant(0),
    error: fc.option(fc.string(), { nil: undefined }),
  });

  /**
   * **Feature: test-commands, Property 2: Successful result output contains required information**
   * **Validates: Requirements 3.2**
   * 
   * For any successful tagging pipeline test result, the formatted output SHALL contain:
   * - The execution duration
   * - The number of articles processed
   * - The number of tags mapped
   */
  it("should contain execution duration, articles processed, and tags mapped in formatted output for successful results", () => {
    fc.assert(
      fc.property(successfulTaggingResultArb, (result) => {
        const output = formatTaggingResult(result);
        
        // Output must contain the duration value
        expect(output).toContain(`${result.duration}ms`);
        
        // Output must contain the duration in seconds format
        expect(output).toContain(`${(result.duration / 1000).toFixed(2)}초`);
        
        // Output must contain the articles processed count
        expect(output).toContain(`처리된 기사 수: ${result.articlesProcessed}`);
        
        // Output must contain the tags mapped count
        expect(output).toContain(`매핑된 태그 수: ${result.tagsMapped}`);
        
        // Output must indicate success
        expect(output).toContain("성공");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any failed tagging pipeline test result, the formatted output SHALL contain:
   * - The execution duration
   * - Failure indication
   */
  it("should contain execution duration in formatted output for failed results", () => {
    fc.assert(
      fc.property(failedTaggingResultArb, (result) => {
        const output = formatTaggingResult(result);
        
        // Output must contain the duration value
        expect(output).toContain(`${result.duration}ms`);
        
        // Output must contain the duration in seconds format
        expect(output).toContain(`${(result.duration / 1000).toFixed(2)}초`);
        
        // Output must indicate failure
        expect(output).toContain("실패");
      }),
      { numRuns: 100 }
    );
  });
});
