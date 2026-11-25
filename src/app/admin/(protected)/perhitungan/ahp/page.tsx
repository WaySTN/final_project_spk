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
      <div className="border-b border-[#e2e8f0] pb-5">
        <p className="editorial-kicker">Komputasi Pembobotan Kriteria</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#1e293b]">
          Perhitungan AHP (Eigenvector &amp; AIJ)
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748b]">
          Jalankan perhitungan bobot kriteria dari data respons kuesioner secara deterministik
          di server, lengkap dengan audit CR individual dan skenario sensitivitas seluruh respons.
        </p>
      </div>

      <AhpWorkbench initialBatches={batches} initialRuns={runs} />
    </div>
  );
}
