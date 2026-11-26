import { z } from "zod";
import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import { runSaw, runWeightSensitivitySuite } from "@/lib/decision";
import { isSafeHttpUrl } from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSawRunSchema = z.object({
  ahpRunId: z.string().uuid("ID perhitungan AHP tidak valid."),
  datasetId: z.string().uuid("ID dataset alternatif tidak valid."),
  alternativeIds: z.array(z.string().uuid()).optional(),
  excludeCodes: z.array(z.string()).optional(),
  scenario: z
    .enum([
      "primary_33_consistent",
      "sensitivity_33_all",
      "primary_7_consistent",
      "sensitivity_7_all",
      "sensitivity_5_no_a6_a7",
      "custom",
    ])
    .optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const repo = await getRepository();
    const runs = await repo.listSawRuns();
    return apiSuccess({ runs });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const body = createSawRunSchema.parse(await request.json());
    const repo = await getRepository();

    const [ahpDetail, dsDetail] = await Promise.all([
      repo.getAhpRunDetail(body.ahpRunId),
      repo.getAlternativeDataset(body.datasetId),
    ]);

    if (!ahpDetail) {
      return apiError(404, "AHP_RUN_NOT_FOUND", "Perhitungan AHP tidak ditemukan.");
    }
    if (!dsDetail) {
      return apiError(404, "DATASET_NOT_FOUND", "Dataset alternatif laptop tidak ditemukan.");
    }

    const c6Metric = dsDetail.dataset.c6Metric ?? "battery_hours";
    const resolvedScenario =
      body.scenario ??
      (c6Metric === "battery_wh"
        ? ahpDetail.run.mode === "all_eligible"
          ? "sensitivity_33_all"
          : "primary_33_consistent"
        : ahpDetail.run.mode === "all_eligible"
          ? "sensitivity_7_all"
          : "primary_7_consistent");

    if (
      !ahpDetail.run.passesCr &&
      (resolvedScenario === "primary_33_consistent" ||
        resolvedScenario === "primary_7_consistent")
    ) {
      return apiError(
        422,
        "AHP_NOT_CONSISTENT",
        "Perhitungan SAW skenario utama diblokir karena matriks gabungan AHP memiliki CR > 0,10.",
      );
    }

    let selected = dsDetail.alternatives.filter((a) => a.active);

    if (body.alternativeIds && body.alternativeIds.length > 0) {
      const allowedSet = new Set(body.alternativeIds);
      selected = selected.filter((a) => allowedSet.has(a.id));
    }

    if (resolvedScenario === "sensitivity_5_no_a6_a7") {
      selected = selected.filter((a) => a.code !== "A6" && a.code !== "A7");
    } else if (body.excludeCodes && body.excludeCodes.length > 0) {
      const excluded = new Set(body.excludeCodes.map((c) => c.toUpperCase()));
      selected = selected.filter((a) => !excluded.has(a.code.toUpperCase()));
    }

    if (selected.length === 0) {
      return apiError(
        422,
        "NO_ELIGIBLE_ALTERNATIVES",
        "Tidak ada alternatif aktif yang memenuhi syarat untuk dihitung pada skenario ini.",
      );
    }

    // Validate all 4 sources and version-appropriate C6 metric exist for every selected alternative
    for (const alt of selected) {
      const validTypes = new Set(
        alt.sources.filter((s) => isSafeHttpUrl(s.url)).map((s) => s.sourceType),
      );
      if (
        !validTypes.has("price") ||
        !validTypes.has("spec") ||
        !validTypes.has("benchmark") ||
        !validTypes.has("battery")
      ) {
        return apiError(
          422,
          "INCOMPLETE_SOURCES",
          `Alternatif ${alt.code} belum memiliki keempat sumber bukti yang valid (harga, spesifikasi, benchmark, baterai).`,
        );
      }

      const c6Value = c6Metric === "battery_wh" ? alt.batteryWh : alt.batteryHours;
      if (c6Value === null || !Number.isFinite(c6Value) || c6Value <= 0) {
        return apiError(
          422,
          "MISSING_C6_VALUE",
          `Alternatif ${alt.code} belum memiliki nilai kriteria C6 (${c6Metric === "battery_wh" ? "kapasitas baterai Wh" : "durasi baterai jam"}) yang valid.`,
        );
      }
    }

    // Compute deterministically on server using persisted AHP weights (never client weights)
    const sawOutput = runSaw({
      weights: ahpDetail.run.weights,
      alternatives: selected.map((alt) => ({
        id: alt.id,
        code: alt.code,
        model: alt.model,
        sku: alt.sku,
        criteria: {
          C1: alt.priceIdr,
          C2: alt.cpuMark,
          C3: alt.ramGb,
          C4: alt.ssdGb,
          C5: alt.weightKg,
          C6: (c6Metric === "battery_wh" ? alt.batteryWh : alt.batteryHours)!,
        },
      })),
      scenario: resolvedScenario,
      c6Metric,
      ahpMode: ahpDetail.run.mode,
    });

    const weightSensitivity = runWeightSensitivitySuite({
      baseWeights: ahpDetail.run.weights,
      baselineItems: sawOutput.results.map((r) => ({
        code: r.code,
        model: r.model,
        normalizedValues: r.normalizedValues,
        weightedValues: r.weightedValues,
        criteriaValues: r.criteriaValues,
        score: r.score,
        rank: r.rank,
      })),
    });

    const savedRun = await repo.saveSawRun({
      run: {
        ahpRunId: ahpDetail.run.id,
        datasetId: dsDetail.dataset.id,
        scenario: sawOutput.scenario,
        c6Metric: sawOutput.c6Metric,
        c6Unit: sawOutput.c6Metric === "battery_hours" ? "jam" : "Wh",
        algorithmVersion: sawOutput.algorithmVersion,
        inputSnapshot: {
          ahpMode: ahpDetail.run.mode,
          weights: ahpDetail.run.weights,
          weightsByCode: ahpDetail.run.weightsByCode,
          alternativeIds: selected.map((a) => a.id),
          alternativeCodes: selected.map((a) => a.code),
          observedAt: dsDetail.dataset.observedAt,
          datasetVersion: dsDetail.dataset.version,
          c6Metric: sawOutput.c6Metric,
          c6Unit: sawOutput.c6Metric === "battery_hours" ? "jam" : "Wh",
        },
        normalizationExtrema: sawOutput.extrema,
        weightSensitivity,
        topMargin: sawOutput.topMargin,
        warnings: sawOutput.warnings,
        caveats: sawOutput.caveats,
        createdBy: admin.id,
        status: "completed",
      },
      results: sawOutput.results.map((r) => ({
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

    await repo.writeAuditLog({
      actorId: admin.id,
      action: "saw_run_computed",
      resourceType: "saw_run",
      resourceId: savedRun.id,
      metadata: {
        ahpRunId: savedRun.ahpRunId,
        datasetId: savedRun.datasetId,
        scenario: savedRun.scenario,
        c6Metric: savedRun.c6Metric,
        alternativeCount: sawOutput.results.length,
        winnerCode: sawOutput.results[0]?.code ?? null,
        winnerScore: sawOutput.results[0]?.score ?? null,
        sensitivityStabilityPct: weightSensitivity.baselineWinnerStabilityPct,
      },
    });

    return apiSuccess(
      {
        run: savedRun,
        results: sawOutput.results,
        weightSensitivity,
      },
      {},
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
