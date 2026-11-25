import {
  AHP_CR_THRESHOLD,
  RESEARCH_TARGET_CONSISTENT_COUNT,
  type SawScenarioKey,
  type SensitivityRankRow,
} from "@/lib/decision";
import { formatDateJakarta, isSafeHttpUrl } from "@/lib/formatting";
import type {
  AhpRunRecord,
  AlternativeRecord,
  PublicLaptopRankingItem,
  PublicRecommendationPayload,
  QualityReviewChecklist,
  SawResultRecord,
  SawRunRecord,
  SurveyResponseRecord,
} from "@/lib/repositories/types";

export interface PublicationGateResult {
  allowed: boolean;
  unmetRequirements: string[];
}

export function getScenarioLabel(scenario: SawScenarioKey): string {
  switch (scenario) {
    case "primary_7_consistent":
      return "Skenario Utama — 7 Alternatif & Responden Konsisten (CR ≤ 0,10)";
    case "sensitivity_7_all":
      return "Sensitivitas — 7 Alternatif & Seluruh Responden Eligible";
    case "sensitivity_5_no_a6_a7":
      return "Sensitivitas — 5 Alternatif Tanpa A6 & A7 (Simulasi Risiko Stok)";
    default:
      return "Skenario Kustom Penelitian";
  }
}

export function buildPublicBannerText(
  observedAt: string,
  status: "provisional" | "final",
): string {
  const formattedDate = formatDateJakarta(observedAt);
  const base = `Hasil berdasarkan preferensi panel mahasiswa dan penawaran yang dicatat pada ${formattedDate}. Harga dan stok dapat berubah. Rekomendasi terbatas pada alternatif yang dinilai.`;
  if (status === "provisional") {
    return `${base} Validasi respons/sumber belum seluruhnya dikonfirmasi.`;
  }
  return base;
}

/**
 * Enforces PRD §9 publication gates server-side.
 * Blocks primary publication when group CR > 0.10 or sources incomplete,
 * and enforces full human confirmation checklist before status="final".
 */
export function validatePublicationGates(params: {
  intendedStatus: "provisional" | "final";
  ahpRun: AhpRunRecord;
  sawRun: SawRunRecord;
  alternativesInRun: AlternativeRecord[];
  qualityReview: QualityReviewChecklist;
}): PublicationGateResult {
  const { intendedStatus, ahpRun, sawRun, alternativesInRun, qualityReview } = params;
  const unmet: string[] = [];

  if (!ahpRun.passesCr || ahpRun.cr > AHP_CR_THRESHOLD) {
    unmet.push(
      `Matriks AHP gabungan tidak memenuhi ambang konsistensi (CR = ${ahpRun.cr.toFixed(6)} > 0,10).`,
    );
  }

  if (ahpRun.mode !== "consistent_only" && intendedStatus === "final") {
    unmet.push(
      "Publikasi final wajib menggunakan skenario utama responden konsisten (CR ≤ 0,10), bukan seluruh responden tidak konsisten.",
    );
  }

  if (alternativesInRun.length === 0) {
    unmet.push("Tidak ada alternatif laptop yang terhubung pada perhitungan SAW.");
  }

  for (const alt of alternativesInRun) {
    const types = new Set(alt.sources.filter((s) => isSafeHttpUrl(s.url)).map((s) => s.sourceType));
    if (
      !types.has("price") ||
      !types.has("spec") ||
      !types.has("benchmark") ||
      !types.has("battery")
    ) {
      unmet.push(
        `Alternatif ${alt.code} belum memiliki 4 tautan sumber lengkap yang valid (harga, spesifikasi, benchmark, baterai).`,
      );
    }
  }

  if (intendedStatus === "final") {
    if (!qualityReview.primaryRuleVerified) {
      unmet.push("Konfirmasi kesesuaian aturan konsistensi AHP individu & kelompok belum dicentang.");
    }
    if (!qualityReview.sourcesAndSkuReviewed) {
      unmet.push("Verifikasi bukti sumber dan kesesuaian tingkat SKU/protokol baterai belum dikonfirmasi.");
    }
    if (!qualityReview.responseIndependenceConfirmed) {
      unmet.push(
        "Konfirmasi independensi & keaslian respons kuesioner tambahan (termasuk baris ber-CR mendekati nol) belum dilakukan oleh peneliti.",
      );
    }
    if (!qualityReview.stockOrArchivalScopeRecorded) {
      unmet.push(
        "Pencatatan hasil konfirmasi stok penjual (atau penetapan eksplisit ruang lingkup penawaran arsip bertanggal) belum dikonfirmasi.",
      );
    }
    if (!qualityReview.caveatsAcknowledged) {
      unmet.push("Pengakuan batasan penelitian (merek, snapshot tanggal, sensitivitas) belum dicentang.");
    }
    if (
      ahpRun.includedIds.length < RESEARCH_TARGET_CONSISTENT_COUNT &&
      (!qualityReview.methodologyExceptionNote ||
        qualityReview.methodologyExceptionNote.trim().length < 10)
    ) {
      unmet.push(
        `Jumlah respons konsisten (${ahpRun.includedIds.length}) di bawah target panel (${RESEARCH_TARGET_CONSISTENT_COUNT}); diperlukan catatan pengecualian metodologi eksplisit.`,
      );
    }
  }

  void sawRun;

  return {
    allowed: unmet.length === 0,
    unmetRequirements: unmet,
  };
}

/**
 * Constructs a strictly sanitized public snapshot payload.
 * Guarantees ZERO individual survey responses, timestamps, programs of study tied to rows,
 * or student suggestions are exposed to anonymous visitors.
 */
export function buildSanitizedPublicPayload(params: {
  status: "provisional" | "final";
  observedAt: string;
  publishedAt: string;
  caveats: string;
  responses: SurveyResponseRecord[];
  ahpRun: AhpRunRecord;
  sawRun: SawRunRecord;
  sawResults: SawResultRecord[];
  alternatives: AlternativeRecord[];
  sensitivityAllEligible?: {
    ahpRun: AhpRunRecord;
    sawResults: SawResultRecord[];
  } | null;
  sensitivityWithoutA6A7?: {
    sawResults: SawResultRecord[];
  } | null;
}): PublicRecommendationPayload {
  const {
    status,
    observedAt,
    publishedAt,
    caveats,
    responses,
    ahpRun,
    sawRun,
    sawResults,
    alternatives,
    sensitivityAllEligible,
    sensitivityWithoutA6A7,
  } = params;

  const altMap = new Map(alternatives.map((a) => [a.id, a]));
  const totalResponses = responses.length;
  const eligibleResponses = responses.filter((r) => r.validationStatus === "eligible").length;
  const consistentResponses =
    ahpRun.mode === "consistent_only" ? ahpRun.includedIds.length : 0;
  const inconsistentResponses = Math.max(0, eligibleResponses - consistentResponses);

  // Aggregate use case distribution ONLY (no individual records!)
  const useCaseCounts = new Map<string, number>();
  for (const resp of responses) {
    if (resp.validationStatus !== "eligible") continue;
    const key = resp.useCase.trim() || "Lainnya";
    useCaseCounts.set(key, (useCaseCounts.get(key) ?? 0) + 1);
  }
  const useCaseBreakdown = Array.from(useCaseCounts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percentage: eligibleResponses > 0 ? (count / eligibleResponses) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const sortedResults = [...sawResults].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.alternativeCode.localeCompare(b.alternativeCode, "en");
  });

  const items: PublicLaptopRankingItem[] = sortedResults.map((res) => {
    const alt = altMap.get(res.alternativeId);
    if (!alt) {
      throw new Error(`Alternatif ${res.alternativeCode} tidak ditemukan saat membangun snapshot publik.`);
    }
    return {
      code: alt.code,
      brand: alt.brand,
      model: alt.model,
      sku: alt.sku,
      cpuName: alt.cpuName,
      priceIdr: alt.priceIdr,
      cpuMark: alt.cpuMark,
      ramGb: alt.ramGb,
      ssdGb: alt.ssdGb,
      weightKg: alt.weightKg,
      batteryHours: alt.batteryHours,
      batteryWh: alt.batteryWh,
      seller: alt.seller,
      stockStatus: alt.stockStatus,
      evidenceStatus: alt.evidenceStatus,
      batteryProtocol: alt.batteryProtocol,
      evidenceNotes: alt.evidenceNotes,
      sources: alt.sources.map((s) => ({
        sourceType: s.sourceType,
        url: s.url,
        observedAt: s.observedAt,
        evidenceLevel: s.evidenceLevel,
        notes: s.notes,
      })),
      criteriaValues: res.criteriaValues,
      normalizedValues: res.normalizedValues,
      weightedValues: res.weightedValues,
      score: res.score,
      rank: res.rank,
      isTied: res.isTied,
    };
  });

  const s2ByCode = new Map(
    (sensitivityAllEligible?.sawResults ?? []).map((r) => [r.alternativeCode, r]),
  );
  const s3ByCode = new Map(
    (sensitivityWithoutA6A7?.sawResults ?? []).map((r) => [r.alternativeCode, r]),
  );

  const rankComparison: SensitivityRankRow[] = items.map((item) => {
    const s2 = s2ByCode.get(item.code);
    const s3 = s3ByCode.get(item.code);
    return {
      code: item.code,
      model: item.model,
      rankPrimary: item.rank,
      scorePrimary: item.score,
      rankAllEligible: s2?.rank ?? null,
      scoreAllEligible: s2?.score ?? null,
      rankWithoutA6A7: s3?.rank ?? null,
      scoreWithoutA6A7: s3?.score ?? null,
    };
  });

  return {
    schemaVersion: "1.0",
    publicationStatus: status,
    observedAt,
    publishedAt,
    bannerText: buildPublicBannerText(observedAt, status),
    caveats,
    scenario: sawRun.scenario,
    scenarioLabel: getScenarioLabel(sawRun.scenario),
    researchSummary: {
      totalResponses,
      eligibleResponses,
      consistentResponses,
      inconsistentResponses,
      alternativeCount: items.length,
      useCaseBreakdown,
    },
    ahp: {
      algorithmVersion: ahpRun.algorithmVersion,
      mode: ahpRun.mode,
      lambdaMax: ahpRun.lambdaMax,
      ci: ahpRun.ci,
      ri: ahpRun.ri,
      cr: ahpRun.cr,
      passesCr: ahpRun.passesCr,
      aggregateMatrix: ahpRun.aggregateMatrix,
      weights: ahpRun.weights,
      weightsByCode: ahpRun.weightsByCode,
      warnings: ahpRun.warnings,
    },
    saw: {
      runId: sawRun.id,
      algorithmVersion: sawRun.algorithmVersion,
      extrema: sawRun.normalizationExtrema,
      topMargin: sawRun.topMargin,
      warnings: sawRun.warnings,
      caveats: sawRun.caveats,
      items,
    },
    sensitivity: {
      allEligibleCr: sensitivityAllEligible?.ahpRun.cr ?? null,
      allEligibleWeightsByCode: sensitivityAllEligible?.ahpRun.weightsByCode ?? null,
      rankComparison,
      notes: [
        "Nilai skor absolut antara skenario 7 alternatif dan skenario 5 alternatif (tanpa A6 & A7) tidak boleh dibandingkan langsung karena basis normalisasi min/max dihitung ulang.",
        "Skenario 33 respons hanya digunakan sebagai pembanding sensitivitas, bukan pengganti uji konsistensi individual CR ≤ 0,10.",
      ],
    },
  };
}
