import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAhpGroup, runSaw } from "@/lib/decision";
import { buildCalculationReportWorkbook } from "@/lib/export/excel";
import { loadExcelWorkbook } from "@/lib/import/xlsx-loader";
import { parseLaptopFile, parseSurveyFile } from "@/lib/import";
import {
  buildSanitizedPublicPayload,
  validatePublicationGates,
} from "@/lib/publication/sanitize";
import { LocalJsonRepository } from "@/lib/repositories/local-repository";
import { RepositoryError } from "@/lib/repositories/types";

const PRIVATE_DIR = path.resolve(process.cwd(), "research", "private");

const tempFiles: string[] = [];

afterEach(() => {
  for (const f of tempFiles.splice(0)) {
    if (fs.existsSync(f)) {
      fs.rmSync(f, { force: true });
    }
  }
});

describe("End-to-end backend workflow: repository immutability, publication gates, sanitization & XLSX export", () => {
  it("enforces duplicate hash, sealed dataset protection, final publish gate, zero raw data leakage, and valid 7-sheet XLSX export", async () => {
    const surveyFile = fs
      .readdirSync(PRIVATE_DIR)
      .find((f) => f.toUpperCase().includes("DATA RESPON KUESIONER") && f.endsWith(".xlsx"));
    const laptopFile = "SPK_Kelompok_13_Audit_SAW_Revisi.xlsx";

    expect(surveyFile).toBeDefined();
    const surveyPreview = await parseSurveyFile(
      surveyFile!,
      fs.readFileSync(path.join(PRIVATE_DIR, surveyFile!)),
    );
    const laptopPreview = await parseLaptopFile(
      laptopFile,
      fs.readFileSync(path.join(PRIVATE_DIR, laptopFile)),
    );

    const storeFile = path.join(os.tmpdir(), `lm-test-${Date.now()}.json`);
    tempFiles.push(storeFile);
    const repo = new LocalJsonRepository(storeFile);

    // 1. Import survey batch & verify duplicate SHA-256 rejection (409)
    const batch = await repo.createResponseBatch({
      filename: surveyPreview.filename,
      sheetName: surveyPreview.sheetName,
      sha256: surveyPreview.sha256,
      importedBy: "admin-1",
      rows: surveyPreview.rows,
    });

    await expect(
      repo.createResponseBatch({
        filename: surveyPreview.filename,
        sheetName: surveyPreview.sheetName,
        sha256: surveyPreview.sha256,
        importedBy: "admin-1",
        rows: surveyPreview.rows,
      }),
    ).rejects.toThrow(RepositoryError);

    // 2. Import alternatives dataset
    const ds1 = await repo.createAlternativeDataset({
      label: "Audit 25 Nov 2026",
      sourceFilename: laptopPreview.filename,
      sourceHash: laptopPreview.sha256,
      observedAt: "2026-11-25",
      createdBy: "admin-1",
      alternatives: laptopPreview.rows.map((r) => ({
        code: r.code,
        brand: r.brand,
        model: r.model,
        sku: r.sku,
        cpuName: r.cpuName,
        priceIdr: r.priceIdr,
        cpuMark: r.cpuMark,
        ramGb: r.ramGb,
        ssdGb: r.ssdGb,
        weightKg: r.weightKg,
        batteryHours: r.batteryHours,
        batteryWh: r.batteryWh,
        seller: r.seller,
        active: true,
        stockStatus: r.stockStatus,
        evidenceStatus: r.evidenceStatus,
        batteryProtocol: r.batteryProtocol,
        evidenceNotes: r.evidenceNotes,
        sources: r.sources,
      })),
    });

    const batchDetail = (await repo.getResponseBatch(batch.id))!;
    const ds1Detail = (await repo.getAlternativeDataset(ds1.id))!;

    // 3. Persist AHP + SAW run (seals ds1 automatically)
    const ahp17 = runAhpGroup(
      batchDetail.responses.map((r) => ({
        id: r.id,
        code: r.code,
        eligible: r.validationStatus === "eligible",
        values: r.parsedAnswers.map((a) => a.numericValue),
      })),
      "consistent_only",
    );

    const savedAhp = await repo.saveAhpRun({
      run: {
        batchId: batch.id,
        mode: ahp17.mode,
        algorithmVersion: ahp17.algorithmVersion,
        includedIds: ahp17.includedIds,
        excludedIds: ahp17.excludedIds,
        aggregateMatrix: ahp17.aggregateMatrix,
        weights: ahp17.weights,
        weightsByCode: ahp17.weightsByCode,
        lambdaMax: ahp17.lambdaMax,
        ci: ahp17.ci,
        ri: ahp17.ri,
        cr: ahp17.cr,
        passesCr: ahp17.passesCr,
        iterations: ahp17.iterations,
        targetCount: 12,
        warnings: ahp17.warnings,
        createdBy: "admin-1",
        status: "completed",
      },
      individualResults: ahp17.individualResults.map((ir) => ({
        responseId: ir.id,
        responseCode: ir.code,
        matrix: ir.matrix,
        weights: ir.weights,
        lambdaMax: ir.lambdaMax,
        ci: ir.ci,
        ri: ir.ri,
        cr: ir.cr,
        passesCr: ir.passesCr,
        eligible: ir.eligible,
        isAllEqual: ir.isAllEqual,
        nearZeroCrFlag: ir.nearZeroCrFlag,
        includedInMode: ir.includedInMode,
        reason: ir.reason,
      })),
    });

    const sawOut = runSaw({
      weights: savedAhp.weights,
      alternatives: ds1Detail.alternatives.map((a) => ({
        id: a.id,
        code: a.code,
        model: a.model,
        criteria: {
          C1: a.priceIdr,
          C2: a.cpuMark,
          C3: a.ramGb,
          C4: a.ssdGb,
          C5: a.weightKg,
          C6: a.batteryHours,
        },
      })),
      scenario: "primary_7_consistent",
      ahpMode: "consistent_only",
    });

    const savedSaw = await repo.saveSawRun({
      run: {
        ahpRunId: savedAhp.id,
        datasetId: ds1.id,
        scenario: sawOut.scenario,
        algorithmVersion: sawOut.algorithmVersion,
        inputSnapshot: {
          ahpMode: savedAhp.mode,
          weights: savedAhp.weights,
          weightsByCode: savedAhp.weightsByCode,
          alternativeIds: ds1Detail.alternatives.map((a) => a.id),
          alternativeCodes: ds1Detail.alternatives.map((a) => a.code),
          observedAt: ds1.observedAt,
          datasetVersion: ds1.version,
        },
        normalizationExtrema: sawOut.extrema,
        topMargin: sawOut.topMargin,
        warnings: sawOut.warnings,
        caveats: sawOut.caveats,
        createdBy: "admin-1",
        status: "completed",
      },
      results: sawOut.results.map((r) => ({
        alternativeId: r.alternativeId,
        alternativeCode: r.code,
        alternativeModel: r.model,
        criteriaValues: r.criteriaValues,
        normalizedValues: r.normalizedValues,
        weightedValues: r.weightedValues,
        score: r.score,
        rank: r.rank,
        isTied: r.isTied,
      })),
    });

    // 4. Verify sealed dataset blocks mutation (409)
    const firstAlt = ds1Detail.alternatives[0]!;
    await expect(repo.toggleAlternativeActive(firstAlt.id, false)).rejects.toThrow(
      RepositoryError,
    );

    // Duplicating to draft creates v2 that CAN be modified without affecting v1 or savedSaw
    const ds2 = await repo.duplicateDatasetToDraft(ds1.id, "admin-1", "Draft v2");
    expect(ds2.version).toBe(2);
    expect(ds2.status).toBe("draft");

    // 5. Verify final publication gate blocks unreviewed baseline (E08)
    const finalGate = validatePublicationGates({
      intendedStatus: "final",
      ahpRun: savedAhp,
      sawRun: savedSaw,
      alternativesInRun: ds1Detail.alternatives,
      qualityReview: {
        primaryRuleVerified: true,
        sourcesAndSkuReviewed: false,
        responseIndependenceConfirmed: false,
        stockOrArchivalScopeRecorded: false,
        caveatsAcknowledged: true,
      },
    });
    expect(finalGate.allowed).toBe(false);
    expect(finalGate.unmetRequirements.length).toBeGreaterThanOrEqual(3);

    // 6. Verify provisional publication passes and leaks ZERO private survey text
    const provGate = validatePublicationGates({
      intendedStatus: "provisional",
      ahpRun: savedAhp,
      sawRun: savedSaw,
      alternativesInRun: ds1Detail.alternatives,
      qualityReview: {
        primaryRuleVerified: true,
        sourcesAndSkuReviewed: false,
        responseIndependenceConfirmed: false,
        stockOrArchivalScopeRecorded: false,
        caveatsAcknowledged: true,
      },
    });
    expect(provGate.allowed).toBe(true);

    const sawDetail = (await repo.getSawRunDetail(savedSaw.id))!;
    const publicPayload = buildSanitizedPublicPayload({
      status: "provisional",
      observedAt: ds1.observedAt,
      publishedAt: "2026-11-25T12:00:00.000Z",
      caveats: "Catatan uji",
      responses: batchDetail.responses,
      ahpRun: savedAhp,
      sawRun: savedSaw,
      sawResults: sawDetail.results,
      alternatives: ds1Detail.alternatives,
    });

    const serialized = JSON.stringify(publicPayload);
    // Must never contain respondent suggestions, program study names tied to rows, or raw timestamps
    expect(serialized).not.toContain("bebas kak manut aja");
    expect(serialized).not.toContain("Sastra mesin");
    expect(serialized).not.toContain("Teknik Sistem Perkapalan");
    expect(serialized).not.toContain("46337.422259");
    expect(publicPayload.bannerText).toContain("Validasi respons/sumber belum seluruhnya dikonfirmasi");

    // 7. Verify XLSX Export generates valid 7-sheet workbook with weights, ranks, and URLs
    const xlsxBuf = await buildCalculationReportWorkbook({
      sawRun: savedSaw,
      sawResults: sawDetail.results,
      ahpRun: savedAhp,
      dataset: ds1,
      alternatives: ds1Detail.alternatives,
      publicationStatus: "provisional (aktif)",
    });

    const parsedWb = await loadExcelWorkbook(xlsxBuf);
    const sheetNames = parsedWb.worksheets.map((s) => s.name);
    expect(sheetNames).toEqual([
      "Ringkasan",
      "Bobot AHP",
      "Matriks AIJ",
      "Alternatif & Sumber",
      "Normalisasi SAW",
      "Kontribusi & Ranking",
      "Sensitivitas",
    ]);

    const rankSheet = parsedWb.getWorksheet("Kontribusi & Ranking")!;
    expect(rankSheet.getRow(2).getCell(2).value).toBe("A7");
    expect(Number(rankSheet.getRow(2).getCell(10).value)).toBeCloseTo(0.953349, 5);
  });
});
