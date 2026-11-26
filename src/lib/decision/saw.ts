import {
  ALGORITHM_VERSION,
  CRITERIA_COUNT,
  CRITERION_CODES,
  PRICE_MAX_IDR,
  PRICE_MIN_IDR,
  SAW_TIE_TOLERANCE,
  SAW_WEIGHT_SUM_TOLERANCE,
  getC6UnitForMetric,
  getCriteriaForMetric,
} from "./criteria";
import { weightsArrayToRecord } from "./ahp";
import type {
  AhpMode,
  C6MetricType,
  CriteriaNumericVector,
  CriterionCode,
  SawAlternativeMetricInput,
  SawAlternativeResult,
  SawCriterionExtrema,
  SawRunOutput,
  SawScenarioKey,
} from "./types";

function compareCodeNaturally(a: string, b: string): number {
  const ma = /^([A-Za-z]+)(\d+)$/.exec(a.trim());
  const mb = /^([A-Za-z]+)(\d+)$/.exec(b.trim());
  if (ma && mb && ma[1]!.toUpperCase() === mb[1]!.toUpperCase()) {
    return Number(ma[2]) - Number(mb[2]);
  }
  return a.localeCompare(b, "en", { numeric: true });
}

export class SawComputationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SawComputationError";
    this.code = code;
  }
}

export interface RunSawParams {
  weights: readonly number[];
  alternatives: readonly SawAlternativeMetricInput[];
  scenario: SawScenarioKey;
  c6Metric?: C6MetricType;
  ahpMode?: AhpMode;
  enforcePriceRange?: boolean;
}

/**
 * Validates weights and alternative values, builds decision matrix X,
 * computes per-column min/max extrema on the provided subset, normalizes R,
 * computes weighted contributions and full-precision SAW scores, and ranks with tie safety.
 */
export function runSaw(params: RunSawParams): SawRunOutput {
  const {
    weights,
    alternatives,
    scenario,
    c6Metric = "battery_wh",
    ahpMode,
    enforcePriceRange = true,
  } = params;

  const activeCriteria = getCriteriaForMetric(c6Metric);
  const c6Unit = getC6UnitForMetric(c6Metric);

  if (weights.length !== CRITERIA_COUNT) {
    throw new SawComputationError(
      "INVALID_WEIGHT_COUNT",
      `Bobot SAW harus berjumlah ${CRITERIA_COUNT}, diterima ${weights.length}.`,
    );
  }

  let weightSum = 0;
  for (let i = 0; i < CRITERIA_COUNT; i++) {
    const w = weights[i]!;
    if (!Number.isFinite(w) || w <= 0) {
      throw new SawComputationError(
        "INVALID_WEIGHT_VALUE",
        `Bobot kriteria ${CRITERION_CODES[i]} harus positif berhingga.`,
      );
    }
    weightSum += w;
  }

  if (Math.abs(weightSum - 1) > SAW_WEIGHT_SUM_TOLERANCE) {
    throw new SawComputationError(
      "WEIGHT_SUM_MISMATCH",
      `Jumlah bobot harus sama dengan 1 (toleransi ${SAW_WEIGHT_SUM_TOLERANCE}), diterima ${weightSum}.`,
    );
  }

  if (alternatives.length === 0) {
    throw new SawComputationError(
      "EMPTY_ALTERNATIVES",
      "Tidak ada alternatif laptop eligible untuk dihitung pada SAW.",
    );
  }

  // Validate every alternative's criteria values strictly
  const seenCodes = new Set<string>();
  for (const alt of alternatives) {
    if (seenCodes.has(alt.code)) {
      throw new SawComputationError(
        "DUPLICATE_ALTERNATIVE_CODE",
        `Kode alternatif duplikat ditemukan: ${alt.code}.`,
      );
    }
    seenCodes.add(alt.code);

    for (const code of CRITERION_CODES) {
      const value = alt.criteria[code];
      if (!Number.isFinite(value) || value <= 0) {
        throw new SawComputationError(
          "INVALID_CRITERION_VALUE",
          `Nilai kriteria ${code} pada alternatif ${alt.code} harus bilangan positif berhingga (diterima: ${value}).`,
        );
      }
    }

    if (
      enforcePriceRange &&
      (alt.criteria.C1 < PRICE_MIN_IDR || alt.criteria.C1 > PRICE_MAX_IDR)
    ) {
      throw new SawComputationError(
        "PRICE_OUT_OF_RANGE",
        `Harga alternatif ${alt.code} (${alt.criteria.C1}) berada di luar rentang penelitian Rp9.000.000–Rp11.000.000.`,
      );
    }
  }

  // Step 1: Compute per-column min and max over the active subset
  const extrema = {} as Record<CriterionCode, SawCriterionExtrema>;
  const warnings: string[] = [];
  const caveats: string[] = [];

  if (alternatives.length === 1) {
    warnings.push(
      "Hanya terdapat satu alternatif pada perhitungan ini. Skor 1,000000 merupakan konsekuensi matematis normalisasi tanpa pembanding.",
    );
  }

  for (const criterion of activeCriteria) {
    const code = criterion.code;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const alt of alternatives) {
      const val = alt.criteria[code];
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    const isConstant = Math.abs(maxVal - minVal) <= 1e-12;
    const extremaType = criterion.attribute === "cost" ? "min" : "max";

    extrema[code] = {
      code,
      attribute: criterion.attribute,
      extremaType,
      value: extremaType === "min" ? minVal : maxVal,
      minValue: minVal,
      maxValue: maxVal,
      isConstant,
    };

    if (isConstant && alternatives.length > 1) {
      caveats.push(
        `Kriteria ${code} (${criterion.shortName}) bernilai seragam (${minVal} ${criterion.unit}) pada seluruh ${alternatives.length} alternatif, sehingga menghasilkan nilai normalisasi 1,000000 dan kontribusi konstan.`,
      );
    }
  }

  const weightsByCode = weightsArrayToRecord(weights);

  // Step 2: Normalize R and compute weighted preference scores at full precision
  const scored: SawAlternativeResult[] = alternatives.map((alt) => {
    const normalizedValues = {} as CriteriaNumericVector;
    const weightedValues = {} as CriteriaNumericVector;
    let totalScore = 0;

    for (const criterion of activeCriteria) {
      const code = criterion.code;
      const x = alt.criteria[code];
      const ext = extrema[code];

      const r =
        criterion.attribute === "cost" ? ext.minValue / x : x / ext.maxValue;

      if (!Number.isFinite(r) || r <= 0 || r > 1 + 1e-12) {
        throw new SawComputationError(
          "NORMALIZATION_OUT_OF_BOUNDS",
          `Nilai normalisasi R untuk ${alt.code} (${code}) di luar rentang (0, 1]: ${r}.`,
        );
      }

      const w = weightsByCode[code];
      const contribution = w * r;

      normalizedValues[code] = r;
      weightedValues[code] = contribution;
      totalScore += contribution;
    }

    if (!Number.isFinite(totalScore) || totalScore <= 0 || totalScore > 1 + 1e-10) {
      throw new SawComputationError(
        "SCORE_OUT_OF_BOUNDS",
        `Nilai preferensi SAW untuk ${alt.code} di luar rentang (0, 1]: ${totalScore}.`,
      );
    }

    return {
      alternativeId: alt.id,
      code: alt.code,
      model: alt.model,
      criteriaValues: { ...alt.criteria },
      normalizedValues,
      weightedValues,
      score: totalScore,
      rank: 0,
      isTied: false,
    };
  });

  // Step 3: Sort by full-precision descending score; tie-break deterministically by natural code order
  scored.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) <= SAW_TIE_TOLERANCE) {
      return compareCodeNaturally(a.code, b.code);
    }
    return diff > 0 ? 1 : -1;
  });

  // Step 4: Competition ranking (1, 1, 3...) when |diff| <= SAW_TIE_TOLERANCE
  for (let i = 0; i < scored.length; i++) {
    const current = scored[i]!;
    if (i === 0) {
      current.rank = 1;
    } else {
      const prev = scored[i - 1]!;
      if (Math.abs(prev.score - current.score) <= SAW_TIE_TOLERANCE) {
        current.rank = prev.rank;
        prev.isTied = true;
        current.isTied = true;
      } else {
        current.rank = i + 1;
      }
    }
  }

  const topMargin =
    scored.length >= 2 ? scored[0]!.score - scored[1]!.score : null;

  if (topMargin !== null && topMargin > SAW_TIE_TOLERANCE && topMargin < 0.01) {
    warnings.push(
      `Selisih skor peringkat 1 (${scored[0]!.code}) dan peringkat 2 (${scored[1]!.code}) relatif tipis (${topMargin.toFixed(6)}). Peringkat teratas sensitif terhadap perubahan bobot kriteria atau harga.`,
    );
  }

  return {
    algorithmVersion: ALGORITHM_VERSION,
    scenario,
    c6Metric,
    c6Unit,
    ahpMode,
    alternativeCount: alternatives.length,
    weights: [...weights],
    weightsByCode,
    extrema,
    results: scored,
    topMargin,
    warnings,
    caveats,
  };
}
