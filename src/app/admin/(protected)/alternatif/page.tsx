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
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Data Sekunder Penawaran & Spesifikasi
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Alternatif Laptop & Audit Sumber Bukti
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
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
