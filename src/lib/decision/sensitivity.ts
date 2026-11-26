import { runAhpGroup, weightsArrayToRecord } from "./ahp";
import {
  CRITERIA_COUNT,
  CRITERION_CODES,
  DEFAULT_SENSITIVITY_DELTAS,
  SAW_TIE_TOLERANCE,
  SAW_WEIGHT_SUM_TOLERANCE,
  getCriteriaForMetric,
} from "./criteria";
import { runSaw } from "./saw";
import type {
  AhpIndividualInput,
  C6MetricType,
  CriteriaNumericVector,
  CriterionCode,
  SawAlternativeMetricInput,
  SensitivityRankRow,
  SensitivitySuiteResult,
  WeightSensitivityAlternativeEntry,
  WeightSensitivityScenarioResult,
  WeightSensitivitySuiteResult,
} from "./types";

function compareCodeNaturally(a: string, b: string): number {
  const ma = /^([A-Za-z]+)(\d+)$/.exec(a.trim());
  const mb = /^([A-Za-z]+)(\d+)$/.exec(b.trim());
  if (ma && mb && ma[1]!.toUpperCase() === mb[1]!.toUpperCase()) {
    return Number(ma[2]) - Number(mb[2]);
  }
  return a.localeCompare(b, "en", { numeric: true });
}

export class WeightSensitivityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "WeightSensitivityError";
    this.code = code;
  }
}

export interface WeightSensitivityBaselineItem {
  code: string;
  model: string;
  normalizedValues: CriteriaNumericVector;
  weightedValues?: CriteriaNumericVector;
  criteriaValues?: CriteriaNumericVector;
  score: number;
  rank: number;
}

/**
 * Rebalances a 6-criterion weight vector using exact One-At-A-Time proportional scaling:
 *   w'_k = w_k * (1 + delta)
 *   w'_j = w_j * (1 - w'_k) / (1 - w_k), for all j != k
 * Guarantees strictly positive weights and exact sum(w') = 1 without mutating baseWeights.
 */
export function rebalanceWeightsOneAtATime(
  baseWeights: readonly number[],
  targetCriterion: CriterionCode,
  relativeDelta: number,
): number[] {
  if (baseWeights.length !== CRITERIA_COUNT) {
    throw new WeightSensitivityError(
      "INVALID_WEIGHT_COUNT",
      `Vektor bobot harus terdiri dari ${CRITERIA_COUNT} kriteria.`,
    );
  }
  if (!Number.isFinite(relativeDelta)) {
    throw new WeightSensitivityError(
      "INVALID_DELTA",
      "Perubahan bobot relatif (delta) harus berupa bilangan berhingga.",
    );
  }

  let baseSum = 0;
  for (let i = 0; i < CRITERIA_COUNT; i++) {
    const w = baseWeights[i]!;
    if (!Number.isFinite(w) || w <= 0 || w >= 1) {
      throw new WeightSensitivityError(
        "INVALID_BASE_WEIGHT",
        `Bobot dasar kriteria ${CRITERION_CODES[i]} harus berada pada interval (0, 1).`,
      );
    }
    baseSum += w;
  }

  if (Math.abs(baseSum - 1) > SAW_WEIGHT_SUM_TOLERANCE) {
    throw new WeightSensitivityError(
      "BASE_WEIGHT_SUM_INVALID",
      `Total bobot dasar harus sama dengan 1 (diterima ${baseSum}).`,
    );
  }

  const targetIdx = CRITERION_CODES.indexOf(targetCriterion);
  if (targetIdx < 0) {
    throw new WeightSensitivityError(
      "UNKNOWN_CRITERION",
      `Kode kriteria tidak dikenal: ${targetCriterion}.`,
    );
  }

  if (Math.abs(relativeDelta) <= 1e-15) {
    return [...baseWeights];
  }

  const wk = baseWeights[targetIdx]!;
  const wkNew = wk * (1 + relativeDelta);

  if (!Number.isFinite(wkNew) || wkNew <= 0 || wkNew >= 1) {
    throw new WeightSensitivityError(
      "PERTURBED_WEIGHT_OUT_OF_RANGE",
      `Perubahan bobot ${targetCriterion} sebesar ${(relativeDelta * 100).toFixed(1)}% menghasilkan bobot di luar rentang (0, 1): ${wkNew}.`,
    );
  }

  const remainingBase = 1 - wk;
  const remainingNew = 1 - wkNew;
  const scaleFactor = remainingNew / remainingBase;

  const adjusted = baseWeights.map((w, idx) =>
    idx === targetIdx ? wkNew : w * scaleFactor,
  );

  for (let i = 0; i < CRITERIA_COUNT; i++) {
    if (!Number.isFinite(adjusted[i]) || adjusted[i]! <= 0) {
      throw new WeightSensitivityError(
        "NON_POSITIVE_ADJUSTED_WEIGHT",
        `Bobot tersesuaikan untuk ${CRITERION_CODES[i]} tidak positif.`,
      );
    }
  }

  const sum = adjusted.reduce((acc, v) => acc + v, 0);
  if (Math.abs(sum - 1) > SAW_WEIGHT_SUM_TOLERANCE) {
    throw new WeightSensitivityError(
      "ADJUSTED_WEIGHT_SUM_INVALID",
      `Total bobot setelah penyesuaian menyimpang dari 1 (${sum}).`,
    );
  }

  return adjusted;
}

export function formatSensitivityScenarioLabel(
  criterion: CriterionCode | null,
  relativeDelta: number,
): string {
  if (!criterion || Math.abs(relativeDelta) <= 1e-15) {
    return "Baseline";
  }
  const pct = Math.round(relativeDelta * 100);
  return `${criterion} ${pct > 0 ? `+${pct}%` : `${pct}%`}`;
}

/**
 * Evaluates a single One-At-A-Time weight sensitivity scenario keeping the normalized matrix R fixed.
 * Never mutates baseline data or persisted AHP/SAW state.
 */
export function runWeightSensitivityScenario(params: {
  baseWeights: readonly number[];
  baselineItems: readonly WeightSensitivityBaselineItem[];
  targetCriterion: CriterionCode | null;
  relativeDelta: number;
  label?: string;
}): WeightSensitivityScenarioResult {
  const { baseWeights, baselineItems, targetCriterion, relativeDelta, label } = params;

  if (baselineItems.length === 0) {
    throw new WeightSensitivityError(
      "EMPTY_BASELINE_ITEMS",
      "Tidak ada alternatif pada baseline SAW untuk dianalisis sensitivitasnya.",
    );
  }

  const adjustedWeights =
    targetCriterion && Math.abs(relativeDelta) > 1e-15
      ? rebalanceWeightsOneAtATime(baseWeights, targetCriterion, relativeDelta)
      : [...baseWeights];

  const baseWeightsByCode = weightsArrayToRecord(baseWeights);
  const weightsByCode = weightsArrayToRecord(adjustedWeights);
  const weightSum = adjustedWeights.reduce((acc, v) => acc + v, 0);

  const baselineSorted = [...baselineItems].sort((a, b) =>
    a.rank !== b.rank ? a.rank - b.rank : compareCodeNaturally(a.code, b.code),
  );
  const baselineWinnerCode = baselineSorted[0]!.code;

  const computed: WeightSensitivityAlternativeEntry[] = baselineItems.map((item) => {
    let score = 0;
    for (let i = 0; i < CRITERIA_COUNT; i++) {
      const code = CRITERION_CODES[i]!;
      score += adjustedWeights[i]! * item.normalizedValues[code];
    }
    return {
      code: item.code,
      model: item.model,
      score,
      rank: 0,
      baselineScore: item.score,
      baselineRank: item.rank,
      rankDelta: 0,
      scoreDelta: score - item.score,
      isTied: false,
    };
  });

  computed.sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) <= SAW_TIE_TOLERANCE) {
      return compareCodeNaturally(a.code, b.code);
    }
    return diff > 0 ? 1 : -1;
  });

  for (let i = 0; i < computed.length; i++) {
    const cur = computed[i]!;
    if (i === 0) {
      cur.rank = 1;
    } else {
      const prev = computed[i - 1]!;
      if (Math.abs(prev.score - cur.score) <= SAW_TIE_TOLERANCE) {
        cur.rank = prev.rank;
        prev.isTied = true;
        cur.isTied = true;
      } else {
        cur.rank = i + 1;
      }
    }
    cur.rankDelta = cur.baselineRank - cur.rank;
  }

  const winner = computed[0]!;
  return {
    label: label ?? formatSensitivityScenarioLabel(targetCriterion, relativeDelta),
    criterion: targetCriterion,
    relativeDelta: targetCriterion ? relativeDelta : 0,
    baseWeights: [...baseWeights],
    baseWeightsByCode,
    weights: adjustedWeights,
    weightsByCode,
    weightSum,
    winnerCode: winner.code,
    winnerModel: winner.model,
    maxScore: winner.score,
    winnerChangedFromBaseline: winner.code !== baselineWinnerCode,
    results: computed,
  };
}

/**
 * Runs the mandatory UAS 37-scenario One-At-A-Time weight sensitivity suite:
 * 1 Baseline + 6 criteria × 6 relative deltas (-20%, -10%, -5%, +5%, +10%, +20%).
 */
export function runWeightSensitivitySuite(params: {
  baseWeights: readonly number[];
  baselineItems: readonly WeightSensitivityBaselineItem[];
  deltas?: readonly number[];
}): WeightSensitivitySuiteResult {
  const {
    baseWeights,
    baselineItems,
    deltas = DEFAULT_SENSITIVITY_DELTAS,
  } = params;

  const scenarios: WeightSensitivityScenarioResult[] = [];
  const baseline = runWeightSensitivityScenario({
    baseWeights,
    baselineItems,
    targetCriterion: null,
    relativeDelta: 0,
    label: "Baseline",
  });
  scenarios.push(baseline);

  const winnerMap = new Map<string, { code: string; model: string; count: number }>();
  const winnerChangeScenarios: WeightSensitivitySuiteResult["winnerChangeScenarios"] = [];

  for (const criterion of CRITERION_CODES) {
    for (const delta of deltas) {
      const sc = runWeightSensitivityScenario({
        baseWeights,
        baselineItems,
        targetCriterion: criterion,
        relativeDelta: delta,
      });
      scenarios.push(sc);

      const entry = winnerMap.get(sc.winnerCode) ?? {
        code: sc.winnerCode,
        model: sc.winnerModel,
        count: 0,
      };
      entry.count += 1;
      winnerMap.set(sc.winnerCode, entry);

      if (sc.winnerChangedFromBaseline) {
        winnerChangeScenarios.push({
          label: sc.label,
          criterion,
          relativeDelta: delta,
          winnerCode: sc.winnerCode,
          winnerModel: sc.winnerModel,
          maxScore: sc.maxScore,
        });
      }
    }
  }

  const perturbedScenarioCount = scenarios.length - 1;
  const baselineWinnerWinsCount = winnerMap.get(baseline.winnerCode)?.count ?? 0;
  const baselineWinnerStabilityPct =
    perturbedScenarioCount > 0
      ? (baselineWinnerWinsCount / perturbedScenarioCount) * 100
      : 100;

  const winnerCounts = Array.from(winnerMap.values())
    .map((w) => ({
      ...w,
      percentage:
        perturbedScenarioCount > 0 ? (w.count / perturbedScenarioCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count || compareCodeNaturally(a.code, b.code));

  return {
    baselineWinnerCode: baseline.winnerCode,
    baselineWinnerModel: baseline.winnerModel,
    baselineWinnerScore: baseline.maxScore,
    deltas: [...deltas],
    totalScenarios: scenarios.length,
    perturbedScenarioCount,
    baselineWinnerWinsCount,
    baselineWinnerStabilityPct,
    winnerCounts,
    winnerChangeScenarios,
    scenarios,
  };
}

export interface DecisionEvaluationSummary {
  totalAlternatives: number;
  winner: {
    code: string;
    model: string;
    score: number;
    strongestCriteria: Array<{ code: CriterionCode; name: string; contribution: number }>;
  } | null;
  runnerUp: {
    code: string;
    model: string;
    score: number;
    marginFromWinner: number;
    advantageCriteria: Array<{ code: CriterionCode; name: string; diff: number }>;
  } | null;
  lowest: {
    code: string;
    model: string;
    score: number;
    gapFromWinner: number;
    weakestCriteria: Array<{ code: CriterionCode; name: string; contribution: number }>;
  } | null;
  sensitivitySummary: {
    totalPerturbed: number;
    baselineWins: number;
    stabilityPct: number;
    changedCount: number;
    challengerCodes: string[];
  } | null;
  insights: string[];
}

/**
 * Generates dynamic, data-driven decision evaluation insights strictly from computed SAW results
 * and optional weight sensitivity output (zero hardcoded laptop codes or scores).
 */
export function buildDecisionEvaluation(params: {
  items: ReadonlyArray<{
    code: string;
    model: string;
    score: number;
    rank: number;
    weightedValues: CriteriaNumericVector;
  }>;
  weightSensitivity?: WeightSensitivitySuiteResult | null;
  c6Metric?: C6MetricType;
}): DecisionEvaluationSummary {
  const { items, weightSensitivity = null, c6Metric = "battery_wh" } = params;
  const criteriaDefs = getCriteriaForMetric(c6Metric);
  const nameByCode = Object.fromEntries(
    criteriaDefs.map((c) => [c.code, c.shortName]),
  ) as Record<CriterionCode, string>;

  const sorted = [...items].sort((a, b) =>
    a.rank !== b.rank ? a.rank - b.rank : compareCodeNaturally(a.code, b.code),
  );

  if (sorted.length === 0) {
    return {
      totalAlternatives: 0,
      winner: null,
      runnerUp: null,
      lowest: null,
      sensitivitySummary: null,
      insights: [],
    };
  }

  const first = sorted[0]!;
  const second = sorted.length >= 2 ? sorted[1]! : null;
  const last = sorted[sorted.length - 1]!;

  const winnerContribs = CRITERION_CODES.map((code) => ({
    code,
    name: nameByCode[code],
    contribution: first.weightedValues[code],
  })).sort((a, b) => b.contribution - a.contribution);

  const runnerUpInfo = second
    ? {
        code: second.code,
        model: second.model,
        score: second.score,
        marginFromWinner: first.score - second.score,
        advantageCriteria: CRITERION_CODES.map((code) => ({
          code,
          name: nameByCode[code],
          diff: second.weightedValues[code] - first.weightedValues[code],
        }))
          .filter((x) => x.diff > 1e-6)
          .sort((a, b) => b.diff - a.diff),
      }
    : null;

  const lowestContribs = CRITERION_CODES.map((code) => ({
    code,
    name: nameByCode[code],
    contribution: last.weightedValues[code],
  })).sort((a, b) => a.contribution - b.contribution);

  const sensitivitySummary = weightSensitivity
    ? {
        totalPerturbed: weightSensitivity.perturbedScenarioCount,
        baselineWins: weightSensitivity.baselineWinnerWinsCount,
        stabilityPct: weightSensitivity.baselineWinnerStabilityPct,
        changedCount: weightSensitivity.winnerChangeScenarios.length,
        challengerCodes: Array.from(
          new Set(weightSensitivity.winnerChangeScenarios.map((s) => s.winnerCode)),
        ),
      }
    : null;

  const insights: string[] = [];
  insights.push(
    `Alternatif ${first.code} (${first.model}) menempati peringkat 1 dengan skor ${first.score.toFixed(6)}, ditopang kontribusi terbesar pada kriteria ${winnerContribs[0]!.code} (${winnerContribs[0]!.name}: ${winnerContribs[0]!.contribution.toFixed(6)}) dan ${winnerContribs[1]!.code} (${winnerContribs[1]!.name}: ${winnerContribs[1]!.contribution.toFixed(6)}).`,
  );

  if (runnerUpInfo) {
    const advText =
      runnerUpInfo.advantageCriteria.length > 0
        ? ` unggul pada ${runnerUpInfo.advantageCriteria
            .slice(0, 2)
            .map((a) => `${a.code} (${a.name})`)
            .join(" dan ")}`
        : "";
    insights.push(
      `Selisih skor terhadap peringkat 2 (${runnerUpInfo.code} — ${runnerUpInfo.model}, skor ${runnerUpInfo.score.toFixed(6)}) adalah ${runnerUpInfo.marginFromWinner.toFixed(6)}; alternatif peringkat 2${advText}.`,
    );
  }

  if (sorted.length > 2) {
    insights.push(
      `Rentang skor dari peringkat 1 (${first.code}: ${first.score.toFixed(6)}) hingga peringkat ${last.rank} (${last.code}: ${last.score.toFixed(6)}) sebesar ${(first.score - last.score).toFixed(6)}, dengan kontribusi terendah pada ${lowestContribs[0]!.code} (${lowestContribs[0]!.name}: ${lowestContribs[0]!.contribution.toFixed(6)}).`,
    );
  }

  if (sensitivitySummary && sensitivitySummary.totalPerturbed > 0) {
    insights.push(
      `Pada uji sensitivitas ${sensitivitySummary.totalPerturbed} skenario perubahan satu bobot (±5%, ±10%, ±20%), ${first.code} bertahan di peringkat 1 pada ${sensitivitySummary.baselineWins} skenario (${sensitivitySummary.stabilityPct.toFixed(2)}%)${
        sensitivitySummary.changedCount > 0
          ? ` dan berganti ke ${sensitivitySummary.challengerCodes.join(", ")} pada ${sensitivitySummary.changedCount} skenario.`
          : " tanpa perubahan peringkat pertama."
      }`,
    );
  }

  return {
    totalAlternatives: sorted.length,
    winner: {
      code: first.code,
      model: first.model,
      score: first.score,
      strongestCriteria: winnerContribs.slice(0, 3),
    },
    runnerUp: runnerUpInfo,
    lowest: {
      code: last.code,
      model: last.model,
      score: last.score,
      gapFromWinner: first.score - last.score,
      weakestCriteria: lowestContribs.slice(0, 3),
    },
    sensitivitySummary,
    insights,
  };
}

/**
 * Runs the legacy three sensitivity scenarios defined in PRD §6.4 (preserved for v1 7-alternative regression & history):
 * - S1: consistent_only (CR <= 0.10) + all active alternatives (7 baseline)
 * - S2: all_eligible (all responses) + all active alternatives (7 baseline)
 * - S3: consistent_only + subset excluding A6 and A7 (5 alternatives, re-normalized)
 */
export function runStandardSensitivitySuite(
  responses: readonly AhpIndividualInput[],
  alternatives: readonly SawAlternativeMetricInput[],
): SensitivitySuiteResult {
  const ahpPrimary = runAhpGroup(responses, "consistent_only");
  const ahpAllEligible = runAhpGroup(responses, "all_eligible");

  const sawPrimary = runSaw({
    weights: ahpPrimary.weights,
    alternatives,
    scenario: "primary_7_consistent",
    c6Metric: "battery_hours",
    ahpMode: "consistent_only",
  });

  const sawAllEligible = runSaw({
    weights: ahpAllEligible.weights,
    alternatives,
    scenario: "sensitivity_7_all",
    c6Metric: "battery_hours",
    ahpMode: "all_eligible",
  });

  const subsetWithoutA6A7 = alternatives.filter(
    (alt) => alt.code !== "A6" && alt.code !== "A7",
  );

  const sawWithoutA6A7 =
    subsetWithoutA6A7.length > 0
      ? runSaw({
          weights: ahpPrimary.weights,
          alternatives: subsetWithoutA6A7,
          scenario: "sensitivity_5_no_a6_a7",
          c6Metric: "battery_hours",
          ahpMode: "consistent_only",
        })
      : null;

  const allByCode = new Map(sawAllEligible.results.map((r) => [r.code, r]));
  const fiveByCode = new Map(
    (sawWithoutA6A7?.results ?? []).map((r) => [r.code, r]),
  );

  const rankComparison: SensitivityRankRow[] = sawPrimary.results.map((row) => {
    const s2 = allByCode.get(row.code);
    const s3 = fiveByCode.get(row.code);
    return {
      code: row.code,
      model: row.model,
      rankPrimary: row.rank,
      scorePrimary: row.score,
      rankAllEligible: s2?.rank ?? null,
      scoreAllEligible: s2?.score ?? null,
      rankWithoutA6A7: s3?.rank ?? null,
      scoreWithoutA6A7: s3?.score ?? null,
    };
  });

  const notes: string[] = [
    "Nilai skor absolut antara skenario 7 alternatif dan skenario 5 alternatif (tanpa A6 dan A7) tidak boleh dibandingkan secara langsung karena faktor normalisasi min/max dihitung ulang pada masing-masing himpunan alternatif.",
    "Skenario seluruh respons (termasuk CR > 0,10) disajikan semata sebagai analisis sensitivitas, bukan pengganti uji konsistensi individual.",
    "Skenario 5 alternatif mensimulasikan risiko ketidaktersediaan A6 dan A7, bukan klaim bahwa lima alternatif lainnya pasti tersedia di penjual.",
  ];

  return {
    ahpPrimary,
    ahpAllEligible,
    sawPrimary,
    sawAllEligible,
    sawWithoutA6A7,
    rankComparison,
    notes,
  };
}
