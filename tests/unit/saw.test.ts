import { describe, expect, it } from "vitest";
import { SawComputationError, runSaw, type SawAlternativeMetricInput } from "@/lib/decision";

const SYNTHETIC_WEIGHTS = [0.25, 0.2, 0.2, 0.1, 0.1, 0.15];

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
      C6: 12,
      ...overrides,
    },
  };
}

describe("SAW Mathematical Engine (synthetic unit tests)", () => {
  it("normalizes cost (min/x) and benefit (x/max) accurately and bounds scores in (0, 1]", () => {
    const alts = [
      makeAlt("A1", { C1: 9_000_000, C2: 10_000, C3: 8, C4: 512, C5: 1.5, C6: 10 }),
      makeAlt("A2", { C1: 11_000_000, C2: 20_000, C3: 16, C4: 512, C5: 1.2, C6: 15 }),
    ];

    const out = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: alts,
      scenario: "custom",
    });

    const a1 = out.results.find((r) => r.code === "A1")!;
    const a2 = out.results.find((r) => r.code === "A2")!;

    expect(a1.normalizedValues.C1).toBeCloseTo(1, 12);
    expect(a2.normalizedValues.C1).toBeCloseTo(9_000_000 / 11_000_000, 12);
    expect(a1.normalizedValues.C2).toBeCloseTo(0.5, 12);
    expect(a2.normalizedValues.C2).toBeCloseTo(1, 12);
    expect(a1.normalizedValues.C4).toBeCloseTo(1, 12);
    expect(a2.normalizedValues.C4).toBeCloseTo(1, 12);
    expect(a1.normalizedValues.C5).toBeCloseTo(1.2 / 1.5, 12);
    expect(a2.normalizedValues.C5).toBeCloseTo(1, 12);

    expect(out.caveats.some((c) => c.includes("C4"))).toBe(true);
    expect(a2.rank).toBe(1);
    expect(a1.rank).toBe(2);
  });

  it("handles exact tie using competition ranking (1, 1, 3) and deterministic code sort", () => {
    const alts = [
      makeAlt("A3", { C1: 9_500_000, C2: 16_000 }),
      makeAlt("A1", { C1: 9_500_000, C2: 16_000 }),
      makeAlt("A2", { C1: 10_500_000, C2: 12_000 }),
    ];

    const out = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: alts,
      scenario: "custom",
    });

    expect(out.results[0]!.code).toBe("A1");
    expect(out.results[0]!.rank).toBe(1);
    expect(out.results[0]!.isTied).toBe(true);

    expect(out.results[1]!.code).toBe("A3");
    expect(out.results[1]!.rank).toBe(1);
    expect(out.results[1]!.isTied).toBe(true);

    expect(out.results[2]!.code).toBe("A2");
    expect(out.results[2]!.rank).toBe(3);
    expect(out.results[2]!.isTied).toBe(false);
  });

  it("distinguishes tiny nonzero differences (> 1e-12) without premature rounding", () => {
    const alts = [
      makeAlt("A1", { C1: 9_500_000 }),
      makeAlt("A2", { C1: 9_500_050 }),
    ];

    const out = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: alts,
      scenario: "custom",
    });

    expect(out.results[0]!.code).toBe("A1");
    expect(out.results[0]!.rank).toBe(1);
    expect(out.results[1]!.code).toBe("A2");
    expect(out.results[1]!.rank).toBe(2);
    expect(out.results[0]!.score).toBeGreaterThan(out.results[1]!.score);
  });

  it("handles a single alternative with warning and score = 1", () => {
    const out = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: [makeAlt("A1")],
      scenario: "custom",
    });

    expect(out.results).toHaveLength(1);
    expect(out.results[0]!.score).toBeCloseTo(1, 12);
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it("accepts inclusive price endpoints (9,000,000 and 11,000,000) and rejects out-of-range prices", () => {
    const valid = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: [
        makeAlt("A1", { C1: 9_000_000 }),
        makeAlt("A2", { C1: 11_000_000 }),
      ],
      scenario: "custom",
    });
    expect(valid.results).toHaveLength(2);

    expect(() =>
      runSaw({
        weights: SYNTHETIC_WEIGHTS,
        alternatives: [makeAlt("A1", { C1: 8_999_999 })],
        scenario: "custom",
      }),
    ).toThrow(SawComputationError);

    expect(() =>
      runSaw({
        weights: SYNTHETIC_WEIGHTS,
        alternatives: [makeAlt("A1", { C1: 11_000_001 })],
        scenario: "custom",
      }),
    ).toThrow(SawComputationError);
  });

  it("rejects empty set, nonpositive values, NaN, and unnormalized weights", () => {
    expect(() =>
      runSaw({ weights: SYNTHETIC_WEIGHTS, alternatives: [], scenario: "custom" }),
    ).toThrow(SawComputationError);

    expect(() =>
      runSaw({
        weights: SYNTHETIC_WEIGHTS,
        alternatives: [makeAlt("A1", { C6: 0 })],
        scenario: "custom",
      }),
    ).toThrow(SawComputationError);

    expect(() =>
      runSaw({
        weights: SYNTHETIC_WEIGHTS,
        alternatives: [makeAlt("A1", { C2: Number.NaN })],
        scenario: "custom",
      }),
    ).toThrow(SawComputationError);

    expect(() =>
      runSaw({
        weights: [0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
        alternatives: [makeAlt("A1")],
        scenario: "custom",
      }),
    ).toThrow(SawComputationError);
  });

  it("re-normalizes min/max when alternative subset changes", () => {
    const a1 = makeAlt("A1", { C3: 8, C2: 14_000 });
    const a2 = makeAlt("A2", { C3: 16, C2: 16_000 });
    const a3 = makeAlt("A3", { C3: 8, C2: 10_000 });

    const full = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: [a1, a2, a3],
      scenario: "custom",
    });
    const subset = runSaw({
      weights: SYNTHETIC_WEIGHTS,
      alternatives: [a1, a3],
      scenario: "custom",
    });

    const a1Full = full.results.find((r) => r.code === "A1")!;
    const a1Subset = subset.results.find((r) => r.code === "A1")!;
    expect(a1Full.normalizedValues.C3).toBeCloseTo(0.5, 12);
    expect(a1Subset.normalizedValues.C3).toBeCloseTo(1, 12);
    expect(subset.extrema.C2.maxValue).toBe(14_000);
  });
});
