import { z } from "zod";
import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import {
  WeightSensitivityError,
  runWeightSensitivityScenario,
  runWeightSensitivitySuite,
} from "@/lib/decision";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const simulateSchema = z.object({
  sawRunId: z.string().uuid("ID perhitungan SAW tidak valid."),
  criterion: z.enum(["C1", "C2", "C3", "C4", "C5", "C6"]).nullable(),
  relativeDelta: z
    .number()
    .min(-0.5, "Perubahan bobot minimum adalah -50%.")
    .max(0.5, "Perubahan bobot maksimum adalah +50%."),
});

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const sawRunId = url.searchParams.get("sawRunId")?.trim();

    const repo = await getRepository();
    const runs = await repo.listSawRuns();
    const targetId = sawRunId || runs[0]?.id || null;
    const detail = targetId ? await repo.getSawRunDetail(targetId) : null;

    if (!detail) {
      return apiSuccess({
        runs,
        selectedRun: null,
        weightSensitivity: null,
      });
    }

    const suite =
      detail.run.weightSensitivity ??
      runWeightSensitivitySuite({
        baseWeights: detail.ahpRun.weights,
        baselineItems: detail.results.map((r) => ({
          code: r.alternativeCode,
          model: r.alternativeModel,
          normalizedValues: r.normalizedValues,
          weightedValues: r.weightedValues,
          criteriaValues: r.criteriaValues,
          score: r.score,
          rank: r.rank,
        })),
      });

    return apiSuccess({
      runs,
      selectedRun: detail.run,
      dataset: detail.dataset,
      ahpRun: detail.ahpRun,
      weightSensitivity: suite,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * Simulates a single One-At-A-Time weight perturbation on a persisted SAW run.
 * Pure read-only simulation: NEVER modifies persisted AHP weights, SAW runs, or active publications.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const body = simulateSchema.parse(await request.json());
    const repo = await getRepository();
    const detail = await repo.getSawRunDetail(body.sawRunId);

    if (!detail) {
      return apiError(404, "SAW_RUN_NOT_FOUND", "Perhitungan SAW tidak ditemukan.");
    }

    try {
      const scenario = runWeightSensitivityScenario({
        baseWeights: detail.ahpRun.weights,
        baselineItems: detail.results.map((r) => ({
          code: r.alternativeCode,
          model: r.alternativeModel,
          normalizedValues: r.normalizedValues,
          weightedValues: r.weightedValues,
          criteriaValues: r.criteriaValues,
          score: r.score,
          rank: r.rank,
        })),
        targetCriterion: body.criterion,
        relativeDelta: body.relativeDelta,
      });

      return apiSuccess({
        sawRunId: detail.run.id,
        persistedStateMutated: false,
        scenario,
      });
    } catch (err) {
      if (err instanceof WeightSensitivityError) {
        return apiError(422, err.code, err.message);
      }
      throw err;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
