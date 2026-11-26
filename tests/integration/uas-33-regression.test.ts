import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CRITERION_CODES,
  runAhpGroup,
  runSaw,
  runWeightSensitivitySuite,
} from "@/lib/decision";
import { parseLaptopFile, parseSurveyFile } from "@/lib/import";
import { buildSanitizedPublicPayload } from "@/lib/publication/sanitize";
import { LocalJsonRepository } from "@/lib/repositories/local-repository";
import { RepositoryError } from "@/lib/repositories/types";

const PRIVATE_DIR = path.resolve(process.cwd(), "research", "private");

function findSurveyFile(): string | null {
  if (!fs.existsSync(PRIVATE_DIR)) return null;
  const match = fs
    .readdirSync(PRIVATE_DIR)
    .find((f) => f.toUpperCase().includes("DATA RESPON KUESIONER") && f.endsWith(".xlsx"));
  return match ? path.join(PRIVATE_DIR, match) : null;
}

interface ExpectedRegressionFixture {
  expected_regression: {
    tolerance: number;
    group_matrix: number[][];
    lambda_max: number;
    ci: number;
    group_cr: number;
    weights: number[];
    normalization_reference: number[];
    ranking: Array<{
      code: string;
      rank: number;
      score: number;
      normalized: number[];
      contributions: number[];
    }>;
    sensitivity: Array<{
      label: string;
      criterion: string | null;
      relative_delta: number;
      weights: number[];
      weight_sum: number;
      winner_code: string;
      max_score: number;
      results: Array<{
        code: string;
        score: number;
        rank: number;
      }>;
    }>;
  };
}

describe("UAS 33-Alternative Full Regression & Dynamic Recalculation Suite", () => {
  const surveyPath = findSurveyFile();
  const jsonPath = path.join(PRIVATE_DIR, "LaptopMatch_Dataset_33_Regression.json");
  const workbookPath = path.join(
    PRIVATE_DIR,
    "SPK_Kelompok_13_AHP_SAW_Terintegrasi_33_Alternatif.xlsx",
  );

  it("parses both 33-alternative JSON and 12-sheet UAS XLSX identically without losing non-contiguous codes", async () => {
    expect(surveyPath).not.toBeNull();
    expect(fs.existsSync(jsonPath)).toBe(true);
    expect(fs.existsSync(workbookPath)).toBe(true);

    const jsonPreview = await parseLaptopFile(
      path.basename(jsonPath),
      fs.readFileSync(jsonPath),
    );
    const xlsxPreview = await parseLaptopFile(
      path.basename(workbookPath),
      fs.readFileSync(workbookPath),
    );

    expect(jsonPreview.ok).toBe(true);
    expect(xlsxPreview.ok).toBe(true);
    expect(jsonPreview.c6Metric).toBe("battery_wh");
    expect(xlsxPreview.c6Metric).toBe("battery_wh");
    expect(jsonPreview.c6Unit).toBe("Wh");
    expect(xlsxPreview.c6Unit).toBe("Wh");

    expect(jsonPreview.rows).toHaveLength(33);
    expect(xlsxPreview.rows).toHaveLength(33);
    expect(jsonPreview.excludedCandidates).toHaveLength(9);
    expect(xlsxPreview.excludedCandidates).toHaveLength(9);
    expect(jsonPreview.summary.brandCount).toBe(8);
    expect(xlsxPreview.summary.brandCount).toBe(8);

    // Non-contiguous codes must be preserved exactly (never renumbered A1..A33)
    const expectedExcludedCodes = ["A9", "A19", "A24", "A25", "A26", "A31", "A32", "A35", "A36"];
    expect(jsonPreview.excludedCandidates.map((e) => e.code)).toEqual(expectedExcludedCodes);
    expect(xlsxPreview.excludedCandidates.map((e) => e.code)).toEqual(expectedExcludedCodes);

    for (let i = 0; i < 33; i++) {
      const jr = jsonPreview.rows[i]!;
      const xr = xlsxPreview.rows[i]!;
      expect(jr.code).toBe(xr.code);
      expect(jr.brand).toBe(xr.brand);
      expect(jr.priceIdr).toBe(xr.priceIdr);
      expect(jr.cpuMark).toBe(xr.cpuMark);
      expect(jr.ramGb).toBe(xr.ramGb);
      expect(jr.ssdGb).toBe(xr.ssdGb);
      expect(jr.weightKg).toBeCloseTo(xr.weightKg, 8);
      expect(jr.batteryWh).toBeCloseTo(xr.batteryWh!, 8);
      // Never fabricate batteryHours for Wh datasets
      expect(jr.batteryHours).toBeNull();
      expect(xr.batteryHours).toBeNull();
      expect(jr.sources).toHaveLength(4);
      expect(xr.sources).toHaveLength(4);
    }
  });

  it("matches every AHP, SAW (33 alts), and 37-scenario Weight Sensitivity value within tolerance 1e-7", async () => {
    if (!surveyPath) throw new Error("Survey XLSX missing.");

    const rawJson = JSON.parse(
      fs.readFileSync(jsonPath, "utf-8"),
    ) as ExpectedRegressionFixture;
    const expected = rawJson.expected_regression;
    const tol = expected.tolerance; // 1e-7

    const surveyPreview = await parseSurveyFile(
      path.basename(surveyPath),
      fs.readFileSync(surveyPath),
    );
    expect(surveyPreview.ok).toBe(true);

    const laptopPreview = await parseLaptopFile(
      path.basename(jsonPath),
      fs.readFileSync(jsonPath),
    );
    expect(laptopPreview.ok).toBe(true);

    // 1. Compute AHP dynamically from raw survey responses
    const ahp = runAhpGroup(
      surveyPreview.rows.map((r) => ({
        id: r.code,
        code: r.code,
        eligible: r.eligible,
        values: r.numericValues,
      })),
      "consistent_only",
    );

    expect(ahp.totalCount).toBe(33);
    expect(ahp.consistentCount).toBe(17);
    expect(ahp.inconsistentCount).toBe(16);
    expect(Math.abs(ahp.lambdaMax - expected.lambda_max)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ahp.ci - expected.ci)).toBeLessThanOrEqual(tol);
    expect(Math.abs(ahp.cr - expected.group_cr)).toBeLessThanOrEqual(tol);

    for (let i = 0; i < 6; i++) {
      expect(Math.abs(ahp.weights[i]! - expected.weights[i]!)).toBeLessThanOrEqual(tol);
      for (let j = 0; j < 6; j++) {
        expect(
          Math.abs(ahp.aggregateMatrix[i]![j]! - expected.group_matrix[i]![j]!),
        ).toBeLessThanOrEqual(tol);
      }
    }

    // 2. Compute SAW dynamically on 33 alternatives using C6 = batteryWh
    const saw = runSaw({
      weights: ahp.weights,
      alternatives: laptopPreview.rows.map((alt) => ({
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
          C6: alt.batteryWh!,
        },
      })),
      scenario: "primary_33_consistent",
      c6Metric: "battery_wh",
      ahpMode: "consistent_only",
    });

    expect(saw.c6Metric).toBe("battery_wh");
    expect(saw.c6Unit).toBe("Wh");
    expect(saw.results).toHaveLength(33);

    // Extrema verification
    for (let i = 0; i < 6; i++) {
      const code = CRITERION_CODES[i]!;
      expect(
        Math.abs(saw.extrema[code].value - expected.normalization_reference[i]!),
      ).toBeLessThanOrEqual(tol);
    }

    // All 33 rankings, scores, normalized values (198), and weighted contributions (198)
    for (let i = 0; i < 33; i++) {
      const expRow = expected.ranking[i]!;
      const actRow = saw.results[i]!;
      expect(actRow.code).toBe(expRow.code);
      expect(actRow.rank).toBe(expRow.rank);
      expect(Math.abs(actRow.score - expRow.score)).toBeLessThanOrEqual(tol);

      for (let c = 0; c < 6; c++) {
        const critCode = CRITERION_CODES[c]!;
        expect(
          Math.abs(actRow.normalizedValues[critCode] - expRow.normalized[c]!),
        ).toBeLessThanOrEqual(tol);
        expect(
          Math.abs(actRow.weightedValues[critCode] - expRow.contributions[c]!),
        ).toBeLessThanOrEqual(tol);
      }
    }

    // Key headline checks
    expect(saw.results[0]!.code).toBe("A33");
    expect(saw.results[1]!.code).toBe("A29");
    expect(saw.results[2]!.code).toBe("A28");
    expect(saw.results[3]!.code).toBe("A37");
    expect(saw.results[4]!.code).toBe("A34");
    expect(saw.results[32]!.code).toBe("A11");

    // 3. Compute all 37 One-At-A-Time Weight Sensitivity scenarios
    const sensitivity = runWeightSensitivitySuite({
      baseWeights: ahp.weights,
      baselineItems: saw.results.map((r) => ({
        code: r.code,
        model: r.model,
        normalizedValues: r.normalizedValues,
        weightedValues: r.weightedValues,
        criteriaValues: r.criteriaValues,
        score: r.score,
        rank: r.rank,
      })),
    });

    expect(sensitivity.totalScenarios).toBe(37);
    expect(sensitivity.perturbedScenarioCount).toBe(36);
    expect(sensitivity.baselineWinnerCode).toBe("A33");
    expect(sensitivity.baselineWinnerWinsCount).toBe(31);
    expect(sensitivity.winnerChangeScenarios).toHaveLength(5);
    expect(sensitivity.winnerChangeScenarios.map((s) => s.label)).toEqual([
      "C1 -20%",
      "C2 +10%",
      "C2 +20%",
      "C6 -20%",
      "C6 -10%",
    ]);
    expect(sensitivity.winnerChangeScenarios.every((s) => s.winnerCode === "A29")).toBe(true);

    // Exhaustive check across all 37 scenarios × (6 weights + sum + winner + max_score + 33 scores & ranks)
    expect(sensitivity.scenarios).toHaveLength(expected.sensitivity.length);
    for (let s = 0; s < expected.sensitivity.length; s++) {
      const expSc = expected.sensitivity[s]!;
      const actSc = sensitivity.scenarios[s]!;
      expect(actSc.label).toBe(expSc.label);
      expect(actSc.criterion).toBe(expSc.criterion);
      expect(Math.abs(actSc.relativeDelta - expSc.relative_delta)).toBeLessThanOrEqual(tol);
      expect(Math.abs(actSc.weightSum - expSc.weight_sum)).toBeLessThanOrEqual(tol);
      expect(actSc.winnerCode).toBe(expSc.winner_code);
      expect(Math.abs(actSc.maxScore - expSc.max_score)).toBeLessThanOrEqual(tol);

      for (let w = 0; w < 6; w++) {
        expect(Math.abs(actSc.weights[w]! - expSc.weights[w]!)).toBeLessThanOrEqual(tol);
      }

      const actByCode = new Map(actSc.results.map((r) => [r.code, r]));
      for (const expAlt of expSc.results) {
        const actAlt = actByCode.get(expAlt.code);
        expect(actAlt).toBeDefined();
        expect(actAlt!.rank).toBe(expAlt.rank);
        expect(Math.abs(actAlt!.score - expAlt.score)).toBeLessThanOrEqual(tol);
      }
    }
  });

  it("recalculates SAW dynamically on duplicated draft v2 when price changes while keeping sealed v1 immutable", async () => {
    if (!surveyPath) throw new Error("Survey XLSX missing.");

    const tmpFile = path.join(
      os.tmpdir(),
      `laptopmatch-uas-dynamic-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
    );

    try {
      const repo = new LocalJsonRepository(tmpFile);
      const surveyPreview = await parseSurveyFile(
        path.basename(surveyPath),
        fs.readFileSync(surveyPath),
      );
      const laptopPreview = await parseLaptopFile(
        path.basename(jsonPath),
        fs.readFileSync(jsonPath),
      );

      const batch = await repo.createResponseBatch({
        filename: surveyPreview.filename,
        sheetName: surveyPreview.sheetName,
        sha256: surveyPreview.sha256,
        importedBy: null,
        rows: surveyPreview.rows,
      });
      const batchDetail = (await repo.getResponseBatch(batch.id))!;

      const ahpOut = runAhpGroup(
        batchDetail.responses.map((r) => ({
          id: r.id,
          code: r.code,
          eligible: r.validationStatus === "eligible",
          values: r.parsedAnswers.map((a) => a.numericValue),
        })),
        "consistent_only",
      );
      const ahpRun = await repo.saveAhpRun({
        run: {
          batchId: batch.id,
          mode: ahpOut.mode,
          algorithmVersion: ahpOut.algorithmVersion,
          includedIds: ahpOut.includedIds,
          excludedIds: ahpOut.excludedIds,
          aggregateMatrix: ahpOut.aggregateMatrix,
          weights: ahpOut.weights,
          weightsByCode: ahpOut.weightsByCode,
          lambdaMax: ahpOut.lambdaMax,
          ci: ahpOut.ci,
          ri: ahpOut.ri,
          cr: ahpOut.cr,
          passesCr: ahpOut.passesCr,
          iterations: ahpOut.iterations,
          targetCount: ahpOut.targetConsistentCount,
          warnings: ahpOut.warnings,
          createdBy: null,
          status: "completed",
        },
        individualResults: ahpOut.individualResults.map((ir) => ({
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

      const dsV1 = await repo.createAlternativeDataset({
        label: "Dataset UAS v1",
        sourceFilename: laptopPreview.filename,
        sourceHash: laptopPreview.sha256,
        observedAt: laptopPreview.observedAt,
        c6Metric: laptopPreview.c6Metric,
        c6Unit: laptopPreview.c6Unit,
        c6Definition: laptopPreview.c6Definition,
        candidateCount: laptopPreview.candidateCount,
        excludedCandidates: laptopPreview.excludedCandidates,
        createdBy: null,
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
          active: r.active,
          stockStatus: r.stockStatus,
          evidenceStatus: r.evidenceStatus,
          batteryProtocol: r.batteryProtocol,
          evidenceNotes: r.evidenceNotes,
          sourceDateRecorded: r.sourceDateRecorded,
          sourceStatusRecorded: r.sourceStatusRecorded,
          selectionReason: r.selectionReason,
          sources: r.sources,
        })),
      });

      const dsV1Detail = (await repo.getAlternativeDataset(dsV1.id))!;
      const sawV1Out = runSaw({
        weights: ahpRun.weights,
        alternatives: dsV1Detail.alternatives.map((a) => ({
          id: a.id,
          code: a.code,
          model: a.model,
          criteria: {
            C1: a.priceIdr,
            C2: a.cpuMark,
            C3: a.ramGb,
            C4: a.ssdGb,
            C5: a.weightKg,
            C6: a.batteryWh!,
          },
        })),
        scenario: "primary_33_consistent",
        c6Metric: "battery_wh",
        ahpMode: "consistent_only",
      });

      const savedSawV1 = await repo.saveSawRun({
        run: {
          ahpRunId: ahpRun.id,
          datasetId: dsV1.id,
          scenario: sawV1Out.scenario,
          c6Metric: "battery_wh",
          c6Unit: "Wh",
          algorithmVersion: sawV1Out.algorithmVersion,
          inputSnapshot: {
            ahpMode: ahpRun.mode,
            weights: ahpRun.weights,
            weightsByCode: ahpRun.weightsByCode,
            alternativeIds: dsV1Detail.alternatives.map((a) => a.id),
            alternativeCodes: dsV1Detail.alternatives.map((a) => a.code),
            observedAt: dsV1.observedAt,
            datasetVersion: dsV1.version,
          },
          normalizationExtrema: sawV1Out.extrema,
          weightSensitivity: runWeightSensitivitySuite({
            baseWeights: ahpRun.weights,
            baselineItems: sawV1Out.results,
          }),
          topMargin: sawV1Out.topMargin,
          warnings: sawV1Out.warnings,
          caveats: sawV1Out.caveats,
          createdBy: null,
          status: "completed",
        },
        results: sawV1Out.results.map((r) => ({
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

      // Sealed v1 must reject direct mutations
      const a29V1 = dsV1Detail.alternatives.find((a) => a.code === "A29")!;
      await expect(
        repo.upsertDraftAlternative({
          ...a29V1,
          priceIdr: 9_250_000,
          sources: a29V1.sources.map((s) => ({
            sourceType: s.sourceType,
            url: s.url,
            observedAt: s.observedAt,
            evidenceLevel: s.evidenceLevel,
            notes: s.notes,
          })),
        }),
      ).rejects.toThrow(RepositoryError);

      // Duplicate v1 to draft v2, lower A29 price from 10.6M to 9.25M (within [9M, 11M])
      const dsV2 = await repo.duplicateDatasetToDraft(dsV1.id, null, "Simulasi Harga A29");
      expect(dsV2.c6Metric).toBe("battery_wh");
      expect(dsV2.excludedCandidates).toHaveLength(9);

      const dsV2Detail = (await repo.getAlternativeDataset(dsV2.id))!;
      const a29V2 = dsV2Detail.alternatives.find((a) => a.code === "A29")!;
      await repo.upsertDraftAlternative({
        ...a29V2,
        priceIdr: 9_250_000,
        sources: a29V2.sources.map((s) => ({
          sourceType: s.sourceType,
          url: s.url,
          observedAt: s.observedAt,
          evidenceLevel: s.evidenceLevel,
          notes: s.notes,
        })),
      });

      const dsV2Updated = (await repo.getAlternativeDataset(dsV2.id))!;
      const sawV2Out = runSaw({
        weights: ahpRun.weights,
        alternatives: dsV2Updated.alternatives.map((a) => ({
          id: a.id,
          code: a.code,
          model: a.model,
          criteria: {
            C1: a.priceIdr,
            C2: a.cpuMark,
            C3: a.ramGb,
            C4: a.ssdGb,
            C5: a.weightKg,
            C6: a.batteryWh!,
          },
        })),
        scenario: "custom",
        c6Metric: "battery_wh",
        ahpMode: "consistent_only",
      });

      // With A29 price reduced to 9,250,000, A29 dynamically overtakes A33 for Rank 1
      expect(sawV2Out.results[0]!.code).toBe("A29");
      expect(sawV2Out.results[1]!.code).toBe("A33");

      // Independent manual verification of A29 new score
      const expectedA29Score =
        ahpRun.weights[0]! * (9_199_000 / 9_250_000) +
        ahpRun.weights[1]! * (22_722 / 22_722) +
        ahpRun.weights[2]! * (16 / 16) +
        ahpRun.weights[3]! * (512 / 1_000) +
        ahpRun.weights[4]! * (0.999 / 1.3) +
        ahpRun.weights[5]! * (52.2 / 75);
      expect(Math.abs(sawV2Out.results[0]!.score - expectedA29Score)).toBeLessThan(1e-12);

      // Sealed v1 & its SAW run remain 100% untouched
      const v1Check = (await repo.getSawRunDetail(savedSawV1.id))!;
      expect(v1Check.results[0]!.alternativeCode).toBe("A33");
      expect(v1Check.alternatives.find((a) => a.code === "A29")!.priceIdr).toBe(10_600_000);

      // Verify sanitized public payload exposes 33 alts + 37 sensitivity scenarios and ZERO raw respondent fields
      const payload = buildSanitizedPublicPayload({
        status: "provisional",
        observedAt: dsV1.observedAt,
        publishedAt: new Date().toISOString(),
        caveats: "Test provisional",
        responses: batchDetail.responses,
        ahpRun,
        sawRun: v1Check.run,
        sawResults: v1Check.results,
        alternatives: v1Check.alternatives,
        dataset: v1Check.dataset,
      });

      expect(payload.c6Metric).toBe("battery_wh");
      expect(payload.c6Unit).toBe("Wh");
      expect(payload.researchSummary.alternativeCount).toBe(33);
      expect(payload.researchSummary.brandCount).toBe(8);
      expect(payload.researchSummary.excludedCandidateCount).toBe(9);
      expect(payload.weightSensitivity?.totalScenarios).toBe(37);
      const serialized = JSON.stringify(payload);
      expect(serialized).not.toContain("rawAnswers");
      expect(serialized).not.toContain("parsedAnswers");
      expect(serialized).not.toContain("rawTimestamp");
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  });
});
