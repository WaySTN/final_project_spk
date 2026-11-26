import { ArrowUpRight } from "lucide-react";
import { CriteriaWeightsChart } from "@/components/decision/charts";
import { PairwiseMatrixTable } from "@/components/decision/matrix-table";
import { WeightSensitivityExplorer } from "@/components/decision/weight-sensitivity-explorer";
import { PublicationBanner } from "@/components/public/publication-banner";
import { AlertBanner, Badge, ScoreBar } from "@/components/ui/primitives";
import {
  ACADEMIC_REFERENCES,
  PAIRWISE_DEFINITIONS,
  SAATY_SIMPLIFIED_SCALE,
  buildDecisionEvaluation,
  getCriteriaForMetric,
  type C6MetricType,
} from "@/lib/decision";
import {
  formatBatteryValue,
  formatDecimal,
  formatIdr,
  formatInteger,
  formatWeightPercent,
} from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

const TOC_SECTIONS = [
  { id: "kriteria", num: "01", label: "Enam Kriteria" },
  { id: "kuesioner", num: "02", label: "Responden & Skala" },
  { id: "rumus", num: "03", label: "Rumus AHP & SAW" },
  { id: "ahp-hasil", num: "04", label: "Matriks & Bobot AHP" },
  { id: "saw-hasil", num: "05", label: "Matriks X, R & Skor" },
  { id: "sensitivitas", num: "06", label: "Analisis Sensitivitas" },
  { id: "referensi", num: "07", label: "Referensi DOI" },
  { id: "keterbatasan", num: "08", label: "Keterbatasan" },
];

export default async function MetodologiPage() {
  const repo = await getRepository();
  const publication = await repo.getCurrentPublication();
  const payload = publication?.publicPayload ?? null;
  const c6Metric: C6MetricType = payload?.c6Metric ?? payload?.saw.c6Metric ?? "battery_wh";
  const activeCriteria = getCriteriaForMetric(c6Metric);
  const evaluation = payload
    ? buildDecisionEvaluation({
        items: payload.saw.items,
        weightSensitivity: payload.weightSensitivity ?? null,
        c6Metric,
      })
    : null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:py-12 space-y-8">
      <div className="border-b border-[#e2e8f0] pb-6 space-y-2">
        <p className="editorial-kicker">Dokumentasi Ilmiah & Audit Algoritma</p>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#1e293b] sm:text-4xl">
          Metodologi Penelitian AHP–SAW
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-[#475569]">
          Dasar penetapan enam kriteria, kuesioner 15 perbandingan berpasangan, skala Saaty
          sederhana, uji konsistensi eigenvector, agregasi geometrik AIJ, normalisasi SAW,
          uji stabilitas peringkat antar skenario, 9 referensi DOI, serta keterbatasan
          penelitian.
        </p>
      </div>

      {payload && <PublicationBanner payload={payload} />}

      {/* Mobile horizontal jump links */}
      <nav
        aria-label="Navigasi cepat bagian metodologi"
        className="flex gap-2 overflow-x-auto pb-1 lg:hidden no-print"
      >
        {TOC_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 font-mono text-[11px] text-[#475569] hover:border-[#1e3a5f] hover:text-[#1e293b]"
          >
            <span className="text-[#64748b]">{s.num}</span>
            {s.label}
          </a>
        ))}
      </nav>

      {/* 2-Column Editorial Layout with Sticky Table of Contents */}
      <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:items-start">
        <aside className="hidden lg:block sticky top-24 space-y-2 no-print">
          <p className="editorial-kicker pb-2 border-b border-[#e2e8f0]">Daftar Isi</p>
          <nav aria-label="Daftar isi metodologi" className="space-y-0.5">
            {TOC_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-[#475569] transition-colors hover:bg-[#f8fafc] hover:text-[#1e293b]"
              >
                <span className="font-mono text-[10px] text-[#64748b]">{s.num}</span>
                <span>{s.label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-12">
          {/* 01. Criteria */}
          <section id="kriteria" className="scroll-mt-24 space-y-4">
            <div className="space-y-1">
              <p className="editorial-kicker">01 / Hierarki Keputusan</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                Dasar Pemilihan Enam Kriteria (C1–C6)
              </h2>
              <p className="text-sm text-[#475569]">
                Ditetapkan dari kajian literatur terdahulu (Ardhana & Indriyanti, 2025;
                Mukharir & Wardoyo, 2021; Ardiansyah dkk., 2025) pada rentang anggaran tetap
                Rp9.000.000–Rp11.000.000.
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] uppercase tracking-[0.06em] text-[#64748b]">
                    <th className="px-4 py-2.5">Kode</th>
                    <th className="px-4 py-2.5">Kriteria</th>
                    <th className="px-3 py-2.5">Satuan</th>
                    <th className="px-3 py-2.5">Atribut</th>
                    <th className="px-4 py-2.5">Definisi Operasional & Sumber</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/70">
                  {activeCriteria.map((c) => (
                    <tr key={c.code} className="align-top">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e293b]">
                        {c.code}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#1e293b] whitespace-nowrap">
                        {c.name}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-[#475569] whitespace-nowrap">
                        {c.unit}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                          {c.attribute === "cost" ? "Cost" : "Benefit"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs leading-relaxed text-[#475569]">
                        <p className="text-[#1e293b]">{c.definition}</p>
                        <p className="mt-1 text-[#64748b]">{c.measurementSource}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 02. Questionnaire & Scale */}
          <section id="kuesioner" className="scroll-mt-24 space-y-5">
            <div className="space-y-1">
              <p className="editorial-kicker">02 / Instrumen & Responden</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                Kuesioner Daring, Panel Mahasiswa & Skala Saaty
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-[#e2e8f0] bg-white p-5 space-y-3 text-xs sm:text-[13px] leading-relaxed text-[#475569]">
                <p>
                  <strong className="text-[#1e293b]">Responden mahasiswa aktif:</strong>{" "}
                  Dipilih sebagai pengguna sasaran agar bobot berasal dari preferensi pemakai
                  melalui <em>non-probability sampling</em> berbasis kriteria dan kemudahan
                  akses.
                </p>
                <p>
                  <strong className="text-[#1e293b]">Alasan kuesioner daring:</strong>{" "}
                  Menghasilkan 15 perbandingan berpasangan terstruktur yang seragam. Studi
                  Pascoe dkk. (2024) menjadi rujukan konteks tantangan survei daring; sistem
                  ini menerapkan <strong>AHP standar</strong>, bukan algoritma modifikasi pada
                  artikel tersebut.
                </p>
                <p>
                  <strong className="text-[#1e293b]">Target ukuran panel (12):</strong>{" "}
                  Keputusan praktis penelitian, bukan batas minimum baku AHP (Schmidt dkk.,
                  2015). Mengacu Bethlehem (2010), hasil diposisikan sebagai preferensi panel,
                  bukan representasi populasi seluruh mahasiswa.
                </p>
                <p>
                  <strong className="text-[#1e293b]">Status data kuesioner (Konsultasi Dosen):</strong>{" "}
                  Berdasarkan hasil konsultasi kelompok dengan dosen pengampu mata kuliah SPK,
                  data 33 respons kuesioner mahasiswa yang telah terkumpul (17 konsisten CR ≤
                  0,10 dan 16 tidak konsisten) diizinkan digunakan langsung tanpa wawancara
                  tambahan.
                </p>
                <p>
                  <strong className="text-[#1e293b]">Dasar 15 pertanyaan:</strong> Segitiga
                  atas matriks 6×6 memiliki <code className="font-mono">n(n−1)/2 = 15</code>{" "}
                  pasangan unik; diagonal bernilai 1 dan bawah diagonal diisi kebalikannya.
                </p>
              </div>

              <div className="min-w-0 rounded-lg border border-[#e2e8f0] bg-white p-5 space-y-4">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1e293b]">
                    Skala Pembobotan AHP Lengkap (1, 3, 5, 7, 9 &amp; Resiprokal)
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#64748b]">
                    Skala perbandingan memakai 9 titik ganjil dan kebalikannya:{" "}
                    <span className="font-mono text-[#1e293b]">
                      &#123;1, 3, 5, 7, 9, 1/3, 1/5, 1/7, 1/9&#125;
                    </span>
                    . Nilai antara genap (<span className="font-mono">2, 4, 6, 8</span>) tidak
                    digunakan agar kategori penilaian lebih ringkas, tegas, dan mengurangi beban
                    kognitif mahasiswa pada 15 perbandingan daring.
                  </p>
                  <div className="mt-2.5 overflow-x-auto rounded border border-[#e2e8f0]">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[10px] uppercase text-[#64748b]">
                          <th className="px-3 py-2">Skala</th>
                          <th className="px-3 py-2">Makna</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]/70">
                        {SAATY_SIMPLIFIED_SCALE.map((s) => (
                          <tr key={s.token}>
                            <td className="px-3 py-2 font-mono font-semibold text-[#1e293b] whitespace-nowrap">
                              {s.token === "1" ? "1" : `${s.token} / ${s.reciprocal}`}
                            </td>
                            <td className="px-3 py-2 text-[#475569]">{s.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[#1e293b] mb-2">
                    15 Pasangan Perbandingan
                  </p>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-[11px] text-[#475569]">
                    {PAIRWISE_DEFINITIONS.map((p) => (
                      <p key={p.pairKey} className="truncate">
                        <span className="font-mono text-[#64748b] mr-1">
                          {String(p.questionNo).padStart(2, "0")}.
                        </span>
                        <span className="font-mono font-medium text-[#1e293b]">
                          {p.pairKey}
                        </span>{" "}
                        {p.leftLabel} vs {p.rightLabel}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 03. Mathematical Formulas */}
          <section id="rumus" className="scroll-mt-24 space-y-4">
            <div className="space-y-1">
              <p className="editorial-kicker">03 / Spesifikasi Algoritma</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                Prosedur Matematis AHP & SAW
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-5 space-y-2.5 text-xs leading-relaxed text-[#475569]">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#1e293b]">
                  Analytical Hierarchy Process (AHP)
                </p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    Principal right eigenvector dihitung melalui <em>power iteration</em>{" "}
                    (konvergensi <code className="font-mono">10⁻¹²</code>, maks 10.000
                    iterasi) — bukan rata-rata baris normalisasi.
                  </li>
                  <li>
                    <code className="font-mono text-[#1e293b]">
                      λmaks = mean((A·w)ᵢ / wᵢ)
                    </code>
                  </li>
                  <li>
                    <code className="font-mono text-[#1e293b]">
                      CI = (λmaks − 6)/5 ; RI = 1,24 ; CR = CI/RI
                    </code>
                  </li>
                  <li>
                    Ambang konsistensi <code className="font-mono">CR ≤ 0,10</code> tanpa
                    pembulatan; agregasi AIJ{" "}
                    <code className="font-mono">aᵢⱼ(G) = exp(mean(ln aᵢⱼ))</code> (Forman &
                    Peniwati, 1998).
                  </li>
                </ul>
              </div>

              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-5 space-y-2.5 text-xs leading-relaxed text-[#475569]">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#1e293b]">
                  Simple Additive Weighting (SAW)
                </p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>
                    Benefit (C2, C3, C4, C6):{" "}
                    <code className="font-mono text-[#1e293b]">rᵢⱼ = xᵢⱼ / maxᵢ(xᵢⱼ)</code>
                  </li>
                  <li>
                    Cost (C1, C5):{" "}
                    <code className="font-mono text-[#1e293b]">rᵢⱼ = minᵢ(xᵢⱼ) / xᵢⱼ</code>
                  </li>
                  <li>
                    Kontribusi <code className="font-mono">cᵢⱼ = wⱼ·rᵢⱼ</code> dan nilai
                    preferensi <code className="font-mono">Vᵢ = Σ cᵢⱼ</code> presisi penuh.
                  </li>
                  <li>
                    Perubahan himpunan alternatif memicu normalisasi ulang; skor absolut antar
                    himpunan berbeda tidak sebanding langsung (Tofallis, 2014).
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 04–06: Live Published Results */}
          {payload && (
            <>
              <section id="ahp-hasil" className="scroll-mt-24 space-y-5">
                <div className="space-y-1">
                  <p className="editorial-kicker">04 / Hasil Agregat AHP (Snapshot Aktif)</p>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                    Matriks Perbandingan Gabungan (AIJ) & Bobot Prioritas
                  </h2>
                  <p className="text-xs sm:text-sm text-[#475569]">
                    Panel: {payload.researchSummary.totalResponses} respons (
                    {payload.researchSummary.consistentResponses} lolos CR ≤ 0,10 ·{" "}
                    {payload.researchSummary.inconsistentResponses} tidak lolos) ·{" "}
                    <span className="font-mono text-[#1e293b]">
                      λmaks = {formatDecimal(payload.ahp.lambdaMax, 8)} · CI ={" "}
                      {formatDecimal(payload.ahp.ci, 8)} · CR ={" "}
                      {formatDecimal(payload.ahp.cr, 8)}
                    </span>
                  </p>
                </div>

                <PairwiseMatrixTable
                  matrix={payload.ahp.aggregateMatrix}
                  digits={4}
                  caption="Matriks perbandingan gabungan AIJ snapshot aktif"
                />

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="min-w-0 overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[10px] uppercase text-[#64748b]">
                          <th className="px-3.5 py-2.5">Kriteria</th>
                          <th className="px-3 py-2.5 text-right">Bobot Utama</th>
                          <th className="px-3 py-2.5 text-right">% Utama</th>
                          {payload.sensitivity.allEligibleWeightsByCode && (
                            <th className="px-3 py-2.5 text-right">% 33 Resp</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]/70 tabular-nums">
                        {activeCriteria.map((c) => (
                          <tr key={c.code}>
                            <td className="px-3.5 py-2.5 font-medium text-[#1e293b]">
                              <span className="font-mono text-[#64748b] mr-1.5">
                                {c.code}
                              </span>
                              {c.shortName}
                              <ScoreBar
                                value={payload.ahp.weightsByCode[c.code]}
                                max={0.28}
                                className="mt-1 h-1"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-[#475569]">
                              {formatDecimal(payload.ahp.weightsByCode[c.code], 8)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-[#1e293b]">
                              {formatWeightPercent(payload.ahp.weightsByCode[c.code], 2)}
                            </td>
                            {payload.sensitivity.allEligibleWeightsByCode && (
                              <td className="px-3 py-2.5 text-right font-mono text-[#64748b]">
                                {formatWeightPercent(
                                  payload.sensitivity.allEligibleWeightsByCode[c.code],
                                  2,
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="min-w-0 rounded-lg border border-[#e2e8f0] bg-white p-4">
                    <CriteriaWeightsChart
                      weightsByCode={payload.ahp.weightsByCode}
                      comparisonWeightsByCode={payload.sensitivity.allEligibleWeightsByCode}
                    />
                  </div>
                </div>
              </section>

              <section id="saw-hasil" className="scroll-mt-24 space-y-5">
                <div className="space-y-1">
                  <p className="editorial-kicker">05 / Matriks Keputusan & Normalisasi</p>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                    Matriks X, Matriks Normalisasi R & Nilai Preferensi SAW
                  </h2>
                </div>

                <div className="space-y-1.5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#64748b]">
                    Matriks Keputusan (X)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
                    <table className="w-full min-w-[660px] border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[10px] uppercase text-[#64748b]">
                          <th className="sticky left-0 bg-[#f8fafc] border-r border-[#e2e8f0] px-3 py-2.5">
                            Kode
                          </th>
                          <th className="px-3 py-2.5">Model</th>
                          <th className="px-3 py-2.5 text-right">C1 (Rp)</th>
                          <th className="px-3 py-2.5 text-right">C2</th>
                          <th className="px-3 py-2.5 text-right">C3</th>
                          <th className="px-3 py-2.5 text-right">C4</th>
                          <th className="px-3 py-2.5 text-right">C5 (kg)</th>
                          <th className="px-3 py-2.5 text-right">
                            C6 ({c6Metric === "battery_wh" ? "Wh" : "jam"})
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]/70 font-mono tabular-nums">
                        {payload.saw.items.map((item) => (
                          <tr key={item.code}>
                            <td className="sticky left-0 bg-white border-r border-[#e2e8f0] px-3 py-2.5 font-semibold text-[#1e293b]">
                              {item.code}
                            </td>
                            <td className="px-3 py-2.5 font-sans text-[#1e293b]">
                              <span className="mr-1.5 font-mono text-[10px] text-[#1e3a5f]">
                                [{item.brand}]
                              </span>
                              {item.model}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {formatIdr(item.priceIdr)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {formatInteger(item.cpuMark)}
                            </td>
                            <td className="px-3 py-2.5 text-right">{item.ramGb} GB</td>
                            <td className="px-3 py-2.5 text-right">{item.ssdGb} GB</td>
                            <td className="px-3 py-2.5 text-right">
                              {formatDecimal(item.weightKg, 2)}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {formatBatteryValue(item, c6Metric)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#64748b]">
                    Matriks Normalisasi (R) &amp; Skor Preferensi (V)
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
                    <table className="w-full min-w-[680px] border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[10px] uppercase text-[#64748b]">
                          <th className="px-3 py-2.5">Rank</th>
                          <th className="sticky left-0 bg-[#f8fafc] border-r border-[#e2e8f0] px-3 py-2.5">
                            Kode
                          </th>
                          {activeCriteria.map((c) => (
                            <th key={c.code} className="px-2.5 py-2.5 text-right">
                              R_{c.code}
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-right">Skor SAW (V)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]/70 font-mono tabular-nums">
                        {payload.saw.items.map((item) => (
                          <tr key={item.code}>
                            <td className="px-3 py-2.5 font-semibold text-[#1e293b]">
                              #{item.rank}
                            </td>
                            <td className="sticky left-0 bg-white border-r border-[#e2e8f0] px-3 py-2.5 font-semibold text-[#1e293b]">
                              {item.code}
                            </td>
                            {activeCriteria.map((c) => (
                              <td
                                key={c.code}
                                className="px-2.5 py-2.5 text-right text-[#475569]"
                              >
                                {formatDecimal(item.normalizedValues[c.code], 6)}
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-right font-bold text-[#1e3a5f]">
                              {formatDecimal(item.score, 6)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {evaluation && evaluation.insights.length > 0 && (
                  <AlertBanner tone="neutral" title="Evaluasi Kesesuaian Hasil Keputusan">
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      {evaluation.insights.map((ins, i) => (
                        <li key={i}>{ins}</li>
                      ))}
                    </ul>
                  </AlertBanner>
                )}
              </section>

              <section id="sensitivitas" className="scroll-mt-24 space-y-5">
                <div className="space-y-1">
                  <p className="editorial-kicker">06 / Stabilitas Peringkat</p>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                    Analisis Sensitivitas Bobot (37 Skenario) &amp; Pembanding Responden
                  </h2>
                  <p className="text-sm text-[#475569]">
                    Menguji stabilitas pemeringkatan terhadap perubahan satu bobot kriteria pada
                    kisaran −20%, −10%, −5%, +5%, +10%, dan +20% dengan penyesuaian proporsional
                    lima bobot lainnya sehingga total bobot selalu tetap sama dengan 1.
                  </p>
                </div>

                {payload.weightSensitivity && (
                  <WeightSensitivityExplorer
                    suite={payload.weightSensitivity}
                    c6Metric={c6Metric}
                  />
                )}

                {payload.sensitivity.rankComparison.some(
                  (r) => r.rankAllEligible !== null || r.rankWithoutA6A7 !== null,
                ) && (
                  <div className="space-y-2 pt-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#64748b]">
                      Pembanding Sensitivitas Panel Responden (17 Konsisten vs 33 Eligible)
                    </p>
                    <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg border border-[#e2e8f0] bg-white">
                      <table className="w-full min-w-[660px] border-collapse text-xs">
                        <thead className="sticky top-0 z-10">
                          <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[10px] uppercase text-[#64748b]">
                            <th className="sticky left-0 bg-[#f8fafc] border-r border-[#e2e8f0] px-3 py-2.5">
                              Kode
                            </th>
                            <th className="px-3 py-2.5">Alternatif</th>
                            <th className="px-3 py-2.5 text-right">Utama (17 Konsisten)</th>
                            <th className="px-3 py-2.5 text-right">Pembanding (33 Resp)</th>
                            {payload.sensitivity.rankComparison.some(
                              (r) => r.rankWithoutA6A7 !== null,
                            ) && (
                              <th className="px-3 py-2.5 text-right">Subset Tanpa A6/A7</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0]/70 tabular-nums">
                          {payload.sensitivity.rankComparison.map((row) => (
                            <tr key={row.code}>
                              <td className="sticky left-0 bg-white border-r border-[#e2e8f0] px-3 py-2.5 font-mono font-semibold text-[#1e293b]">
                                {row.code}
                              </td>
                              <td className="px-3 py-2.5 text-[#1e293b]">{row.model}</td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {row.rankPrimary !== null
                                  ? `#${row.rankPrimary} (${formatDecimal(row.scorePrimary ?? 0, 6)})`
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {row.rankAllEligible !== null
                                  ? `#${row.rankAllEligible} (${formatDecimal(row.scoreAllEligible ?? 0, 6)})`
                                  : "—"}
                              </td>
                              {payload.sensitivity.rankComparison.some(
                                (r) => r.rankWithoutA6A7 !== null,
                              ) && (
                                <td className="px-3 py-2.5 text-right font-mono text-[#475569]">
                                  {row.rankWithoutA6A7 !== null
                                    ? `#${row.rankWithoutA6A7} (${formatDecimal(row.scoreWithoutA6A7 ?? 0, 6)})`
                                    : "Dikeluarkan"}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <AlertBanner tone="warning" title="Aturan Pembacaan Sensitivitas">
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    {payload.sensitivity.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </AlertBanner>
              </section>
            </>
          )}

          {/* 07. References */}
          <section id="referensi" className="scroll-mt-24 space-y-4">
            <div className="space-y-1">
              <p className="editorial-kicker">07 / Daftar Pustaka</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                Referensi Ilmiah & Tautan DOI
              </h2>
            </div>

            <div className="divide-y divide-[#e2e8f0] rounded-lg border border-[#e2e8f0] bg-white">
              {ACADEMIC_REFERENCES.map((ref, idx) => (
                <div key={ref.id} className="px-5 py-4 space-y-1">
                  <p className="text-sm font-medium text-[#1e293b]">
                    <span className="font-mono text-xs text-[#64748b] mr-2">
                      [{idx + 1}]
                    </span>
                    {ref.authors} ({ref.year}). <em>{ref.title}</em>. {ref.journal}.
                  </p>
                  <p className="text-xs text-[#475569] pl-6">{ref.usageContext}</p>
                  <div className="pl-6">
                    <a
                      href={ref.doi}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 break-all font-mono text-xs text-[#1e293b] underline hover:opacity-70"
                    >
                      {ref.doi}
                      <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 08. Limitations */}
          <section id="keterbatasan" className="scroll-mt-24 space-y-4">
            <div className="space-y-1">
              <p className="editorial-kicker">08 / Transparansi Akademik</p>
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-[#1e293b]">
                Keterbatasan Penelitian
              </h2>
            </div>

            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-5">
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm leading-relaxed text-[#475569]">
                <li>
                  Sampel responden menggunakan <em>non-probability sampling</em> sehingga
                  mencerminkan preferensi panel mahasiswa yang berpartisipasi, bukan estimasi
                  populasi seluruh mahasiswa.
                </li>
                <li>
                  Sepuluh respons tambahan memiliki CR mendekati nol dan sebagian cap waktu
                  tidak berurutan; konsistensi matematis tidak membuktikan keaslian/independensi
                  respons sehingga konfirmasi manual peneliti tetap diperlukan.
                </li>
                <li>
                  Pada versi penelitian UAS (33 alternatif lintas 8 merek: Lenovo, ASUS, Acer,
                  HP, MSI, Axioo, TECNO, dan Infinix), kriteria C6 menggunakan kapasitas energi
                  baterai (Wh) sebagai proksi daya tahan baterai — bukan durasi pemakaian aktual
                  karena efisiensi prosesor, layar, dan beban kerja berbeda antar laptop.
                </li>
                <li>
                  Sembilan kandidat yang tidak memenuhi kelengkapan spesifikasi, mengalami
                  konflik data sumber, berada di luar rentang harga, atau berupa arsip lama
                  (A9, A19, A24, A25, A26, A31, A32, A35, A36) dikeluarkan dari pemeringkatan
                  utama dan disimpan semata sebagai arsip audit.
                </li>
                <li>
                  Harga dan ketersediaan merupakan snapshot audit bertanggal (bukan real-time),
                  dan ketersediaan stok aktual belum dikonfirmasi melalui transaksi checkout
                  langsung ke penjual.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
