import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();
import fs from "node:fs";
import path from "node:path";
import {
  RESEARCH_AUDIT_DATE,
  runAhpGroup,
  runSaw,
  runWeightSensitivitySuite,
} from "@/lib/decision";
import { parseLaptopFile, parseSurveyFile } from "@/lib/import";
import {
  buildDefaultPublicationCaveats,
  buildSanitizedPublicPayload,
} from "@/lib/publication/sanitize";
import { LocalJsonRepository } from "@/lib/repositories/local-repository";
import { SupabaseRepository } from "@/lib/repositories/supabase-repository";
import type { DataRepository, SawRunRecord } from "@/lib/repositories/types";
import {
  getLocalStorePath,
  isSupabaseConfigured,
} from "@/lib/supabase/config";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/server";

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx < 0 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1] ?? null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function resolveCliRepository(): Promise<DataRepository> {
  if (isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const client = createServiceRoleSupabaseClient();
    return new SupabaseRepository(client);
  }
  const localPath = getLocalStorePath();
  if (localPath) {
    return new LocalJsonRepository(localPath);
  }
  throw new Error(
    "Tidak ada target penyimpanan. Sediakan NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (untuk Supabase) atau LAPTOPMATCH_LOCAL_STORE_PATH (untuk uji lokal).",
  );
}

async function main() {
  const surveyArg = getArg("--survey");
  const laptopsArg = getArg("--laptops");
  const observedAtArg = getArg("--observed-at");
  const labelArg = getArg("--label");
  const publishProvisional = hasFlag("--publish-provisional");

  if (!surveyArg || !laptopsArg) {
    console.error(
      "Penggunaan:\n  npm run import:research -- --survey <path-kuesioner.xlsx> --laptops <path-dataset.json|.xlsx> [--observed-at 2026-11-26] [--label \"Dataset UAS 33 Alternatif\"] [--publish-provisional]",
    );
    process.exit(1);
  }

  const surveyPath = path.resolve(surveyArg);
  const laptopsPath = path.resolve(laptopsArg);

  if (!fs.existsSync(surveyPath)) {
    throw new Error(`Berkas kuesioner tidak ditemukan: ${surveyPath}`);
  }
  if (!fs.existsSync(laptopsPath)) {
    throw new Error(`Berkas data alternatif tidak ditemukan: ${laptopsPath}`);
  }

  console.log("1. Membaca dan memvalidasi berkas kuesioner...");
  const surveyPreview = await parseSurveyFile(
    path.basename(surveyPath),
    fs.readFileSync(surveyPath),
  );
  if (!surveyPreview.ok) {
    throw new Error(`Validasi kuesioner gagal: ${surveyPreview.errors.join(" | ")}`);
  }
  console.log(
    `   OK: ${surveyPreview.summary.totalRows} baris, ${surveyPreview.summary.eligibleRows} eligible, ${surveyPreview.summary.consistentPreviewCount} konsisten (CR <= 0,10).`,
  );

  console.log("2. Membaca dan memvalidasi berkas alternatif laptop...");
  const laptopPreview = await parseLaptopFile(
    path.basename(laptopsPath),
    fs.readFileSync(laptopsPath),
    observedAtArg ?? RESEARCH_AUDIT_DATE,
  );
  if (!laptopPreview.ok) {
    throw new Error(`Validasi alternatif gagal: ${laptopPreview.errors.join(" | ")}`);
  }
  const effectiveObservedAt = observedAtArg ?? laptopPreview.observedAt;
  console.log(
    `   OK: ${laptopPreview.summary.totalRows} alternatif aktif lintas ${laptopPreview.summary.brandCount} merek, ${laptopPreview.summary.excludedCount} kandidat dikeluarkan (C6: ${laptopPreview.c6Unit}, audit ${effectiveObservedAt}).`,
  );

  const repo = await resolveCliRepository();
  console.log(`3. Menyimpan dataset secara idempotent ke target penyimpanan (${repo.mode})...`);

  const existingBatches = await repo.listResponseBatches();
  let batch = existingBatches.find((b) => b.sha256 === surveyPreview.sha256);
  if (!batch) {
    batch = await repo.createResponseBatch({
      filename: surveyPreview.filename,
      sheetName: surveyPreview.sheetName,
      sha256: surveyPreview.sha256,
      importedBy: null,
      notes: "Diimpor melalui CLI scripts/import-research.ts",
      rows: surveyPreview.rows,
    });
    console.log(`   Batch respons tersimpan: ${batch.id}`);
  } else {
    console.log(`   Batch respons dengan SHA-256 sama sudah ada (${batch.id}); tidak mengimpor ulang.`);
  }

  const batchDetail = await repo.getResponseBatch(batch.id);
  if (!batchDetail) throw new Error("Gagal membaca ulang batch respons.");

  const existingDatasets = await repo.listAlternativeDatasets();
  let dataset = existingDatasets.find(
    (d) => d.sourceHash && d.sourceHash === laptopPreview.sha256,
  );
  if (!dataset) {
    dataset = await repo.createAlternativeDataset({
      label:
        labelArg ||
        (laptopPreview.c6Metric === "battery_wh"
          ? `Dataset UAS ${laptopPreview.summary.totalRows} Alternatif Lintas ${laptopPreview.summary.brandCount} Merek (${effectiveObservedAt})`
          : `Snapshot Audit ${effectiveObservedAt} (${laptopPreview.filename})`),
      sourceFilename: laptopPreview.filename,
      sourceHash: laptopPreview.sha256,
      observedAt: effectiveObservedAt,
      c6Metric: laptopPreview.c6Metric,
      c6Unit: laptopPreview.c6Unit,
      c6Definition: laptopPreview.c6Definition,
      candidateCount: laptopPreview.candidateCount,
      excludedCandidates: laptopPreview.excludedCandidates,
      createdBy: null,
      notes: "Diimpor melalui CLI scripts/import-research.ts",
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
    console.log(`   Dataset alternatif v${dataset.version} tersimpan: ${dataset.id}`);
  } else {
    console.log(
      `   Dataset alternatif dengan SHA-256 sama sudah ada (v${dataset.version}: ${dataset.id}); menggunakan dataset tersebut.`,
    );
  }

  const dsDetail = await repo.getAlternativeDataset(dataset.id);
  if (!dsDetail) throw new Error("Gagal membaca ulang dataset alternatif.");

  console.log("4. Menghitung AHP (skenario utama 17 konsisten & pembanding 33 respons)...");
  const ahpInputs = batchDetail.responses.map((r) => ({
    id: r.id,
    code: r.code,
    eligible: r.validationStatus === "eligible" && r.parsedAnswers.length === 15,
    ineligibleReason: r.validationErrors.join("; ") || null,
    values: r.parsedAnswers.map((a) => a.numericValue),
  }));

  const ahp17 = runAhpGroup(ahpInputs, "consistent_only");
  const ahp33 = runAhpGroup(ahpInputs, "all_eligible");

  const existingAhpRuns = await repo.listAhpRuns();
  let savedAhp17 = existingAhpRuns.find(
    (r) => r.batchId === batch.id && r.mode === "consistent_only",
  );
  if (!savedAhp17) {
    savedAhp17 = await repo.saveAhpRun({
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
        targetCount: ahp17.targetConsistentCount,
        warnings: ahp17.warnings,
        createdBy: null,
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
  }

  let savedAhp33 = existingAhpRuns.find(
    (r) => r.batchId === batch.id && r.mode === "all_eligible",
  );
  if (!savedAhp33) {
    savedAhp33 = await repo.saveAhpRun({
      run: {
        batchId: batch.id,
        mode: ahp33.mode,
        algorithmVersion: ahp33.algorithmVersion,
        includedIds: ahp33.includedIds,
        excludedIds: ahp33.excludedIds,
        aggregateMatrix: ahp33.aggregateMatrix,
        weights: ahp33.weights,
        weightsByCode: ahp33.weightsByCode,
        lambdaMax: ahp33.lambdaMax,
        ci: ahp33.ci,
        ri: ahp33.ri,
        cr: ahp33.cr,
        passesCr: ahp33.passesCr,
        iterations: ahp33.iterations,
        targetCount: ahp33.targetConsistentCount,
        warnings: ahp33.warnings,
        createdBy: null,
        status: "completed",
      },
      individualResults: ahp33.individualResults.map((ir) => ({
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
  }
  console.log(`   AHP 17 CR = ${savedAhp17.cr.toFixed(8)} | AHP 33 CR = ${savedAhp33.cr.toFixed(8)}`);

  const isUasWh = dsDetail.dataset.c6Metric === "battery_wh";
  const primaryScenario = isUasWh ? "primary_33_consistent" : "primary_7_consistent";
  const allEligibleScenario = isUasWh ? "sensitivity_33_all" : "sensitivity_7_all";

  console.log(
    isUasWh
      ? "5. Menghitung SAW UAS (33 alternatif, C6 Wh) + 37 skenario analisis sensitivitas bobot..."
      : "5. Menghitung SAW historis (S1 utama, S2 33 respons, S3 5 alternatif tanpa A6/A7)...",
  );

  const toMetric = (a: (typeof dsDetail.alternatives)[number]) => ({
    id: a.id,
    code: a.code,
    model: a.model,
    sku: a.sku,
    criteria: {
      C1: a.priceIdr,
      C2: a.cpuMark,
      C3: a.ramGb,
      C4: a.ssdGb,
      C5: a.weightKg,
      C6: (isUasWh ? a.batteryWh : a.batteryHours)!,
    },
  });

  const activeAlts = dsDetail.alternatives.filter((a) => a.active);
  const saw1Out = runSaw({
    weights: savedAhp17.weights,
    alternatives: activeAlts.map(toMetric),
    scenario: primaryScenario,
    c6Metric: dsDetail.dataset.c6Metric,
    ahpMode: "consistent_only",
  });
  const saw2Out = runSaw({
    weights: savedAhp33.weights,
    alternatives: activeAlts.map(toMetric),
    scenario: allEligibleScenario,
    c6Metric: dsDetail.dataset.c6Metric,
    ahpMode: "all_eligible",
  });

  const persistSaw = async (
    ahpRun: typeof savedAhp17,
    out: typeof saw1Out,
    altsUsed: typeof dsDetail.alternatives,
  ): Promise<SawRunRecord> => {
    const ws = runWeightSensitivitySuite({
      baseWeights: ahpRun.weights,
      baselineItems: out.results.map((r) => ({
        code: r.code,
        model: r.model,
        normalizedValues: r.normalizedValues,
        weightedValues: r.weightedValues,
        criteriaValues: r.criteriaValues,
        score: r.score,
        rank: r.rank,
      })),
    });

    return repo.saveSawRun({
      run: {
        ahpRunId: ahpRun.id,
        datasetId: dataset.id,
        scenario: out.scenario,
        c6Metric: out.c6Metric,
        c6Unit: out.c6Metric === "battery_hours" ? "jam" : "Wh",
        algorithmVersion: out.algorithmVersion,
        inputSnapshot: {
          ahpMode: ahpRun.mode,
          weights: ahpRun.weights,
          weightsByCode: ahpRun.weightsByCode,
          alternativeIds: altsUsed.map((a) => a.id),
          alternativeCodes: altsUsed.map((a) => a.code),
          observedAt: dataset.observedAt,
          datasetVersion: dataset.version,
          c6Metric: out.c6Metric,
          c6Unit: out.c6Metric === "battery_hours" ? "jam" : "Wh",
        },
        normalizationExtrema: out.extrema,
        weightSensitivity: ws,
        topMargin: out.topMargin,
        warnings: out.warnings,
        caveats: out.caveats,
        createdBy: null,
        status: "completed",
      },
      results: out.results.map((r) => ({
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
  };

  const savedSaw1 = await persistSaw(savedAhp17, saw1Out, activeAlts);
  const savedSaw2 = await persistSaw(savedAhp33, saw2Out, activeAlts);

  let savedSaw3: SawRunRecord | null = null;
  if (!isUasWh) {
    const fiveAlts = activeAlts.filter((a) => a.code !== "A6" && a.code !== "A7");
    if (fiveAlts.length > 0) {
      const saw3Out = runSaw({
        weights: savedAhp17.weights,
        alternatives: fiveAlts.map(toMetric),
        scenario: "sensitivity_5_no_a6_a7",
        c6Metric: dsDetail.dataset.c6Metric,
        ahpMode: "consistent_only",
      });
      savedSaw3 = await persistSaw(savedAhp17, saw3Out, fiveAlts);
      console.log(
        `   S3 Rank 1: ${saw3Out.results[0]?.code} (${saw3Out.results[0]?.score.toFixed(6)})`,
      );
    }
  }

  console.log(
    `   Utama Rank 1: ${saw1Out.results[0]?.code} (${saw1Out.results[0]?.score.toFixed(6)}) | Rank 2: ${saw1Out.results[1]?.code ?? "-"} (${saw1Out.results[1]?.score.toFixed(6) ?? "-"})`,
  );
  console.log(
    `   Sensitivitas Bobot 36 skenario: ${savedSaw1.weightSensitivity?.baselineWinnerCode} bertahan ${savedSaw1.weightSensitivity?.baselineWinnerWinsCount}/${savedSaw1.weightSensitivity?.perturbedScenarioCount} (${savedSaw1.weightSensitivity?.baselineWinnerStabilityPct.toFixed(2)}%)`,
  );

  if (publishProvisional) {
    console.log("6. Mempublikasikan snapshot berstatus PROVISIONAL (bukan final)...");
    const d1 = await repo.getSawRunDetail(savedSaw1.id);
    const d2 = await repo.getSawRunDetail(savedSaw2.id);
    const d3 = savedSaw3 ? await repo.getSawRunDetail(savedSaw3.id) : null;
    if (!d1 || !d2) throw new Error("Gagal membaca detail SAW untuk publikasi.");

    const brandCount = new Set(activeAlts.map((a) => a.brand)).size;
    const caveats = buildDefaultPublicationCaveats({
      alternativeCount: activeAlts.length,
      brandCount,
      observedAt: dataset.observedAt,
      c6Metric: dataset.c6Metric,
    });

    const payload = buildSanitizedPublicPayload({
      status: "provisional",
      observedAt: dataset.observedAt,
      publishedAt: new Date().toISOString(),
      caveats,
      responses: batchDetail.responses,
      ahpRun: savedAhp17,
      sawRun: savedSaw1,
      sawResults: d1.results,
      alternatives: activeAlts,
      dataset: dsDetail.dataset,
      sensitivityAllEligible: { ahpRun: savedAhp33, sawResults: d2.results },
      sensitivityWithoutA6A7: d3 ? { sawResults: d3.results } : null,
    });

    const pub = await repo.publishSnapshot({
      sawRunId: savedSaw1.id,
      sensitivityRunIds: [savedSaw2.id, ...(savedSaw3 ? [savedSaw3.id] : [])],
      publicPayload: payload,
      status: "provisional",
      reviewedBy: null,
      caveats,
      qualityReview: {
        primaryRuleVerified: true,
        sourcesAndSkuReviewed: false,
        responseIndependenceConfirmed: false,
        stockOrArchivalScopeRecorded: false,
        caveatsAcknowledged: true,
      },
    });
    console.log(`   Snapshot provisional dipublikasikan: ${pub.id}`);
  }

  console.log("Selesai.");
}

main().catch((err) => {
  console.error("Gagal menjalankan import:research:", err instanceof Error ? err.message : err);
  process.exit(1);
});
