import { z } from "zod";
import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import { alternativeDraftSchema } from "@/lib/import/validation";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createOrUpdateSchema = alternativeDraftSchema.extend({
  id: z.string().uuid().optional(),
  datasetId: z.string().uuid("ID dataset tidak valid."),
});

const patchActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("duplicate"),
    sourceDatasetId: z.string().uuid(),
    label: z.string().trim().max(160).optional(),
  }),
  z.object({
    action: z.literal("toggle_active"),
    alternativeId: z.string().uuid(),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("update_alternative"),
    payload: createOrUpdateSchema.extend({ id: z.string().uuid() }),
  }),
]);

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const datasetId = url.searchParams.get("datasetId")?.trim();

    const repo = await getRepository();
    const datasets = await repo.listAlternativeDatasets();
    const targetId = datasetId || datasets[0]?.id || null;
    const selected = targetId ? await repo.getAlternativeDataset(targetId) : null;

    return apiSuccess({
      datasets,
      selectedDataset: selected?.dataset ?? null,
      alternatives: selected?.alternatives ?? [],
    });
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

    const body = createOrUpdateSchema.parse(await request.json());
    const repo = await getRepository();
    const saved = await repo.upsertDraftAlternative({
      ...body,
      batteryWh: body.batteryWh ?? null,
    });

    await repo.writeAuditLog({
      actorId: admin.id,
      action: body.id ? "alternative_updated" : "alternative_created",
      resourceType: "alternative",
      resourceId: saved.id,
      metadata: {
        datasetId: saved.datasetId,
        code: saved.code,
        priceIdr: saved.priceIdr,
      },
    });

    return apiSuccess({ alternative: saved }, {}, body.id ? 200 : 201);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!verifyWriteOrigin(request)) {
      return apiError(403, "INVALID_ORIGIN", "Permintaan lintas origin tidak diizinkan.");
    }

    const parsed = patchActionSchema.parse(await request.json());
    const repo = await getRepository();

    if (parsed.action === "duplicate") {
      const created = await repo.duplicateDatasetToDraft(
        parsed.sourceDatasetId,
        admin.id,
        parsed.label,
      );
      await repo.writeAuditLog({
        actorId: admin.id,
        action: "alternative_dataset_duplicated",
        resourceType: "alternative_dataset",
        resourceId: created.id,
        metadata: {
          sourceDatasetId: parsed.sourceDatasetId,
          version: created.version,
        },
      });
      return apiSuccess({ dataset: created }, {}, 201);
    }

    if (parsed.action === "toggle_active") {
      const updated = await repo.toggleAlternativeActive(
        parsed.alternativeId,
        parsed.active,
      );
      await repo.writeAuditLog({
        actorId: admin.id,
        action: "alternative_active_toggled",
        resourceType: "alternative",
        resourceId: updated.id,
        metadata: { code: updated.code, active: updated.active },
      });
      return apiSuccess({ alternative: updated });
    }

    const saved = await repo.upsertDraftAlternative({
      ...parsed.payload,
      batteryWh: parsed.payload.batteryWh ?? null,
    });

    await repo.writeAuditLog({
      actorId: admin.id,
      action: "alternative_updated",
      resourceType: "alternative",
      resourceId: saved.id,
      metadata: {
        datasetId: saved.datasetId,
        code: saved.code,
        priceIdr: saved.priceIdr,
      },
    });

    return apiSuccess({ alternative: saved });
  } catch (err) {
    return handleRouteError(err);
  }
}
