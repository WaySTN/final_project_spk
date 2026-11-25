import { AlternatifWorkbench } from "@/components/admin/alternatif-workbench";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminAlternatifPage() {
  const repo = await getRepository();
  const datasets = await repo.listAlternativeDatasets();
  const selected = datasets[0]
    ? await repo.getAlternativeDataset(datasets[0].id)
    : null;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e5e5e0] pb-5">
        <p className="editorial-kicker">Data Sekunder Penawaran &amp; Spesifikasi</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#111113]">
          Alternatif Laptop &amp; Audit Sumber Bukti
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#787872]">
          Kelola versi dataset laptop pada kisaran harga Rp9.000.000–Rp11.000.000 lengkap
          dengan tautan harga, spesifikasi, benchmark CPU Mark, dan durasi baterai PSREF.
        </p>
      </div>

      <AlternatifWorkbench
        initialDatasets={datasets}
        initialSelectedDataset={selected?.dataset ?? null}
        initialAlternatives={selected?.alternatives ?? []}
      />
    </div>
  );
}
