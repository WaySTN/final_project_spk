import { RespondenWorkbench } from "@/components/admin/responden-workbench";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminRespondenPage() {
  const repo = await getRepository();
  const batches = await repo.listResponseBatches();

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e2e8f0] pb-5">
        <p className="editorial-kicker">Data Primer Kuesioner · Privat Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#1e293b]">
          Responden &amp; Audit Konsistensi Individual
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748b]">
          Impor, validasi, dan audit 15 jawaban perbandingan berpasangan setiap responden.
          Data mentah tidak pernah dapat diakses oleh pengunjung publik.
        </p>
      </div>

      <RespondenWorkbench initialBatches={batches} />
    </div>
  );
}
