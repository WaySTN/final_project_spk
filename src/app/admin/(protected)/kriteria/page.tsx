import { ArrowUpRight } from "lucide-react";
import {
  AlertBanner,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ScoreBar,
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

  const maxWeight = latestPrimary
    ? Math.max(...CRITERIA.map((c) => latestPrimary.weightsByCode[c.code] ?? 0), 0.01)
    : 1;

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e5e5e0] pb-5">
        <p className="editorial-kicker">Kontrak Penelitian · Read-Only</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#111113]">
          Kriteria Keputusan (C1–C6)
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#787872]">
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
          <CardTitle>Daftar Kriteria &amp; Bobot AHP Terbaru</CardTitle>
          <CardDescription>
            {latestPrimary
              ? `Menampilkan bobot dari run AHP skenario utama terbaru (CR = ${formatDecimal(latestPrimary.cr, 8)}).`
              : "Belum ada run AHP skenario utama. Lakukan impor responden dan hitung AHP untuk menghasilkan bobot."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile stacked specification cards */}
          <div className="divide-y divide-[#e5e5e0] md:hidden">
            {CRITERIA.map((c) => {
              const weight = latestPrimary?.weightsByCode[c.code] ?? null;
              return (
                <div key={c.code} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#111113] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                        {c.code}
                      </span>
                      <span className="text-sm font-semibold text-[#111113]">{c.name}</span>
                    </div>
                    <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                      {c.attribute === "cost" ? "Cost" : "Benefit"}
                    </Badge>
                  </div>

                  {weight !== null && (
                    <div className="rounded-md border border-[#e5e5e0] bg-[#f7f7f5] p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#787872]">
                          Bobot AHP ({c.unit})
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#111113]">
                          {formatWeightPercent(weight, 2)}
                        </span>
                      </div>
                      <ScoreBar value={weight} max={maxWeight} className="mt-2" />
                      <p className="mt-1 font-mono text-[11px] tabular-nums text-[#787872]">
                        {formatDecimal(weight, 8)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1 text-xs leading-relaxed text-[#52524e]">
                    <p className="text-[#111113]">{c.definition}</p>
                    <p>
                      <span className="font-medium text-[#111113]">Sumber:</span>{" "}
                      {c.measurementSource}
                    </p>
                    <p className="text-[#787872]">{c.notes}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {c.referenceIds.map((refId) => {
                      const ref = refMap.get(refId);
                      if (!ref) return null;
                      return (
                        <a
                          key={ref.id}
                          href={ref.doi}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-[#e5e5e0] bg-[#f7f7f5] px-2 py-0.5 text-[11px] text-[#52524e] hover:border-[#111113]/40 hover:text-[#111113]"
                        >
                          {ref.authors.split(",")[0]} ({ref.year})
                          <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop precision table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e0] bg-[#f7f7f5] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#787872]">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Kriteria</th>
                  <th className="px-4 py-3">Atribut</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3 text-right">Bobot AHP</th>
                  <th className="px-4 py-3">Definisi Operasional &amp; Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e0]/80">
                {CRITERIA.map((c) => {
                  const weight = latestPrimary?.weightsByCode[c.code] ?? null;
                  return (
                    <tr key={c.code} className="align-top transition-colors hover:bg-[#f7f7f5]/60">
                      <td className="px-4 py-4 font-mono font-semibold text-[#111113]">
                        {c.code}
                      </td>
                      <td className="px-4 py-4 font-medium text-[#111113]">{c.name}</td>
                      <td className="px-4 py-4">
                        <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                          {c.attribute === "cost" ? "Cost (min/x)" : "Benefit (x/max)"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-[#52524e]">
                        {c.unit}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums whitespace-nowrap">
                        {weight !== null ? (
                          <div className="ml-auto w-28 space-y-1">
                            <p className="font-mono text-sm font-semibold text-[#111113]">
                              {formatWeightPercent(weight, 2)}
                            </p>
                            <ScoreBar value={weight} max={maxWeight} />
                            <p className="font-mono text-[11px] text-[#787872]">
                              {formatDecimal(weight, 8)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#9c9c95]">—</span>
                        )}
                      </td>
                      <td className="max-w-md space-y-1.5 px-4 py-4 text-xs text-[#52524e]">
                        <p className="leading-relaxed text-[#111113]">{c.definition}</p>
                        <p>
                          <span className="font-medium text-[#111113]">Sumber:</span>{" "}
                          {c.measurementSource}
                        </p>
                        <p className="text-[#787872]">{c.notes}</p>
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
                                className="inline-flex items-center gap-0.5 rounded border border-[#e5e5e0] bg-[#f7f7f5] px-1.5 py-0.5 text-[11px] text-[#52524e] transition-colors hover:border-[#111113]/40 hover:text-[#111113]"
                              >
                                {ref.authors.split(",")[0]} ({ref.year})
                                <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
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
