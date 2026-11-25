import { SawWorkbench } from "@/components/admin/saw-workbench";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminSawPage() {
  const repo = await getRepository();
  const [ahpRuns, datasets, sawRuns] = await Promise.all([
    repo.listAhpRuns(),
    repo.listAlternativeDatasets(),
    repo.listSawRuns(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Komputasi Pemeringkatan Alternatif
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Perhitungan SAW & Analisis Sensitivitas
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Transparansi penuh dari matriks keputusan X, nilai ekstrem normalisasi, matriks R,
          kontribusi berbobot setiap kriteria, hingga peringkat akhir pada skenario S1, S2, dan S3.
        </p>
      </div>

      <SawWorkbench
        initialAhpRuns={ahpRuns}
        initialDatasets={datasets}
        initialSawRuns={sawRuns}
      />
    </div>
  );
}
