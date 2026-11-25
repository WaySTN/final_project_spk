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

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:py-12 space-y-6">
      <div className="flex flex-col gap-4 border-b border-[#e5e5e0] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="editorial-kicker">
            Pemeringkatan Simple Additive Weighting (SAW)
            {payload ? ` · Audit ${formatDateJakarta(payload.observedAt)}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#111113] sm:text-4xl">
            Rekomendasi Laptop Mahasiswa
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#52524e]">
            Diurutkan berdasarkan nilai preferensi SAW presisi penuh menggunakan bobot
            kriteria panel mahasiswa (AHP) pada rentang Rp9.000.000–Rp11.000.000.
          </p>
        </div>

        {payload && (
          <Link
            href="/bandingkan"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#d0d0c8] bg-white px-4 text-sm font-medium text-[#111113] hover:border-[#111113] hover:bg-[#f7f7f5]"
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

          {payload.saw.topMargin !== null && payload.saw.topMargin < 0.001 && (
            <AlertBanner tone="neutral" title="Catatan Sensitivitas Peringkat Teratas">
              Peringkat #1 (<strong>{payload.saw.items[0]?.code}</strong>) dan #2 (
              <strong>{payload.saw.items[1]?.code}</strong>) hanya terpaut{" "}
              <strong className="font-mono tabular-nums">
                {formatDecimal(payload.saw.topMargin, 6)}
              </strong>
              . Jangan mengartikan peringkat pertama unggul jauh secara mutlak; periksa
              kontribusi kriteria dan status stok pada halaman detail.
            </AlertBanner>
          )}

          <RecommendationExplorer items={payload.saw.items} />
        </>
      )}
    </div>
  );
}
