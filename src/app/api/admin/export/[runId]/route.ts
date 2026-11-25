import { NextResponse } from "next/server";
import { apiError, handleRouteError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/session";
import type { SensitivityRankRow } from "@/lib/decision";
import { buildCalculationReportWorkbook } from "@/lib/export/excel";
import { getRepository } from "@/lib/repositories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { runId } = await context.params;

    const repo = await getRepository();
    const detail = await repo.getSawRunDetail(runId);
    if (!detail) {
      return apiError(404, "SAW_RUN_NOT_FOUND", "Perhitungan SAW tidak ditemukan untuk diekspor.");
    }

    // Gather matching sensitivity runs on same dataset if available
    const allSawRuns = await repo.listSawRuns();
    const s2Run = allSawRuns.find(
      (r) => r.datasetId === detail.run.datasetId && r.scenario === "sensitivity_7_all",
    );
    const s3Run = allSawRuns.find(
      (r) => r.datasetId === detail.run.datasetId && r.scenario === "sensitivity_5_no_a6_a7",
    );

    const s2Detail = s2Run ? await repo.getSawRunDetail(s2Run.id) : null;
    const s3Detail = s3Run ? await repo.getSawRunDetail(s3Run.id) : null;

    const s2Map = new Map((s2Detail?.results ?? []).map((r) => [r.alternativeCode, r]));
    const s3Map = new Map((s3Detail?.results ?? []).map((r) => [r.alternativeCode, r]));

    const sensitivityRows: SensitivityRankRow[] = detail.results.map((r) => ({
      code: r.alternativeCode,
      model: r.alternativeModel,
      rankPrimary: r.rank,
      scorePrimary: r.score,
      rankAllEligible: s2Map.get(r.alternativeCode)?.rank ?? null,
      scoreAllEligible: s2Map.get(r.alternativeCode)?.score ?? null,
      rankWithoutA6A7: s3Map.get(r.alternativeCode)?.rank ?? null,
      scoreWithoutA6A7: s3Map.get(r.alternativeCode)?.score ?? null,
    }));

    const pubs = await repo.listPublications();
    const matchedPub = pubs.find((p) => p.sawRunId === detail.run.id);

    const buffer = await buildCalculationReportWorkbook({
      sawRun: detail.run,
      sawResults: detail.results,
      ahpRun: detail.ahpRun,
      dataset: detail.dataset,
      alternatives: detail.alternatives,
      allEligibleAhp: s2Detail?.ahpRun ?? null,
      sensitivityRows,
      publicationStatus: matchedPub
        ? `${matchedPub.status}${matchedPub.isCurrent ? " (aktif)" : ""}`
        : "belum dipublikasikan",
    });

    await repo.writeAuditLog({
      actorId: admin.id,
      action: "calculation_report_exported",
      resourceType: "saw_run",
      resourceId: detail.run.id,
      metadata: { scenario: detail.run.scenario },
    });

    const filename = `LaptopMatch_Laporan_SPK_${detail.run.scenario}_${detail.dataset.observedAt}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
