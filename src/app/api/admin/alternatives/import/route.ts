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
    const allowDuplicate =
      String(formData.get("allowDuplicate") ?? "false").toLowerCase() === "true";
    const observedAt =
      String(formData.get("observedAt") ?? "").trim() || RESEARCH_AUDIT_DATE;
    const label = String(formData.get("label") ?? "").trim();

    if (!(file instanceof File)) {
      return apiError(
        400,
        "MISSING_FILE",
        "Unggah berkas alternatif laptop (.json, .xlsx, atau .csv).",
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = await parseLaptopFile(file.name, buffer, observedAt);
    const repo = await getRepository();
    const existingDatasets = await repo.listAlternativeDatasets();
    const duplicateDataset = existingDatasets.find(
      (d) => d.sourceHash && d.sourceHash === preview.sha256,
    );

    if (!commit) {
      const warnings = duplicateDataset
        ? [
            ...preview.warnings,
            `Berkas dengan SHA-256 yang sama sudah pernah diimpor pada dataset v${duplicateDataset.version} ("${duplicateDataset.label}"). Impor ulang diblokir secara default untuk menjaga idempotensi.`,
          ]
        : preview.warnings;
      return apiSuccess(
        {
          ...preview,
          warnings,
          duplicateDataset: duplicateDataset
            ? {
                id: duplicateDataset.id,
                version: duplicateDataset.version,
                label: duplicateDataset.label,
              }
            : null,
        },
        { committed: false },
        preview.ok ? 200 : 422,
      );
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

    if (duplicateDataset && !allowDuplicate) {
      return apiError(
        409,
        "DUPLICATE_DATASET_HASH",
        `Berkas dengan SHA-256 yang sama sudah tersimpan pada dataset v${duplicateDataset.version} ("${duplicateDataset.label}"). Gunakan dataset tersebut atau gandakan menjadi draft baru.`,
        {
          existingDatasetId: duplicateDataset.id,
          existingVersion: duplicateDataset.version,
        },
      );
    }

    const dataset = await repo.createAlternativeDataset({
      label: label || `Impor ${preview.filename} (${preview.observedAt})`,
      sourceFilename: preview.filename,
      sourceHash: preview.sha256,
      observedAt: preview.observedAt,
      c6Metric: preview.c6Metric,
      c6Unit: preview.c6Unit,
      c6Definition: preview.c6Definition,
      candidateCount: preview.candidateCount,
      excludedCandidates: preview.excludedCandidates,
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
        sourceDateRecorded: r.sourceDateRecorded,
        sourceStatusRecorded: r.sourceStatusRecorded,
        selectionReason: r.selectionReason,
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
        excludedCount: preview.excludedCandidates.length,
        c6Metric: preview.c6Metric,
        observedAt: preview.observedAt,
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
