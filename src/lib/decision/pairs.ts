import type {
  AllowedScaleToken,
  PairwiseDefinition,
  ParsedPairwiseAnswer,
} from "./types";

export const ALLOWED_SCALE_TOKENS: readonly AllowedScaleToken[] = [
  "9",
  "7",
  "5",
  "3",
  "1",
  "1/3",
  "1/5",
  "1/7",
  "1/9",
] as const;

export const ALLOWED_SCALE_VALUES: Readonly<Record<AllowedScaleToken, number>> = {
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

export const SAATY_SIMPLIFIED_SCALE = [
  {
    token: "1",
    reciprocal: "1",
    intensity: 1,
    meaning: "Keduanya sama penting",
  },
  {
    token: "3",
    reciprocal: "1/3",
    intensity: 3,
    meaning: "Kriteria pertama / kedua lebih penting",
  },
  {
    token: "5",
    reciprocal: "1/5",
    intensity: 5,
    meaning: "Kriteria pertama / kedua jauh lebih penting",
  },
  {
    token: "7",
    reciprocal: "1/7",
    intensity: 7,
    meaning: "Kriteria pertama / kedua sangat jauh lebih penting",
  },
  {
    token: "9",
    reciprocal: "1/9",
    intensity: 9,
    meaning: "Kriteria pertama / kedua mutlak lebih penting",
  },
] as const;

export const PAIRWISE_DEFINITIONS: readonly PairwiseDefinition[] = [
  {
    questionNo: 1,
    pairKey: "C1:C2",
    rowIndex: 0,
    colIndex: 1,
    leftCode: "C1",
    rightCode: "C2",
    leftLabel: "Harga",
    rightLabel: "Performa prosesor",
    expectedHeader: "01. Harga atau Performa prosesor?",
  },
  {
    questionNo: 2,
    pairKey: "C1:C3",
    rowIndex: 0,
    colIndex: 2,
    leftCode: "C1",
    rightCode: "C3",
    leftLabel: "Harga",
    rightLabel: "RAM",
    expectedHeader: "02. Harga atau RAM?",
  },
  {
    questionNo: 3,
    pairKey: "C1:C4",
    rowIndex: 0,
    colIndex: 3,
    leftCode: "C1",
    rightCode: "C4",
    leftLabel: "Harga",
    rightLabel: "SSD",
    expectedHeader: "03. Harga atau SSD?",
  },
  {
    questionNo: 4,
    pairKey: "C1:C5",
    rowIndex: 0,
    colIndex: 4,
    leftCode: "C1",
    rightCode: "C5",
    leftLabel: "Harga",
    rightLabel: "Berat",
    expectedHeader: "04. Harga atau Berat?",
  },
  {
    questionNo: 5,
    pairKey: "C1:C6",
    rowIndex: 0,
    colIndex: 5,
    leftCode: "C1",
    rightCode: "C6",
    leftLabel: "Harga",
    rightLabel: "Daya tahan baterai",
    expectedHeader: "05. Harga atau Daya tahan baterai?",
  },
  {
    questionNo: 6,
    pairKey: "C2:C3",
    rowIndex: 1,
    colIndex: 2,
    leftCode: "C2",
    rightCode: "C3",
    leftLabel: "Performa prosesor",
    rightLabel: "RAM",
    expectedHeader: "06. Performa prosesor atau RAM?",
  },
  {
    questionNo: 7,
    pairKey: "C2:C4",
    rowIndex: 1,
    colIndex: 3,
    leftCode: "C2",
    rightCode: "C4",
    leftLabel: "Performa prosesor",
    rightLabel: "SSD",
    expectedHeader: "07. Performa prosesor atau SSD?",
  },
  {
    questionNo: 8,
    pairKey: "C2:C5",
    rowIndex: 1,
    colIndex: 4,
    leftCode: "C2",
    rightCode: "C5",
    leftLabel: "Performa prosesor",
    rightLabel: "Berat",
    expectedHeader: "08. Performa prosesor atau Berat?",
  },
  {
    questionNo: 9,
    pairKey: "C2:C6",
    rowIndex: 1,
    colIndex: 5,
    leftCode: "C2",
    rightCode: "C6",
    leftLabel: "Performa prosesor",
    rightLabel: "Daya tahan baterai",
    expectedHeader: "09. Performa prosesor atau Daya tahan baterai?",
  },
  {
    questionNo: 10,
    pairKey: "C3:C4",
    rowIndex: 2,
    colIndex: 3,
    leftCode: "C3",
    rightCode: "C4",
    leftLabel: "RAM",
    rightLabel: "SSD",
    expectedHeader: "10. RAM atau SSD?",
  },
  {
    questionNo: 11,
    pairKey: "C3:C5",
    rowIndex: 2,
    colIndex: 4,
    leftCode: "C3",
    rightCode: "C5",
    leftLabel: "RAM",
    rightLabel: "Berat",
    expectedHeader: "11. RAM atau Berat?",
  },
  {
    questionNo: 12,
    pairKey: "C3:C6",
    rowIndex: 2,
    colIndex: 5,
    leftCode: "C3",
    rightCode: "C6",
    leftLabel: "RAM",
    rightLabel: "Daya tahan baterai",
    expectedHeader: "12. RAM atau Daya tahan baterai?",
  },
  {
    questionNo: 13,
    pairKey: "C4:C5",
    rowIndex: 3,
    colIndex: 4,
    leftCode: "C4",
    rightCode: "C5",
    leftLabel: "SSD",
    rightLabel: "Berat",
    expectedHeader: "13. SSD atau Berat?",
  },
  {
    questionNo: 14,
    pairKey: "C4:C6",
    rowIndex: 3,
    colIndex: 5,
    leftCode: "C4",
    rightCode: "C6",
    leftLabel: "SSD",
    rightLabel: "Daya tahan baterai",
    expectedHeader: "14. SSD atau Daya tahan baterai?",
  },
  {
    questionNo: 15,
    pairKey: "C5:C6",
    rowIndex: 4,
    colIndex: 5,
    leftCode: "C5",
    rightCode: "C6",
    leftLabel: "Berat",
    rightLabel: "Daya tahan baterai",
    expectedHeader: "15. Berat atau Daya tahan baterai?",
  },
] as const;

export function isAllowedScaleToken(token: string): token is AllowedScaleToken {
  return Object.prototype.hasOwnProperty.call(ALLOWED_SCALE_VALUES, token);
}

export function normalizeHeaderText(header: string): string {
  return header
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function matchPairwiseHeader(header: string): PairwiseDefinition | null {
  const normalized = normalizeHeaderText(header);
  for (const def of PAIRWISE_DEFINITIONS) {
    if (normalizeHeaderText(def.expectedHeader) === normalized) {
      return def;
    }
  }
  return null;
}

export interface PairwiseParseResult {
  ok: true;
  answer: ParsedPairwiseAnswer;
}

export interface PairwiseParseError {
  ok: false;
  error: string;
}

/**
 * Parses a single pairwise comparison answer from Google Forms export (e.g. "1/3 | SSD lebih penting").
 * Strictly validates token against allowlist without eval() or parseInt().
 */
export function parsePairwiseAnswer(
  rawInput: unknown,
  pair: PairwiseDefinition,
): PairwiseParseResult | PairwiseParseError {
  if (rawInput === null || rawInput === undefined) {
    return {
      ok: false,
      error: `Jawaban kosong pada pertanyaan ${pair.questionNo} (${pair.pairKey}).`,
    };
  }

  const rawText = String(rawInput).trim();
  if (!rawText) {
    return {
      ok: false,
      error: `Jawaban kosong pada pertanyaan ${pair.questionNo} (${pair.pairKey}).`,
    };
  }

  const parts = rawText.split("|");
  const tokenCandidate = (parts[0] ?? "").trim().replace(/\s+/g, "");
  const labelPart = parts.slice(1).join("|").trim();

  if (!isAllowedScaleToken(tokenCandidate)) {
    return {
      ok: false,
      error: `Token skala tidak valid "${tokenCandidate}" pada pertanyaan ${pair.questionNo} (${pair.pairKey}). Nilai yang diizinkan: ${ALLOWED_SCALE_TOKENS.join(", ")}.`,
    };
  }

  const numericValue = ALLOWED_SCALE_VALUES[tokenCandidate];
  let labelWarning: string | null = null;

  if (labelPart) {
    const lowerLabel = labelPart.toLowerCase();
    const leftLower = pair.leftLabel.toLowerCase();
    const rightLower = pair.rightLabel.toLowerCase();

    if (tokenCandidate === "1") {
      if (!lowerLabel.includes("sama penting")) {
        labelWarning = `Label "${labelPart}" tidak sesuai ekspektasi "sama penting" untuk token 1 pada ${pair.pairKey}.`;
      }
    } else if (tokenCandidate.startsWith("1/")) {
      if (!lowerLabel.includes(rightLower) || lowerLabel.includes(leftLower)) {
        labelWarning = `Label "${labelPart}" berpotensi bertentangan dengan arah token "${tokenCandidate}" (seharusnya mengutamakan ${pair.rightLabel}) pada ${pair.pairKey}.`;
      }
    } else {
      if (!lowerLabel.includes(leftLower) || lowerLabel.includes(rightLower)) {
        labelWarning = `Label "${labelPart}" berpotensi bertentangan dengan arah token "${tokenCandidate}" (seharusnya mengutamakan ${pair.leftLabel}) pada ${pair.pairKey}.`;
      }
    }
  }

  return {
    ok: true,
    answer: {
      questionNo: pair.questionNo,
      pairKey: pair.pairKey,
      rawText,
      token: tokenCandidate,
      numericValue,
      labelWarning,
    },
  };
}
