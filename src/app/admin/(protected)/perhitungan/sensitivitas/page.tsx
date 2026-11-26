import { SensitivitasWorkbench } from "@/components/admin/sensitivitas-workbench";
import { runWeightSensitivitySuite } from "@/lib/decision";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminSensitivitasPage() {
  const repo = await getRepository();
  const sawRuns = await repo.listSawRuns();
  const preferredRun =
    sawRuns.find(
      (r) =>
        r.scenario === "primary_33_consistent" ||
        r.scenario === "primary_7_consistent",
    ) ??
    sawRuns[0] ??
    null;

  const detail = preferredRun ? await repo.getSawRunDetail(preferredRun.id) : null;
  const initialSuite = detail
    ? (detail.run.weightSensitivity ??
      runWeightSensitivitySuite({
        baseWeights: detail.ahpRun.weights,
        baselineItems: detail.results.map((r) => ({
          code: r.alternativeCode,
          model: r.alternativeModel,
          normalizedValues: r.normalizedValues,
          weightedValues: r.weightedValues,
          criteriaValues: r.criteriaValues,
          score: r.score,
          rank: r.rank,
        })),
      }))
    : null;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e2e8f0] pb-5">
        <p className="editorial-kicker">Uji Stabilitas Bobot · 37 Skenario UAS</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#1e293b]">
          Analisis Sensitivitas Perubahan Satu Bobot
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[#64748b]">
          Menguji stabilitas peringkat SAW terhadap variasi satu bobot kriteria (−20%, −10%,
          −5%, +5%, +10%, +20%) sambil menyesuaikan lima bobot lainnya secara proporsional
          agar total bobot selalu tetap sama dengan 1.
        </p>
      </div>

      <SensitivitasWorkbench
        initialSawRuns={sawRuns}
        initialSelectedRun={detail?.run ?? null}
        initialSuite={initialSuite}
      />
    </div>
  );
}
