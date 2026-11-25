import ExcelJS from "exceljs";
import { CRITERIA, CRITERION_CODES, type SensitivityRankRow } from "@/lib/decision";
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
    fgColor: { argb: "FF18181B" },
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

  const wb = new ExcelJS.Workbook();
  wb.creator = "LaptopMatch SPK Kelompok 13";
  wb.created = new Date();

  const altById = new Map(alternatives.map((a) => [a.id, a]));
  const sortedResults = [...sawResults].sort((a, b) =>
    a.rank !== b.rank
      ? a.rank - b.rank
      : a.alternativeCode.localeCompare(b.alternativeCode, "en"),
  );

  // Sheet 1: Ringkasan
  const sSummary = wb.addWorksheet("Ringkasan");
  sSummary.columns = [
    { header: "Komponen", key: "k", width: 32 },
    { header: "Nilai / Keterangan", key: "v", width: 80 },
  ];
  styleHeaderRow(sSummary.getRow(1));
  const summaryRows: Array<[string, string | number]> = [
    ["Aplikasi", "LaptopMatch — SPK Pemilihan Laptop Mahasiswa (AHP–SAW)"],
    ["Kelompok", "Kelompok 13, Program Studi Sistem Informasi, UPN Veteran Jawa Timur"],
    ["ID Perhitungan SAW", sawRun.id],
    ["ID Perhitungan AHP", ahpRun.id],
    ["Versi Algoritma", sawRun.algorithmVersion],
    ["Skenario", getScenarioLabel(sawRun.scenario)],
    ["Mode AHP", ahpRun.mode],
    ["Status Publikasi", publicationStatus],
    ["Tanggal Observasi Data Laptop", dataset.observedAt],
    ["Versi Dataset Alternatif", `v${dataset.version} (${dataset.status})`],
    ["Jumlah Responden Disertakan", ahpRun.includedIds.length],
    ["Jumlah Responden Dieksklusi", ahpRun.excludedIds.length],
    ["Lambda Maksimum (AHP)", ahpRun.lambdaMax],
    ["Consistency Index (CI)", ahpRun.ci],
    ["Random Index (RI, n=6)", ahpRun.ri],
    ["Consistency Ratio (CR)", ahpRun.cr],
    ["Status Konsistensi AHP", ahpRun.passesCr ? "Konsisten (CR ≤ 0,10)" : "Tidak Konsisten"],
    ["Jumlah Alternatif Dinilai", sortedResults.length],
    ["Peringkat 1", sortedResults[0] ? `${sortedResults[0].alternativeCode} — ${sortedResults[0].alternativeModel}` : "-"],
    ["Skor Peringkat 1", sortedResults[0]?.score ?? 0],
    ["Selisih Skor Rank 1 vs Rank 2", sawRun.topMargin ?? "-"],
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
    { header: "Kriteria", key: "name", width: 24 },
    { header: "Atribut", key: "attr", width: 12 },
    { header: "Satuan", key: "unit", width: 20 },
    { header: "Bobot Utama (Presisi Penuh)", key: "wMain", width: 26 },
    { header: "Persentase (%)", key: "pct", width: 16 },
    { header: "Bobot Pembanding 33 Responden", key: "wAll", width: 28 },
  ];
  styleHeaderRow(sWeights.getRow(1));
  for (const crit of CRITERIA) {
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
  for (let i = 0; i < CRITERIA.length; i++) {
    const crit = CRITERIA[i]!;
    const rowVals = ahpRun.aggregateMatrix[i] ?? [];
    sMatrix.addRow([`${crit.code} (${crit.shortName})`, ...rowVals]);
  }
  sMatrix.getColumn(1).width = 24;
  for (let c = 2; c <= 7; c++) sMatrix.getColumn(c).width = 16;

  // Sheet 4: Alternatif & Sumber
  const sAlts = wb.addWorksheet("Alternatif & Sumber");
  sAlts.columns = [
    { header: "Kode", key: "code", width: 8 },
    { header: "Model / SKU", key: "model", width: 38 },
    { header: "Prosesor", key: "cpu", width: 20 },
    { header: "Harga (Rp)", key: "price", width: 15 },
    { header: "CPU Mark", key: "cpuMark", width: 12 },
    { header: "RAM (GB)", key: "ram", width: 10 },
    { header: "SSD (GB)", key: "ssd", width: 10 },
    { header: "Berat (kg)", key: "weight", width: 12 },
    { header: "Video 1080p (jam)", key: "battery", width: 16 },
    { header: "Baterai (Wh, Metadata)", key: "wh", width: 18 },
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
      model: sanitizeSpreadsheetText(alt.model),
      cpu: sanitizeSpreadsheetText(alt.cpuName),
      price: alt.priceIdr,
      cpuMark: alt.cpuMark,
      ram: alt.ramGb,
      ssd: alt.ssdGb,
      weight: alt.weightKg,
      battery: alt.batteryHours,
      wh: alt.batteryWh ?? "-",
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
    { header: "Model", key: "model", width: 38 },
    { header: "R_C1 (Harga)", key: "C1", width: 16 },
    { header: "R_C2 (CPU)", key: "C2", width: 16 },
    { header: "R_C3 (RAM)", key: "C3", width: 16 },
    { header: "R_C4 (SSD)", key: "C4", width: 16 },
    { header: "R_C5 (Berat)", key: "C5", width: 16 },
    { header: "R_C6 (Baterai)", key: "C6", width: 16 },
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
    { header: "Model / SKU", key: "model", width: 38 },
    { header: "w1*r1 (Harga)", key: "C1", width: 16 },
    { header: "w2*r2 (CPU)", key: "C2", width: 16 },
    { header: "w3*r3 (RAM)", key: "C3", width: 16 },
    { header: "w4*r4 (SSD)", key: "C4", width: 16 },
    { header: "w5*r5 (Berat)", key: "C5", width: 16 },
    { header: "w6*r6 (Baterai)", key: "C6", width: 16 },
    { header: "Skor SAW (Presisi Penuh)", key: "score", width: 24 },
  ];
  styleHeaderRow(sRank.getRow(1));
  for (const res of sortedResults) {
    sRank.addRow({
      rank: res.rank,
      code: res.alternativeCode,
      model: sanitizeSpreadsheetText(res.alternativeModel),
      ...res.weightedValues,
      score: res.score,
    });
  }

  // Sheet 7: Sensitivitas
  const sSens = wb.addWorksheet("Sensitivitas");
  sSens.columns = [
    { header: "Kode", key: "code", width: 10 },
    { header: "Model", key: "model", width: 38 },
    { header: "Rank S1 (7 Alt / 17 Konsisten)", key: "r1", width: 26 },
    { header: "Skor S1", key: "s1", width: 18 },
    { header: "Rank S2 (7 Alt / 33 Responden)", key: "r2", width: 26 },
    { header: "Skor S2", key: "s2", width: 18 },
    { header: "Rank S3 (5 Alt Tanpa A6/A7)", key: "r3", width: 26 },
    { header: "Skor S3", key: "s3", width: 18 },
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
      "Skor absolut antara S1/S2 (7 alternatif) dan S3 (5 alternatif) tidak sebanding langsung karena nilai min/max normalisasi berubah saat himpunan alternatif berubah.",
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
