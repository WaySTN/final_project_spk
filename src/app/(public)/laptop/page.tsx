import { CatalogExplorer } from "@/components/public/catalog-explorer";
import {
  NoPublicationState,
  PublicationBanner,
} from "@/components/public/publication-banner";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function KatalogLaptopPage() {
  const repo = await getRepository();
  const publication = await repo.getCurrentPublication();
  const payload = publication?.publicPayload ?? null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:py-12 space-y-6">
      <div className="border-b border-[#e2e8f0] pb-6 space-y-1.5">
        <p className="editorial-kicker">Katalog Alternatif Penelitian</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#1e293b] sm:text-4xl">
          Daftar Alternatif Laptop
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#475569]">
          Lembar spesifikasi seluruh konfigurasi SKU yang dinilai pada snapshot aktif —
          tanpa gambar ilustrasi buatan maupun tebakan stok.
        </p>
      </div>

      {!payload ? (
        <NoPublicationState />
      ) : (
        <>
          <PublicationBanner payload={payload} />
          <CatalogExplorer
            items={payload.saw.items}
            c6Metric={payload.c6Metric ?? payload.saw.c6Metric ?? "battery_wh"}
          />
        </>
      )}
    </div>
  );
}
