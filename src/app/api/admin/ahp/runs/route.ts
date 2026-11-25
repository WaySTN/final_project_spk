import { z } from "zod";
import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import { runAhpGroup } from "@/lib/decision";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createAhpRunSchema = z.object({
  batchId: z.string().uuid("ID batch responden tidak valid."),
  mode: z.enum(["consistent_only", "all_eligible"]).default("consistent_only"),
});

export async function GET() {
  try {
    await requireAdmin();
    const repo = await getRepository();
    const runs = await repo.listAhpRuns();
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

    const body = createAhpRunSchema.parse(await request.json());
    const repo = await getRepository();
    const batchData = await repo.getResponseBatch(body.batchId);

    if (!batchData) {
      return apiError(404, "BATCH_NOT_FOUND", "Batch responden tidak ditemukan.");
    }

    const ahpResult = runAhpGroup(
      batchData.responses.map((r) => ({
        id: r.id,
        code: r.code,
        eligible: r.validationStatus === "eligible" && r.parsedAnswers.length === 15,
        ineligibleReason: r.validationErrors.join("; ") || null,
        values: r.parsedAnswers.map((a) => a.numericValue),
      })),
      body.mode,
    );

    const savedRun = await repo.saveAhpRun({
      run: {
        batchId: body.batchId,
        mode: ahpResult.mode,
        algorithmVersion: ahpResult.algorithmVersion,
        includedIds: ahpResult.includedIds,
        excludedIds: ahpResult.excludedIds,
        aggregateMatrix: ahpResult.aggregateMatrix,
        weights: ahpResult.weights,
        weightsByCode: ahpResult.weightsByCode,
        lambdaMax: ahpResult.lambdaMax,
        ci: ahpResult.ci,
        ri: ahpResult.ri,
        cr: ahpResult.cr,
        passesCr: ahpResult.passesCr,
        iterations: ahpResult.iterations,
        targetCount: ahpResult.targetConsistentCount,
        warnings: ahpResult.warnings,
        createdBy: admin.id,
        status: "completed",
      },
      individualResults: ahpResult.individualResults.map((ir) => ({
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

    await repo.writeAuditLog({
      actorId: admin.id,
      action: "ahp_run_computed",
      resourceType: "ahp_run",
      resourceId: savedRun.id,
      metadata: {
        batchId: body.batchId,
        mode: savedRun.mode,
        includedCount: savedRun.includedIds.length,
        cr: savedRun.cr,
        passesCr: savedRun.passesCr,
      },
    });

    return apiSuccess(
      {
        run: savedRun,
        summary: {
          totalCount: ahpResult.totalCount,
          eligibleCount: ahpResult.eligibleCount,
          consistentCount: ahpResult.consistentCount,
          inconsistentCount: ahpResult.inconsistentCount,
        },
      },
      {},
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
