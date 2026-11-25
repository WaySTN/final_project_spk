import { apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const repo = await getRepository();
    const batches = await repo.listResponseBatches();
    return apiSuccess({ batches });
  } catch (err) {
    return handleRouteError(err);
  }
}
