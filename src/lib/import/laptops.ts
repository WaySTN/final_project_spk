import type ExcelJS from "exceljs";
import Papa from "papaparse";
import { loadExcelWorkbook } from "./xlsx-loader";
import { PRICE_MAX_IDR, PRICE_MIN_IDR, RESEARCH_AUDIT_DATE } from "@/lib/decision/criteria";
import { isSafeHttpUrl } from "@/lib/formatting";
import {
  MAX_ALTERNATIVE_ROWS,
  computeSha256,
  validateUploadedFile,
} from "./validation";

export const LAPTOP_EXPECTED_SHEET = "Data Audit";

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
  batteryHours: number;
  batteryWh: number | null;
  seller: string;
  active: boolean;
  stockStatus: StockStatus;
  evidenceStatus: EvidenceStatus;
  batteryProtocol: string;
  evidenceNotes: string;
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
  rows: ParsedLaptopAlternative[];
  summary: {
    totalRows: number;
    eligibleRows: number;
    invalidRows: number;
    withdrawnCount: number;
  };
  errors: string[];
  warnings: string[];
}

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

  // Handle plain decimal like "1.43" or "12.5" or integer "9399000"
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return Number(cleaned);
  }
  // Handle Indonesian decimal comma "1,43" or "12,5"
  if (/^\d+,\d+$/.test(cleaned)) {
    return Number(cleaned.replace(",", "."));
  }
  // Handle Indonesian thousand separator "9.399.000"
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ""));
  }
  return Number(cleaned);
}

function inferBrandAndSku(modelText: string): { brand: string; sku: string } {
  const tokens = modelText.trim().split(/\s+/).filter(Boolean);
  const brand = tokens[0] ?? "Tidak diketahui";
  const sku = tokens.length >= 2 ? tokens[tokens.length - 1]! : modelText.trim();
  return { brand, sku };
}

function inferStockStatus(statusNotes: string): StockStatus {
  const lower = statusNotes.toLowerCase();
  if (lower.includes("withdrawn")) {
    return "withdrawn_series";
  }
  if (lower.includes("konfirmasi stok") || lower.includes("meminta konfirmasi")) {
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
  if (sourceType === "battery") return "series";
  // spec URL
  if (url.toLowerCase().includes("psref.lenovo.com/detail/")) {
    return "sku";
  }
  if (url.toLowerCase().includes("psref.lenovo.com/product/")) {
    return "series";
  }
  return "listing";
}

const COLUMN_ALIASES: Record<string, readonly string[]> = {
  code: ["kode"],
  model: ["model dan sku", "model / sku", "model"],
  cpu: ["prosesor", "cpu"],
  price: ["harga (rp)", "harga"],
  cpuMark: ["cpu mark", "passmark cpu mark", "skor cpu mark"],
  ram: ["ram (gb)", "ram"],
  ssd: ["ssd (gb)", "ssd"],
  weight: ["berat (kg)", "berat"],
  batteryHours: ["video (jam)", "baterai (jam)", "daya tahan baterai (jam)"],
  batteryWh: ["baterai (wh)"],
  seller: ["penjual"],
  evidenceNotes: ["status bukti", "catatan"],
  urlPrice: ["url harga"],
  urlSpec: ["url spesifikasi"],
  urlBattery: ["url baterai", "url durasi baterai"],
  urlCpuMark: ["url cpu mark"],
};

function findCol(headers: string[], key: keyof typeof COLUMN_ALIASES): number {
  const aliases = COLUMN_ALIASES[key]!;
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (aliases.includes(h)) return i;
  }
  return -1;
}

async function readLaptopTable(
  buffer: Buffer,
  extension: ".xlsx" | ".csv",
): Promise<{ sheetName: string; headers: string[]; rows: string[][] }> {
  if (extension === ".csv") {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    if (parsed.errors.length > 0) {
      throw new Error(`Gagal membaca CSV laptop: ${parsed.errors[0]?.message ?? "format salah"}.`);
    }
    const headers = (parsed.data[0] ?? []).map((h) => String(h ?? "").trim());
    const rows = parsed.data.slice(1).map((r) => r.map((c) => String(c ?? "").trim()));
    return { sheetName: "CSV", headers, rows };
  }

  const workbook = await loadExcelWorkbook(buffer);

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
 * Parses and validates laptop alternatives from `SPK_Kelompok_13_Audit_SAW_Revisi.xlsx` (sheet `Data Audit`)
 * or compatible XLSX/CSV format. Never invents URLs or claims verified stock.
 */
export async function parseLaptopFile(
  filename: string,
  buffer: Buffer,
  observedAt: string = RESEARCH_AUDIT_DATE,
): Promise<LaptopImportPreview> {
  const sha256 = computeSha256(buffer);
  const fileCheck = validateUploadedFile(filename, buffer);

  if (!fileCheck.ok || !fileCheck.extension) {
    return {
      ok: false,
      filename,
      sheetName: "",
      sha256,
      observedAt,
      rows: [],
      summary: { totalRows: 0, eligibleRows: 0, invalidRows: 0, withdrawnCount: 0 },
      errors: [fileCheck.error ?? "Berkas tidak valid."],
      warnings: [],
    };
  }

  let sheetName = "";
  let headers: string[] = [];
  let rawRows: string[][] = [];

  try {
    const table = await readLaptopTable(buffer, fileCheck.extension);
    sheetName = table.sheetName;
    headers = table.headers;
    rawRows = table.rows;
  } catch (err) {
    return {
      ok: false,
      filename,
      sheetName: "",
      sha256,
      observedAt,
      rows: [],
      summary: { totalRows: 0, eligibleRows: 0, invalidRows: 0, withdrawnCount: 0 },
      errors: [err instanceof Error ? err.message : "Gagal membaca berkas alternatif laptop."],
      warnings: [],
    };
  }

  const colMap = {
    code: findCol(headers, "code"),
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

  const requiredCols: Array<[string, number]> = [
    ["Kode", colMap.code],
    ["Model dan SKU", colMap.model],
    ["Prosesor", colMap.cpu],
    ["Harga (Rp)", colMap.price],
    ["CPU Mark", colMap.cpuMark],
    ["RAM (GB)", colMap.ram],
    ["SSD (GB)", colMap.ssd],
    ["Berat (kg)", colMap.weight],
    ["Video (jam)", colMap.batteryHours],
    ["Penjual", colMap.seller],
    ["URL harga", colMap.urlPrice],
    ["URL spesifikasi", colMap.urlSpec],
    ["URL baterai", colMap.urlBattery],
    ["URL CPU Mark", colMap.urlCpuMark],
  ];

  const missingCols = requiredCols.filter(([, idx]) => idx < 0).map(([label]) => label);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (missingCols.length > 0) {
    errors.push(`Kolom wajib tidak ditemukan pada sheet "${sheetName}": ${missingCols.join(", ")}.`);
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
      rows: [],
      summary: { totalRows: rawRows.length, eligibleRows: 0, invalidRows: 0, withdrawnCount: 0 },
      errors,
      warnings,
    };
  }

  const parsedRows: ParsedLaptopAlternative[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i]!;
    const rowNo = i + 1;
    const validationErrors: string[] = [];

    const code = (r[colMap.code] ?? "").trim().toUpperCase();
    const model = (r[colMap.model] ?? "").trim();
    const cpuName = (r[colMap.cpu] ?? "").trim();
    const priceIdr = parseNumericCell(r[colMap.price] ?? "");
    const cpuMark = parseNumericCell(r[colMap.cpuMark] ?? "");
    const ramGb = parseNumericCell(r[colMap.ram] ?? "");
    const ssdGb = parseNumericCell(r[colMap.ssd] ?? "");
    const weightKg = parseNumericCell(r[colMap.weight] ?? "");
    const batteryHours = parseNumericCell(r[colMap.batteryHours] ?? "");
    const batteryWhRaw =
      colMap.batteryWh >= 0 ? parseNumericCell(r[colMap.batteryWh] ?? "") : Number.NaN;
    const batteryWh = Number.isFinite(batteryWhRaw) && batteryWhRaw > 0 ? batteryWhRaw : null;
    const seller = (r[colMap.seller] ?? "").trim();
    const evidenceNotes =
      colMap.evidenceNotes >= 0 ? (r[colMap.evidenceNotes] ?? "").trim() : "";

    const urlPrice = (r[colMap.urlPrice] ?? "").trim();
    const urlSpec = (r[colMap.urlSpec] ?? "").trim();
    const urlBattery = (r[colMap.urlBattery] ?? "").trim();
    const urlCpuMark = (r[colMap.urlCpuMark] ?? "").trim();

    if (!/^A\d{1,3}$/.test(code)) {
      validationErrors.push(`Kode alternatif tidak valid: "${code}".`);
    } else if (seenCodes.has(code)) {
      validationErrors.push(`Kode alternatif duplikat: "${code}".`);
    } else {
      seenCodes.add(code);
    }

    if (!model) validationErrors.push("Model dan SKU kosong.");
    if (!cpuName) validationErrors.push("Nama prosesor kosong.");
    if (!seller) validationErrors.push("Nama penjual kosong.");

    if (!Number.isFinite(priceIdr) || !Number.isInteger(priceIdr)) {
      validationErrors.push("Harga harus berupa bilangan bulat Rupiah.");
    } else if (priceIdr < PRICE_MIN_IDR || priceIdr > PRICE_MAX_IDR) {
      validationErrors.push(
        `Harga Rp${priceIdr.toLocaleString("id-ID")} di luar rentang Rp9.000.000–Rp11.000.000.`,
      );
    }

    if (!Number.isFinite(cpuMark) || cpuMark <= 0)
      validationErrors.push("CPU Mark harus lebih dari 0.");
    if (!Number.isFinite(ramGb) || ramGb <= 0)
      validationErrors.push("RAM (GB) harus lebih dari 0.");
    if (!Number.isFinite(ssdGb) || ssdGb <= 0)
      validationErrors.push("SSD (GB) harus lebih dari 0.");
    if (!Number.isFinite(weightKg) || weightKg <= 0)
      validationErrors.push("Berat (kg) harus lebih dari 0.");
    if (!Number.isFinite(batteryHours) || batteryHours <= 0)
      validationErrors.push("Daya tahan baterai (jam) harus lebih dari 0.");

    const sources: ParsedAlternativeSource[] = [];
    const sourceCandidates: Array<[AlternativeSourceType, string, string]> = [
      ["price", urlPrice, `Sumber penawaran harga dari ${seller || "penjual"} pada audit ${observedAt}.`],
      ["spec", urlSpec, "Dokumentasi spesifikasi SKU/model."],
      ["battery", urlBattery, "Estimasi maksimum pemutaran video lokal 1080p pada 150 nit (Lenovo PSREF, tingkat seri/kapasitas)."],
      ["benchmark", urlCpuMark, "Skor PassMark CPU Mark."],
    ];

    for (const [sourceType, url, notes] of sourceCandidates) {
      if (!isSafeHttpUrl(url)) {
        validationErrors.push(`URL sumber ${sourceType} tidak valid atau kosong.`);
      } else {
        sources.push({
          sourceType,
          url,
          observedAt,
          evidenceLevel: inferEvidenceLevel(sourceType, url),
          notes,
        });
      }
    }

    const { brand, sku } = inferBrandAndSku(model);
    const stockStatus = inferStockStatus(evidenceNotes);
    const eligible = validationErrors.length === 0;

    parsedRows.push({
      rowNo,
      code,
      brand,
      model,
      sku,
      cpuName,
      priceIdr: Number.isFinite(priceIdr) ? priceIdr : 0,
      cpuMark: Number.isFinite(cpuMark) ? cpuMark : 0,
      ramGb: Number.isFinite(ramGb) ? ramGb : 0,
      ssdGb: Number.isFinite(ssdGb) ? ssdGb : 0,
      weightKg: Number.isFinite(weightKg) ? weightKg : 0,
      batteryHours: Number.isFinite(batteryHours) ? batteryHours : 0,
      batteryWh,
      seller,
      active: true,
      stockStatus,
      evidenceStatus: eligible ? "provisional_unconfirmed" : "incomplete",
      batteryProtocol: "Lenovo PSREF — pemutaran video lokal 1080p @ 150 nit (tingkat seri/kapasitas)",
      evidenceNotes,
      sources,
      validationErrors,
      eligible,
    });
  }

  const eligibleRows = parsedRows.filter((r) => r.eligible).length;
  const invalidRows = parsedRows.length - eligibleRows;
  const withdrawnCount = parsedRows.filter((r) => r.stockStatus === "withdrawn_series").length;

  if (withdrawnCount > 0) {
    warnings.push(
      `${withdrawnCount} alternatif berasal dari seri berstatus withdrawn oleh pabrikan; stok ritel belum terkonfirmasi langsung.`,
    );
  }
  warnings.push(
    "Seluruh status awal ditandai provisional_unconfirmed (bukan stok terverifikasi) sampai konfirmasi langsung oleh peneliti.",
  );

  return {
    ok: invalidRows === 0,
    filename,
    sheetName,
    sha256,
    observedAt,
    rows: parsedRows,
    summary: {
      totalRows: parsedRows.length,
      eligibleRows,
      invalidRows,
      withdrawnCount,
    },
    errors,
    warnings,
  };
}
