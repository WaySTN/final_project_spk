import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import { CriteriaWeightsChart } from "@/components/decision/charts";
import {
  NoPublicationState,
  PublicationBanner,
} from "@/components/public/publication-banner";
import {
  AlertBanner,
  Badge,
  ScoreBar,
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
  const topOne = topThree[0] ?? null;
  const topTwo = topThree[1] ?? null;

  const sortedWeights = payload
    ? [...CRITERIA]
        .map((c) => ({
          criterion: c,
          weight: payload.ahp.weightsByCode[c.code],
        }))
        .sort((a, b) => b.weight - a.weight)
    : [];

  return (
    <div>
      {/* Section 1: Asymmetric Editorial Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-12">
            {/* Left 7 cols — Editorial Statement */}
            <div className="min-w-0 space-y-6 lg:col-span-7 lg:pt-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#e5e5e0] pb-4">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#111113]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      payload
                        ? payload.publicationStatus === "final"
                          ? "bg-emerald-600"
                          : "bg-amber-500"
                        : "bg-[#a1a1aa]"
                    }`}
                    aria-hidden="true"
                  />
                  {payload
                    ? `Audit ${formatDateJakarta(payload.observedAt)}`
                    : "Menunggu Snapshot"}
                </span>
                <span className="text-[#d0d0c8]" aria-hidden="true">
                  /
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#787872]">
                  Anggaran Rp9.000.000–Rp11.000.000
                </span>
              </div>

              <h1 className="text-[2.2rem] font-semibold leading-[1.07] tracking-[-0.035em] text-[#111113] sm:text-5xl lg:text-[3.35rem]">
                Pemilihan laptop mahasiswa yang terukur, transparan, dan dapat diaudit.
              </h1>

              <p className="max-w-[58ch] text-[15px] leading-[1.68] text-[#52524e] sm:text-base">
                <strong>LaptopMatch</strong> mengolah preferensi mahasiswa melalui{" "}
                <em>Analytical Hierarchy Process</em> (AHP) dan memeringkat penawaran laptop
                bersumber melalui <em>Simple Additive Weighting</em> (SAW) — tanpa bobot
                subjektif peneliti dan tanpa kotak hitam AI.
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
                <Link
                  href="/rekomendasi"
                  className="inline-flex h-11 items-center gap-2.5 rounded-lg bg-[#111113] px-5 text-sm font-medium text-white transition-all hover:bg-[#27272a] active:scale-[0.99]"
                >
                  Lihat Peringkat SAW
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/metodologi"
                  className="inline-flex h-11 items-center gap-1.5 border-b border-[#111113] text-sm font-medium text-[#111113] transition-opacity hover:opacity-70"
                >
                  Pelajari Metodologi
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/laptop"
                  className="inline-flex h-11 items-center text-sm font-medium text-[#787872] transition-colors hover:text-[#111113]"
                >
                  Katalog SKU
                </Link>
              </div>
            </div>

            {/* Right 5 cols — Obsidian Live Snapshot Dossier */}
            <div className="min-w-0 lg:col-span-5">
              <div className="rounded-xl border border-[#232327] bg-[#111113] p-5 text-white sm:p-6">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                    Live Snapshot Dossier
                  </span>
                  <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-zinc-200">
                    {payload ? payload.publicationStatus : "Belum Aktif"}
                  </span>
                </div>

                {payload && topOne ? (
                  <div className="mt-4 space-y-5">
                    {/* #1 vs #2 Micro Podium */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono text-[11px] text-zinc-400">
                            #01 · {topOne.code} · {topOne.cpuName}
                          </span>
                          <p className="mt-0.5 truncate text-base font-semibold tracking-[-0.02em] text-white">
                            {topOne.model}
                          </p>
                          <p className="font-mono text-xs text-zinc-400 tabular-nums">
                            {formatIdr(topOne.priceIdr)} · {topOne.ramGb} GB RAM ·{" "}
                            {formatDecimal(topOne.weightKg, 2)} kg
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block font-mono text-[10px] uppercase text-zinc-400">
                            Skor V
                          </span>
                          <span className="font-mono text-xl font-semibold tabular-nums text-white">
                            {formatDecimal(topOne.score, 6)}
                          </span>
                        </div>
                      </div>

                      <ScoreBar value={topOne.score} inverted />

                      {topTwo && (
                        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
                          <div className="min-w-0 truncate">
                            <span className="font-mono text-zinc-400 mr-1.5">
                              #02 {topTwo.code}
                            </span>
                            <span className="text-zinc-200">{topTwo.model}</span>
                          </div>
                          <span className="ml-2 shrink-0 font-mono text-zinc-300 tabular-nums">
                            {formatDecimal(topTwo.score, 6)}
                          </span>
                        </div>
                      )}

                      {payload.saw.topMargin !== null && payload.saw.topMargin < 0.001 && (
                        <p className="font-mono text-[11px] text-amber-300/90 tabular-nums">
                          Δ Margin #1 vs #2: {formatDecimal(payload.saw.topMargin, 6)} (sangat
                          tipis — sensitif)
                        </p>
                      )}
                    </div>

                    {/* Mini AHP Weight Pulse */}
                    <div className="border-t border-white/10 pt-4 space-y-2">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                        <span>Bobot AHP ({payload.researchSummary.consistentResponses} Konsisten)</span>
                        <span>CR {formatDecimal(payload.ahp.cr, 6)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {sortedWeights.map(({ criterion, weight }) => (
                          <div
                            key={criterion.code}
                            className="grid grid-cols-[78px_1fr_44px] items-center gap-2 text-[11px]"
                          >
                            <span className="truncate font-mono text-zinc-300">
                              {criterion.code} {criterion.shortName}
                            </span>
                            <ScoreBar value={weight} max={0.3} inverted className="h-1" />
                            <span className="text-right font-mono tabular-nums text-zinc-200">
                              {formatWeightPercent(weight, 2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3.5 text-xs">
                      <Link
                        href={`/laptop/${topOne.code}`}
                        className="inline-flex items-center gap-1.5 font-medium text-white hover:underline"
                      >
                        Inspeksi Detail {topOne.code}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      <Link
                        href="/bandingkan"
                        className="font-mono text-[11px] text-zinc-400 hover:text-white"
                      >
                        Bandingkan →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-3">
                    <p className="text-sm font-medium text-zinc-200">
                      Snapshot publikasi belum diaktifkan
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      Panel ini otomatis menampilkan peringkat SAW dan bobot AHP presisi
                      penuh setelah administrator mempublikasikan hasil perhitungan dari
                      database.
                    </p>
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center gap-1.5 pt-1 text-xs font-medium text-white underline"
                    >
                      Buka Panel Administrator
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Full-Width Architectural Hairline Metric Ledger */}
      <section className="border-y border-[#e5e5e0] bg-white">
        <div className="mx-auto max-w-[1200px] grid grid-cols-2 divide-y divide-[#e5e5e0] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-6 sm:px-6 sm:py-7 border-r border-[#e5e5e0] sm:border-r-0">
            <p className="editorial-kicker">01 / Alternatif</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[#111113] sm:text-4xl">
              {payload ? payload.researchSummary.alternativeCount : "—"}
            </p>
            <p className="mt-1 text-xs text-[#787872]">
              {payload
                ? `Audit ${formatDateJakarta(payload.observedAt)}`
                : "Menunggu publikasi"}
            </p>
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-7">
            <p className="editorial-kicker">02 / Kriteria Tetap</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[#111113] sm:text-4xl">
              {CRITERIA.length}
            </p>
            <p className="mt-1 text-xs text-[#787872]">
              2 Cost (C1, C5) · 4 Benefit
            </p>
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-7 border-r border-[#e5e5e0] sm:border-r-0">
            <p className="editorial-kicker">03 / Panel AHP</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[#111113] sm:text-4xl">
              {payload
                ? `${payload.researchSummary.consistentResponses}/${payload.researchSummary.totalResponses}`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-[#787872]">Lolos uji CR ≤ 0,10</p>
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-7">
            <p className="editorial-kicker">04 / CR Gabungan</p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.03em] tabular-nums text-[#111113] sm:text-3xl sm:leading-[2.5rem]">
              {payload ? formatDecimal(payload.ahp.cr, 6) : "—"}
            </p>
            <p className="mt-1 text-xs text-[#787872]">
              {payload
                ? payload.ahp.passesCr
                  ? "Konsisten (RI = 1,24)"
                  : "Melebihi ambang 0,10"
                : "Dihitung di server"}
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Top-3 Podium & AHP Breakdown on Warm Paper */}
      <section className="bg-[#f7f7f5]">
        <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 space-y-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="editorial-kicker">Hasil Pemeringkatan Terpublikasi</p>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#111113] sm:text-3xl">
                Tiga Peringkat Teratas SAW
              </h2>
            </div>
            {payload && (
              <Link
                href="/rekomendasi"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#111113] hover:underline"
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
                <AlertBanner tone="neutral" title="Selisih peringkat #1 dan #2 sangat tipis">
                  Skor <strong>{payload.saw.items[0]?.code}</strong> (
                  <span className="font-mono">
                    {formatDecimal(payload.saw.items[0]?.score ?? 0, 6)}
                  </span>
                  ) hanya unggul{" "}
                  <strong className="font-mono">
                    {formatDecimal(payload.saw.topMargin, 6)}
                  </strong>{" "}
                  dari <strong>{payload.saw.items[1]?.code}</strong> (
                  <span className="font-mono">
                    {formatDecimal(payload.saw.items[1]?.score ?? 0, 6)}
                  </span>
                  ). Peringkat sensitif terhadap perubahan bobot maupun ketersediaan stok —
                  tinjau analisis sensitivitas di halaman{" "}
                  <Link href="/metodologi#sensitivitas" className="font-semibold underline">
                    Metodologi
                  </Link>
                  .
                </AlertBanner>
              )}

              {/* Podium Cards */}
              <div className="grid gap-5 md:grid-cols-3">
                {topThree.map((item) => {
                  const stockBadge = formatStockStatusLabel(item.stockStatus);
                  const isFirst = item.rank === 1;
                  return (
                    <article
                      key={item.code}
                      className={`flex flex-col justify-between rounded-lg border bg-white p-5 transition-colors hover:border-[#111113]/40 ${
                        isFirst
                          ? "border-[#e5e5e0] border-t-2 border-t-[#111113]"
                          : "border-[#e5e5e0]"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone={isFirst ? "dark" : "neutral"}>
                              #{item.rank}
                            </Badge>
                            <span className="font-mono text-xs font-semibold text-[#111113]">
                              {item.code}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-[#787872]">
                            SKU {item.sku}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.015em] text-[#111113]">
                            {item.model}
                          </h3>
                          <p className="mt-0.5 text-xs text-[#787872]">{item.cpuName}</p>
                        </div>

                        <div className="space-y-2 border-y border-[#e5e5e0]/80 py-3.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-lg font-semibold tracking-[-0.02em] tabular-nums text-[#111113]">
                              {formatIdr(item.priceIdr)}
                            </span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-[#111113]">
                              {formatDecimal(item.score, 6)}
                            </span>
                          </div>
                          <ScoreBar value={item.score} />
                        </div>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#787872]">
                              CPU Mark
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                              {formatInteger(item.cpuMark)}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#787872]">
                              RAM / SSD
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                              {item.ramGb} / {item.ssdGb} GB
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#787872]">
                              Berat
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                              {formatDecimal(item.weightKg, 2)} kg
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#787872]">
                              Video 1080p
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                              {formatDecimal(item.batteryHours, 1)} jam
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#e5e5e0]/80 pt-3.5">
                        <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                        <Link
                          href={`/laptop/${item.code}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#111113] hover:underline"
                        >
                          Detail & Sumber
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Asymmetric AHP Weights Section (5 / 7 split) */}
              <div className="grid gap-6 pt-4 lg:grid-cols-12">
                <div className="min-w-0 rounded-lg border border-[#e5e5e0] bg-white lg:col-span-5">
                  <div className="border-b border-[#e5e5e0] px-5 py-4">
                    <p className="editorial-kicker">Prioritas Kriteria</p>
                    <h3 className="mt-1 text-[15px] font-semibold text-[#111113]">
                      Bobot Eigenvector AHP (C1–C6)
                    </h3>
                  </div>
                  <div className="divide-y divide-[#e5e5e0]/70">
                    {CRITERIA.map((c) => {
                      const w = payload.ahp.weightsByCode[c.code];
                      return (
                        <div key={c.code} className="px-5 py-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-[#111113]">
                              <span className="font-mono text-[#787872] mr-1.5">
                                {c.code}
                              </span>
                              {c.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] uppercase text-[#787872]">
                                {c.attribute}
                              </span>
                              <span className="font-mono font-semibold tabular-nums text-[#111113]">
                                {formatWeightPercent(w, 2)}
                              </span>
                            </div>
                          </div>
                          <ScoreBar value={w} max={0.28} className="h-1" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="min-w-0 rounded-lg border border-[#e5e5e0] bg-white p-5 lg:col-span-7">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="editorial-kicker">Visualisasi Perbandingan</p>
                      <h3 className="mt-1 text-[15px] font-semibold text-[#111113]">
                        Bobot Utama (17 Konsisten) vs Sensitivitas (33 Respons)
                      </h3>
                    </div>
                    <span className="font-mono text-[11px] text-[#787872]">
                      AIJ Geometric Mean
                    </span>
                  </div>
                  <CriteriaWeightsChart
                    weightsByCode={payload.ahp.weightsByCode}
                    comparisonWeightsByCode={payload.sensitivity.allEligibleWeightsByCode}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Section 4: Sculptural Obsidian 4-Step AHP-SAW Band */}
      <section className="bg-[#111113] text-white">
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 space-y-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
                Arsitektur Matematis Deterministik
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-white sm:text-3xl">
                Empat Tahap dari Kuesioner ke Peringkat
              </h2>
            </div>
            <Link
              href="/metodologi"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-200 hover:text-white hover:underline"
            >
              Lihat rumus & referensi DOI
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {[
              {
                step: "01",
                title: "Kuesioner 15 Pasangan",
                desc: "Mahasiswa aktif menilai 15 pasangan kriteria pada skala Saaty sederhana (1, 3, 5, 7, 9 beserta kebalikannya) secara terstruktur.",
              },
              {
                step: "02",
                title: "Power Iteration & AIJ",
                desc: "Setiap matriks 6×6 diuji konsistensinya (CR ≤ 0,10, RI = 1,24), lalu diagregasikan menggunakan rata-rata geometrik agar sifat resiprokal terjaga.",
              },
              {
                step: "03",
                title: "Audit Sumber Terbatas",
                desc: "Setiap kandidat pada rentang Rp9–11 juta wajib menyertakan 4 tautan bukti: harga penawaran, spesifikasi SKU, PassMark CPU Mark, dan durasi video 1080p PSREF.",
              },
              {
                step: "04",
                title: "Normalisasi & Sensitivitas",
                desc: "SAW menormalisasi cost (min/x) dan benefit (x/max) tanpa pembulatan perantara, lengkap dengan simulasi 33 respons serta 5 alternatif tanpa A6/A7.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="py-6 sm:px-5 lg:py-8 first:sm:pl-0 last:sm:pr-0 space-y-3"
              >
                <span className="font-mono text-2xl font-semibold tracking-tight text-zinc-500">
                  {item.step}
                </span>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Research Scope & Academic Disclaimer */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-6 rounded-lg border border-[#e5e5e0] bg-[#f7f7f5] p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#111113]">
                <ShieldCheck className="h-4 w-4 text-[#111113]" aria-hidden="true" />
                Transparansi Sumber & Batasan Ruang Lingkup
              </div>
              <p className="text-xs leading-relaxed text-[#52524e]">
                Alternatif baseline terbatas pada tujuh konfigurasi Lenovo demi keseragaman
                pengukuran daya tahan baterai (estimasi maksimum pemutaran video lokal 1080p
                pada 150 nit dari Lenovo PSREF). Hasil merefleksikan preferensi panel
                responden mahasiswa dan snapshot harga pada tanggal audit — bukan seluruh
                pasar laptop Indonesia dan bukan jaminan stok real-time.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3 text-xs font-medium">
              <Link
                href="/bandingkan"
                className="inline-flex h-10 items-center rounded-lg border border-[#d0d0c8] bg-white px-4 text-[#111113] hover:bg-[#f2f2ee]"
              >
                Bandingkan Laptop
              </Link>
              <Link
                href="/tentang"
                className="inline-flex h-10 items-center rounded-lg bg-[#111113] px-4 text-white hover:bg-[#27272a]"
              >
                Tentang Kelompok 13
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
