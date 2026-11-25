import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const repo = await getRepository();
    const detail = await repo.getAhpRunDetail(id);

    if (!detail) {
      return apiError(404, "AHP_RUN_NOT_FOUND", "Hasil perhitungan AHP tidak ditemukan.");
    }

    return apiSuccess(detail);
  } catch (err) {
    return handleRouteError(err);
  }
}
