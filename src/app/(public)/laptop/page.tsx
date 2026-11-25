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
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Katalog Alternatif Penelitian
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Daftar Alternatif Laptop
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Seluruh konfigurasi laptop yang dinilai dalam snapshot aktif beserta spesifikasi
          enam kriteria. Tidak menampilkan gambar produk buatan/tebakan tanpa sumber resmi.
        </p>
      </div>

      {!payload ? (
        <NoPublicationState />
      ) : (
        <>
          <PublicationBanner payload={payload} />
          <CatalogExplorer items={payload.saw.items} />
        </>
      )}
    </div>
  );
}
