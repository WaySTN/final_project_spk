import { AhpWorkbench } from "@/components/admin/ahp-workbench";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminAhpPage() {
  const repo = await getRepository();
  const [batches, runs] = await Promise.all([
    repo.listResponseBatches(),
    repo.listAhpRuns(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Komputasi Pembobotan Kriteria
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Perhitungan AHP (Eigenvector & AIJ)
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Jalankan perhitungan bobot kriteria dari data respons kuesioner secara deterministik
          di server, lengkap dengan audit CR individual dan skenario sensitivitas seluruh respons.
        </p>
      </div>

      <AhpWorkbench initialBatches={batches} initialRuns={runs} />
    </div>
  );
}
