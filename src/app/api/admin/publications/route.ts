import { z } from "zod";
import { apiError, apiSuccess, handleRouteError } from "@/lib/api/response";
import { requireAdmin, verifyWriteOrigin } from "@/lib/auth/session";
import {
  buildSanitizedPublicPayload,
  validatePublicationGates,
} from "@/lib/publication/sanitize";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publishSchema = z.object({
  sawRunId: z.string().uuid("ID perhitungan SAW utama tidak valid."),
  sensitivityRunIds: z.array(z.string().uuid()).optional().default([]),
  intendedStatus: z.enum(["provisional", "final"]),
  caveats: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .default(
      "Snapshot penelitian terbatas pada 7 konfigurasi Lenovo pada rentang Rp9.000.000–Rp11.000.000 berdasarkan data audit 25 November 2026. Independensi respons tambahan dan konfirmasi stok ritel langsung belum seluruhnya diverifikasi.",
    ),
  qualityReview: z
    .object({
      primaryRuleVerified: z.boolean().default(false),
      sourcesAndSkuReviewed: z.boolean().default(false),
      responseIndependenceConfirmed: z.boolean().default(false),
      stockOrArchivalScopeRecorded: z.boolean().default(false),
      caveatsAcknowledged: z.boolean().default(false),
      methodologyExceptionNote: z.string().trim().max(1000).optional(),
    })
    .default({
      primaryRuleVerified: false,
      sourcesAndSkuReviewed: false,
      responseIndependenceConfirmed: false,
      stockOrArchivalScopeRecorded: false,
      caveatsAcknowledged: false,
    }),
});

export async function GET() {
  try {
    await requireAdmin();
    const repo = await getRepository();
    const publications = await repo.listPublications();
    return apiSuccess({ publications });
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

    const body = publishSchema.parse(await request.json());
    const repo = await getRepository();

    const sawDetail = await repo.getSawRunDetail(body.sawRunId);
    if (!sawDetail) {
      return apiError(404, "SAW_RUN_NOT_FOUND", "Perhitungan SAW utama tidak ditemukan.");
    }

    const batchDetail = await repo.getResponseBatch(sawDetail.ahpRun.batchId);
    if (!batchDetail) {
      return apiError(404, "BATCH_NOT_FOUND", "Batch responden terkait tidak ditemukan.");
    }

    const includedAltIdSet = new Set(sawDetail.results.map((r) => r.alternativeId));
    const alternativesInRun = sawDetail.alternatives.filter((a) =>
      includedAltIdSet.has(a.id),
    );

    const gate = validatePublicationGates({
      intendedStatus: body.intendedStatus,
      ahpRun: sawDetail.ahpRun,
      sawRun: sawDetail.run,
      alternativesInRun,
      qualityReview: body.qualityReview,
    });

    if (!gate.allowed) {
      return apiError(
        422,
        "PUBLICATION_GATE_BLOCKED",
        "Publikasi ditolak karena syarat validasi belum terpenuhi.",
        { unmetRequirements: gate.unmetRequirements },
      );
    }

    // Resolve optional sensitivity runs (or auto-match latest S2/S3 on same dataset/batch)
    let sensitivityAllEligible: {
      ahpRun: typeof sawDetail.ahpRun;
      sawResults: typeof sawDetail.results;
    } | null = null;
    let sensitivityWithoutA6A7: {
      sawResults: typeof sawDetail.results;
    } | null = null;

    const sensIds = [...body.sensitivityRunIds];
    if (sensIds.length === 0) {
      const allRuns = await repo.listSawRuns();
      const s2 = allRuns.find(
        (r) => r.datasetId === sawDetail.run.datasetId && r.scenario === "sensitivity_7_all",
      );
      const s3 = allRuns.find(
        (r) => r.datasetId === sawDetail.run.datasetId && r.scenario === "sensitivity_5_no_a6_a7",
      );
      if (s2) sensIds.push(s2.id);
      if (s3) sensIds.push(s3.id);
    }

    for (const sId of sensIds) {
      const d = await repo.getSawRunDetail(sId);
      if (!d) continue;
      if (d.run.scenario === "sensitivity_7_all") {
        sensitivityAllEligible = { ahpRun: d.ahpRun, sawResults: d.results };
      } else if (d.run.scenario === "sensitivity_5_no_a6_a7") {
        sensitivityWithoutA6A7 = { sawResults: d.results };
      }
    }

    const publishedAt = new Date().toISOString();
    const publicPayload = buildSanitizedPublicPayload({
      status: body.intendedStatus,
      observedAt: sawDetail.dataset.observedAt,
      publishedAt,
      caveats: body.caveats,
      responses: batchDetail.responses,
      ahpRun: sawDetail.ahpRun,
      sawRun: sawDetail.run,
      sawResults: sawDetail.results,
      alternatives: alternativesInRun,
      sensitivityAllEligible,
      sensitivityWithoutA6A7,
    });

    const publication = await repo.publishSnapshot({
      sawRunId: sawDetail.run.id,
      sensitivityRunIds: sensIds,
      publicPayload,
      status: body.intendedStatus,
      reviewedBy: admin.id,
      caveats: body.caveats,
      qualityReview: body.qualityReview,
    });

    await repo.writeAuditLog({
      actorId: admin.id,
      action: "snapshot_published",
      resourceType: "publication",
      resourceId: publication.id,
      metadata: {
        sawRunId: publication.sawRunId,
        status: publication.status,
        alternativeCount: publicPayload.saw.items.length,
      },
    });

    return apiSuccess({ publication }, {}, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
