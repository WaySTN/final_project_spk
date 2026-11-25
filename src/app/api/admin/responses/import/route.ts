import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { checkRateLimit, getClientKey } from "@/lib/auth/rate-limit";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import { parseSurveyFile } from "@/lib/import";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const rate = checkRateLimit(getClientKey(request, "survey_import"), 20, 60_000);
    if (!rate.allowed) {
      return apiError(429, "RATE_LIMITED", "Terlalu banyak permintaan impor. Coba sesaat lagi.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const expectedHash = String(formData.get("expectedHash") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim().slice(0, 1000);

    if (!(file instanceof File)) {
      return apiError(400, "MISSING_FILE", "Berkas kuesioner wajib diunggah.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await parseSurveyFile(file.name, buffer);

    if (expectedHash && preview.sha256 !== expectedHash) {
      return apiError(
        409,
        "HASH_MISMATCH",
        "Hash berkas berubah antara tahap preview dan commit. Lakukan preview ulang sebelum menyimpan.",
      );
    }

    if (!preview.ok) {
      return apiError(
        422,
        "INVALID_SURVEY_FILE",
        preview.errors[0] ?? "Berkas kuesioner tidak lolos validasi.",
        {
          errors: preview.errors,
          headerMapping: preview.headerMapping,
        },
      );
    }

    const repo = await getRepository();
    const existingBatches = await repo.listResponseBatches();
    const activeParent = existingBatches.find((b) => b.status === "active")?.id ?? null;

    const batch = await repo.createResponseBatch({
      filename: preview.filename,
      sheetName: preview.sheetName,
      sha256: preview.sha256,
      importedBy: admin.id,
      parentBatchId: activeParent,
      notes,
      rows: preview.rows,
    });

    await repo.writeAuditLog({
      actorId: admin.id,
      action: "survey_batch_imported",
      resourceType: "response_batch",
      resourceId: batch.id,
      metadata: {
        filename: batch.filename,
        sha256: batch.sha256,
        rowCount: batch.rowCount,
        eligibleCount: batch.eligibleCount,
        consistentPreviewCount: preview.summary.consistentPreviewCount,
      },
    });

    return apiSuccess(
      {
        batch,
        summary: preview.summary,
        warnings: preview.warnings,
      },
      {},
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
