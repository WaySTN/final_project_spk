import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { evaluateIndividualAhp } from "@/lib/decision";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ batchId: string }> },
) {
  try {
    await requireAdmin();
    const { batchId } = await context.params;
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status")?.trim() || "all";

    const repo = await getRepository();
    const detail = await repo.getResponseBatch(batchId);
    if (!detail) {
      return apiError(404, "BATCH_NOT_FOUND", "Batch responden tidak ditemukan.");
    }

    const enriched = detail.responses.map((resp) => {
      const numericValues = resp.parsedAnswers.map((a) => a.numericValue);
      const evalResult =
        resp.validationStatus === "eligible" && numericValues.length === 15
          ? evaluateIndividualAhp({
              id: resp.id,
              code: resp.code,
              eligible: true,
              values: numericValues,
            })
          : null;

      return {
        ...resp,
        cr: evalResult?.cr ?? null,
        lambdaMax: evalResult?.lambdaMax ?? null,
        ci: evalResult?.ci ?? null,
        passesCr: evalResult?.passesCr ?? false,
        individualMatrix: evalResult?.matrix ?? null,
        individualWeights: evalResult?.weights ?? null,
        ahpReason: evalResult?.reason ?? resp.validationErrors.join("; "),
      };
    });

    const filtered = enriched.filter((row) => {
      if (statusFilter === "consistent") return row.validationStatus === "eligible" && row.passesCr;
      if (statusFilter === "inconsistent") return row.validationStatus === "eligible" && !row.passesCr;
      if (statusFilter === "flagged") return row.auditFlags.length > 0;
      return true;
    });

    return apiSuccess(
      {
        batch: detail.batch,
        responses: filtered,
      },
      {
        total: enriched.length,
        filteredCount: filtered.length,
        consistentCount: enriched.filter((r) => r.validationStatus === "eligible" && r.passesCr).length,
        inconsistentCount: enriched.filter((r) => r.validationStatus === "eligible" && !r.passesCr).length,
      },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
