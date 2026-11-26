import type ExcelJS from "exceljs";
import Papa from "papaparse";
import { loadExcelWorkbook } from "./xlsx-loader";
import {
  PRICE_MAX_IDR,
  PRICE_MIN_IDR,
  RESEARCH_AUDIT_DATE,
} from "@/lib/decision/criteria";
import type { C6MetricType } from "@/lib/decision/types";
import { isSafeHttpUrl } from "@/lib/formatting";
import {
  MAX_ALTERNATIVE_ROWS,
  computeSha256,
  validateUploadedFile,
} from "./validation";

export const LAPTOP_EXPECTED_SHEET = "Data Audit";
export const LAPTOP_UAS_CANDIDATE_SHEET = "Kandidat";
export const LAPTOP_UAS_SOURCE_SHEET = "Sumber";

export type AlternativeSourceType = "price" | "spec" | "benchmark" | "battery";
export type EvidenceLevel = "sku" | "series" | "listing";
export type StockStatus =
  | "indexed_in_stock"
  | "unconfirmed"
  | "confirmation_required"
  | "withdrawn_series"
  | "confirmed_available"
  | "unavailable";
export type EvidenceStatus =
  | "provisional_unconfirmed"
  | "verified_by_researcher"
  | "incomplete";

export interface ParsedAlternativeSource {
  sourceType: AlternativeSourceType;
  url: string;
  observedAt: string;
  evidenceLevel: EvidenceLevel;
  notes: string;
}

export interface ExcludedCandidateRecord {
  code: string;
  brand: string;
  model: string;
  cpuName: string;
  priceIdr: number | null;
  cpuMark: number | null;
  ramGb: number | null;
  ssdGb: number | null;
  weightKg: number | null;
  batteryWh: number | null;
  seller: string;
  sourceDateRecorded: string;
  sourceStatusRecorded: string;
  evidenceNotes: string;
  selectionReason: string;
  sources: ParsedAlternativeSource[];
}

export interface ParsedLaptopAlternative {
  rowNo: number;
  code: string;
  brand: string;
  model: string;
  sku: string;
  cpuName: string;
  priceIdr: number;
  cpuMark: number;
  ramGb: number;
  ssdGb: number;
  weightKg: number;
  batteryHours: number | null;
  batteryWh: number | null;
  seller: string;
  active: boolean;
  stockStatus: StockStatus;
  evidenceStatus: EvidenceStatus;
  batteryProtocol: string;
  evidenceNotes: string;
  sourceDateRecorded: string;
  sourceStatusRecorded: string;
  selectionReason: string;
  sources: ParsedAlternativeSource[];
  validationErrors: string[];
  eligible: boolean;
}

export interface LaptopImportPreview {
  ok: boolean;
  filename: string;
  sheetName: string;
  sha256: string;
  observedAt: string;
  c6Metric: C6MetricType;
  c6Unit: "Wh" | "jam";
  c6Definition: string;
  candidateCount: number;
  rows: ParsedLaptopAlternative[];
  excludedCandidates: ExcludedCandidateRecord[];
  summary: {
    totalRows: number;
    eligibleRows: number;
    invalidRows: number;
    withdrawnCount: number;
    brandCount: number;
    excludedCount: number;
  };
  errors: string[];
  warnings: string[];
}

const WH_BATTERY_PROTOCOL =
  "Kapasitas energi baterai (Wh) sebagai proksi daya tahan baterai — asumsi konsumsi daya setara, bukan durasi pemakaian aktual.";
const HOURS_BATTERY_PROTOCOL =
  "Lenovo PSREF — pemutaran video lokal 1080p @ 150 nit (tingkat seri/kapasitas)";

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return value.hyperlink.trim();
    }
    if ("result" in value && value.result !== undefined) {
      return String(value.result).trim();
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((p) => p.text).join("").trim();
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
  }
  return String(value).trim();
}

function parseNumericCell(raw: string): number {
  const cleaned = raw.trim().replace(/^Rp\s*/i, "");
  if (!cleaned) return Number.NaN;

  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned);
  }
  if (/^\d+,\d+$/.test(cleaned)) {
    return Number(cleaned.replace(",", "."));
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ""));
  }
  return Number(cleaned);
}

function parseOptionalNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  const parsed = parseNumericCell(String(val));
  return Number.isFinite(parsed) ? parsed : null;
}

function inferBrandAndSku(
  modelText: string,
  explicitBrand?: string,
): { brand: string; sku: string; fullModel: string } {
  const cleanModel = modelText.trim();
  const brand = explicitBrand?.trim() || cleanModel.split(/\s+/)[0] || "Tidak diketahui";
  const fullModel =
    explicitBrand &&
    !cleanModel.toLowerCase().startsWith(brand.toLowerCase())
      ? `${brand} ${cleanModel}`
      : cleanModel;

  const tokens = cleanModel.split(/\s+/).filter(Boolean);
  const skuCandidate = tokens.length >= 2 ? tokens[tokens.length - 1]! : cleanModel;
  return { brand, sku: skuCandidate, fullModel };
}

function inferStockStatus(statusNotes: string): StockStatus {
  const lower = statusNotes.toLowerCase();
  if (lower.includes("withdrawn")) {
    return "withdrawn_series";
  }
  if (lower.includes("sold out") || lower.includes("habis")) {
    return "unavailable";
  }
  if (
    lower.includes("konfirmasi stok") ||
    lower.includes("meminta konfirmasi") ||
    lower.includes("perlu konfirmasi") ||
    lower.includes("cek stok")
  ) {
    return "confirmation_required";
  }
  if (
    lower.includes("in stock pada indeks") ||
    lower.includes("ready pada indeks") ||
    lower.includes("stok 10+ pada indeks")
  ) {
    return "indexed_in_stock";
  }
  return "unconfirmed";
}

function inferEvidenceLevel(
  sourceType: AlternativeSourceType,
  url: string,
): EvidenceLevel {
  if (sourceType === "price") return "listing";
  if (sourceType === "benchmark") return "series";
  const lower = url.toLowerCase();
  if (
    lower.includes("psref.lenovo.com/detail/") ||
    lower.includes("store.acer.com/") ||
    lower.includes("acer.com/id-id/laptops/") ||
    lower.includes("storage-asset.msi.com/specsheet/")
  ) {
    return "sku";
  }
  if (
    lower.includes("psref.lenovo.com/product/") ||
    lower.includes("axiooworld.com/") ||
    lower.includes("id.msi.com/") ||
    lower.includes("advandigital.com/")
  ) {
    return "series";
  }
  return "listing";
}

function normalizeRecordedDateToIso(recorded: string, fallback: string): string {
  const trimmed = recorded.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  }
  return fallback;
}

interface RawLaptopCandidateInput {
  rowNo: number;
  code: string;
  explicitBrand?: string;
  model: string;
  cpuName: string;
  priceIdr: number;
  cpuMark: number;
  ramGb: number;
  ssdGb: number;
  weightKg: number;
  batteryHours: number | null;
  batteryWh: number | null;
  seller: string;
  sourceDateRecorded: string;
  sourceStatusRecorded: string;
  evidenceNotes: string;
  selectionReason: string;
  urlPrice: string;
  urlSpec: string;
  urlBattery: string;
  urlBenchmark: string;
}

function validateAndNormalizeCandidates(params: {
  filename: string;
  sheetName: string;
  sha256: string;
  observedAt: string;
  c6Metric: C6MetricType;
  candidates: RawLaptopCandidateInput[];
  excludedCandidates: ExcludedCandidateRecord[];
}): LaptopImportPreview {
  const {
    filename,
    sheetName,
    sha256,
    observedAt,
    c6Metric,
    candidates,
    excludedCandidates,
  } = params;

  const c6Unit: "Wh" | "jam" = c6Metric === "battery_wh" ? "Wh" : "jam";
  const c6Definition =
    c6Metric === "battery_wh"
      ? WH_BATTERY_PROTOCOL
      : HOURS_BATTERY_PROTOCOL;

  const parsedRows: ParsedLaptopAlternative[] = [];
  const seenCodes = new Set<string>();

  for (const item of candidates) {
    const validationErrors: string[] = [];
    const code = item.code.trim().toUpperCase();
    const { brand, sku, fullModel } = inferBrandAndSku(item.model, item.explicitBrand);
    const cpuName = item.cpuName.trim();
    const seller = item.seller.trim();
    const rowObservedAt = normalizeRecordedDateToIso(
      item.sourceDateRecorded,
      observedAt,
    );

    if (!/^A\d{1,3}$/.test(code)) {
      validationErrors.push(`Kode alternatif tidak valid: "${code}".`);
    } else if (seenCodes.has(code)) {
      validationErrors.push(`Kode alternatif duplikat: "${code}".`);
    } else {
      seenCodes.add(code);
    }

    if (!fullModel) validationErrors.push("Model dan SKU kosong.");
    if (!cpuName) validationErrors.push("Nama prosesor kosong.");
    if (!seller) validationErrors.push("Nama penjual kosong.");

    if (!Number.isFinite(item.priceIdr) || !Number.isInteger(item.priceIdr)) {
      validationErrors.push("Harga harus berupa bilangan bulat Rupiah.");
    } else if (item.priceIdr < PRICE_MIN_IDR || item.priceIdr > PRICE_MAX_IDR) {
      validationErrors.push(
        `Harga Rp${item.priceIdr.toLocaleString("id-ID")} di luar rentang Rp9.000.000–Rp11.000.000.`,
      );
    }

    if (!Number.isFinite(item.cpuMark) || item.cpuMark <= 0) {
      validationErrors.push("CPU Mark harus lebih dari 0.");
    }
    if (!Number.isFinite(item.ramGb) || item.ramGb <= 0) {
      validationErrors.push("RAM (GB) harus lebih dari 0.");
    }
    if (!Number.isFinite(item.ssdGb) || item.ssdGb <= 0) {
      validationErrors.push("SSD (GB) harus lebih dari 0.");
    }
    if (!Number.isFinite(item.weightKg) || item.weightKg <= 0) {
      validationErrors.push("Berat (kg) harus lebih dari 0.");
    }

    if (c6Metric === "battery_wh") {
      if (
        item.batteryWh === null ||
        !Number.isFinite(item.batteryWh) ||
        item.batteryWh <= 0
      ) {
        validationErrors.push("Kapasitas baterai (Wh) harus lebih dari 0.");
      }
    } else {
      if (
        item.batteryHours === null ||
        !Number.isFinite(item.batteryHours) ||
        item.batteryHours <= 0
      ) {
        validationErrors.push("Daya tahan baterai (jam) harus lebih dari 0.");
      }
    }

    const sources: ParsedAlternativeSource[] = [];
    const batterySourceNote =
      c6Metric === "battery_wh"
        ? "Kapasitas baterai (Wh) dari spesifikasi pabrikan/SKU sebagai proksi daya tahan."
        : "Estimasi maksimum pemutaran video lokal 1080p pada 150 nit (Lenovo PSREF, tingkat seri/kapasitas).";

    const sourceCandidates: Array<[AlternativeSourceType, string, string]> = [
      [
        "price",
        item.urlPrice.trim(),
        `Sumber penawaran harga dari ${seller || "penjual"} pada audit ${rowObservedAt}.`,
      ],
      ["spec", item.urlSpec.trim(), "Dokumentasi spesifikasi SKU/konfigurasi."],
      ["battery", item.urlBattery.trim(), batterySourceNote],
      [
        "benchmark",
        item.urlBenchmark.trim(),
        "Skor PassMark CPU Mark (daftar model prosesor).",
      ],
    ];

    for (const [sourceType, url, notes] of sourceCandidates) {
      if (!isSafeHttpUrl(url)) {
        validationErrors.push(`URL sumber ${sourceType} tidak valid atau kosong.`);
      } else {
        sources.push({
          sourceType,
          url,
          observedAt: rowObservedAt,
          evidenceLevel: inferEvidenceLevel(sourceType, url),
          notes,
        });
      }
    }

    const stockStatus = inferStockStatus(
      `${item.sourceStatusRecorded} ${item.evidenceNotes}`,
    );
    const eligible = validationErrors.length === 0;

    parsedRows.push({
      rowNo: item.rowNo,
      code,
      brand,
      model: fullModel,
      sku,
      cpuName,
      priceIdr: Number.isFinite(item.priceIdr) ? item.priceIdr : 0,
      cpuMark: Number.isFinite(item.cpuMark) ? item.cpuMark : 0,
      ramGb: Number.isFinite(item.ramGb) ? item.ramGb : 0,
      ssdGb: Number.isFinite(item.ssdGb) ? item.ssdGb : 0,
      weightKg: Number.isFinite(item.weightKg) ? item.weightKg : 0,
      batteryHours:
        c6Metric === "battery_hours" &&
        item.batteryHours !== null &&
        Number.isFinite(item.batteryHours)
          ? item.batteryHours
          : null,
      batteryWh:
        item.batteryWh !== null && Number.isFinite(item.batteryWh)
          ? item.batteryWh
          : null,
      seller,
      active: true,
      stockStatus,
      evidenceStatus: eligible ? "provisional_unconfirmed" : "incomplete",
      batteryProtocol: c6Definition,
      evidenceNotes: item.evidenceNotes.trim(),
      sourceDateRecorded: item.sourceDateRecorded.trim(),
      sourceStatusRecorded: item.sourceStatusRecorded.trim(),
      selectionReason: item.selectionReason.trim(),
      sources,
      validationErrors,
      eligible,
    });
  }

  const eligibleRows = parsedRows.filter((r) => r.eligible).length;
  const invalidRows = parsedRows.length - eligibleRows;
  const withdrawnCount = parsedRows.filter(
    (r) => r.stockStatus === "withdrawn_series",
  ).length;
  const brandCount = new Set(parsedRows.map((r) => r.brand)).size;

  const warnings: string[] = [];
  if (withdrawnCount > 0) {
    warnings.push(
      `${withdrawnCount} alternatif berasal dari seri berstatus withdrawn oleh pabrikan; stok ritel belum terkonfirmasi langsung.`,
    );
  }
  if (excludedCandidates.length > 0) {
    warnings.push(
      `${excludedCandidates.length} kandidat cadangan/dikeluarkan diarsipkan terpisah dan tidak dimasukkan ke perhitungan SAW utama.`,
    );
  }
  if (c6Metric === "battery_wh") {
    warnings.push(
      "Kriteria C6 pada dataset ini menggunakan kapasitas baterai (Wh) sebagai proksi daya tahan (asumsi konsumsi daya setara, bukan durasi jam aktual).",
    );
  }
  warnings.push(
    "Seluruh status awal ditandai provisional_unconfirmed (bukan stok terverifikasi) sampai konfirmasi langsung oleh peneliti.",
  );

  return {
    ok: invalidRows === 0 && parsedRows.length > 0,
    filename,
    sheetName,
    sha256,
    observedAt,
    c6Metric,
    c6Unit,
    c6Definition,
    candidateCount: parsedRows.length + excludedCandidates.length,
    rows: parsedRows,
    excludedCandidates,
    summary: {
      totalRows: parsedRows.length,
      eligibleRows,
      invalidRows,
      withdrawnCount,
      brandCount,
      excludedCount: excludedCandidates.length,
    },
    errors:
      parsedRows.length === 0
        ? ["Tidak ditemukan baris alternatif laptop pada berkas."]
        : [],
    warnings,
  };
}

/**
 * Parses LaptopMatch_Dataset_33_Regression.json.
 * Strictly reads ONLY `alternatives` (and archives `excluded_candidates`);
 * NEVER reads or trusts `expected_regression` for production calculations.
 */
function parseJsonLaptopDataset(
  filename: string,
  buffer: Buffer,
  sha256: string,
  fallbackObservedAt: string,
): LaptopImportPreview {
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(buffer.toString("utf-8").replace(/^\uFEFF/, ""));
  } catch (err) {
    return {
      ok: false,
      filename,
      sheetName: "JSON",
      sha256,
      observedAt: fallbackObservedAt,
      c6Metric: "battery_wh",
      c6Unit: "Wh",
      c6Definition: WH_BATTERY_PROTOCOL,
      candidateCount: 0,
      rows: [],
      excludedCandidates: [],
      summary: {
        totalRows: 0,
        eligibleRows: 0,
        invalidRows: 0,
        withdrawnCount: 0,
        brandCount: 0,
        excludedCount: 0,
      },
      errors: [
        `Berkas JSON tidak valid: ${err instanceof Error ? err.message : "format salah"}.`,
      ],
      warnings: [],
    };
  }

  const doc = rawJson as Record<string, unknown>;
  const rawAlternatives = Array.isArray(doc.alternatives) ? doc.alternatives : null;
  if (!rawAlternatives || rawAlternatives.length === 0) {
    return {
      ok: false,
      filename,
      sheetName: "JSON",
      sha256,
      observedAt: fallbackObservedAt,
      c6Metric: "battery_wh",
      c6Unit: "Wh",
      c6Definition: WH_BATTERY_PROTOCOL,
      candidateCount: 0,
      rows: [],
      excludedCandidates: [],
      summary: {
        totalRows: 0,
        eligibleRows: 0,
        invalidRows: 0,
        withdrawnCount: 0,
        brandCount: 0,
        excludedCount: 0,
      },
      errors: ['Berkas JSON wajib memiliki array "alternatives" yang tidak kosong.'],
      warnings: [],
    };
  }

  if (rawAlternatives.length > MAX_ALTERNATIVE_ROWS) {
    return {
      ok: false,
      filename,
      sheetName: "JSON",
      sha256,
      observedAt: fallbackObservedAt,
      c6Metric: "battery_wh",
      c6Unit: "Wh",
      c6Definition: WH_BATTERY_PROTOCOL,
      candidateCount: rawAlternatives.length,
      rows: [],
      excludedCandidates: [],
      summary: {
        totalRows: rawAlternatives.length,
        eligibleRows: 0,
        invalidRows: 0,
        withdrawnCount: 0,
        brandCount: 0,
        excludedCount: 0,
      },
      errors: [`Jumlah alternatif melebihi batas maksimum ${MAX_ALTERNATIVE_ROWS}.`],
      warnings: [],
    };
  }

  const observedAt =
    typeof doc.data_snapshot === "string" && /^\d{4}-\d{2}-\d{2}$/.test(doc.data_snapshot)
      ? doc.data_snapshot
      : fallbackObservedAt;

  const criteriaArr = Array.isArray(doc.criteria) ? doc.criteria : [];
  const c6Meta = criteriaArr.find(
    (c): c is Record<string, unknown> =>
      Boolean(c && typeof c === "object" && (c as Record<string, unknown>).code === "C6"),
  );
  const c6Metric: C6MetricType =
    c6Meta && String(c6Meta.unit ?? "").toLowerCase().includes("jam")
      ? "battery_hours"
      : "battery_wh";

  const candidates: RawLaptopCandidateInput[] = rawAlternatives.map((entry, idx) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    const src = (row.sources ?? {}) as Record<string, unknown>;
    return {
      rowNo: idx + 1,
      code: String(row.code ?? ""),
      explicitBrand: String(row.brand ?? ""),
      model: String(row.model_configuration ?? row.model ?? ""),
      cpuName: String(row.cpu_name ?? ""),
      priceIdr: parseOptionalNumber(row.price_idr) ?? Number.NaN,
      cpuMark: parseOptionalNumber(row.cpu_mark) ?? Number.NaN,
      ramGb: parseOptionalNumber(row.ram_gb) ?? Number.NaN,
      ssdGb: parseOptionalNumber(row.ssd_gb) ?? Number.NaN,
      weightKg: parseOptionalNumber(row.weight_kg) ?? Number.NaN,
      batteryHours: parseOptionalNumber(row.battery_hours),
      batteryWh: parseOptionalNumber(row.battery_wh),
      seller: String(row.seller ?? ""),
      sourceDateRecorded: String(row.source_date_as_recorded ?? ""),
      sourceStatusRecorded: String(row.source_status_as_recorded ?? ""),
      evidenceNotes: String(row.evidence_notes ?? row.source_audit_note ?? ""),
      selectionReason: String(row.selection_reason ?? ""),
      urlPrice: String(src.price ?? ""),
      urlSpec: String(src.specification ?? src.spec ?? ""),
      urlBattery: String(src.battery ?? ""),
      urlBenchmark: String(src.benchmark ?? ""),
    };
  });

  const rawExcluded = Array.isArray(doc.excluded_candidates)
    ? doc.excluded_candidates
    : [];
  const excludedCandidates: ExcludedCandidateRecord[] = rawExcluded.map((entry) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    const src = (row.sources ?? {}) as Record<string, unknown>;
    const brand = String(row.brand ?? "").trim();
    const modelConf = String(row.model_configuration ?? row.model ?? "").trim();
    const fullModel =
      brand && !modelConf.toLowerCase().startsWith(brand.toLowerCase())
        ? `${brand} ${modelConf}`
        : modelConf;
    const rowDate = normalizeRecordedDateToIso(
      String(row.source_date_as_recorded ?? ""),
      observedAt,
    );

    const sources: ParsedAlternativeSource[] = [];
    for (const [st, rawUrl] of [
      ["price", String(src.price ?? "")],
      ["spec", String(src.specification ?? src.spec ?? "")],
      ["battery", String(src.battery ?? "")],
      ["benchmark", String(src.benchmark ?? "")],
    ] as const) {
      if (isSafeHttpUrl(rawUrl)) {
        sources.push({
          sourceType: st,
          url: rawUrl.trim(),
          observedAt: rowDate,
          evidenceLevel: inferEvidenceLevel(st, rawUrl.trim()),
          notes: "",
        });
      }
    }

    return {
      code: String(row.code ?? "").trim().toUpperCase(),
      brand,
      model: fullModel,
      cpuName: String(row.cpu_name ?? "").trim(),
      priceIdr: parseOptionalNumber(row.price_idr),
      cpuMark: parseOptionalNumber(row.cpu_mark),
      ramGb: parseOptionalNumber(row.ram_gb),
      ssdGb: parseOptionalNumber(row.ssd_gb),
      weightKg: parseOptionalNumber(row.weight_kg),
      batteryWh: parseOptionalNumber(row.battery_wh),
      seller: String(row.seller ?? "").trim(),
      sourceDateRecorded: String(row.source_date_as_recorded ?? "").trim(),
      sourceStatusRecorded: String(row.source_status_as_recorded ?? "").trim(),
      evidenceNotes: String(row.evidence_notes ?? row.source_audit_note ?? "").trim(),
      selectionReason: String(row.selection_reason ?? "").trim(),
      sources,
    };
  });

  return validateAndNormalizeCandidates({
    filename,
    sheetName: "JSON (alternatives)",
    sha256,
    observedAt,
    c6Metric,
    candidates,
    excludedCandidates,
  });
}

/**
 * Parses the integrated 12-sheet UAS workbook (`Kandidat` + `Sumber` sheets).
 */
function parseIntegratedUasWorkbook(
  filename: string,
  workbook: ExcelJS.Workbook,
  sha256: string,
  observedAt: string,
): LaptopImportPreview {
  const kandSheet = workbook.getWorksheet(LAPTOP_UAS_CANDIDATE_SHEET)!;
  const srcSheet = workbook.getWorksheet(LAPTOP_UAS_SOURCE_SHEET)!;

  // Build map of source URLs by code from `Sumber` sheet
  const sourceMap = new Map<
    string,
    {
      price: string;
      spec: string;
      battery: string;
      benchmark: string;
      recordedDate: string;
      auditNote: string;
    }
  >();

  for (let r = 2; r <= srcSheet.rowCount; r++) {
    const row = srcSheet.getRow(r);
    const code = cellToString(row.getCell(1).value).toUpperCase();
    if (!code) continue;
    sourceMap.set(code, {
      price: cellToString(row.getCell(4).value),
      spec: cellToString(row.getCell(5).value),
      battery: cellToString(row.getCell(6).value),
      benchmark: cellToString(row.getCell(7).value),
      recordedDate: cellToString(row.getCell(8).value),
      auditNote: cellToString(row.getCell(9).value),
    });
  }

  const candidates: RawLaptopCandidateInput[] = [];
  const excludedCandidates: ExcludedCandidateRecord[] = [];

  for (let r = 2; r <= kandSheet.rowCount; r++) {
    const row = kandSheet.getRow(r);
    const code = cellToString(row.getCell(1).value).toUpperCase();
    if (!code) continue;

    const brand = cellToString(row.getCell(2).value);
    const modelConf = cellToString(row.getCell(3).value);
    const cpuName = cellToString(row.getCell(4).value);
    const priceIdr = parseNumericCell(cellToString(row.getCell(5).value));
    const cpuMark = parseNumericCell(cellToString(row.getCell(6).value));
    const ramGb = parseNumericCell(cellToString(row.getCell(7).value));
    const ssdGb = parseNumericCell(cellToString(row.getCell(8).value));
    const weightKg = parseNumericCell(cellToString(row.getCell(9).value));
    const batteryWh = parseOptionalNumber(cellToString(row.getCell(10).value));
    const seller = cellToString(row.getCell(11).value);
    const sourceDateRecorded = cellToString(row.getCell(12).value);
    const sourceStatusRecorded = cellToString(row.getCell(13).value);
    const evidenceNotes = cellToString(row.getCell(14).value);
    const decision = cellToString(row.getCell(15).value).toLowerCase();
    const selectionReason = cellToString(row.getCell(16).value);

    const src = sourceMap.get(code);
    const urlPrice = src?.price ?? "";
    const urlSpec = src?.spec ?? "";
    const urlBattery = src?.battery ?? "";
    const urlBenchmark = src?.benchmark ?? "";

    if (decision !== "masuk") {
      const { fullModel } = inferBrandAndSku(modelConf, brand);
      const rowDate = normalizeRecordedDateToIso(sourceDateRecorded, observedAt);
      const exSources: ParsedAlternativeSource[] = [];
      for (const [st, u] of [
        ["price", urlPrice],
        ["spec", urlSpec],
        ["battery", urlBattery],
        ["benchmark", urlBenchmark],
      ] as const) {
        if (isSafeHttpUrl(u)) {
          exSources.push({
            sourceType: st,
            url: u,
            observedAt: rowDate,
            evidenceLevel: inferEvidenceLevel(st, u),
            notes: "",
          });
        }
      }
      excludedCandidates.push({
        code,
        brand,
        model: fullModel,
        cpuName,
        priceIdr: Number.isFinite(priceIdr) ? priceIdr : null,
        cpuMark: Number.isFinite(cpuMark) ? cpuMark : null,
        ramGb: Number.isFinite(ramGb) ? ramGb : null,
        ssdGb: Number.isFinite(ssdGb) ? ssdGb : null,
        weightKg: Number.isFinite(weightKg) ? weightKg : null,
        batteryWh,
        seller,
        sourceDateRecorded,
        sourceStatusRecorded,
        evidenceNotes: evidenceNotes || src?.auditNote || "",
        selectionReason,
        sources: exSources,
      });
      continue;
    }

    candidates.push({
      rowNo: candidates.length + 1,
      code,
      explicitBrand: brand,
      model: modelConf,
      cpuName,
      priceIdr,
      cpuMark,
      ramGb,
      ssdGb,
      weightKg,
      batteryHours: null,
      batteryWh,
      seller,
      sourceDateRecorded: sourceDateRecorded || src?.recordedDate || "",
      sourceStatusRecorded,
      evidenceNotes: evidenceNotes || src?.auditNote || "",
      selectionReason,
      urlPrice,
      urlSpec,
      urlBattery,
      urlBenchmark,
    });
  }

  return validateAndNormalizeCandidates({
    filename,
    sheetName: `${LAPTOP_UAS_CANDIDATE_SHEET} + ${LAPTOP_UAS_SOURCE_SHEET}`,
    sha256,
    observedAt,
    c6Metric: "battery_wh",
    candidates,
    excludedCandidates,
  });
}

const COLUMN_ALIASES: Record<string, readonly string[]> = {
  code: ["kode"],
  brand: ["merek", "brand"],
  model: ["model dan sku", "model / sku", "model / konfigurasi", "model"],
  cpu: ["prosesor", "cpu"],
  price: ["harga (rp)", "harga"],
  cpuMark: ["cpu mark", "passmark cpu mark", "skor cpu mark"],
  ram: ["ram (gb)", "ram"],
  ssd: ["ssd (gb)", "ssd"],
  weight: ["berat (kg)", "berat"],
  batteryHours: ["video (jam)", "baterai (jam)", "daya tahan baterai (jam)"],
  batteryWh: ["baterai (wh)", "kapasitas baterai (wh)", "wh"],
  seller: ["penjual"],
  evidenceNotes: ["status bukti", "catatan audit", "catatan"],
  urlPrice: ["url harga", "harga / penawaran"],
  urlSpec: ["url spesifikasi", "spesifikasi / berat"],
  urlBattery: ["url baterai", "url durasi baterai"],
  urlCpuMark: ["url cpu mark", "cpu mark (daftar bersama)"],
};

function findCol(headers: string[], key: keyof typeof COLUMN_ALIASES): number {
  const aliases = COLUMN_ALIASES[key]!;
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (aliases.includes(h)) return i;
  }
  return -1;
}

async function readFlatLaptopTable(
  buffer: Buffer,
  extension: ".xlsx" | ".csv",
  loadedWorkbook?: ExcelJS.Workbook,
): Promise<{ sheetName: string; headers: string[]; rows: string[][] }> {
  if (extension === ".csv") {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    if (parsed.errors.length > 0) {
      throw new Error(
        `Gagal membaca CSV laptop: ${parsed.errors[0]?.message ?? "format salah"}.`,
      );
    }
    const headers = (parsed.data[0] ?? []).map((h) => String(h ?? "").trim());
    const rows = parsed.data.slice(1).map((r) => r.map((c) => String(c ?? "").trim()));
    return { sheetName: "CSV", headers, rows };
  }

  const workbook = loadedWorkbook ?? (await loadExcelWorkbook(buffer));
  const sheet = workbook.getWorksheet(LAPTOP_EXPECTED_SHEET) ?? workbook.worksheets[0];
  if (!sheet) {
    throw new Error("Workbook laptop tidak memiliki worksheet.");
  }

  const headerRow = sheet.getRow(1);
  const colCount = Math.max(headerRow.cellCount, headerRow.actualCellCount, 16);
  const headers: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    headers.push(cellToString(headerRow.getCell(c).value));
  }

  const rows: string[][] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values: string[] = [];
    let nonEmpty = false;
    for (let c = 1; c <= headers.length; c++) {
      const val = cellToString(row.getCell(c).value);
      if (val) nonEmpty = true;
      values.push(val);
    }
    if (nonEmpty) rows.push(values);
  }

  return { sheetName: sheet.name, headers, rows };
}

/**
 * Parses and validates laptop alternatives from:
 * 1. `LaptopMatch_Dataset_33_Regression.json` (UAS 33-alt JSON, C6 = Wh)
 * 2. `SPK_Kelompok_13_AHP_SAW_Terintegrasi_33_Alternatif.xlsx` (`Kandidat` + `Sumber`, C6 = Wh)
 * 3. Historical `SPK_Kelompok_13_Audit_SAW_Revisi.xlsx` (`Data Audit`, C6 = jam) or CSV
 * Never invents URLs, never reads `expected_regression` for production output, and never fabricates stock.
 */
export async function parseLaptopFile(
  filename: string,
  buffer: Buffer,
  observedAt: string = RESEARCH_AUDIT_DATE,
): Promise<LaptopImportPreview> {
  const sha256 = computeSha256(buffer);
  const fileCheck = validateUploadedFile(filename, buffer, { allowJson: true });

  if (!fileCheck.ok || !fileCheck.extension) {
    return {
      ok: false,
      filename,
      sheetName: "",
      sha256,
      observedAt,
      c6Metric: "battery_wh",
      c6Unit: "Wh",
      c6Definition: WH_BATTERY_PROTOCOL,
      candidateCount: 0,
      rows: [],
      excludedCandidates: [],
      summary: {
        totalRows: 0,
        eligibleRows: 0,
        invalidRows: 0,
        withdrawnCount: 0,
        brandCount: 0,
        excludedCount: 0,
      },
      errors: [fileCheck.error ?? "Berkas tidak valid."],
      warnings: [],
    };
  }

  if (fileCheck.extension === ".json") {
    return parseJsonLaptopDataset(filename, buffer, sha256, observedAt);
  }

  let sheetName = "";
  let headers: string[] = [];
  let rawRows: string[][] = [];

  try {
    if (fileCheck.extension === ".xlsx") {
      const workbook = await loadExcelWorkbook(buffer);
      if (
        workbook.getWorksheet(LAPTOP_UAS_CANDIDATE_SHEET) &&
        workbook.getWorksheet(LAPTOP_UAS_SOURCE_SHEET)
      ) {
        return parseIntegratedUasWorkbook(filename, workbook, sha256, observedAt);
      }
      const table = await readFlatLaptopTable(buffer, ".xlsx", workbook);
      sheetName = table.sheetName;
      headers = table.headers;
      rawRows = table.rows;
    } else {
      const table = await readFlatLaptopTable(buffer, ".csv");
      sheetName = table.sheetName;
      headers = table.headers;
      rawRows = table.rows;
    }
  } catch (err) {
    return {
      ok: false,
      filename,
      sheetName: "",
      sha256,
      observedAt,
      c6Metric: "battery_wh",
      c6Unit: "Wh",
      c6Definition: WH_BATTERY_PROTOCOL,
      candidateCount: 0,
      rows: [],
      excludedCandidates: [],
      summary: {
        totalRows: 0,
        eligibleRows: 0,
        invalidRows: 0,
        withdrawnCount: 0,
        brandCount: 0,
        excludedCount: 0,
      },
      errors: [
        err instanceof Error ? err.message : "Gagal membaca berkas alternatif laptop.",
      ],
      warnings: [],
    };
  }

  const colMap = {
    code: findCol(headers, "code"),
    brand: findCol(headers, "brand"),
    model: findCol(headers, "model"),
    cpu: findCol(headers, "cpu"),
    price: findCol(headers, "price"),
    cpuMark: findCol(headers, "cpuMark"),
    ram: findCol(headers, "ram"),
    ssd: findCol(headers, "ssd"),
    weight: findCol(headers, "weight"),
    batteryHours: findCol(headers, "batteryHours"),
    batteryWh: findCol(headers, "batteryWh"),
    seller: findCol(headers, "seller"),
    evidenceNotes: findCol(headers, "evidenceNotes"),
    urlPrice: findCol(headers, "urlPrice"),
    urlSpec: findCol(headers, "urlSpec"),
    urlBattery: findCol(headers, "urlBattery"),
    urlCpuMark: findCol(headers, "urlCpuMark"),
  };

  // Detect C6 metric: if `Video (jam)` column exists, use battery_hours (legacy format); otherwise use battery_wh
  const c6Metric: C6MetricType =
    colMap.batteryHours >= 0 ? "battery_hours" : "battery_wh";

  const requiredCols: Array<[string, number]> = [
    ["Kode", colMap.code],
    ["Model dan SKU", colMap.model],
    ["Prosesor", colMap.cpu],
    ["Harga (Rp)", colMap.price],
    ["CPU Mark", colMap.cpuMark],
    ["RAM (GB)", colMap.ram],
    ["SSD (GB)", colMap.ssd],
    ["Berat (kg)", colMap.weight],
    c6Metric === "battery_hours"
      ? ["Video (jam)", colMap.batteryHours]
      : ["Baterai (Wh)", colMap.batteryWh],
    ["Penjual", colMap.seller],
    ["URL harga", colMap.urlPrice],
    ["URL spesifikasi", colMap.urlSpec],
    ["URL baterai", colMap.urlBattery],
    ["URL CPU Mark", colMap.urlCpuMark],
  ];

  const missingCols = requiredCols.filter(([, idx]) => idx < 0).map(([label]) => label);
  const errors: string[] = [];

  if (missingCols.length > 0) {
    errors.push(
      `Kolom wajib tidak ditemukan pada sheet "${sheetName}": ${missingCols.join(", ")}.`,
    );
  }
  if (rawRows.length === 0) {
    errors.push("Tidak ditemukan baris alternatif laptop pada berkas.");
  }
  if (rawRows.length > MAX_ALTERNATIVE_ROWS) {
    errors.push(`Jumlah baris melebihi batas maksimum ${MAX_ALTERNATIVE_ROWS}.`);
  }

  if (errors.length > 0) {
    return {
      ok: false,
      filename,
      sheetName,
      sha256,
      observedAt,
      c6Metric,
      c6Unit: c6Metric === "battery_wh" ? "Wh" : "jam",
      c6Definition:
        c6Metric === "battery_wh" ? WH_BATTERY_PROTOCOL : HOURS_BATTERY_PROTOCOL,
      candidateCount: rawRows.length,
      rows: [],
      excludedCandidates: [],
      summary: {
        totalRows: rawRows.length,
        eligibleRows: 0,
        invalidRows: 0,
        withdrawnCount: 0,
        brandCount: 0,
        excludedCount: 0,
      },
      errors,
      warnings: [],
    };
  }

  const candidates: RawLaptopCandidateInput[] = rawRows.map((r, idx) => ({
    rowNo: idx + 1,
    code: r[colMap.code] ?? "",
    explicitBrand: colMap.brand >= 0 ? (r[colMap.brand] ?? "") : undefined,
    model: r[colMap.model] ?? "",
    cpuName: r[colMap.cpu] ?? "",
    priceIdr: parseNumericCell(r[colMap.price] ?? ""),
    cpuMark: parseNumericCell(r[colMap.cpuMark] ?? ""),
    ramGb: parseNumericCell(r[colMap.ram] ?? ""),
    ssdGb: parseNumericCell(r[colMap.ssd] ?? ""),
    weightKg: parseNumericCell(r[colMap.weight] ?? ""),
    batteryHours:
      colMap.batteryHours >= 0
        ? parseOptionalNumber(r[colMap.batteryHours] ?? "")
        : null,
    batteryWh:
      colMap.batteryWh >= 0 ? parseOptionalNumber(r[colMap.batteryWh] ?? "") : null,
    seller: r[colMap.seller] ?? "",
    sourceDateRecorded: "",
    sourceStatusRecorded: "",
    evidenceNotes: colMap.evidenceNotes >= 0 ? (r[colMap.evidenceNotes] ?? "") : "",
    selectionReason: "",
    urlPrice: r[colMap.urlPrice] ?? "",
    urlSpec: r[colMap.urlSpec] ?? "",
    urlBattery: r[colMap.urlBattery] ?? "",
    urlBenchmark: r[colMap.urlCpuMark] ?? "",
  }));

  return validateAndNormalizeCandidates({
    filename,
    sheetName,
    sha256,
    observedAt,
    c6Metric,
    candidates,
    excludedCandidates: [],
  });
}
