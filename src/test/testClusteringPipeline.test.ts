import * as fc from "fast-check";
import { formatClusteringResult } from "./testClusteringPipeline";
import { PipelineResult } from "../services/news/news-clustering-pipeline";

/**
 * Property-Based Tests for Clustering Pipeline
 * 
 * **Feature: test-commands, Property 2: Successful result output contains required information**
 * **Validates: Requirements 2.2**
 */
describe("Clustering Pipeline Output Formatting", () => {
  /**
   * Arbitrary generator for successful PipelineResult
   */
  const successfulPipelineResultArb: fc.Arbitrary<PipelineResult> = fc.record({
    status: fc.constant("success" as const),
    message: fc.string(),
    executedAt: fc.date().map((d) => d.toISOString()),
    duration: fc.integer({ min: 0, max: 1000000 }),
    clusters_created: fc.integer({ min: 0, max: 10000 }),
    clusters_updated: fc.integer({ min: 0, max: 10000 }),
    issue_index: fc.float({ min: 0, max: 100, noNaN: true }),
  });

  /**
   * Arbitrary generator for failed PipelineResult
   */
  const failedPipelineResultArb: fc.Arbitrary<PipelineResult> = fc.record({
    status: fc.constant("failure" as const),
    message: fc.string(),
    executedAt: fc.date().map((d) => d.toISOString()),
    duration: fc.integer({ min: 0, max: 1000000 }),
    clusters_created: fc.constant(0),
    clusters_updated: fc.constant(0),
    issue_index: fc.constant(0),
    error: fc.option(fc.string(), { nil: undefined }),
  });

  /**
   * **Feature: test-commands, Property 2: Successful result output contains required information**
   * **Validates: Requirements 2.2**
   * 
   * For any successful pipeline test result, the formatted output SHALL contain:
   * - The execution duration
   * - The issue index result
   */
  it("should contain execution duration in formatted output for successful results", () => {
    fc.assert(
      fc.property(successfulPipelineResultArb, (result) => {
        const output = formatClusteringResult(result);
        
        // Output must contain the duration value
        expect(output).toContain(`${result.duration}ms`);
        
        // Output must contain the duration in seconds format
        expect(output).toContain(`${(result.duration / 1000).toFixed(2)}초`);
        
        // Output must contain the issue index
        expect(output).toContain(`이슈 지수: ${result.issue_index}`);
        
        // Output must indicate success
        expect(output).toContain("성공");
      }),
      { numRuns: 100 }
    );
  });

  /**
   * For any failed pipeline test result, the formatted output SHALL contain:
   * - The execution duration
   * - Failure indication
   */
  it("should contain execution duration in formatted output for failed results", () => {
    fc.assert(
      fc.property(failedPipelineResultArb, (result) => {
        const output = formatClusteringResult(result);
        
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
