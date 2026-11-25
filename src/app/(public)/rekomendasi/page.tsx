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
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Pemeringkatan Simple Additive Weighting (SAW)
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Rekomendasi Laptop Mahasiswa
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Kisaran harga Rp9.000.000–Rp11.000.000 menggunakan bobot preferensi panel
            mahasiswa hasil AHP
            {payload ? ` · Audit ${formatDateJakarta(payload.observedAt)}` : ""}.
          </p>
        </div>

        {payload && (
          <Link
            href="/bandingkan"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
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
              Peringkat #1 ({payload.saw.items[0]?.code}) dan #2 (
              {payload.saw.items[1]?.code}) hanya terpaut{" "}
              <strong className="tabular-nums">
                {formatDecimal(payload.saw.topMargin, 6)}
              </strong>
              . Jangan mengartikan peringkat pertama jauh lebih unggul secara mutlak;
              periksa detail kontribusi kriteria dan status stok sebelum mengambil keputusan.
            </AlertBanner>
          )}

          <RecommendationExplorer items={payload.saw.items} />
        </>
      )}
    </div>
  );
}
