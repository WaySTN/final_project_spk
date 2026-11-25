import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  Database,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { CriteriaWeightsChart } from "@/components/decision/charts";
import {
  NoPublicationState,
  PublicationBanner,
} from "@/components/public/publication-banner";
import {
  AlertBanner,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  formatStockStatusLabel,
} from "@/components/ui/primitives";
import { CRITERIA } from "@/lib/decision";
import {
  formatDateJakarta,
  formatDecimal,
  formatIdr,
  formatInteger,
  formatWeightPercent,
} from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const repo = await getRepository();
  const publication = await repo.getCurrentPublication();
  const payload = publication?.publicPayload ?? null;

  const topThree = payload?.saw.items.slice(0, 3) ?? [];

  return (
    <div className="divide-y divide-zinc-200">
      {/* Hero Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="dark">Anggaran Tetap: Rp9.000.000–Rp11.000.000</Badge>
              <Badge tone="neutral">AHP (Pembobotan) + SAW (Pemeringkatan)</Badge>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl leading-[1.15]">
              Pemilihan Laptop Mahasiswa yang Terukur, Transparan, dan Dapat Diaudit.
            </h1>

            <p className="text-base text-zinc-600 sm:text-lg leading-relaxed">
              <strong>LaptopMatch</strong> membantu mahasiswa membandingkan alternatif laptop
              dalam kisaran harga Rp9–11 juta menggunakan bobot kriteria dari kuesioner
              mahasiswa (<strong>AHP</strong>) dan pemeringkatan multikriteria berbasis data
              spesifikasi bersumber (<strong>SAW</strong>).
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/rekomendasi"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
              >
                Lihat Rekomendasi
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/metodologi"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                Pelajari Metodologi
              </Link>
              <Link
                href="/laptop"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                Jelajahi Katalog
              </Link>
            </div>
          </div>

          {/* Dynamic Snapshot Stats */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-xs font-medium text-zinc-500">Alternatif Dinilai</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900">
                {payload ? payload.researchSummary.alternativeCount : "—"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {payload
                  ? `Snapshot audit ${formatDateJakarta(payload.observedAt)}`
                  : "Menunggu publikasi snapshot"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-xs font-medium text-zinc-500">Kriteria Penelitian</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900">
                {CRITERIA.length}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                2 Cost (Harga, Berat) · 4 Benefit
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-xs font-medium text-zinc-500">Panel Responden AHP</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900">
                {payload
                  ? `${payload.researchSummary.consistentResponses} / ${payload.researchSummary.totalResponses}`
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Lolos konsistensi CR ≤ 0,10
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-4">
              <p className="text-xs font-medium text-zinc-500">CR Gabungan (AIJ)</p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-zinc-900">
                {payload ? formatDecimal(payload.ahp.cr, 6) : "—"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {payload
                  ? payload.ahp.passesCr
                    ? "Konsisten (ambang ≤ 0,10)"
                    : "Melebihi ambang"
                  : "Dihitung dinamis di server"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Ranking Preview */}
      <section className="bg-zinc-50/60">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Hasil Pemeringkatan Terpublikasi
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                Preview Peringkat Teratas SAW
              </h2>
            </div>
            {payload && (
              <Link
                href="/rekomendasi"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 hover:underline"
              >
                Lihat seluruh {payload.saw.items.length} peringkat
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>

          {!payload ? (
            <NoPublicationState />
          ) : (
            <>
              <PublicationBanner payload={payload} />

              {payload.saw.topMargin !== null && payload.saw.topMargin < 0.001 && (
                <AlertBanner tone="neutral" title="Selisih peringkat 1 dan 2 sangat tipis">
                  Selisih skor antara{" "}
                  <strong>{payload.saw.items[0]?.code}</strong> (
                  {formatDecimal(payload.saw.items[0]?.score ?? 0, 6)}) dan{" "}
                  <strong>{payload.saw.items[1]?.code}</strong> (
                  {formatDecimal(payload.saw.items[1]?.score ?? 0, 6)}) hanya{" "}
                  <strong className="tabular-nums">
                    {formatDecimal(payload.saw.topMargin, 6)}
                  </strong>
                  . Peringkat sensitif terhadap perubahan bobot maupun ketersediaan produk —
                  lihat bagian analisis sensitivitas di halaman Metodologi.
                </AlertBanner>
              )}

              <div className="grid gap-5 md:grid-cols-3">
                {topThree.map((item) => {
                  const stockBadge = formatStockStatusLabel(item.stockStatus);
                  return (
                    <Card key={item.code} className="flex flex-col justify-between">
                      <CardHeader className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                            Peringkat #{item.rank}
                          </Badge>
                          <span className="font-mono text-xs text-zinc-500">
                            {item.code}
                          </span>
                        </div>
                        <CardTitle className="text-base leading-snug">
                          {item.model}
                        </CardTitle>
                        <CardDescription>{item.cpuName}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-baseline justify-between border-b border-zinc-100 pb-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-zinc-400">
                              Harga Penawaran
                            </p>
                            <p className="text-lg font-bold tabular-nums text-zinc-900">
                              {formatIdr(item.priceIdr)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wider text-zinc-400">
                              Nilai SAW
                            </p>
                            <p className="font-mono text-lg font-bold tabular-nums text-zinc-900">
                              {formatDecimal(item.score, 6)}
                            </p>
                          </div>
                        </div>

                        <dl className="grid grid-cols-2 gap-y-2 text-xs">
                          <div>
                            <dt className="text-zinc-500">CPU Mark</dt>
                            <dd className="font-medium tabular-nums">
                              {formatInteger(item.cpuMark)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">RAM / SSD</dt>
                            <dd className="font-medium tabular-nums">
                              {item.ramGb} GB / {item.ssdGb} GB
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">Berat</dt>
                            <dd className="font-medium tabular-nums">
                              {formatDecimal(item.weightKg, 2)} kg
                            </dd>
                          </div>
                          <div>
                            <dt className="text-zinc-500">Video 1080p</dt>
                            <dd className="font-medium tabular-nums">
                              {formatDecimal(item.batteryHours, 1)} jam
                            </dd>
                          </div>
                        </dl>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                          <Link
                            href={`/laptop/${item.code}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 hover:underline"
                          >
                            Detail & Sumber
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* AHP Weights Visual Summary */}
              <div className="grid gap-6 pt-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Bobot Kriteria Hasil AHP</CardTitle>
                    <CardDescription>
                      Diperoleh dari agregasi geometrik (AIJ) {payload.researchSummary.consistentResponses}{" "}
                      responden mahasiswa yang lolos uji konsistensi CR ≤ 0,10.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CriteriaWeightsChart
                      weightsByCode={payload.ahp.weightsByCode}
                      comparisonWeightsByCode={payload.sensitivity.allEligibleWeightsByCode}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ringkasan Bobot & Atribut</CardTitle>
                    <CardDescription>
                      Kriteria tetap C1–C6 sesuai rancangan penelitian Kelompok 13.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                          <th className="px-4 py-2.5">Kriteria</th>
                          <th className="px-4 py-2.5">Atribut</th>
                          <th className="px-4 py-2.5 text-right">Bobot AHP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {CRITERIA.map((c) => (
                          <tr key={c.code}>
                            <td className="px-4 py-2.5">
                              <span className="font-mono text-xs text-zinc-500 mr-1.5">
                                {c.code}
                              </span>
                              <span className="font-medium text-zinc-900">{c.name}</span>
                            </td>
                            <td className="px-4 py-2.5 text-xs uppercase text-zinc-600">
                              {c.attribute}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                              {formatWeightPercent(payload.ahp.weightsByCode[c.code], 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </section>

      {/* How AHP-SAW Works */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Transparansi Algoritma
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
              Cara Kerja Model AHP–SAW
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Scale,
                step: "01",
                title: "Kuesioner 15 Pasangan",
                desc: "Mahasiswa aktif membandingkan 6 kriteria berpasangan pada skala Saaty sederhana (1, 3, 5, 7, 9 dan kebalikannya).",
              },
              {
                icon: ShieldCheck,
                step: "02",
                title: "Uji Konsistensi & AIJ",
                desc: "Setiap matriks 6×6 diuji dengan eigenvector power iteration dan CR ≤ 0,10 (RI = 1,24), lalu diagregasikan secara geometrik.",
              },
              {
                icon: Database,
                step: "03",
                title: "Data Bersumber Terbatas",
                desc: "Alternatif pada rentang Rp9–11 juta dicatat lengkap dengan URL harga, spesifikasi PSREF, PassMark CPU Mark, dan durasi video 1080p.",
              },
              {
                icon: Calculator,
                step: "04",
                title: "Normalisasi & Skor SAW",
                desc: "Kriteria cost (min/x) dan benefit (x/max) dinormalisasi, dikalikan bobot AHP presisi penuh, lalu diurutkan beserta analisis sensitivitas.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-900">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-zinc-400">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900">{item.title}</h3>
                  <p className="text-xs text-zinc-600 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Scope & Limitations Footer Box */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <CheckCircle2 className="h-4 w-4 text-zinc-700" aria-hidden="true" />
              Sumber Data & Batasan Ruang Lingkup Penelitian
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Alternatif baseline terbatas pada tujuh konfigurasi merek Lenovo demi
              keseragaman protokol pengukuran daya tahan baterai (estimasi maksimum pemutaran
              video lokal 1080p pada kecerahan 150 nit dari Lenovo PSREF). Hasil merefleksikan
              preferensi panel responden mahasiswa dan snapshot harga pada tanggal audit —
              bukan representasi seluruh pasar laptop Indonesia dan bukan jaminan ketersediaan
              stok real-time.
            </p>
            <div className="pt-1 flex flex-wrap gap-4 text-xs font-medium">
              <Link href="/metodologi" className="text-zinc-900 underline">
                Baca Metodologi & Referensi DOI
              </Link>
              <Link href="/bandingkan" className="text-zinc-900 underline">
                Bandingkan Maks. 3 Laptop
              </Link>
              <Link href="/tentang" className="text-zinc-900 underline">
                Tentang Kelompok 13
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
