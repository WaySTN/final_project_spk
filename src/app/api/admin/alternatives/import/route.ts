import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import { RESEARCH_AUDIT_DATE } from "@/lib/decision";
import { parseLaptopFile } from "@/lib/import";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const commit = String(formData.get("commit") ?? "false").toLowerCase() === "true";
    const observedAt =
      String(formData.get("observedAt") ?? "").trim() || RESEARCH_AUDIT_DATE;
    const label = String(formData.get("label") ?? "").trim();

    if (!(file instanceof File)) {
      return apiError(400, "MISSING_FILE", "Unggah berkas alternatif laptop (.xlsx atau .csv).");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await parseLaptopFile(file.name, buffer, observedAt);

    if (!commit) {
      return apiSuccess(preview, { committed: false }, preview.ok ? 200 : 422);
    }

    if (!preview.ok) {
      return apiError(
        422,
        "INVALID_ALTERNATIVES_FILE",
        preview.errors[0] ?? "Terdapat baris alternatif yang tidak valid. Periksa preview sebelum menyimpan.",
        {
          errors: preview.errors,
          rows: preview.rows,
        },
      );
    }

    const repo = await getRepository();
    const dataset = await repo.createAlternativeDataset({
      label: label || `Impor ${preview.filename} (${observedAt})`,
      sourceFilename: preview.filename,
      sourceHash: preview.sha256,
      observedAt,
      createdBy: admin.id,
      notes: preview.warnings.join(" "),
      alternatives: preview.rows.map((r) => ({
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

    await repo.writeAuditLog({
      actorId: admin.id,
      action: "alternative_dataset_imported",
      resourceType: "alternative_dataset",
      resourceId: dataset.id,
      metadata: {
        version: dataset.version,
        filename: preview.filename,
        rowCount: preview.rows.length,
        observedAt,
      },
    });

    return apiSuccess(
      { dataset, summary: preview.summary, warnings: preview.warnings },
      { committed: true },
      201,
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
