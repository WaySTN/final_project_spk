import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { RESEARCH_AUDIT_DATE, runAhpGroup, runSaw } from "@/lib/decision";
import { parseLaptopFile, parseSurveyFile } from "@/lib/import";
import { buildSanitizedPublicPayload } from "@/lib/publication/sanitize";
import { LocalJsonRepository } from "@/lib/repositories/local-repository";
import { SupabaseRepository } from "@/lib/repositories/supabase-repository";
import type { DataRepository } from "@/lib/repositories/types";
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
  const observedAt = getArg("--observed-at") ?? RESEARCH_AUDIT_DATE;
  const publishProvisional = hasFlag("--publish-provisional");

  if (!surveyArg || !laptopsArg) {
    console.error(
      "Penggunaan:\n  npm run import:research -- --survey <path-kuesioner.xlsx> --laptops <path-audit-laptop.xlsx> [--observed-at 2026-11-25] [--publish-provisional]",
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
    observedAt,
  );
  if (!laptopPreview.ok) {
    throw new Error(`Validasi alternatif gagal: ${laptopPreview.errors.join(" | ")}`);
  }
  console.log(`   OK: ${laptopPreview.summary.totalRows} alternatif valid (audit ${observedAt}).`);

  const repo = await resolveCliRepository();
  console.log(`3. Menyimpan dataset ke target penyimpanan (${repo.mode})...`);

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
    console.log(`   Batch respons dengan SHA-256 sama sudah ada (${batch.id}); menggunakan batch tersebut.`);
  }

  const batchDetail = await repo.getResponseBatch(batch.id);
  if (!batchDetail) throw new Error("Gagal membaca ulang batch respons.");

  const dataset = await repo.createAlternativeDataset({
    label: `Snapshot Audit ${observedAt} (${laptopPreview.filename})`,
    sourceFilename: laptopPreview.filename,
    sourceHash: laptopPreview.sha256,
    observedAt,
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
      sources: r.sources,
    })),
  });
  const dsDetail = await repo.getAlternativeDataset(dataset.id);
  if (!dsDetail) throw new Error("Gagal membaca ulang dataset alternatif.");
  console.log(`   Dataset alternatif v${dataset.version} tersimpan: ${dataset.id}`);

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

  const savedAhp17 = await repo.saveAhpRun({
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

  const savedAhp33 = await repo.saveAhpRun({
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
  console.log(`   AHP 17 CR = ${savedAhp17.cr.toFixed(8)} | AHP 33 CR = ${savedAhp33.cr.toFixed(8)}`);

  console.log("5. Menghitung SAW (S1 utama, S2 33 respons, S3 5 alternatif tanpa A6/A7)...");
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
      C6: a.batteryHours,
    },
  });

  const saw1Out = runSaw({
    weights: savedAhp17.weights,
    alternatives: dsDetail.alternatives.map(toMetric),
    scenario: "primary_7_consistent",
    ahpMode: "consistent_only",
  });
  const saw2Out = runSaw({
    weights: savedAhp33.weights,
    alternatives: dsDetail.alternatives.map(toMetric),
    scenario: "sensitivity_7_all",
    ahpMode: "all_eligible",
  });
  const fiveAlts = dsDetail.alternatives.filter((a) => a.code !== "A6" && a.code !== "A7");
  const saw3Out = runSaw({
    weights: savedAhp17.weights,
    alternatives: fiveAlts.map(toMetric),
    scenario: "sensitivity_5_no_a6_a7",
    ahpMode: "consistent_only",
  });

  const persistSaw = async (
    ahpRun: typeof savedAhp17,
    out: typeof saw1Out,
    altsUsed: typeof dsDetail.alternatives,
  ) =>
    repo.saveSawRun({
      run: {
        ahpRunId: ahpRun.id,
        datasetId: dataset.id,
        scenario: out.scenario,
        algorithmVersion: out.algorithmVersion,
        inputSnapshot: {
          ahpMode: ahpRun.mode,
          weights: ahpRun.weights,
          weightsByCode: ahpRun.weightsByCode,
          alternativeIds: altsUsed.map((a) => a.id),
          alternativeCodes: altsUsed.map((a) => a.code),
          observedAt: dataset.observedAt,
          datasetVersion: dataset.version,
        },
        normalizationExtrema: out.extrema,
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

  const savedSaw1 = await persistSaw(savedAhp17, saw1Out, dsDetail.alternatives);
  const savedSaw2 = await persistSaw(savedAhp33, saw2Out, dsDetail.alternatives);
  const savedSaw3 = await persistSaw(savedAhp17, saw3Out, fiveAlts);

  console.log(
    `   S1 Rank 1: ${saw1Out.results[0]?.code} (${saw1Out.results[0]?.score.toFixed(6)})`,
  );
  console.log(
    `   S2 Rank 1: ${saw2Out.results[0]?.code} (${saw2Out.results[0]?.score.toFixed(6)})`,
  );
  console.log(
    `   S3 Rank 1: ${saw3Out.results[0]?.code} (${saw3Out.results[0]?.score.toFixed(6)})`,
  );

  if (publishProvisional) {
    console.log("6. Mempublikasikan snapshot berstatus PROVISIONAL (bukan final)...");
    const d1 = await repo.getSawRunDetail(savedSaw1.id);
    const d2 = await repo.getSawRunDetail(savedSaw2.id);
    const d3 = await repo.getSawRunDetail(savedSaw3.id);
    if (!d1 || !d2 || !d3) throw new Error("Gagal membaca detail SAW untuk publikasi.");

    const caveats =
      "Snapshot penelitian sementara (provisional) berdasarkan 33 respons kuesioner mahasiswa (17 konsisten CR ≤ 0,10) dan 7 penawaran Lenovo pada audit 25 November 2026. Independensi 10 respons tambahan serta konfirmasi stok ritel langsung belum sepenuhnya diverifikasi.";

    const payload = buildSanitizedPublicPayload({
      status: "provisional",
      observedAt: dataset.observedAt,
      publishedAt: new Date().toISOString(),
      caveats,
      responses: batchDetail.responses,
      ahpRun: savedAhp17,
      sawRun: savedSaw1,
      sawResults: d1.results,
      alternatives: dsDetail.alternatives,
      sensitivityAllEligible: { ahpRun: savedAhp33, sawResults: d2.results },
      sensitivityWithoutA6A7: { sawResults: d3.results },
    });

    const pub = await repo.publishSnapshot({
      sawRunId: savedSaw1.id,
      sensitivityRunIds: [savedSaw2.id, savedSaw3.id],
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
