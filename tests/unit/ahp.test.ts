import { describe, expect, it } from "vitest";
import {
  AHP_CR_THRESHOLD,
  AHP_RI_6,
  AhpComputationError,
  aggregateMatricesAIJ,
  buildPairwiseMatrix,
  computePrincipalEigenvector,
  evaluateIndividualAhp,
  runAhpGroup,
} from "@/lib/decision";

describe("AHP Mathematical Engine (synthetic unit tests)", () => {
  it("yields uniform weights (1/6) and CR = 0 for an all-equal matrix", () => {
    const values = Array.from({ length: 15 }, () => 1);
    const matrix = buildPairwiseMatrix(values);
    const eigen = computePrincipalEigenvector(matrix);

    expect(eigen.ri).toBe(AHP_RI_6);
    expect(eigen.lambdaMax).toBeCloseTo(6, 12);
    expect(eigen.ci).toBeCloseTo(0, 12);
    expect(eigen.cr).toBeCloseTo(0, 12);
    for (const w of eigen.weights) {
      expect(w).toBeCloseTo(1 / 6, 12);
    }
  });

  it("recovers exact latent weights with CR ≈ 0 for a perfectly consistent synthetic matrix", () => {
    const latent = [0.32, 0.24, 0.18, 0.12, 0.08, 0.06];
    const upper: number[] = [];
    for (let i = 0; i < 6; i++) {
      for (let j = i + 1; j < 6; j++) {
        upper.push(latent[i]! / latent[j]!);
      }
    }

    const matrix = buildPairwiseMatrix(upper);
    // Check reciprocal invariant
    for (let i = 0; i < 6; i++) {
      expect(matrix[i]![i]).toBe(1);
      for (let j = i + 1; j < 6; j++) {
        expect(matrix[i]![j]! * matrix[j]![i]!).toBeCloseTo(1, 12);
      }
    }

    const eigen = computePrincipalEigenvector(matrix);
    expect(eigen.cr).toBeLessThan(1e-11);
    expect(eigen.weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    for (let i = 0; i < 6; i++) {
      expect(eigen.weights[i]).toBeCloseTo(latent[i]!, 10);
    }
  });

  it("detects high CR (> 0.10) for cyclic/inconsistent judgments", () => {
    // Strong cycle: C1 >> C2 >> C3 >> C1
    const cyclic = [9, 1 / 9, 5, 5, 5, 9, 1 / 5, 1, 1, 7, 1 / 7, 1, 5, 1 / 5, 9];
    const res = evaluateIndividualAhp({
      id: "SYN-CYCLIC",
      code: "S01",
      eligible: true,
      values: cyclic,
    });

    expect(res.cr).not.toBeNull();
    expect(res.cr!).toBeGreaterThan(AHP_CR_THRESHOLD);
    expect(res.passesCr).toBe(false);
  });

  it("preserves exact reciprocal invariant during geometric AIJ aggregation", () => {
    const m1 = buildPairwiseMatrix([3, 5, 1, 7, 1 / 3, 3, 1 / 3, 5, 1, 1 / 5, 3, 1, 5, 3, 1 / 3]);
    const m2 = buildPairwiseMatrix([1 / 3, 3, 5, 1 / 3, 3, 1 / 5, 3, 1, 5, 3, 1 / 3, 5, 1 / 3, 1, 5]);
    const agg = aggregateMatricesAIJ([m1, m2]);

    for (let i = 0; i < 6; i++) {
      expect(agg[i]![i]).toBe(1);
      for (let j = i + 1; j < 6; j++) {
        expect(agg[i]![j]! * agg[j]![i]!).toBeCloseTo(1, 12);
        expect(agg[i]![j]).toBeCloseTo(Math.sqrt(m1[i]![j]! * m2[i]![j]!), 12);
      }
    }
  });

  it("blocks group computation with controlled error when no respondent passes CR <= 0.10", () => {
    const cyclic = [9, 1 / 9, 5, 5, 5, 9, 1 / 5, 1, 1, 7, 1 / 7, 1, 5, 1 / 5, 9];
    expect(() =>
      runAhpGroup(
        [{ id: "S1", code: "S01", eligible: true, values: cyclic }],
        "consistent_only",
      ),
    ).toThrow(AhpComputationError);
  });

  it("returns controlled error on non-convergence when maxIterations is artificially tiny", () => {
    const m = buildPairwiseMatrix([9, 1 / 7, 5, 3, 1 / 5, 7, 1 / 3, 5, 1 / 7, 5, 1 / 5, 3, 7, 1 / 3, 9]);
    expect(() =>
      computePrincipalEigenvector(m, { tolerance: 1e-15, maxIterations: 1 }),
    ).toThrow(AhpComputationError);
  });
});
