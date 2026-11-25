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
      <div className="border-b border-[#e2e8f0] pb-5">
        <p className="editorial-kicker">Komputasi Pemeringkatan Alternatif</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#1e293b]">
          Perhitungan SAW &amp; Analisis Sensitivitas
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748b]">
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
