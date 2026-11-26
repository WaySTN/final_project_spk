import {
  AHP_CR_THRESHOLD,
  RESEARCH_TARGET_CONSISTENT_COUNT,
  getC6UnitForMetric,
  runWeightSensitivitySuite,
  type C6MetricType,
  type SawScenarioKey,
  type SensitivityRankRow,
} from "@/lib/decision";
import { compareAlternativeCodes, formatDateJakarta, isSafeHttpUrl } from "@/lib/formatting";
import type {
  AhpRunRecord,
  AlternativeDatasetRecord,
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
    case "primary_33_consistent":
      return "Skenario Utama UAS — 33 Alternatif Lintas 8 Merek & Responden Konsisten (CR ≤ 0,10)";
    case "sensitivity_33_all":
      return "Sensitivitas — 33 Alternatif & Seluruh Responden Eligible (33 Respons)";
    case "primary_7_consistent":
      return "Skenario Utama Historis — 7 Alternatif Lenovo & Responden Konsisten (CR ≤ 0,10)";
    case "sensitivity_7_all":
      return "Sensitivitas Historis — 7 Alternatif & Seluruh Responden Eligible";
    case "sensitivity_5_no_a6_a7":
      return "Sensitivitas Historis — 5 Alternatif Tanpa A6 & A7 (Simulasi Risiko Stok)";
    default:
      return "Skenario Kustom Penelitian";
  }
}

export function buildDefaultPublicationCaveats(params: {
  alternativeCount: number;
  brandCount: number;
  observedAt: string;
  c6Metric: C6MetricType;
}): string {
  const formattedDate = formatDateJakarta(params.observedAt);
  if (params.c6Metric === "battery_wh") {
    return `Snapshot penelitian sementara (provisional) mencakup ${params.alternativeCount} konfigurasi laptop dari ${params.brandCount} merek pada rentang Rp9.000.000–Rp11.000.000 berdasarkan audit ${formattedDate}. Kriteria C6 menggunakan kapasitas energi baterai (Wh) sebagai indikator pendekatan daya tahan baterai dengan asumsi konsumsi daya setara, bukan durasi pemakaian aktual. Harga dan ketersediaan stok dapat berubah sewaktu-waktu dan belum diverifikasi melalui transaksi checkout langsung.`;
  }
  return `Snapshot penelitian historis sementara (provisional) mencakup ${params.alternativeCount} konfigurasi laptop pada rentang Rp9.000.000–Rp11.000.000 berdasarkan data audit ${formattedDate}. Independensi respons tambahan dan konfirmasi stok ritel langsung belum seluruhnya diverifikasi.`;
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
  dataset?: AlternativeDatasetRecord | null;
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
    dataset = null,
    sensitivityAllEligible,
    sensitivityWithoutA6A7,
  } = params;

  const c6Metric: C6MetricType =
    sawRun.c6Metric ?? dataset?.c6Metric ?? "battery_wh";
  const c6Unit = sawRun.c6Unit ?? dataset?.c6Unit ?? getC6UnitForMetric(c6Metric);

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
    return compareAlternativeCodes(a.alternativeCode, b.alternativeCode);
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
      sourceDateRecorded: alt.sourceDateRecorded,
      sourceStatusRecorded: alt.sourceStatusRecorded,
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

  const brands = Array.from(new Set(items.map((i) => i.brand))).sort((a, b) =>
    a.localeCompare(b, "id"),
  );
  const excludedCandidateCount = dataset?.excludedCandidates?.length ?? 0;
  const candidateCount =
    dataset?.candidateCount ?? items.length + excludedCandidateCount;

  const weightSensitivity =
    sawRun.weightSensitivity ??
    (items.length > 0
      ? runWeightSensitivitySuite({
          baseWeights: ahpRun.weights,
          baselineItems: items.map((i) => ({
            code: i.code,
            model: i.model,
            normalizedValues: i.normalizedValues,
            weightedValues: i.weightedValues,
            criteriaValues: i.criteriaValues,
            score: i.score,
            rank: i.rank,
          })),
        })
      : null);

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

  const sensitivityNotes: string[] = [
    "Analisis sensitivitas bobot mengubah satu bobot kriteria pada kisaran ±5%, ±10%, dan ±20% dengan penyesuaian proporsional lima bobot lain sehingga total bobot selalu tetap sama dengan 1.",
    "Skenario seluruh respons (33 respons termasuk CR > 0,10) hanya digunakan sebagai pembanding metodologis, bukan pengganti uji konsistensi individual CR ≤ 0,10.",
  ];
  if (sensitivityWithoutA6A7) {
    sensitivityNotes.push(
      "Nilai skor absolut antara skenario penuh dan skenario himpunan alternatif tereduksi tidak boleh dibandingkan langsung karena basis normalisasi min/max dihitung ulang.",
    );
  }

  return {
    schemaVersion: "2.0",
    publicationStatus: status,
    observedAt,
    publishedAt,
    bannerText: buildPublicBannerText(observedAt, status),
    caveats,
    scenario: sawRun.scenario,
    scenarioLabel: getScenarioLabel(sawRun.scenario),
    c6Metric,
    c6Unit,
    researchSummary: {
      totalResponses,
      eligibleResponses,
      consistentResponses,
      inconsistentResponses,
      alternativeCount: items.length,
      brandCount: brands.length,
      brands,
      candidateCount,
      excludedCandidateCount,
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
      c6Metric,
      c6Unit,
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
      notes: sensitivityNotes,
    },
    weightSensitivity,
  };
}
