import { RiwayatWorkbench } from "@/components/admin/riwayat-workbench";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminRiwayatPage() {
  const repo = await getRepository();
  const [sawRuns, publications] = await Promise.all([
    repo.listSawRuns(),
    repo.listPublications(),
  ]);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e5e5e0] pb-5">
        <p className="editorial-kicker">Versioning &amp; Kontrol Publikasi</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#111113]">
          Riwayat Perhitungan &amp; Publikasi Snapshot
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#787872]">
          Kelola versi perhitungan immutable dan kendalikan snapshot yang ditampilkan kepada
          mahasiswa dengan gerbang validasi provisional maupun final.
        </p>
      </div>

      <RiwayatWorkbench
        initialSawRuns={sawRuns}
        initialPublications={publications}
      />
    </div>
  );
}
