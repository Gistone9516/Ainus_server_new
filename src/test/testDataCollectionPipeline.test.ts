import * as fc from "fast-check";
import { isValidMode, VALID_MODES } from "./testDataCollectionPipeline";

/**
 * Property-Based Tests for Data Collection Pipeline Mode Handling
 * 
 * **Feature: test-commands, Property 3: Invalid mode produces helpful error**
 * **Validates: Requirements 4.2**
 */
describe("Data Collection Pipeline Mode Validation", () => {
  /**
   * Arbitrary generator for valid modes
   */
  const validModeArb = fc.constantFrom(...VALID_MODES);

  /**
   * Arbitrary generator for invalid modes
   * Generates strings that are NOT in the VALID_MODES array
   */
  const invalidModeArb = fc.string().filter(
    (s) => !VALID_MODES.includes(s as typeof VALID_MODES[number])
  );

  /**
   * **Feature: test-commands, Property 3: Invalid mode produces helpful error**
   * **Validates: Requirements 4.2**
   * 
   * For any valid mode argument (all, schedule, naver, aa), 
   * isValidMode SHALL return true
   */
  it("should return true for all valid modes", () => {
    fc.assert(
      fc.property(validModeArb, (mode) => {
        expect(isValidMode(mode)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: test-commands, Property 3: Invalid mode produces helpful error**
   * **Validates: Requirements 4.2**
   * 
   * For any invalid mode argument, isValidMode SHALL return false
   */
  it("should return false for all invalid modes", () => {
    fc.assert(
      fc.property(invalidModeArb, (mode) => {
        expect(isValidMode(mode)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Verify that VALID_MODES contains exactly the expected modes
   */
  it("should have exactly four valid modes", () => {
    expect(VALID_MODES).toHaveLength(4);
    expect(VALID_MODES).toContain("all");
    expect(VALID_MODES).toContain("schedule");
    expect(VALID_MODES).toContain("naver");
    expect(VALID_MODES).toContain("aa");
  });
});
