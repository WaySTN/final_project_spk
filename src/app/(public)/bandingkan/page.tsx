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
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Perbandingan Spesifikasi & Kontribusi
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Bandingkan Alternatif Laptop
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Bandingkan hingga tiga konfigurasi laptop secara berdampingan beserta kontribusi
          kriteria SAW dan sumber datanya.
        </p>
      </div>

      {!payload ? (
        <NoPublicationState />
      ) : (
        <>
          <PublicationBanner payload={payload} />
          <CompareWorkbench items={payload.saw.items} initialCodes={initialCodes} />
        </>
      )}
    </div>
  );
}
