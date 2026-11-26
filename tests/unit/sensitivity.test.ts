import { describe, expect, it } from "vitest";
import {
  CRITERION_CODES,
  WeightSensitivityError,
  buildDecisionEvaluation,
  rebalanceWeightsOneAtATime,
  runSaw,
  runWeightSensitivityScenario,
  runWeightSensitivitySuite,
  type SawAlternativeMetricInput,
} from "@/lib/decision";

const SYNTHETIC_WEIGHTS = [0.25, 0.2, 0.18, 0.12, 0.1, 0.15];

function makeAlt(
  code: string,
  overrides?: Partial<SawAlternativeMetricInput["criteria"]>,
): SawAlternativeMetricInput {
  return {
    id: `syn-${code}`,
    code,
    model: `Synthetic Model ${code}`,
    criteria: {
      C1: 10_000_000,
      C2: 15_000,
      C3: 16,
      C4: 512,
      C5: 1.4,
      C6: 55,
      ...overrides,
    },
  };
}

describe("One-At-A-Time Weight Sensitivity Engine (synthetic unit tests)", () => {
  it("rebalances one criterion weight while scaling remaining 5 weights proportionally and preserving sum = 1", () => {
    const baseCopy = [...SYNTHETIC_WEIGHTS];
    const adjusted = rebalanceWeightsOneAtATime(SYNTHETIC_WEIGHTS, "C2", 0.2);

    // Input must never be mutated
    expect(SYNTHETIC_WEIGHTS).toEqual(baseCopy);

    const w2New = 0.2 * 1.2;
    const scale = (1 - w2New) / (1 - 0.2);
    expect(adjusted[1]).toBeCloseTo(w2New, 12);
    expect(adjusted[0]).toBeCloseTo(0.25 * scale, 12);
    expect(adjusted[2]).toBeCloseTo(0.18 * scale, 12);
    expect(adjusted[3]).toBeCloseTo(0.12 * scale, 12);
    expect(adjusted[4]).toBeCloseTo(0.1 * scale, 12);
    expect(adjusted[5]).toBeCloseTo(0.15 * scale, 12);

    const sum = adjusted.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
    expect(adjusted.every((w) => w > 0)).toBe(true);
  });

  it("rejects deltas that push a weight out of (0, 1) or invalid base weight vectors", () => {
    expect(() => rebalanceWeightsOneAtATime(SYNTHETIC_WEIGHTS, "C1", -1)).toThrow(
      WeightSensitivityError,
    );
    expect(() => rebalanceWeightsOneAtATime(SYNTHETIC_WEIGHTS, "C1", 3.5)).toThrow(
      WeightSensitivityError,
    );
    expect(() => rebalanceWeightsOneAtATime([0.2, 0.2, 0.2, 0.2, 0.2, 0.2], "C1", 0.1)).toThrow(
      WeightSensitivityError,
    );
    expect(() => rebalanceWeightsOneAtATime(SYNTHETIC_WEIGHTS, "C1", Number.NaN)).toThrow(
      WeightSensitivityError,
    );
  });

  it("produces 37 scenarios (1 baseline + 36 perturbations), preserves R, and tracks winner shifts", () => {
    const alts = [
      makeAlt("A1", { C1: 9_200_000, C2: 14_000, C3: 16, C4: 512, C5: 1.4, C6: 75 }),
      makeAlt("A2", { C1: 10_600_000, C2: 22_000, C3: 16, C4: 512, C5: 1.3, C6: 50 }),
      makeAlt("A3", { C1: 10_800_000, C2: 11_000, C3: 8, C4: 256, C5: 1.8, C6: 40 }),
    ];

    const saw = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: alts,
      scenario: "custom",
      c6Metric: "battery_wh",
    });

    const suite = runWeightSensitivitySuite({
      baseWeights: SYNTHETIC_WEIGHTS,
      baselineItems: saw.results.map((r) => ({
        code: r.code,
        model: r.model,
        normalizedValues: r.normalizedValues,
        weightedValues: r.weightedValues,
        criteriaValues: r.criteriaValues,
        score: r.score,
        rank: r.rank,
      })),
    });

    expect(suite.totalScenarios).toBe(37);
    expect(suite.perturbedScenarioCount).toBe(36);
    expect(suite.scenarios[0]!.label).toBe("Baseline");
    expect(suite.scenarios[0]!.winnerCode).toBe(saw.results[0]!.code);

    for (const sc of suite.scenarios) {
      expect(sc.weightSum).toBeCloseTo(1, 12);
      expect(sc.weights).toHaveLength(6);
      expect(sc.results).toHaveLength(3);
      for (const code of CRITERION_CODES) {
        expect(sc.weightsByCode[code]).toBeGreaterThan(0);
      }
    }

    const customScenario = runWeightSensitivityScenario({
      baseWeights: SYNTHETIC_WEIGHTS,
      baselineItems: saw.results.map((r) => ({
        code: r.code,
        model: r.model,
        normalizedValues: r.normalizedValues,
        score: r.score,
        rank: r.rank,
      })),
      targetCriterion: "C2",
      relativeDelta: 0.2,
    });
    expect(customScenario.weightSum).toBeCloseTo(1, 12);
    expect(customScenario.label).toBe("C2 +20%");

    const evaluation = buildDecisionEvaluation({
      items: saw.results,
      weightSensitivity: suite,
      c6Metric: "battery_wh",
    });
    expect(evaluation.winner?.code).toBe(saw.results[0]!.code);
    expect(evaluation.lowest?.code).toBe("A3");
    expect(evaluation.insights.length).toBeGreaterThanOrEqual(3);
  });
});
