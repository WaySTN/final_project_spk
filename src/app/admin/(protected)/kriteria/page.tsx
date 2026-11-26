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
import {
  ACADEMIC_REFERENCES,
  CRITERIA,
  SAATY_SIMPLIFIED_SCALE,
} from "@/lib/decision";
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
      <div className="border-b border-[#e2e8f0] pb-5">
        <p className="editorial-kicker">Kontrak Penelitian · Read-Only</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#1e293b]">
          Kriteria Keputusan (C1–C6)
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#64748b]">
          Enam kriteria ditetapkan berdasarkan kajian literatur penelitian terdahulu. Bobot
          dihasilkan secara matematis dari perhitungan AHP, bukan diubah manual.
        </p>
      </div>

      <AlertBanner tone="neutral" title="Aturan integritas kriteria & proksi baterai C6 (UAS)">
        Enam kriteria (C1–C6) memiliki atribut cost/benefit tetap agar selaras dengan instrumen
        kuesioner 15 perbandingan berpasangan. Pada versi penelitian UAS (33 alternatif lintas 8
        merek), kriteria C6 menggunakan <strong>kapasitas baterai (Wh)</strong> sebagai indikator
        pendekatan daya tahan baterai dengan asumsi konsumsi daya setara — bukan jaminan jam
        pemakaian aktual. Dataset historis v1 (7 alternatif Lenovo) tetap mempertahankan satuan
        aslinya (jam video lokal 1080p PSREF).
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
          <div className="divide-y divide-[#e2e8f0] md:hidden">
            {CRITERIA.map((c) => {
              const weight = latestPrimary?.weightsByCode[c.code] ?? null;
              return (
                <div key={c.code} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#1e3a5f] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                        {c.code}
                      </span>
                      <span className="text-sm font-semibold text-[#1e293b]">{c.name}</span>
                    </div>
                    <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                      {c.attribute === "cost" ? "Cost" : "Benefit"}
                    </Badge>
                  </div>

                  {weight !== null && (
                    <div className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] p-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                          Bobot AHP ({c.unit})
                        </span>
                        <span className="font-mono text-sm font-semibold tabular-nums text-[#1e293b]">
                          {formatWeightPercent(weight, 2)}
                        </span>
                      </div>
                      <ScoreBar value={weight} max={maxWeight} className="mt-2" />
                      <p className="mt-1 font-mono text-[11px] tabular-nums text-[#64748b]">
                        {formatDecimal(weight, 8)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1 text-xs leading-relaxed text-[#475569]">
                    <p className="text-[#1e293b]">{c.definition}</p>
                    <p>
                      <span className="font-medium text-[#1e293b]">Sumber:</span>{" "}
                      {c.measurementSource}
                    </p>
                    <p className="text-[#64748b]">{c.notes}</p>
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
                          className="inline-flex items-center gap-1 rounded border border-[#e2e8f0] bg-[#f8fafc] px-2 py-0.5 text-[11px] text-[#475569] hover:border-[#1e3a5f]/40 hover:text-[#1e293b]"
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
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Kriteria</th>
                  <th className="px-4 py-3">Atribut</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3 text-right">Bobot AHP</th>
                  <th className="px-4 py-3">Definisi Operasional &amp; Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]/80">
                {CRITERIA.map((c) => {
                  const weight = latestPrimary?.weightsByCode[c.code] ?? null;
                  return (
                    <tr key={c.code} className="align-top transition-colors hover:bg-[#f8fafc]/60">
                      <td className="px-4 py-4 font-mono font-semibold text-[#1e293b]">
                        {c.code}
                      </td>
                      <td className="px-4 py-4 font-medium text-[#1e293b]">{c.name}</td>
                      <td className="px-4 py-4">
                        <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                          {c.attribute === "cost" ? "Cost (min/x)" : "Benefit (x/max)"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-[#475569]">
                        {c.unit}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums whitespace-nowrap">
                        {weight !== null ? (
                          <div className="ml-auto w-28 space-y-1">
                            <p className="font-mono text-sm font-semibold text-[#1e293b]">
                              {formatWeightPercent(weight, 2)}
                            </p>
                            <ScoreBar value={weight} max={maxWeight} />
                            <p className="font-mono text-[11px] text-[#64748b]">
                              {formatDecimal(weight, 8)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )}
                      </td>
                      <td className="max-w-md space-y-1.5 px-4 py-4 text-xs text-[#475569]">
                        <p className="leading-relaxed text-[#1e293b]">{c.definition}</p>
                        <p>
                          <span className="font-medium text-[#1e293b]">Sumber:</span>{" "}
                          {c.measurementSource}
                        </p>
                        <p className="text-[#64748b]">{c.notes}</p>
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
                                className="inline-flex items-center gap-0.5 rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 text-[11px] text-[#475569] transition-colors hover:border-[#1e3a5f]/40 hover:text-[#1e293b]"
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

      {/* Complete AHP Scale Explanation (UAS Requirement) */}
      <Card>
        <CardHeader>
          <CardTitle>Skala Pembobotan AHP Lengkap (Saaty Disederhanakan)</CardTitle>
          <CardDescription>
            Instrumen kuesioner menggunakan sembilan nilai perbandingan:{" "}
            <span className="font-mono text-[#1e293b]">
              &#123;1, 3, 5, 7, 9, 1/3, 1/5, 1/7, 1/9&#125;
            </span>
            . Nilai antara genap (<span className="font-mono">2, 4, 6, 8</span>) tidak digunakan
            agar pilihan kategori tetap tegas bagi responden mahasiswa pada 15 perbandingan daring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
                  <th className="px-4 py-2.5">Nilai Utama</th>
                  <th className="px-4 py-2.5">Nilai Kebalikan (Resiprokal)</th>
                  <th className="px-4 py-2.5">Tingkat Kepentingan &amp; Makna Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]/80 text-xs">
                {SAATY_SIMPLIFIED_SCALE.map((s) => (
                  <tr key={s.token} className="hover:bg-[#f8fafc]/60">
                    <td className="px-4 py-3 font-mono font-semibold text-[#1e3a5f]">
                      {s.token}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#475569]">
                      {s.reciprocal} ({s.token === "1" ? "1,0000" : formatDecimal(1 / Number(s.token), 4)})
                    </td>
                    <td className="px-4 py-3 text-[#1e293b]">{s.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-[#64748b]">
            <strong className="text-[#1e293b]">Catatan metode pengumpulan data:</strong> Berdasarkan
            hasil konsultasi kelompok dengan dosen pengampu SPK, 33 data kuesioner mahasiswa yang
            telah terkumpul (17 konsisten CR ≤ 0,10; 16 tidak konsisten) digunakan langsung untuk
            pembobotan AHP tanpa wawancara tambahan. Pengujian konsistensi menggunakan Random Index{" "}
            <span className="font-mono">RI = 1,24</span> untuk{" "}
            <span className="font-mono">n = 6</span> kriteria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
