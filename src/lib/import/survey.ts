import type ExcelJS from "exceljs";
import Papa from "papaparse";
import { loadExcelWorkbook } from "./xlsx-loader";
import {
  PAIRWISE_DEFINITIONS,
  evaluateIndividualAhp,
  matchPairwiseHeader,
  normalizeHeaderText,
  parsePairwiseAnswer,
  type ParsedPairwiseAnswer,
} from "@/lib/decision";
import {
  MAX_SURVEY_ROWS,
  computeSha256,
  parseSurveyTimestamp,
  validateUploadedFile,
} from "./validation";

export const SURVEY_EXPECTED_SHEET = "Jawaban Formulir 1";
export const SURVEY_CONSENT_EXPECTED = "ya, saya bersedia berpartisipasi";
export const SURVEY_ACTIVE_STUDENT_EXPECTED = "ya, mahasiswa aktif";

const HEADER_ALIASES = {
  timestamp: ["cap waktu", "timestamp"],
  consent: [
    "saya telah membaca penjelasan penelitian dan bersedia berpartisipasi secara sukarela.",
    "saya telah membaca penjelasan penelitian dan bersedia berpartisipasi secara sukarela",
  ],
  activeStudent: ["apakah kamu mahasiswa aktif?", "apakah kamu mahasiswa aktif"],
  programStudy: ["program studi (opsional)", "program studi"],
  useCase: [
    "untuk apa kamu paling sering menggunakan laptop?",
    "untuk apa kamu paling sering menggunakan laptop",
  ],
  suggestion: [
    "ada alasan khusus atau saran tentang pemilihan laptop untuk mahasiswa? (opsional)",
    "ada alasan khusus atau saran tentang pemilihan laptop untuk mahasiswa?",
  ],
} as const;

export type SurveyAuditFlag =
  | "out_of_order_timestamp"
  | "duplicate_answer_pattern"
  | "all_equal_answers"
  | "near_zero_cr"
  | "label_mismatch_warning";

export interface ParsedSurveyRow {
  rowNo: number;
  code: string;
  rawTimestamp: string;
  submittedAt: string | null;
  consentRaw: string;
  consentValid: boolean;
  activeStudentRaw: string;
  activeStudentValid: boolean;
  programStudy: string | null;
  useCase: string;
  suggestion: string | null;
  rawAnswers: Record<string, string>;
  parsedAnswers: ParsedPairwiseAnswer[];
  numericValues: number[];
  eligible: boolean;
  validationStatus: "eligible" | "ineligible_screening" | "invalid_answers";
  validationErrors: string[];
  auditFlags: SurveyAuditFlag[];
  previewCr: number | null;
  previewPassesCr: boolean;
}

export interface SurveyHeaderMapping {
  timestampCol: number;
  consentCol: number;
  activeStudentCol: number;
  programStudyCol: number | null;
  useCaseCol: number;
  suggestionCol: number | null;
  pairwiseCols: Record<number, number>; // questionNo (1..15) -> 0-based col index
  rawHeaders: string[];
  missingHeaders: string[];
  unknownHeaders: string[];
}

export interface SurveyImportPreview {
  ok: boolean;
  filename: string;
  sheetName: string;
  sha256: string;
  headerMapping: SurveyHeaderMapping;
  rows: ParsedSurveyRow[];
  summary: {
    totalRows: number;
    eligibleRows: number;
    ineligibleRows: number;
    invalidRows: number;
    consistentPreviewCount: number;
    inconsistentPreviewCount: number;
    flaggedCount: number;
    outOfOrderTimestampCount: number;
    nearZeroCrCount: number;
    allEqualCount: number;
  };
  errors: string[];
  warnings: string[];
}

function cellValueToPrimitive(value: ExcelJS.CellValue): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) {
      return value.result;
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
  }
  return value;
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeHeaderText(headers[i] ?? "");
    if (aliases.includes(norm)) {
      return i;
    }
  }
  return -1;
}

function buildHeaderMapping(rawHeaders: string[]): SurveyHeaderMapping {
  const timestampCol = findHeaderIndex(rawHeaders, HEADER_ALIASES.timestamp);
  const consentCol = findHeaderIndex(rawHeaders, HEADER_ALIASES.consent);
  const activeStudentCol = findHeaderIndex(rawHeaders, HEADER_ALIASES.activeStudent);
  const programStudyColIdx = findHeaderIndex(rawHeaders, HEADER_ALIASES.programStudy);
  const useCaseCol = findHeaderIndex(rawHeaders, HEADER_ALIASES.useCase);
  const suggestionColIdx = findHeaderIndex(rawHeaders, HEADER_ALIASES.suggestion);

  const matchedCols = new Set<number>(
    [
      timestampCol,
      consentCol,
      activeStudentCol,
      programStudyColIdx,
      useCaseCol,
      suggestionColIdx,
    ].filter((idx) => idx >= 0),
  );

  const pairwiseCols: Record<number, number> = {};
  for (let i = 0; i < rawHeaders.length; i++) {
    if (matchedCols.has(i)) continue;
    const matched = matchPairwiseHeader(rawHeaders[i] ?? "");
    if (matched && pairwiseCols[matched.questionNo] === undefined) {
      pairwiseCols[matched.questionNo] = i;
      matchedCols.add(i);
    }
  }

  const missingHeaders: string[] = [];
  if (timestampCol < 0) missingHeaders.push("Cap waktu");
  if (consentCol < 0)
    missingHeaders.push(
      "Saya telah membaca penjelasan penelitian dan bersedia berpartisipasi secara sukarela.",
    );
  if (activeStudentCol < 0) missingHeaders.push("Apakah kamu mahasiswa aktif?");
  if (useCaseCol < 0)
    missingHeaders.push("Untuk apa kamu paling sering menggunakan laptop?");

  for (const def of PAIRWISE_DEFINITIONS) {
    if (pairwiseCols[def.questionNo] === undefined) {
      missingHeaders.push(def.expectedHeader);
    }
  }

  const unknownHeaders: string[] = [];
  for (let i = 0; i < rawHeaders.length; i++) {
    const text = (rawHeaders[i] ?? "").trim();
    if (text && !matchedCols.has(i)) {
      unknownHeaders.push(text);
    }
  }

  return {
    timestampCol,
    consentCol,
    activeStudentCol,
    programStudyCol: programStudyColIdx >= 0 ? programStudyColIdx : null,
    useCaseCol,
    suggestionCol: suggestionColIdx >= 0 ? suggestionColIdx : null,
    pairwiseCols,
    rawHeaders,
    missingHeaders,
    unknownHeaders,
  };
}

function formatRespondentCode(rowNo: number): string {
  return `R${String(rowNo).padStart(2, "0")}`;
}

async function readTabularSurvey(
  filename: string,
  buffer: Buffer,
  extension: ".xlsx" | ".csv",
): Promise<{ sheetName: string; headers: string[]; dataRows: unknown[][] }> {
  if (extension === ".csv") {
    const text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    const parsed = Papa.parse<string[]>(text, {
      skipEmptyLines: "greedy",
    });
    if (parsed.errors.length > 0) {
      throw new Error(
        `Gagal membaca berkas CSV: ${parsed.errors[0]?.message ?? "format tidak valid"}.`,
      );
    }
    const allRows = parsed.data;
    if (allRows.length < 2) {
      throw new Error("Berkas CSV tidak memiliki baris data responden.");
    }
    const headers = (allRows[0] ?? []).map((cell) => String(cell ?? "").trim());
    const dataRows = allRows.slice(1);
    return { sheetName: "CSV", headers, dataRows };
  }

  const workbook = await loadExcelWorkbook(buffer);

  const sheet =
    workbook.getWorksheet(SURVEY_EXPECTED_SHEET) ?? workbook.worksheets[0];

  if (!sheet) {
    throw new Error("Workbook Excel tidak memiliki worksheet.");
  }

  const headerRow = sheet.getRow(1);
  const colCount = Math.max(headerRow.cellCount, headerRow.actualCellCount, 21);
  const headers: string[] = [];
  for (let c = 1; c <= colCount; c++) {
    const val = cellValueToPrimitive(headerRow.getCell(c).value);
    headers.push(String(val ?? "").trim());
  }

  const dataRows: unknown[][] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values: unknown[] = [];
    let hasContent = false;
    for (let c = 1; c <= headers.length; c++) {
      const val = cellValueToPrimitive(row.getCell(c).value);
      if (val !== "" && val !== null && val !== undefined) {
        hasContent = true;
      }
      values.push(val);
    }
    if (hasContent) {
      dataRows.push(values);
    }
  }

  return {
    sheetName: sheet.name,
    headers,
    dataRows,
  };
}

/**
 * Parses, validates, and audits a Google Forms AHP survey workbook (.xlsx or .csv)
 * strictly preserving original row order (R01..Rn) without mutating answers.
 */
export async function parseSurveyFile(
  filename: string,
  buffer: Buffer,
): Promise<SurveyImportPreview> {
  const sha256 = computeSha256(buffer);
  const fileCheck = validateUploadedFile(filename, buffer);

  const emptyMapping: SurveyHeaderMapping = {
    timestampCol: -1,
    consentCol: -1,
    activeStudentCol: -1,
    programStudyCol: null,
    useCaseCol: -1,
    suggestionCol: null,
    pairwiseCols: {},
    rawHeaders: [],
    missingHeaders: [],
    unknownHeaders: [],
  };

  if (!fileCheck.ok || !fileCheck.extension || fileCheck.extension === ".json") {
    return {
      ok: false,
      filename,
      sheetName: "",
      sha256,
      headerMapping: emptyMapping,
      rows: [],
      summary: {
        totalRows: 0,
        eligibleRows: 0,
        ineligibleRows: 0,
        invalidRows: 0,
        consistentPreviewCount: 0,
        inconsistentPreviewCount: 0,
        flaggedCount: 0,
        outOfOrderTimestampCount: 0,
        nearZeroCrCount: 0,
        allEqualCount: 0,
      },
      errors: [fileCheck.error ?? "Berkas tidak valid. Unggah berkas .xlsx atau .csv."],
      warnings: [],
    };
  }

  let sheetName = "";
  let headers: string[] = [];
  let dataRows: unknown[][] = [];

  try {
    const table = await readTabularSurvey(filename, buffer, fileCheck.extension);
    sheetName = table.sheetName;
    headers = table.headers;
    dataRows = table.dataRows;
  } catch (err) {
    return {
      ok: false,
      filename,
      sheetName: "",
      sha256,
      headerMapping: emptyMapping,
      rows: [],
      summary: {
        totalRows: 0,
        eligibleRows: 0,
        ineligibleRows: 0,
        invalidRows: 0,
        consistentPreviewCount: 0,
        inconsistentPreviewCount: 0,
        flaggedCount: 0,
        outOfOrderTimestampCount: 0,
        nearZeroCrCount: 0,
        allEqualCount: 0,
      },
      errors: [
        err instanceof Error
          ? err.message
          : "Gagal membaca berkas kuesioner. Pastikan berkas tidak rusak.",
      ],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  if (dataRows.length === 0) {
    errors.push("Tidak ditemukan baris respons pada berkas yang diunggah.");
  }

  if (dataRows.length > MAX_SURVEY_ROWS) {
    errors.push(
      `Jumlah baris (${dataRows.length}) melebihi batas maksimum ${MAX_SURVEY_ROWS} baris per batch.`,
    );
  }

  const headerMapping = buildHeaderMapping(headers);
  if (headerMapping.missingHeaders.length > 0) {
    errors.push(
      `Header wajib tidak ditemukan atau tidak sesuai format: ${headerMapping.missingHeaders.join("; ")}.`,
    );
  }
  if (headerMapping.unknownHeaders.length > 0) {
    errors.push(
      `Header tidak dikenal ditemukan (diblokir untuk mencegah salah pemetaan): ${headerMapping.unknownHeaders.join("; ")}.`,
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      filename,
      sheetName,
      sha256,
      headerMapping,
      rows: [],
      summary: {
        totalRows: dataRows.length,
        eligibleRows: 0,
        ineligibleRows: 0,
        invalidRows: 0,
        consistentPreviewCount: 0,
        inconsistentPreviewCount: 0,
        flaggedCount: 0,
        outOfOrderTimestampCount: 0,
        nearZeroCrCount: 0,
        allEqualCount: 0,
      },
      errors,
      warnings,
    };
  }

  const rows: ParsedSurveyRow[] = [];
  const answerSignatureCounts = new Map<string, number>();

  for (let i = 0; i < dataRows.length; i++) {
    const rawRow = dataRows[i]!;
    const rowNo = i + 1;
    const code = formatRespondentCode(rowNo);

    const ts = parseSurveyTimestamp(rawRow[headerMapping.timestampCol]);
    const consentRaw = String(rawRow[headerMapping.consentCol] ?? "").trim();
    const activeStudentRaw = String(rawRow[headerMapping.activeStudentCol] ?? "").trim();
    const programStudyRaw =
      headerMapping.programStudyCol !== null
        ? String(rawRow[headerMapping.programStudyCol] ?? "").trim()
        : "";
    const useCase = String(rawRow[headerMapping.useCaseCol] ?? "").trim();
    const suggestionRaw =
      headerMapping.suggestionCol !== null
        ? String(rawRow[headerMapping.suggestionCol] ?? "").trim()
        : "";

    const consentValid = consentRaw.toLowerCase() === SURVEY_CONSENT_EXPECTED;
    const activeStudentValid =
      activeStudentRaw.toLowerCase() === SURVEY_ACTIVE_STUDENT_EXPECTED;

    const validationErrors: string[] = [];
    const auditFlags: SurveyAuditFlag[] = [];

    if (!consentValid) {
      validationErrors.push("Responden belum menyatakan persetujuan partisipasi sukarela.");
    }
    if (!activeStudentValid) {
      validationErrors.push("Responden bukan berstatus mahasiswa aktif.");
    }

    const rawAnswers: Record<string, string> = {};
    const parsedAnswers: ParsedPairwiseAnswer[] = [];
    const numericValues: number[] = [];
    let hasAnswerError = false;
    let hasLabelWarning = false;

    for (const def of PAIRWISE_DEFINITIONS) {
      const colIdx = headerMapping.pairwiseCols[def.questionNo]!;
      const cellVal = rawRow[colIdx];
      const rawStr = cellVal === null || cellVal === undefined ? "" : String(cellVal).trim();
      rawAnswers[def.pairKey] = rawStr;

      const parsed = parsePairwiseAnswer(cellVal, def);
      if (!parsed.ok) {
        hasAnswerError = true;
        validationErrors.push(parsed.error);
      } else {
        parsedAnswers.push(parsed.answer);
        numericValues.push(parsed.answer.numericValue);
        if (parsed.answer.labelWarning) {
          hasLabelWarning = true;
        }
      }
    }

    if (hasLabelWarning) {
      auditFlags.push("label_mismatch_warning");
    }

    const eligible = consentValid && activeStudentValid && !hasAnswerError;
    const validationStatus: ParsedSurveyRow["validationStatus"] = hasAnswerError
      ? "invalid_answers"
      : !consentValid || !activeStudentValid
        ? "ineligible_screening"
        : "eligible";

    let previewCr: number | null = null;
    let previewPassesCr = false;

    if (eligible && numericValues.length === PAIRWISE_DEFINITIONS.length) {
      const evalRes = evaluateIndividualAhp({
        id: code,
        code,
        eligible: true,
        values: numericValues,
      });
      previewCr = evalRes.cr;
      previewPassesCr = evalRes.passesCr;
      if (evalRes.isAllEqual) {
        auditFlags.push("all_equal_answers");
      }
      if (evalRes.nearZeroCrFlag) {
        auditFlags.push("near_zero_cr");
      }

      const signature = parsedAnswers.map((a) => a.token).join(",");
      answerSignatureCounts.set(signature, (answerSignatureCounts.get(signature) ?? 0) + 1);
    }

    rows.push({
      rowNo,
      code,
      rawTimestamp: ts.rawTimestamp,
      submittedAt: ts.submittedAt,
      consentRaw,
      consentValid,
      activeStudentRaw,
      activeStudentValid,
      programStudy: programStudyRaw || null,
      useCase,
      suggestion: suggestionRaw || null,
      rawAnswers,
      parsedAnswers,
      numericValues,
      eligible,
      validationStatus,
      validationErrors,
      auditFlags,
      previewCr,
      previewPassesCr,
    });
  }

  // Second pass: flag out-of-order timestamps & duplicate answer patterns (never auto-delete!)
  let maxSeenTime = -Infinity;
  for (const row of rows) {
    if (row.submittedAt) {
      const t = new Date(row.submittedAt).getTime();
      if (Number.isFinite(t)) {
        if (t < maxSeenTime) {
          row.auditFlags.push("out_of_order_timestamp");
        } else {
          maxSeenTime = t;
        }
      }
    }

    if (row.parsedAnswers.length === PAIRWISE_DEFINITIONS.length) {
      const sig = row.parsedAnswers.map((a) => a.token).join(",");
      if ((answerSignatureCounts.get(sig) ?? 0) > 1) {
        row.auditFlags.push("duplicate_answer_pattern");
      }
    }
  }

  const eligibleRows = rows.filter((r) => r.eligible).length;
  const invalidRows = rows.filter((r) => r.validationStatus === "invalid_answers").length;
  const ineligibleRows = rows.filter((r) => r.validationStatus === "ineligible_screening").length;
  const consistentPreviewCount = rows.filter((r) => r.eligible && r.previewPassesCr).length;
  const inconsistentPreviewCount = rows.filter((r) => r.eligible && !r.previewPassesCr).length;
  const outOfOrderTimestampCount = rows.filter((r) =>
    r.auditFlags.includes("out_of_order_timestamp"),
  ).length;
  const nearZeroCrCount = rows.filter((r) => r.auditFlags.includes("near_zero_cr")).length;
  const allEqualCount = rows.filter((r) => r.auditFlags.includes("all_equal_answers")).length;
  const flaggedCount = rows.filter((r) => r.auditFlags.length > 0).length;

  if (outOfOrderTimestampCount > 0) {
    warnings.push(
      `Terdeteksi ${outOfOrderTimestampCount} baris dengan cap waktu lebih awal dibanding baris sebelumnya. Urutan baris asli (R01–R${String(rows.length).padStart(2, "0")}) tetap dipertahankan dan ditandai untuk audit.`,
    );
  }
  if (nearZeroCrCount > 0) {
    warnings.push(
      `Terdeteksi ${nearZeroCrCount} respons dengan CR mendekati nol (selain all-equal). Konfirmasi independensi dan jejak pengumpulan tetap diperlukan oleh peneliti.`,
    );
  }
  if (allEqualCount > 0) {
    warnings.push(
      `Terdapat ${allEqualCount} respons bernilai sama penting di seluruh 15 pasangan; sah secara matematis dan tetap dipertahankan.`,
    );
  }

  return {
    ok: true,
    filename,
    sheetName,
    sha256,
    headerMapping,
    rows,
    summary: {
      totalRows: rows.length,
      eligibleRows,
      ineligibleRows,
      invalidRows,
      consistentPreviewCount,
      inconsistentPreviewCount,
      flaggedCount,
      outOfOrderTimestampCount,
      nearZeroCrCount,
      allEqualCount,
    },
    errors,
    warnings,
  };
}
