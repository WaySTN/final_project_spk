import ExcelJS from "exceljs";
import {
  CRITERION_CODES,
  getCriteriaForMetric,
  runWeightSensitivitySuite,
  type SensitivityRankRow,
} from "@/lib/decision";
import { compareAlternativeCodes } from "@/lib/formatting";
import { sanitizeSpreadsheetText } from "@/lib/import/validation";
import { getScenarioLabel } from "@/lib/publication/sanitize";
import type {
  AhpRunRecord,
  AlternativeDatasetRecord,
  AlternativeRecord,
  SawResultRecord,
  SawRunRecord,
} from "@/lib/repositories/types";

export interface ExportReportParams {
  sawRun: SawRunRecord;
  sawResults: SawResultRecord[];
  ahpRun: AhpRunRecord;
  dataset: AlternativeDatasetRecord;
  alternatives: AlternativeRecord[];
  allEligibleAhp?: AhpRunRecord | null;
  sensitivityRows?: SensitivityRankRow[];
  publicationStatus?: string;
}

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  row.alignment = { vertical: "middle", horizontal: "left" };
}

/**
 * Generates an auditable multi-sheet XLSX calculation report for lecturer review.
 * Sanitizes all free-text fields against Excel formula injection and excludes raw survey rows.
 */
export async function buildCalculationReportWorkbook(
  params: ExportReportParams,
): Promise<Buffer> {
  const {
    sawRun,
    sawResults,
    ahpRun,
    dataset,
    alternatives,
    allEligibleAhp,
    sensitivityRows = [],
    publicationStatus = "belum dipublikasikan",
  } = params;

  const c6Metric = sawRun.c6Metric ?? dataset.c6Metric ?? "battery_wh";
  const c6Unit = sawRun.c6Unit ?? dataset.c6Unit ?? (c6Metric === "battery_wh" ? "Wh" : "jam");
  const activeCriteria = getCriteriaForMetric(c6Metric);

  const wb = new ExcelJS.Workbook();
  wb.creator = "LaptopMatch SPK Kelompok 13";
  wb.created = new Date();

  const altById = new Map(alternatives.map((a) => [a.id, a]));
  const sortedResults = [...sawResults].sort((a, b) =>
    a.rank !== b.rank
      ? a.rank - b.rank
      : compareAlternativeCodes(a.alternativeCode, b.alternativeCode),
  );
  const includedBrands = Array.from(
    new Set(
      sortedResults
        .map((r) => altById.get(r.alternativeId)?.brand)
        .filter((b): b is string => Boolean(b)),
    ),
  ).sort((a, b) => a.localeCompare(b, "id"));

  const weightSensitivity =
    sawRun.weightSensitivity ??
    (sortedResults.length > 0
      ? runWeightSensitivitySuite({
          baseWeights: ahpRun.weights,
          baselineItems: sortedResults.map((r) => ({
            code: r.alternativeCode,
            model: r.alternativeModel,
            normalizedValues: r.normalizedValues,
            weightedValues: r.weightedValues,
            criteriaValues: r.criteriaValues,
            score: r.score,
            rank: r.rank,
          })),
        })
      : null);

  // Sheet 1: Ringkasan
  const sSummary = wb.addWorksheet("Ringkasan");
  sSummary.columns = [
    { header: "Komponen", key: "k", width: 36 },
    { header: "Nilai / Keterangan", key: "v", width: 84 },
  ];
  styleHeaderRow(sSummary.getRow(1));
  const summaryRows: Array<[string, string | number]> = [
    ["Aplikasi", "LaptopMatch — SPK Pemilihan Laptop Mahasiswa (AHP–SAW)"],
    ["Kelompok", "Kelompok 13, Kelas D, Program Studi Sistem Informasi, UPN Veteran Jawa Timur"],
    ["ID Perhitungan SAW", sawRun.id],
    ["ID Perhitungan AHP", ahpRun.id],
    ["Versi Algoritma", sawRun.algorithmVersion],
    ["Skenario", getScenarioLabel(sawRun.scenario)],
    ["Mode AHP", ahpRun.mode],
    ["Definisi Kriteria C6", c6Metric === "battery_wh" ? "Kapasitas baterai (Wh, proksi daya tahan baterai)" : "Daya tahan baterai video lokal 1080p (jam, dataset historis)"],
    ["Status Publikasi", publicationStatus],
    ["Tanggal Observasi Data Laptop", dataset.observedAt],
    ["Versi Dataset Alternatif", `v${dataset.version} (${dataset.status})`],
    ["Jumlah Merek pada Himpunan Aktif", `${includedBrands.length} (${includedBrands.join(", ")})`],
    ["Jumlah Responden Disertakan", ahpRun.includedIds.length],
    ["Jumlah Responden Dieksklusi", ahpRun.excludedIds.length],
    ["Lambda Maksimum (AHP)", ahpRun.lambdaMax],
    ["Consistency Index (CI)", ahpRun.ci],
    ["Random Index (RI, n=6)", ahpRun.ri],
    ["Consistency Ratio (CR)", ahpRun.cr],
    ["Status Konsistensi AHP", ahpRun.passesCr ? "Konsisten (CR ≤ 0,10)" : "Tidak Konsisten"],
    ["Jumlah Alternatif Dinilai", sortedResults.length],
    ["Kandidat Dikeluarkan (Arsip Audit)", dataset.excludedCandidates?.length ?? 0],
    ["Peringkat 1", sortedResults[0] ? `${sortedResults[0].alternativeCode} — ${sortedResults[0].alternativeModel}` : "-"],
    ["Skor Peringkat 1", sortedResults[0]?.score ?? 0],
    ["Selisih Skor Rank 1 vs Rank 2", sawRun.topMargin ?? "-"],
    [
      "Stabilitas Sensitivitas Bobot (36 Skenario)",
      weightSensitivity
        ? `${weightSensitivity.baselineWinnerCode} bertahan ${weightSensitivity.baselineWinnerWinsCount}/${weightSensitivity.perturbedScenarioCount} (${weightSensitivity.baselineWinnerStabilityPct.toFixed(2)}%)`
        : "-",
    ],
    ["Catatan Integritas", "Laporan ini hanya memuat agregat penelitian dan data alternatif bersumber; data mentah individu responden tidak diekspor ke ringkasan publik."],
  ];
  for (const [k, v] of summaryRows) {
    sSummary.addRow({
      k,
      v: typeof v === "string" ? sanitizeSpreadsheetText(v) : v,
    });
  }

  // Sheet 2: Bobot AHP
  const sWeights = wb.addWorksheet("Bobot AHP");
  sWeights.columns = [
    { header: "Kode", key: "code", width: 10 },
    { header: "Kriteria", key: "name", width: 26 },
    { header: "Atribut", key: "attr", width: 12 },
    { header: "Satuan", key: "unit", width: 22 },
    { header: "Bobot Utama (Presisi Penuh)", key: "wMain", width: 26 },
    { header: "Persentase (%)", key: "pct", width: 16 },
    { header: "Bobot Pembanding 33 Responden", key: "wAll", width: 28 },
  ];
  styleHeaderRow(sWeights.getRow(1));
  for (const crit of activeCriteria) {
    const w = ahpRun.weightsByCode[crit.code];
    const wAll = allEligibleAhp ? allEligibleAhp.weightsByCode[crit.code] : null;
    sWeights.addRow({
      code: crit.code,
      name: crit.name,
      attr: crit.attribute.toUpperCase(),
      unit: crit.unit,
      wMain: w,
      pct: Number((w * 100).toFixed(4)),
      wAll: wAll ?? "-",
    });
  }

  // Sheet 3: Matriks AIJ
  const sMatrix = wb.addWorksheet("Matriks AIJ");
  sMatrix.addRow(["Kriteria", ...CRITERION_CODES]);
  styleHeaderRow(sMatrix.getRow(1));
  for (let i = 0; i < activeCriteria.length; i++) {
    const crit = activeCriteria[i]!;
    const rowVals = ahpRun.aggregateMatrix[i] ?? [];
    sMatrix.addRow([`${crit.code} (${crit.shortName})`, ...rowVals]);
  }
  sMatrix.getColumn(1).width = 24;
  for (let c = 2; c <= 7; c++) sMatrix.getColumn(c).width = 16;

  // Sheet 4: Alternatif & Sumber
  const sAlts = wb.addWorksheet("Alternatif & Sumber");
  sAlts.columns = [
    { header: "Kode", key: "code", width: 8 },
    { header: "Merek", key: "brand", width: 14 },
    { header: "Model / SKU", key: "model", width: 40 },
    { header: "Prosesor", key: "cpu", width: 24 },
    { header: "Harga (Rp)", key: "price", width: 15 },
    { header: "CPU Mark", key: "cpuMark", width: 12 },
    { header: "RAM (GB)", key: "ram", width: 10 },
    { header: "SSD (GB)", key: "ssd", width: 10 },
    { header: "Berat (kg)", key: "weight", width: 12 },
    {
      header: c6Metric === "battery_wh" ? "Baterai (Wh) — C6" : "Video 1080p (jam) — C6",
      key: "c6Val",
      width: 22,
    },
    {
      header: c6Metric === "battery_wh" ? "Durasi Jam (Opsional)" : "Baterai (Wh, Metadata)",
      key: "c6Secondary",
      width: 22,
    },
    { header: "Penjual", key: "seller", width: 24 },
    { header: "Status Stok", key: "stock", width: 22 },
    { header: "Status Bukti", key: "evidence", width: 24 },
    { header: "URL Harga", key: "uPrice", width: 42 },
    { header: "URL Spesifikasi", key: "uSpec", width: 42 },
    { header: "URL Baterai", key: "uBat", width: 42 },
    { header: "URL CPU Mark", key: "uBench", width: 42 },
  ];
  styleHeaderRow(sAlts.getRow(1));

  for (const res of sortedResults) {
    const alt = altById.get(res.alternativeId);
    if (!alt) continue;
    const findUrl = (t: string) => alt.sources.find((s) => s.sourceType === t)?.url ?? "";
    sAlts.addRow({
      code: alt.code,
      brand: sanitizeSpreadsheetText(alt.brand),
      model: sanitizeSpreadsheetText(alt.model),
      cpu: sanitizeSpreadsheetText(alt.cpuName),
      price: alt.priceIdr,
      cpuMark: alt.cpuMark,
      ram: alt.ramGb,
      ssd: alt.ssdGb,
      weight: alt.weightKg,
      c6Val: c6Metric === "battery_wh" ? (alt.batteryWh ?? "-") : (alt.batteryHours ?? "-"),
      c6Secondary: c6Metric === "battery_wh" ? (alt.batteryHours ?? "-") : (alt.batteryWh ?? "-"),
      seller: sanitizeSpreadsheetText(alt.seller),
      stock: alt.stockStatus,
      evidence: alt.evidenceStatus,
      uPrice: sanitizeSpreadsheetText(findUrl("price")),
      uSpec: sanitizeSpreadsheetText(findUrl("spec")),
      uBat: sanitizeSpreadsheetText(findUrl("battery")),
      uBench: sanitizeSpreadsheetText(findUrl("benchmark")),
    });
  }

  // Sheet 5: Normalisasi SAW (Matriks R + Extrema)
  const sNorm = wb.addWorksheet("Normalisasi SAW");
  sNorm.columns = [
    { header: "Kode", key: "code", width: 10 },
    { header: "Model", key: "model", width: 40 },
    { header: "R_C1 (Harga)", key: "C1", width: 16 },
    { header: "R_C2 (CPU)", key: "C2", width: 16 },
    { header: "R_C3 (RAM)", key: "C3", width: 16 },
    { header: "R_C4 (SSD)", key: "C4", width: 16 },
    { header: "R_C5 (Berat)", key: "C5", width: 16 },
    { header: `R_C6 (Baterai ${c6Unit})`, key: "C6", width: 18 },
  ];
  styleHeaderRow(sNorm.getRow(1));
  for (const res of sortedResults) {
    sNorm.addRow({
      code: res.alternativeCode,
      model: sanitizeSpreadsheetText(res.alternativeModel),
      ...res.normalizedValues,
    });
  }
  sNorm.addRow([]);
  sNorm.addRow({
    code: "EKSTREM",
    model: "Min (Cost) / Max (Benefit) pada himpunan aktif",
    C1: sawRun.normalizationExtrema.C1.value,
    C2: sawRun.normalizationExtrema.C2.value,
    C3: sawRun.normalizationExtrema.C3.value,
    C4: sawRun.normalizationExtrema.C4.value,
    C5: sawRun.normalizationExtrema.C5.value,
    C6: sawRun.normalizationExtrema.C6.value,
  });

  // Sheet 6: Kontribusi & Ranking
  const sRank = wb.addWorksheet("Kontribusi & Ranking");
  sRank.columns = [
    { header: "Peringkat", key: "rank", width: 12 },
    { header: "Kode", key: "code", width: 10 },
    { header: "Merek", key: "brand", width: 14 },
    { header: "Model / SKU", key: "model", width: 40 },
    { header: "w1*r1 (Harga)", key: "C1", width: 16 },
    { header: "w2*r2 (CPU)", key: "C2", width: 16 },
    { header: "w3*r3 (RAM)", key: "C3", width: 16 },
    { header: "w4*r4 (SSD)", key: "C4", width: 16 },
    { header: "w5*r5 (Berat)", key: "C5", width: 16 },
    { header: `w6*r6 (Baterai ${c6Unit})`, key: "C6", width: 18 },
    { header: "Skor SAW (Presisi Penuh)", key: "score", width: 24 },
  ];
  styleHeaderRow(sRank.getRow(1));
  for (const res of sortedResults) {
    const alt = altById.get(res.alternativeId);
    sRank.addRow({
      rank: res.rank,
      code: res.alternativeCode,
      brand: sanitizeSpreadsheetText(alt?.brand ?? "-"),
      model: sanitizeSpreadsheetText(res.alternativeModel),
      ...res.weightedValues,
      score: res.score,
    });
  }

  // Sheet 7: Sensitivitas Bobot (37 Skenario — UAS)
  if (weightSensitivity) {
    const sWeightSens = wb.addWorksheet("Sensitivitas Bobot 37");
    sWeightSens.columns = [
      { header: "Skenario", key: "label", width: 16 },
      { header: "Kriteria Diubah", key: "crit", width: 16 },
      { header: "Delta (%)", key: "delta", width: 12 },
      { header: "W1 (Harga)", key: "w1", width: 14 },
      { header: "W2 (CPU)", key: "w2", width: 14 },
      { header: "W3 (RAM)", key: "w3", width: 14 },
      { header: "W4 (SSD)", key: "w4", width: 14 },
      { header: "W5 (Berat)", key: "w5", width: 14 },
      { header: "W6 (Baterai)", key: "w6", width: 14 },
      { header: "Total Bobot", key: "sum", width: 14 },
      { header: "Peringkat 1", key: "winner", width: 14 },
      { header: "Model Peringkat 1", key: "winnerModel", width: 34 },
      { header: "Skor Tertinggi", key: "maxScore", width: 18 },
      { header: "Berubah dari Baseline", key: "changed", width: 22 },
    ];
    styleHeaderRow(sWeightSens.getRow(1));
    for (const sc of weightSensitivity.scenarios) {
      sWeightSens.addRow({
        label: sc.label,
        crit: sc.criterion ?? "-",
        delta: sc.criterion ? `${sc.relativeDelta > 0 ? "+" : ""}${Math.round(sc.relativeDelta * 100)}%` : "0%",
        w1: sc.weightsByCode.C1,
        w2: sc.weightsByCode.C2,
        w3: sc.weightsByCode.C3,
        w4: sc.weightsByCode.C4,
        w5: sc.weightsByCode.C5,
        w6: sc.weightsByCode.C6,
        sum: sc.weightSum,
        winner: sc.winnerCode,
        winnerModel: sanitizeSpreadsheetText(sc.winnerModel),
        maxScore: sc.maxScore,
        changed: sc.winnerChangedFromBaseline ? "Ya" : "Tidak",
      });
    }
  }

  // Sheet 8: Sensitivitas Skenario (Pembanding Responden / Himpunan)
  const sSens = wb.addWorksheet("Sensitivitas");
  sSens.columns = [
    { header: "Kode", key: "code", width: 10 },
    { header: "Model", key: "model", width: 40 },
    { header: "Rank Utama (17 Konsisten)", key: "r1", width: 24 },
    { header: "Skor Utama", key: "s1", width: 18 },
    { header: "Rank Pembanding (33 Responden)", key: "r2", width: 28 },
    { header: "Skor Pembanding", key: "s2", width: 18 },
    { header: "Rank Subset Alternatif (Opsional)", key: "r3", width: 28 },
    { header: "Skor Subset", key: "s3", width: 18 },
  ];
  styleHeaderRow(sSens.getRow(1));
  for (const row of sensitivityRows) {
    sSens.addRow({
      code: row.code,
      model: sanitizeSpreadsheetText(row.model),
      r1: row.rankPrimary ?? "-",
      s1: row.scorePrimary ?? "-",
      r2: row.rankAllEligible ?? "-",
      s2: row.scoreAllEligible ?? "-",
      r3: row.rankWithoutA6A7 ?? "-",
      s3: row.scoreWithoutA6A7 ?? "-",
    });
  }
  sSens.addRow([]);
  sSens.addRow({
    code: "CATATAN",
    model:
      "Skenario 33 responden hanya sebagai pembanding metodologis; uji sensitivitas perubahan satu bobot (37 skenario) tersimpan lengkap pada lembar Sensitivitas Bobot 37.",
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
