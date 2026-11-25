import {
  AlertBanner,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";
import { ACADEMIC_REFERENCES, CRITERIA } from "@/lib/decision";
import { formatDecimal, formatWeightPercent } from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminKriteriaPage() {
  const repo = await getRepository();
  const ahpRuns = await repo.listAhpRuns();
  const latestPrimary = ahpRuns.find((r) => r.mode === "consistent_only") ?? null;
  const refMap = new Map(ACADEMIC_REFERENCES.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Kontrak Penelitian (Read-Only)
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Kriteria Keputusan (C1–C6)
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Enam kriteria ditetapkan berdasarkan kajian literatur penelitian terdahulu. Bobot
          dihasilkan secara matematis dari perhitungan AHP, bukan diubah manual.
        </p>
      </div>

      <AlertBanner tone="neutral" title="Aturan integritas kriteria">
        Definisi operasional, urutan C1–C6, atribut cost/benefit, serta protokol pengukuran
        C6 (video lokal 1080p @ 150 nit dalam satuan jam, bukan kapasitas Wh) bersifat tetap
        untuk versi penelitian ini agar konsisten dengan instrumen kuesioner 15 pasangan.
      </AlertBanner>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kriteria & Bobot AHP Terbaru</CardTitle>
          <CardDescription>
            {latestPrimary
              ? `Menampilkan bobot dari run AHP skenario utama terbaru (CR = ${formatDecimal(latestPrimary.cr, 8)}).`
              : "Belum ada run AHP skenario utama. Lakukan impor responden dan hitung AHP untuk menghasilkan bobot."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Kriteria</th>
                  <th className="px-4 py-3">Atribut</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3 text-right">Bobot AHP</th>
                  <th className="px-4 py-3">Definisi Operasional & Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {CRITERIA.map((c) => {
                  const weight = latestPrimary?.weightsByCode[c.code] ?? null;
                  return (
                    <tr key={c.code} className="align-top hover:bg-zinc-50/70">
                      <td className="px-4 py-3.5 font-mono font-semibold text-zinc-900">
                        {c.code}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-zinc-900">
                        {c.name}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                          {c.attribute === "cost" ? "Cost (min/x)" : "Benefit (x/max)"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-700 whitespace-nowrap">
                        {c.unit}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap">
                        {weight !== null ? (
                          <div>
                            <p className="font-semibold text-zinc-900">
                              {formatWeightPercent(weight, 2)}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatDecimal(weight, 8)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 space-y-1 text-xs text-zinc-600 max-w-md">
                        <p className="text-zinc-800">{c.definition}</p>
                        <p>
                          <span className="font-medium text-zinc-700">Sumber:</span>{" "}
                          {c.measurementSource}
                        </p>
                        <p className="text-zinc-500">{c.notes}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {c.referenceIds.map((refId) => {
                            const ref = refMap.get(refId);
                            if (!ref) return null;
                            return (
                              <a
                                key={ref.id}
                                href={ref.doi}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-700 hover:border-zinc-400"
                              >
                                {ref.authors.split(",")[0]} ({ref.year})
                              </a>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
