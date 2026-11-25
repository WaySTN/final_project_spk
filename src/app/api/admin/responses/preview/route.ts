import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import { parseSurveyFile } from "@/lib/import";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return apiError(400, "MISSING_FILE", "Unggah berkas .xlsx atau .csv pada field 'file'.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await parseSurveyFile(file.name, buffer);

    const repo = await getRepository();
    const existingBatches = await repo.listResponseBatches();
    const duplicateBatch = existingBatches.find((b) => b.sha256 === preview.sha256) ?? null;

    return apiSuccess(
      {
        ...preview,
        duplicateBatch: duplicateBatch
          ? {
              id: duplicateBatch.id,
              filename: duplicateBatch.filename,
              importedAt: duplicateBatch.importedAt,
            }
          : null,
      },
      { canCommit: preview.ok && !duplicateBatch },
      preview.ok ? 200 : 422,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
