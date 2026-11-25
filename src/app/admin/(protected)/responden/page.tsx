import { RespondenWorkbench } from "@/components/admin/responden-workbench";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminRespondenPage() {
  const repo = await getRepository();
  const batches = await repo.listResponseBatches();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Data Primer Kuesioner (Privat Admin)
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Responden & Audit Konsistensi Individual
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Impor, validasi, dan audit 15 jawaban perbandingan berpasangan setiap responden.
          Data mentah tidak pernah dapat diakses oleh pengunjung publik.
        </p>
      </div>

      <RespondenWorkbench initialBatches={batches} />
    </div>
  );
}
