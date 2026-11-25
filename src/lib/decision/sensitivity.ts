import { runAhpGroup } from "./ahp";
import { runSaw } from "./saw";
import type {
  AhpIndividualInput,
  SawAlternativeMetricInput,
  SensitivityRankRow,
  SensitivitySuiteResult,
} from "./types";

/**
 * Runs the three mandatory research sensitivity scenarios defined in PRD §6.4:
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
    ahpMode: "consistent_only",
  });

  const sawAllEligible = runSaw({
    weights: ahpAllEligible.weights,
    alternatives,
    scenario: "sensitivity_7_all",
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
          ahpMode: "consistent_only",
        })
      : null;

  const primaryByCode = new Map(sawPrimary.results.map((r) => [r.code, r]));
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

  // Ensure any alternative present in primary map is covered cleanly
  void primaryByCode;

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
