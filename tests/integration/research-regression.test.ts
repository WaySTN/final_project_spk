import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runStandardSensitivitySuite } from "@/lib/decision";
import { parseLaptopFile, parseSurveyFile } from "@/lib/import";

const PRIVATE_DIR = path.resolve(process.cwd(), "research", "private");

function findSurveyFile(): string | null {
  if (!fs.existsSync(PRIVATE_DIR)) return null;
  const match = fs
    .readdirSync(PRIVATE_DIR)
    .find((f) => f.toUpperCase().includes("DATA RESPON KUESIONER") && f.endsWith(".xlsx"));
  return match ? path.join(PRIVATE_DIR, match) : null;
}

function findAuditLaptopFile(): string | null {
  const target = path.join(PRIVATE_DIR, "SPK_Kelompok_13_Audit_SAW_Revisi.xlsx");
  return fs.existsSync(target) ? target : null;
}

describe("Research Baseline Regression Test (Actual Excel Files vs PRD & Audit Workbook)", () => {
  const surveyPath = findSurveyFile();
  const laptopPath = findAuditLaptopFile();

  it("locates private research source files locally", () => {
    expect(surveyPath).not.toBeNull();
    expect(laptopPath).not.toBeNull();
  });

  it("reproduces exact AHP weights, individual CRs, group CR, SAW S1/S2/S3 rankings from raw Excel files", async () => {
    if (!surveyPath || !laptopPath) {
      throw new Error("Berkas penelitian lokal di research/private/ tidak ditemukan.");
    }

    const surveyBuffer = fs.readFileSync(surveyPath);
    const laptopBuffer = fs.readFileSync(laptopPath);

    const surveyPreview = await parseSurveyFile(path.basename(surveyPath), surveyBuffer);
    expect(surveyPreview.ok).toBe(true);
    expect(surveyPreview.errors).toHaveLength(0);
    expect(surveyPreview.summary.totalRows).toBe(33);
    expect(surveyPreview.summary.eligibleRows).toBe(33);
    expect(surveyPreview.summary.consistentPreviewCount).toBe(17);
    expect(surveyPreview.summary.inconsistentPreviewCount).toBe(16);
    expect(surveyPreview.summary.allEqualCount).toBe(2); // R09 and R32
    expect(surveyPreview.summary.nearZeroCrCount).toBe(9); // R23-R31 (R32 is all-equal)
    expect(surveyPreview.summary.outOfOrderTimestampCount).toBeGreaterThan(0);

    // Verify original order R01..R33 preserved (never re-sorted by timestamp)
    expect(surveyPreview.rows[0]!.code).toBe("R01");
    expect(surveyPreview.rows[8]!.code).toBe("R09");
    expect(surveyPreview.rows[32]!.code).toBe("R33");

    const laptopPreview = await parseLaptopFile(path.basename(laptopPath), laptopBuffer);
    expect(laptopPreview.ok).toBe(true);
    expect(laptopPreview.summary.totalRows).toBe(7);
    expect(laptopPreview.summary.eligibleRows).toBe(7);

    // Every alternative has 4 valid http/https sources and conservative provisional status
    for (const row of laptopPreview.rows) {
      expect(row.sources).toHaveLength(4);
      expect(row.evidenceStatus).toBe("provisional_unconfirmed");
    }

    // Run full AHP + SAW + Sensitivity suite directly from parsed raw data
    const suite = runStandardSensitivitySuite(
      surveyPreview.rows.map((r) => ({
        id: r.code,
        code: r.code,
        eligible: r.eligible,
        values: r.numericValues,
      })),
      laptopPreview.rows.map((alt) => ({
        id: alt.code,
        code: alt.code,
        model: alt.model,
        sku: alt.sku,
        criteria: {
          C1: alt.priceIdr,
          C2: alt.cpuMark,
          C3: alt.ramGb,
          C4: alt.ssdGb,
          C5: alt.weightKg,
          C6: alt.batteryHours,
        },
      })),
    );

    // --- Verify AHP S1 (17 consistent) within ± 1e-7 ---
    expect(suite.ahpPrimary.consistentCount).toBe(17);
    expect(suite.ahpPrimary.inconsistentCount).toBe(16);
    expect(suite.ahpPrimary.lambdaMax).toBeCloseTo(6.00790181, 7);
    expect(suite.ahpPrimary.ci).toBeCloseTo(0.00158036, 7);
    expect(suite.ahpPrimary.cr).toBeCloseTo(0.00127449, 7);

    const expectedMainWeights = [
      0.21319209,
      0.19140985,
      0.18199344,
      0.13068068,
      0.11332254,
      0.16940139,
    ];
    for (let i = 0; i < 6; i++) {
      expect(Math.abs(suite.ahpPrimary.weights[i]! - expectedMainWeights[i]!)).toBeLessThan(1e-7);
    }

    // Verify specific individual CRs from Lampiran B / Audit sheet
    const indByCode = new Map(suite.ahpPrimary.individualResults.map((r) => [r.code, r]));
    expect(indByCode.get("R01")!.cr!).toBeCloseTo(0.287063, 5);
    expect(indByCode.get("R04")!.cr!).toBeCloseTo(0.084535, 5);
    expect(indByCode.get("R06")!.cr!).toBeCloseTo(0.084720, 5);
    expect(indByCode.get("R09")!.cr!).toBeCloseTo(0, 10);
    expect(indByCode.get("R10")!.cr!).toBeCloseTo(0.116810, 5);
    expect(indByCode.get("R33")!.cr!).toBeCloseTo(1.373334, 5);

    // --- Verify AHP S2 (33 all eligible) within ± 1e-7 ---
    expect(suite.ahpAllEligible.includedIds).toHaveLength(33);
    expect(Math.abs(suite.ahpAllEligible.cr - 0.01233169)).toBeLessThan(1e-7);

    // --- Verify SAW S1 Extrema ---
    expect(suite.sawPrimary.extrema.C1.minValue).toBe(9_399_000);
    expect(suite.sawPrimary.extrema.C2.maxValue).toBe(16_812);
    expect(suite.sawPrimary.extrema.C3.maxValue).toBe(16);
    expect(suite.sawPrimary.extrema.C4.maxValue).toBe(512);
    expect(suite.sawPrimary.extrema.C5.minValue).toBe(1.37);
    expect(suite.sawPrimary.extrema.C6.maxValue).toBe(15);

    // --- Verify SAW S1 Ranking & Scores (± 1e-6) ---
    const expectedS1: Array<[number, string, number]> = [
      [1, "A7", 0.953349],
      [2, "A6", 0.953327],
      [3, "A2", 0.887581],
      [4, "A1", 0.853643],
      [5, "A4", 0.800615],
      [6, "A3", 0.798297],
      [7, "A5", 0.780012],
    ];

    expect(suite.sawPrimary.results).toHaveLength(7);
    for (let i = 0; i < expectedS1.length; i++) {
      const [expRank, expCode, expScore] = expectedS1[i]!;
      const actual = suite.sawPrimary.results[i]!;
      expect(actual.rank).toBe(expRank);
      expect(actual.code).toBe(expCode);
      expect(Math.abs(actual.score - expScore)).toBeLessThan(1e-6);
    }

    // Verify tiny A7 vs A6 margin ~0.0000219771
    expect(suite.sawPrimary.topMargin).not.toBeNull();
    expect(Math.abs(suite.sawPrimary.topMargin! - 0.0000219771)).toBeLessThan(1e-7);

    // --- Verify SAW S2 (33 responses, 7 alternatives) ---
    expect(suite.sawAllEligible.results[0]!.code).toBe("A6");
    expect(Math.abs(suite.sawAllEligible.results[0]!.score - 0.963921)).toBeLessThan(1e-6);

    // --- Verify SAW S3 (17 consistent, 5 alternatives without A6/A7) ---
    expect(suite.sawWithoutA6A7).not.toBeNull();
    expect(suite.sawWithoutA6A7!.results).toHaveLength(5);
    expect(suite.sawWithoutA6A7!.results[0]!.code).toBe("A2");
    expect(Math.abs(suite.sawWithoutA6A7!.results[0]!.score - 0.979739)).toBeLessThan(1e-6);
  });
});
