import { CompareWorkbench } from "@/components/public/compare-workbench";
import {
  NoPublicationState,
  PublicationBanner,
} from "@/components/public/publication-banner";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function BandingkanPage({
  searchParams,
}: {
  searchParams: Promise<{ codes?: string }>;
}) {
  const sp = await searchParams;
  const initialCodes = (sp.codes ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);

  const repo = await getRepository();
  const publication = await repo.getCurrentPublication();
  const payload = publication?.publicPayload ?? null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:py-12 space-y-6">
      <div className="border-b border-[#e2e8f0] pb-6 space-y-1.5">
        <p className="editorial-kicker">Perbandingan Spesifikasi & Kontribusi</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#1e293b] sm:text-4xl">
          Bandingkan Alternatif Laptop
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
          Evaluasi hingga tiga konfigurasi secara berdampingan lengkap dengan kontribusi
          masing-masing kriteria SAW dan tautan bukti sumbernya.
        </p>
      </div>

      {!payload ? (
        <NoPublicationState />
      ) : (
        <>
          <PublicationBanner payload={payload} />
          <CompareWorkbench
            items={payload.saw.items}
            initialCodes={initialCodes}
            c6Metric={payload.c6Metric ?? payload.saw.c6Metric ?? "battery_wh"}
          />
        </>
      )}
    </div>
  );
}
