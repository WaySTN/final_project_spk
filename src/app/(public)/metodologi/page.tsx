import { ExternalLink } from "lucide-react";
import { CriteriaWeightsChart } from "@/components/decision/charts";
import { PairwiseMatrixTable } from "@/components/decision/matrix-table";
import { PublicationBanner } from "@/components/public/publication-banner";
import {
  AlertBanner,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";
import {
  ACADEMIC_REFERENCES,
  CRITERIA,
  PAIRWISE_DEFINITIONS,
  SAATY_SIMPLIFIED_SCALE,
} from "@/lib/decision";
import {
  formatDecimal,
  formatIdr,
  formatInteger,
  formatWeightPercent,
} from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function MetodologiPage() {
  const repo = await getRepository();
  const publication = await repo.getCurrentPublication();
  const payload = publication?.publicPayload ?? null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-8">
      <div className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Dokumentasi Ilmiah & Audit Algoritma
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Metodologi Penelitian AHP–SAW
        </h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Halaman ini merinci dasar penetapan enam kriteria, desain kuesioner daring 15
          pasangan, skala perbandingan Saaty, uji konsistensi eigenvector, agregasi geometrik
          AIJ, normalisasi SAW, analisis sensitivitas, rujukan DOI, serta keterbatasan
          penelitian secara transparan.
        </p>
      </div>

      {payload && <PublicationBanner payload={payload} />}

      {/* 1. Criteria & Literature Rationale */}
      <Card>
        <CardHeader>
          <CardTitle>1. Hierarki & Dasar Pemilihan Enam Kriteria</CardTitle>
          <CardDescription>
            Disusun berdasarkan penelitian terdahulu (Ardhana & Indriyanti, 2025; Mukharir &
            Wardoyo, 2021; Ardiansyah dkk., 2025) pada anggaran tetap Rp9.000.000–Rp11.000.000.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                  <th className="px-4 py-2.5">Kode</th>
                  <th className="px-4 py-2.5">Kriteria</th>
                  <th className="px-4 py-2.5">Satuan</th>
                  <th className="px-4 py-2.5">Atribut</th>
                  <th className="px-4 py-2.5">Definisi Operasional & Sumber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {CRITERIA.map((c) => (
                  <tr key={c.code} className="align-top">
                    <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                      {c.unit}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                        {c.attribute === "cost" ? "Cost" : "Benefit"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600">
                      <p className="text-zinc-800">{c.definition}</p>
                      <p className="mt-1 text-zinc-500">{c.measurementSource}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. Questionnaire, Respondents & Sample Size */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>2. Responden, Kuesioner Daring & Ukuran Panel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-700 leading-relaxed">
            <p>
              <strong>Pemilihan mahasiswa sebagai responden:</strong> Mahasiswa aktif
              merupakan pengguna sasaran utama sistem sehingga bobot kriteria berasal dari
              preferensi pemakai, bukan persentase subjektif peneliti. Perekrutan dilakukan
              dengan <em>non-probability sampling</em> (kriteria mahasiswa aktif & kemudahan
              akses).
            </p>
            <p>
              <strong>Alasan kuesioner daring:</strong> Penelitian membutuhkan penilaian
              kuantitatif berpasangan dengan struktur dan skala identik bagi seluruh
              responden agar dapat langsung dikonversi ke matriks 6×6. Studi Pascoe dkk.
              (2024) dijadikan rujukan konteks survei AHP daring dan tantangan
              inkonsistensinya, namun penelitian ini menerapkan{" "}
              <strong>AHP standar dengan skala disederhanakan</strong>, bukan algoritma
              modifikasi pada artikel tersebut.
            </p>
            <p>
              <strong>Alasan ukuran responden:</strong> Target awal 12 respons lolos CR
              merupakan keputusan praktis penelitian, bukan ambang baku universal AHP
              (Schmidt dkk., 2015). Mengacu Bethlehem (2010), hasil survei web diposisikan
              sebagai preferensi panel, bukan estimasi populasi seluruh mahasiswa.
            </p>
            <p>
              <strong>Dasar 15 pertanyaan:</strong> Untuk 6 kriteria, jumlah pasangan unik
              segitiga atas matriks adalah <code>n(n − 1) / 2 = 6(5) / 2 = 15</code>.
              Elemen diagonal bernilai 1 dan segitiga bawah diisi kebalikannya (
              <code>aⱼᵢ = 1 / aᵢⱼ</code>).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Skala Perbandingan Saaty Sederhana</CardTitle>
            <CardDescription>
              Nilai genap (2, 4, 6, 8) ditiadakan untuk mempermudah pengisian daring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left font-semibold text-zinc-600">
                    <th className="px-3 py-2">Skala</th>
                    <th className="px-3 py-2">Makna Perbandingan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {SAATY_SIMPLIFIED_SCALE.map((s) => (
                    <tr key={s.token}>
                      <td className="px-3 py-2 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        {s.token === "1" ? "1" : `${s.token} / ${s.reciprocal}`}
                      </td>
                      <td className="px-3 py-2 text-zinc-700">{s.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold text-zinc-700">
                15 Pasangan Perbandingan (Segitiga Atas Matriks 6×6):
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 text-xs text-zinc-600">
                {PAIRWISE_DEFINITIONS.map((p) => (
                  <p key={p.pairKey} className="truncate">
                    <span className="font-mono text-zinc-400 mr-1">
                      {String(p.questionNo).padStart(2, "0")}.
                    </span>
                    <span className="font-medium text-zinc-800">{p.pairKey}</span> —{" "}
                    {p.leftLabel} vs {p.rightLabel}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Mathematical Procedures */}
      <Card>
        <CardHeader>
          <CardTitle>4. Rumus Pengujian Konsistensi AHP, AIJ & Pemeringkatan SAW</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 text-xs text-zinc-700 leading-relaxed">
          <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              Analytical Hierarchy Process (AHP)
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                Vektor prioritas <code>w</code> dihitung dari principal right eigenvector
                matriks 6×6 melalui <em>power iteration</em> (toleransi{" "}
                <code>10⁻¹²</code>, maks 10.000 iterasi), bukan rata-rata baris normalisasi.
              </li>
              <li>
                <code>λmaks = rata-rata((A · w)ᵢ / wᵢ)</code>
              </li>
              <li>
                <code>CI = (λmaks − 6) / 5</code>, <code>RI = 1,24</code> (untuk n = 6),{" "}
                <code>CR = CI / RI</code>.
              </li>
              <li>
                Batas konsistensi: <code>CR ≤ 0,10</code> tanpa pembulatan.
              </li>
              <li>
                Agregasi kelompok menggunakan rata-rata geometrik (AIJ):{" "}
                <code>aᵢⱼ(G) = exp(mean(ln(aᵢⱼ)))</code> (Forman & Peniwati, 1998).
              </li>
            </ul>
          </div>

          <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-900">
              Simple Additive Weighting (SAW)
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                Kriteria <strong>Benefit</strong> (C2, C3, C4, C6):{" "}
                <code>rᵢⱼ = xᵢⱼ / maxᵢ(xᵢⱼ)</code>.
              </li>
              <li>
                Kriteria <strong>Cost</strong> (C1, C5):{" "}
                <code>rᵢⱼ = minᵢ(xᵢⱼ) / xᵢⱼ</code>.
              </li>
              <li>
                Kontribusi kriteria: <code>cᵢⱼ = wⱼ × rᵢⱼ</code>.
              </li>
              <li>
                Nilai preferensi: <code>Vᵢ = Σⱼ (wⱼ × rᵢⱼ)</code> dengan presisi penuh tanpa
                pembulatan perantara.
              </li>
              <li>
                Jika himpunan alternatif berubah, <code>min/max</code> dihitung ulang; skor
                absolut antarskenario berbeda tidak dibandingkan secara langsung (Tofallis,
                2014).
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 5. Live Published Calculation Matrices & Sensitivity (if published) */}
      {payload && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>5. Hasil Agregat AHP (Snapshot Aktif)</CardTitle>
              <CardDescription>
                Panel responden: {payload.researchSummary.totalResponses} terkumpul (
                {payload.researchSummary.eligibleResponses} eligible,{" "}
                {payload.researchSummary.consistentResponses} lolos CR ≤ 0,10,{" "}
                {payload.researchSummary.inconsistentResponses} tidak lolos). λmaks ={" "}
                {formatDecimal(payload.ahp.lambdaMax, 8)} · CI ={" "}
                {formatDecimal(payload.ahp.ci, 8)} · CR gabungan ={" "}
                {formatDecimal(payload.ahp.cr, 8)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  Matriks Perbandingan Gabungan (AIJ)
                </h3>
                <PairwiseMatrixTable
                  matrix={payload.ahp.aggregateMatrix}
                  digits={4}
                  caption="Matriks perbandingan gabungan AIJ snapshot aktif"
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                    Bobot Prioritas AHP & Pembanding Sensitivitas
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-left font-semibold text-zinc-600">
                          <th className="px-3 py-2">Kriteria</th>
                          <th className="px-3 py-2 text-right">Bobot Utama</th>
                          <th className="px-3 py-2 text-right">% Utama</th>
                          {payload.sensitivity.allEligibleWeightsByCode && (
                            <th className="px-3 py-2 text-right">% 33 Respons</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 tabular-nums">
                        {CRITERIA.map((c) => (
                          <tr key={c.code}>
                            <td className="px-3 py-2 font-medium text-zinc-900">
                              {c.code} — {c.shortName}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatDecimal(payload.ahp.weightsByCode[c.code], 8)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatWeightPercent(payload.ahp.weightsByCode[c.code], 2)}
                            </td>
                            {payload.sensitivity.allEligibleWeightsByCode && (
                              <td className="px-3 py-2 text-right text-zinc-600">
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
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                    Grafik Perbandingan Bobot Kriteria
                  </h3>
                  <CriteriaWeightsChart
                    weightsByCode={payload.ahp.weightsByCode}
                    comparisonWeightsByCode={payload.sensitivity.allEligibleWeightsByCode}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SAW Matrices X, R, and Score */}
          <Card>
            <CardHeader>
              <CardTitle>6. Matriks Keputusan (X), Normalisasi (R) & Skor SAW</CardTitle>
              <CardDescription>
                Seluruh nilai berasal dari run SAW terpublikasi tanpa data statis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  Matriks Keputusan (X)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full min-w-[700px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-left font-semibold text-zinc-600">
                        <th className="px-3 py-2">Kode</th>
                        <th className="px-3 py-2">Model</th>
                        <th className="px-3 py-2 text-right">C1 (Rp)</th>
                        <th className="px-3 py-2 text-right">C2</th>
                        <th className="px-3 py-2 text-right">C3 (GB)</th>
                        <th className="px-3 py-2 text-right">C4 (GB)</th>
                        <th className="px-3 py-2 text-right">C5 (kg)</th>
                        <th className="px-3 py-2 text-right">C6 (jam)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 tabular-nums">
                      {payload.saw.items.map((item) => (
                        <tr key={item.code}>
                          <td className="px-3 py-2 font-mono font-semibold">{item.code}</td>
                          <td className="px-3 py-2">{item.model}</td>
                          <td className="px-3 py-2 text-right">{formatIdr(item.priceIdr)}</td>
                          <td className="px-3 py-2 text-right">{formatInteger(item.cpuMark)}</td>
                          <td className="px-3 py-2 text-right">{item.ramGb}</td>
                          <td className="px-3 py-2 text-right">{item.ssdGb}</td>
                          <td className="px-3 py-2 text-right">{formatDecimal(item.weightKg, 2)}</td>
                          <td className="px-3 py-2 text-right">{formatDecimal(item.batteryHours, 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-zinc-900">
                  Matriks Normalisasi (R) & Nilai Preferensi (V)
                </h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full min-w-[720px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-left font-semibold text-zinc-600">
                        <th className="px-3 py-2">Rank</th>
                        <th className="px-3 py-2">Kode</th>
                        {CRITERIA.map((c) => (
                          <th key={c.code} className="px-2.5 py-2 text-right">
                            R_{c.code}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right">Skor SAW (V)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 font-mono tabular-nums">
                      {payload.saw.items.map((item) => (
                        <tr key={item.code}>
                          <td className="px-3 py-2 font-semibold">#{item.rank}</td>
                          <td className="px-3 py-2 font-semibold">{item.code}</td>
                          {CRITERIA.map((c) => (
                            <td key={c.code} className="px-2.5 py-2 text-right text-zinc-700">
                              {formatDecimal(item.normalizedValues[c.code], 6)}
                            </td>
                          ))}
                          <td className="px-3 py-2 text-right font-bold text-zinc-900">
                            {formatDecimal(item.score, 6)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 7. Sensitivity Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>7. Analisis Sensitivitas Lintas Skenario</CardTitle>
              <CardDescription>
                Membandingkan perubahan peringkat ketika bobot menggunakan seluruh 33 respons
                atau saat A6 dan A7 dikeluarkan (simulasi risiko stok).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full min-w-[720px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left font-semibold text-zinc-600">
                      <th className="px-3 py-2.5">Kode</th>
                      <th className="px-3 py-2.5">Alternatif</th>
                      <th className="px-3 py-2.5 text-right">S1 Utama (7 Alt · 17)</th>
                      <th className="px-3 py-2.5 text-right">S2 (7 Alt · 33 Resp)</th>
                      <th className="px-3 py-2.5 text-right">S3 (5 Alt Tanpa A6/A7)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 tabular-nums">
                    {payload.sensitivity.rankComparison.map((row) => (
                      <tr key={row.code}>
                        <td className="px-3 py-2.5 font-mono font-semibold">{row.code}</td>
                        <td className="px-3 py-2.5 text-zinc-800">{row.model}</td>
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
                        <td className="px-3 py-2.5 text-right font-mono">
                          {row.rankWithoutA6A7 !== null
                            ? `#${row.rankWithoutA6A7} (${formatDecimal(row.scoreWithoutA6A7 ?? 0, 6)})`
                            : "Dikeluarkan"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <AlertBanner tone="warning" title="Penting dalam Membaca Analisis Sensitivitas">
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  {payload.sensitivity.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </AlertBanner>
            </CardContent>
          </Card>
        </>
      )}

      {/* 8. Academic References (DOIs) */}
      <Card>
        <CardHeader>
          <CardTitle>Referensi Ilmiah & Tautan DOI</CardTitle>
          <CardDescription>
            Seluruh acuan ilmiah yang digunakan dalam perancangan kriteria, metode AHP–SAW,
            dan batasan penelitian.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 p-0">
          {ACADEMIC_REFERENCES.map((ref) => (
            <div key={ref.id} className="px-5 py-4 space-y-1">
              <p className="text-sm font-medium text-zinc-900">
                {ref.authors} ({ref.year}). <em>{ref.title}</em>. {ref.journal}.
              </p>
              <p className="text-xs text-zinc-600">{ref.usageContext}</p>
              <a
                href={ref.doi}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-zinc-800 underline hover:text-zinc-600"
              >
                {ref.doi}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 9. Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Keterbatasan Penelitian</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700 leading-relaxed">
            <li>
              Sampel responden menggunakan <em>non-probability sampling</em> sehingga
              mencerminkan preferensi panel mahasiswa yang berpartisipasi, bukan estimasi
              populasi seluruh mahasiswa.
            </li>
            <li>
              Sepuluh respons tambahan memiliki CR mendekati nol dan sebagian cap waktu tidak
              berurutan; konsistensi matematis tidak membuktikan keaslian/independensi
              respons sehingga konfirmasi manual peneliti tetap diperlukan.
            </li>
            <li>
              Alternatif baseline terbatas pada 7 konfigurasi Lenovo demi keseragaman
              pengukuran daya tahan baterai (Lenovo PSREF video lokal 1080p @ 150 nit), dan
              seluruh kandidat memiliki SSD 512 GB (kontribusi C4 konstan).
            </li>
            <li>
              Harga dan ketersediaan merupakan snapshot audit bertanggal (bukan real-time),
              sebagian seri (A4, A6, A7) berstatus <em>withdrawn</em>, dan stok belum
              dikonfirmasi langsung ke penjual oleh kelompok.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
