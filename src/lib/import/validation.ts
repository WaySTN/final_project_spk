import crypto from "node:crypto";
import { z } from "zod";
import { PRICE_MAX_IDR, PRICE_MIN_IDR } from "@/lib/decision/criteria";
import { isSafeHttpUrl } from "@/lib/formatting";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_SURVEY_ROWS = 5_000;
export const MAX_ALTERNATIVE_ROWS = 500;

export function computeSha256(buffer: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export interface FileValidationResult {
  ok: boolean;
  extension: ".xlsx" | ".csv" | ".json" | null;
  error?: string;
}

/**
 * Validates file name, extension, byte size, and magic headers.
 * Rejects macro-enabled workbooks (.xlsm), encrypted OLE2 Office files, and corrupt uploads.
 */
export function validateUploadedFile(
  filename: string,
  buffer: Buffer,
  options?: { allowJson?: boolean },
): FileValidationResult {
  const cleanName = filename.trim();
  const lower = cleanName.toLowerCase();
  const allowJson = options?.allowJson ?? false;

  if (!cleanName) {
    return { ok: false, extension: null, error: "Nama berkas tidak boleh kosong." };
  }

  if (lower.endsWith(".xlsm") || lower.endsWith(".xlsb") || lower.endsWith(".xls")) {
    return {
      ok: false,
      extension: null,
      error: "Format berkas macro atau Excel lama (.xlsm/.xlsb/.xls) ditolak demi keamanan. Gunakan .xlsx atau .csv.",
    };
  }

  const extension: ".xlsx" | ".csv" | ".json" | null = lower.endsWith(".xlsx")
    ? ".xlsx"
    : lower.endsWith(".csv")
      ? ".csv"
      : allowJson && lower.endsWith(".json")
        ? ".json"
        : null;

  if (!extension) {
    return {
      ok: false,
      extension: null,
      error: allowJson
        ? "Format berkas tidak didukung. Unggah berkas .json, .xlsx, atau .csv."
        : "Format berkas tidak didukung. Unggah berkas .xlsx atau .csv.",
    };
  }

  if (buffer.byteLength === 0) {
    return { ok: false, extension: null, error: "Berkas kosong (0 byte)." };
  }

  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      extension: null,
      error: `Ukuran berkas melebihi batas maksimum ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    };
  }

  if (extension === ".xlsx") {
    // Check OLE2 compound file magic (encrypted Office doc)
    if (
      buffer.byteLength >= 4 &&
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    ) {
      return {
        ok: false,
        extension: null,
        error: "Berkas Excel terenkripsi atau berformat biner lama tidak didukung.",
      };
    }

    // Check ZIP magic bytes PK\x03\x04
    if (
      buffer.byteLength < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return {
        ok: false,
        extension: null,
        error: "Berkas .xlsx rusak atau bukan arsip OpenXML yang valid.",
      };
    }

    // Reject embedded VBA macros even if renamed to .xlsx
    if (buffer.includes(Buffer.from("vbaProject.bin"))) {
      return {
        ok: false,
        extension: null,
        error: "Berkas mengandung macro VBA yang ditolak demi keamanan.",
      };
    }
  }

  return { ok: true, extension };
}

/**
 * Neutralizes leading formula characters in CSV/spreadsheet exports to prevent formula injection.
 */
export function sanitizeSpreadsheetText(value: string): string {
  if (!value) return "";
  const trimmedStart = value.replace(/^\uFEFF/, "");
  if (/^[=+\-@\t\r]/.test(trimmedStart)) {
    return `'${trimmedStart}`;
  }
  return trimmedStart;
}

/**
 * Converts Excel serial timestamp (assumed Asia/Jakarta +07:00 local form time) to UTC ISO string.
 * Returns null if timestamp format is ambiguous rather than guessing.
 */
export function parseSurveyTimestamp(raw: unknown): {
  rawTimestamp: string;
  submittedAt: string | null;
} {
  if (raw === null || raw === undefined) {
    return { rawTimestamp: "", submittedAt: null };
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = raw.getUTCMonth();
    const d = raw.getUTCDate();
    const hh = raw.getUTCHours();
    const mm = raw.getUTCMinutes();
    const ss = raw.getUTCSeconds();
    const ms = raw.getUTCMilliseconds();
    const utcMs = Date.UTC(y, m, d, hh - 7, mm, ss, ms);
    return {
      rawTimestamp: raw.toISOString(),
      submittedAt: new Date(utcMs).toISOString(),
    };
  }

  if (typeof raw === "number" && Number.isFinite(raw) && raw > 25_000 && raw < 80_000) {
    const excelEpochJakartaUtcMs = Date.UTC(1899, 11, 30, -7, 0, 0, 0);
    const utcMs = Math.round(excelEpochJakartaUtcMs + raw * 86_400_000);
    return {
      rawTimestamp: String(raw),
      submittedAt: new Date(utcMs).toISOString(),
    };
  }

  const text = String(raw).trim();
  if (!text) {
    return { rawTimestamp: "", submittedAt: null };
  }

  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (Number.isFinite(serial) && serial > 25_000 && serial < 80_000) {
      const excelEpochJakartaUtcMs = Date.UTC(1899, 11, 30, -7, 0, 0, 0);
      const utcMs = Math.round(excelEpochJakartaUtcMs + serial * 86_400_000);
      return {
        rawTimestamp: text,
        submittedAt: new Date(utcMs).toISOString(),
      };
    }
  }

  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(text)) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return { rawTimestamp: text, submittedAt: parsed.toISOString() };
    }
  }

  const isoLocal = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (isoLocal) {
    const utcMs = Date.UTC(
      Number(isoLocal[1]),
      Number(isoLocal[2]) - 1,
      Number(isoLocal[3]),
      Number(isoLocal[4]) - 7,
      Number(isoLocal[5]),
      Number(isoLocal[6] ?? 0),
    );
    return { rawTimestamp: text, submittedAt: new Date(utcMs).toISOString() };
  }

  return { rawTimestamp: text, submittedAt: null };
}

export const safeUrlSchema = z
  .string()
  .trim()
  .min(1, "URL sumber wajib diisi.")
  .refine((val) => isSafeHttpUrl(val), {
    message: "URL harus menggunakan protokol http:// atau https:// yang valid.",
  });

export const alternativeSourceSchema = z.object({
  sourceType: z.enum(["price", "spec", "benchmark", "battery"]),
  url: safeUrlSchema,
  observedAt: z.string().trim().min(1),
  evidenceLevel: z.enum(["sku", "series", "listing"]),
  notes: z.string().trim().max(500).optional().default(""),
});

export const alternativeDraftBaseSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^A\d{1,3}$/, "Kode alternatif harus berformat A1, A2, dst."),
  brand: z.string().trim().min(1, "Merek wajib diisi.").max(80),
  model: z.string().trim().min(2, "Nama model/SKU wajib diisi.").max(200),
  sku: z.string().trim().min(1, "Kode SKU wajib diisi.").max(80),
  cpuName: z.string().trim().min(2, "Nama prosesor wajib diisi.").max(120),
  priceIdr: z
    .number()
    .int("Harga harus bilangan bulat Rupiah.")
    .min(PRICE_MIN_IDR, `Harga minimal Rp${PRICE_MIN_IDR.toLocaleString("id-ID")}.`)
    .max(PRICE_MAX_IDR, `Harga maksimal Rp${PRICE_MAX_IDR.toLocaleString("id-ID")}.`),
  cpuMark: z.number().positive("PassMark CPU Mark harus lebih dari 0."),
  ramGb: z.number().positive("Kapasitas RAM harus lebih dari 0."),
  ssdGb: z.number().positive("Kapasitas SSD harus lebih dari 0."),
  weightKg: z.number().positive("Berat laptop harus lebih dari 0.").max(10),
  batteryHours: z
    .number()
    .positive("Durasi baterai (jam) harus lebih dari 0.")
    .max(48)
    .nullable()
    .optional(),
  batteryWh: z
    .number()
    .positive("Kapasitas baterai (Wh) harus lebih dari 0.")
    .max(200)
    .nullable()
    .optional(),
  seller: z.string().trim().min(1, "Nama penjual wajib diisi.").max(160),
  active: z.boolean().default(true),
  stockStatus: z.enum([
    "indexed_in_stock",
    "unconfirmed",
    "confirmation_required",
    "withdrawn_series",
    "confirmed_available",
    "unavailable",
  ]),
  evidenceStatus: z.enum(["provisional_unconfirmed", "verified_by_researcher", "incomplete"]),
  batteryProtocol: z.string().trim().min(5).max(300),
  evidenceNotes: z.string().trim().max(1000).default(""),
  sourceDateRecorded: z.string().trim().max(60).optional().default(""),
  sourceStatusRecorded: z.string().trim().max(160).optional().default(""),
  selectionReason: z.string().trim().max(400).optional().default(""),
  sources: z
    .array(alternativeSourceSchema)
    .refine(
      (list) => {
        const types = new Set(list.map((s) => s.sourceType));
        return (
          types.has("price") &&
          types.has("spec") &&
          types.has("benchmark") &&
          types.has("battery")
        );
      },
      {
        message:
          "Keempat tipe sumber (price, spec, benchmark, battery) wajib lengkap sebelum alternatif berstatus eligible.",
      },
    ),
});

export const alternativeDraftSchema = alternativeDraftBaseSchema.refine(
  (data) =>
    (typeof data.batteryWh === "number" && data.batteryWh > 0) ||
    (typeof data.batteryHours === "number" && data.batteryHours > 0),
  {
    message:
      "Minimal salah satu nilai baterai positif wajib diisi (kapasitas Wh untuk dataset UAS atau durasi jam untuk dataset historis).",
    path: ["batteryWh"],
  },
);
