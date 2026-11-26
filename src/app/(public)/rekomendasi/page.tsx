import Link from "next/link";
import { GitCompare } from "lucide-react";
import {
  NoPublicationState,
  PublicationBanner,
} from "@/components/public/publication-banner";
import { RecommendationExplorer } from "@/components/public/recommendation-explorer";
import { AlertBanner } from "@/components/ui/primitives";
import { formatDateJakarta, formatDecimal } from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function RekomendasiPage() {
  const repo = await getRepository();
  const publication = await repo.getCurrentPublication();
  const payload = publication?.publicPayload ?? null;

  const c6Metric = payload?.c6Metric ?? payload?.saw.c6Metric ?? "battery_wh";

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:py-12 space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#e2e8f0] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="editorial-kicker">
            Pemeringkatan Simple Additive Weighting (SAW)
            {payload ? ` · Audit ${formatDateJakarta(payload.observedAt)}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#1e293b] sm:text-4xl">
            Rekomendasi Laptop Mahasiswa
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
            Diurutkan berdasarkan nilai preferensi SAW presisi penuh menggunakan bobot
            kriteria panel mahasiswa (AHP) pada rentang Rp9.000.000–Rp11.000.000
            {payload
              ? ` (${payload.saw.items.length} alternatif lintas ${payload.researchSummary.brandCount ?? new Set(payload.saw.items.map((i) => i.brand)).size} merek).`
              : "."}
          </p>
        </div>

        {payload && (
          <Link
            href="/bandingkan"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-medium text-[#1e293b] hover:border-[#1e3a5f] hover:bg-[#f8fafc]"
          >
            <GitCompare className="h-4 w-4" aria-hidden="true" />
            Bandingkan Laptop
          </Link>
        )}
      </div>

      {!payload ? (
        <NoPublicationState />
      ) : (
        <>
          <PublicationBanner payload={payload} />

          {payload.saw.topMargin !== null && payload.saw.topMargin < 0.01 && (
            <AlertBanner tone="neutral" title="Catatan Sensitivitas Peringkat Teratas">
              Peringkat #1 (<strong>{payload.saw.items[0]?.code}</strong> —{" "}
              {payload.saw.items[0]?.brand}) dan #2 (
              <strong>{payload.saw.items[1]?.code}</strong> —{" "}
              {payload.saw.items[1]?.brand}) terpaut{" "}
              <strong className="font-mono tabular-nums">
                {formatDecimal(payload.saw.topMargin, 6)}
              </strong>
              .{" "}
              {payload.weightSensitivity && (
                <>
                  Pada uji sensitivitas {payload.weightSensitivity.perturbedScenarioCount}{" "}
                  skenario bobot, <strong>{payload.weightSensitivity.baselineWinnerCode}</strong>{" "}
                  bertahan di #1 pada{" "}
                  <strong>
                    {payload.weightSensitivity.baselineWinnerWinsCount}/
                    {payload.weightSensitivity.perturbedScenarioCount}
                  </strong>{" "}
                  skenario.{" "}
                </>
              )}
              Tinjau kontribusi kriteria di bawah atau simulasi lengkap pada{" "}
              <Link
                href="/metodologi#sensitivitas"
                className="font-semibold text-[#1e3a5f] underline"
              >
                Analisis Sensitivitas
              </Link>
              .
            </AlertBanner>
          )}

          <RecommendationExplorer
            items={payload.saw.items}
            c6Metric={c6Metric}
            weightSensitivity={payload.weightSensitivity ?? null}
          />
        </>
      )}
    </div>
  );
}
