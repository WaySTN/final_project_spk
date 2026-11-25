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
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Versioning & Kontrol Publikasi
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Riwayat Perhitungan & Publikasi Snapshot
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
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
