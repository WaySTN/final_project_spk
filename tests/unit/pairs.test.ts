import { describe, expect, it } from "vitest";
import {
  ALLOWED_SCALE_TOKENS,
  PAIRWISE_DEFINITIONS,
  matchPairwiseHeader,
  parsePairwiseAnswer,
} from "@/lib/decision/pairs";

describe("Pairwise scale parser (synthetic unit tests)", () => {
  const firstPair = PAIRWISE_DEFINITIONS[0]!; // C1:C2 Harga atau Performa prosesor?

  it("parses all 9 allowed scale tokens to exact numeric fractions without eval or parseInt truncation", () => {
    const expected: Record<string, number> = {
      "9": 9,
      "7": 7,
      "5": 5,
      "3": 3,
      "1": 1,
      "1/3": 1 / 3,
      "1/5": 1 / 5,
      "1/7": 1 / 7,
      "1/9": 1 / 9,
    };

    for (const token of ALLOWED_SCALE_TOKENS) {
      const label =
        token === "1"
          ? "Keduanya sama penting"
          : token.startsWith("1/")
            ? "Performa prosesor lebih penting"
            : "Harga lebih penting";

      const result = parsePairwiseAnswer(`${token} | ${label}`, firstPair);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.answer.token).toBe(token);
        expect(result.answer.numericValue).toBeCloseTo(expected[token]!, 15);
        expect(result.answer.labelWarning).toBeNull();
      }
    }
  });

  it("explicitly distinguishes 1/3, 1/5, 1/7, 1/9 from integer 1", () => {
    const res = parsePairwiseAnswer("1/3 | SSD lebih penting", PAIRWISE_DEFINITIONS[9]!);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.answer.numericValue).not.toBe(1);
      expect(res.answer.numericValue).toBeCloseTo(0.3333333333333333, 15);
    }
  });

  it("flags conflicting label text without mutating numeric token", () => {
    const res = parsePairwiseAnswer("1/3 | Harga lebih penting", firstPair);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.answer.numericValue).toBeCloseTo(1 / 3, 15);
      expect(res.answer.labelWarning).toContain("berpotensi bertentangan");
    }
  });

  it("rejects malformed, zero, negative, even, or unknown tokens", () => {
    const invalidInputs = [
      "",
      null,
      undefined,
      "0 | Nol",
      "-3 | Negatif",
      "2 | Skala genap tidak diizinkan",
      "1/2 | Tidak diizinkan",
      "1/0 | Pembagian nol",
      "process.exit(1) | Injeksi",
      "abc",
    ];

    for (const bad of invalidInputs) {
      const res = parsePairwiseAnswer(bad, firstPair);
      expect(res.ok).toBe(false);
    }
  });

  it("matches all 15 exact Google Forms headers and rejects unknown headers", () => {
    for (const def of PAIRWISE_DEFINITIONS) {
      const matched = matchPairwiseHeader(def.expectedHeader);
      expect(matched?.questionNo).toBe(def.questionNo);
      expect(matched?.pairKey).toBe(def.pairKey);
    }
    expect(matchPairwiseHeader("01. Performa prosesor atau Harga?")).toBeNull();
    expect(matchPairwiseHeader("16. Layar atau Harga?")).toBeNull();
  });
});
