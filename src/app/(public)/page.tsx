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
import { getCriteriaForMetric } from "@/lib/decision";
import {
  formatBatteryValue,
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

  const c6Metric = payload?.c6Metric ?? payload?.saw.c6Metric ?? "battery_wh";
  const activeCriteria = getCriteriaForMetric(c6Metric);
  const brands = payload
    ? (payload.researchSummary.brands ??
        Array.from(new Set(payload.saw.items.map((i) => i.brand))).sort((a, b) =>
          a.localeCompare(b, "id"),
        ))
    : [];
  const brandCount = payload?.researchSummary.brandCount ?? brands.length;

  const topThree = payload?.saw.items.slice(0, 3) ?? [];
  const topOne = topThree[0] ?? null;
  const topTwo = topThree[1] ?? null;

  const sortedWeights = payload
    ? [...activeCriteria]
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#e2e8f0] pb-4">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#1e293b]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      payload
                        ? payload.publicationStatus === "final"
                          ? "bg-emerald-600"
                          : "bg-amber-500"
                        : "bg-[#94a3b8]"
                    }`}
                    aria-hidden="true"
                  />
                  {payload
                    ? `Audit ${formatDateJakarta(payload.observedAt)}`
                    : "Menunggu Snapshot"}
                </span>
                <span className="text-[#cbd5e1]" aria-hidden="true">
                  /
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#64748b]">
                  Anggaran Rp9.000.000–Rp11.000.000
                </span>
              </div>

              <h1 className="text-[2.2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[#1e293b] sm:text-5xl lg:text-[3.3rem]">
                Pemilihan laptop mahasiswa yang terukur, transparan, dan dapat diaudit.
              </h1>

              <p className="max-w-[58ch] text-[15px] leading-[1.7] text-[#475569] sm:text-base">
                <strong className="text-[#1e293b]">LaptopMatch</strong> mengolah preferensi
                mahasiswa melalui <em>Analytical Hierarchy Process</em> (AHP) dan memeringkat
                penawaran laptop bersumber melalui <em>Simple Additive Weighting</em> (SAW) —
                tanpa bobot subjektif peneliti dan tanpa kotak hitam AI.
              </p>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
                <Link
                  href="/rekomendasi"
                  className="inline-flex h-11 items-center gap-2.5 rounded-lg bg-[#1e3a5f] px-5 text-sm font-medium text-white transition-all hover:bg-[#162d4a] active:scale-[0.99]"
                >
                  Lihat Peringkat SAW
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/metodologi"
                  className="inline-flex h-11 items-center gap-1.5 border-b border-[#1e3a5f] text-sm font-medium text-[#1e3a5f] transition-opacity hover:opacity-75"
                >
                  Pelajari Metodologi
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/laptop"
                  className="inline-flex h-11 items-center text-sm font-medium text-[#64748b] transition-colors hover:text-[#1e293b]"
                >
                  Katalog SKU
                </Link>
              </div>
            </div>

            {/* Right 5 cols — Airy Nordic Slate Live Snapshot Dossier */}
            <div className="min-w-0 lg:col-span-5">
              <div className="rounded-xl border border-[#cbd5e1] border-t-[3px] border-t-[#1e3a5f] bg-[#f8fafc] p-5 text-[#1e293b] shadow-[0_1px_4px_rgba(15,23,42,0.04)] sm:p-6">
                <div className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3.5">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#64748b]">
                    Live Snapshot Dossier
                  </span>
                  <span className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#1e3a5f]">
                    {payload ? payload.publicationStatus : "Belum Aktif"}
                  </span>
                </div>

                {payload && topOne ? (
                  <div className="mt-4 space-y-5">
                    {/* #1 vs #2 Micro Podium */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono text-[11px] text-[#64748b]">
                            #01 · {topOne.code} · {topOne.brand} · {topOne.cpuName}
                          </span>
                          <p className="mt-0.5 truncate text-base font-semibold tracking-[-0.02em] text-[#1e293b]">
                            {topOne.model}
                          </p>
                          <p className="font-mono text-xs text-[#64748b] tabular-nums">
                            {formatIdr(topOne.priceIdr)} · {topOne.ramGb} GB RAM ·{" "}
                            {formatBatteryValue(topOne, c6Metric)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block font-mono text-[10px] uppercase text-[#64748b]">
                            Skor V
                          </span>
                          <span className="font-mono text-xl font-semibold tabular-nums text-[#1e3a5f]">
                            {formatDecimal(topOne.score, 6)}
                          </span>
                        </div>
                      </div>

                      <ScoreBar value={topOne.score} />

                      {topTwo && (
                        <div className="flex min-w-0 items-center justify-between rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs">
                          <div className="min-w-0 truncate">
                            <span className="mr-1.5 font-mono text-[#64748b]">
                              #02 {topTwo.code}
                            </span>
                            <span className="font-medium text-[#1e293b]">{topTwo.model}</span>
                          </div>
                          <span className="ml-2 shrink-0 font-mono font-medium text-[#475569] tabular-nums">
                            {formatDecimal(topTwo.score, 6)}
                          </span>
                        </div>
                      )}

                      {payload.saw.topMargin !== null && payload.saw.topMargin < 0.01 && (
                        <p className="rounded-md border border-amber-200/80 bg-amber-50/80 px-2.5 py-1.5 font-mono text-[11px] text-amber-900 tabular-nums">
                          Δ Margin #1 vs #2: {formatDecimal(payload.saw.topMargin, 6)}
                          {payload.weightSensitivity
                            ? ` · ${payload.weightSensitivity.baselineWinnerCode} stabil ${payload.weightSensitivity.baselineWinnerWinsCount}/${payload.weightSensitivity.perturbedScenarioCount} skenario`
                            : " (tipis — sensitif)"}
                        </p>
                      )}
                    </div>

                    {/* Mini AHP Weight Pulse */}
                    <div className="space-y-2 border-t border-[#e2e8f0] pt-4">
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                        <span>
                          Bobot AHP ({payload.researchSummary.consistentResponses} Konsisten)
                        </span>
                        <span>CR {formatDecimal(payload.ahp.cr, 6)}</span>
                      </div>
                      <div className="space-y-1.5">
                        {sortedWeights.map(({ criterion, weight }) => (
                          <div
                            key={criterion.code}
                            className="grid grid-cols-[78px_1fr_44px] items-center gap-2 text-[11px]"
                          >
                            <span className="truncate font-mono text-[#475569]">
                              {criterion.code} {criterion.shortName}
                            </span>
                            <ScoreBar value={weight} max={0.3} className="h-1" />
                            <span className="text-right font-mono font-medium tabular-nums text-[#1e293b]">
                              {formatWeightPercent(weight, 2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-3.5 text-xs">
                      <Link
                        href={`/laptop/${topOne.code}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#1e3a5f] hover:underline"
                      >
                        Inspeksi Detail {topOne.code}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      <Link
                        href="/bandingkan"
                        className="font-mono text-[11px] text-[#64748b] hover:text-[#1e3a5f]"
                      >
                        Bandingkan →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-8">
                    <p className="text-sm font-semibold text-[#1e293b]">
                      Snapshot publikasi belum diaktifkan
                    </p>
                    <p className="text-xs leading-relaxed text-[#64748b]">
                      Panel ini otomatis menampilkan peringkat SAW dan bobot AHP presisi
                      penuh setelah administrator mempublikasikan hasil perhitungan dari
                      database.
                    </p>
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center gap-1.5 pt-1 text-xs font-semibold text-[#1e3a5f] underline"
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
      <section className="border-y border-[#e2e8f0] bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 divide-y divide-[#e2e8f0] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="border-r border-[#e2e8f0] px-4 py-6 sm:border-r-0 sm:px-6 sm:py-7">
            <p className="editorial-kicker">01 / Alternatif</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[#1e293b] sm:text-4xl">
              {payload ? payload.researchSummary.alternativeCount : "—"}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              {payload
                ? `${brandCount} merek · Audit ${formatDateJakarta(payload.observedAt)}`
                : "Menunggu publikasi"}
            </p>
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-7">
            <p className="editorial-kicker">02 / Kriteria Tetap</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[#1e293b] sm:text-4xl">
              {activeCriteria.length}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              2 Cost (C1, C5) · 4 Benefit ({c6Metric === "battery_wh" ? "C6 Wh" : "C6 jam"})
            </p>
          </div>

          <div className="border-r border-[#e2e8f0] px-4 py-6 sm:border-r-0 sm:px-6 sm:py-7">
            <p className="editorial-kicker">03 / Panel AHP</p>
            <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[#1e293b] sm:text-4xl">
              {payload
                ? `${payload.researchSummary.consistentResponses}/${payload.researchSummary.totalResponses}`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">Lolos uji CR ≤ 0,10</p>
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-7">
            <p className="editorial-kicker">04 / CR Gabungan</p>
            <p className="mt-2 font-mono text-2xl font-semibold tracking-[-0.03em] tabular-nums text-[#1e3a5f] sm:text-3xl sm:leading-[2.5rem]">
              {payload ? formatDecimal(payload.ahp.cr, 6) : "—"}
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              {payload
                ? payload.ahp.passesCr
                  ? "Konsisten (RI = 1,24)"
                  : "Melebihi ambang 0,10"
                : "Dihitung di server"}
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Top-3 Podium & AHP Breakdown on Cool Mist Paper */}
      <section className="bg-[#f8fafc]">
        <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="editorial-kicker">Hasil Pemeringkatan Terpublikasi</p>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#1e293b] sm:text-3xl">
                Tiga Peringkat Teratas SAW
              </h2>
            </div>
            {payload && (
              <Link
                href="/rekomendasi"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:underline"
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

              {payload.saw.topMargin !== null && payload.saw.topMargin < 0.01 && (
                <AlertBanner tone="neutral" title="Selisih peringkat #1 dan #2 relatif tipis">
                  Skor <strong>{payload.saw.items[0]?.code}</strong> ({payload.saw.items[0]?.brand},{" "}
                  <span className="font-mono">
                    {formatDecimal(payload.saw.items[0]?.score ?? 0, 6)}
                  </span>
                  ) unggul{" "}
                  <strong className="font-mono">
                    {formatDecimal(payload.saw.topMargin, 6)}
                  </strong>{" "}
                  dari <strong>{payload.saw.items[1]?.code}</strong> ({payload.saw.items[1]?.brand},{" "}
                  <span className="font-mono">
                    {formatDecimal(payload.saw.items[1]?.score ?? 0, 6)}
                  </span>
                  ).
                  {payload.weightSensitivity && (
                    <>
                      {" "}
                      Pada uji sensitivitas {payload.weightSensitivity.perturbedScenarioCount} skenario
                      perubahan satu bobot (±5%, ±10%, ±20%),{" "}
                      <strong>{payload.weightSensitivity.baselineWinnerCode}</strong> bertahan pada{" "}
                      <strong>
                        {payload.weightSensitivity.baselineWinnerWinsCount}/
                        {payload.weightSensitivity.perturbedScenarioCount}
                      </strong>{" "}
                      skenario ({formatDecimal(payload.weightSensitivity.baselineWinnerStabilityPct, 2)}%).
                    </>
                  )}{" "}
                  Tinjau simulasi interaktif di halaman{" "}
                  <Link href="/metodologi#sensitivitas" className="font-semibold text-[#1e3a5f] underline">
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
                      className={`min-w-0 flex flex-col justify-between rounded-lg border bg-white p-5 transition-colors hover:border-[#1e3a5f]/40 ${
                        isFirst
                          ? "border-[#cbd5e1] border-t-[3px] border-t-[#1e3a5f]"
                          : "border-[#e2e8f0]"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone={isFirst ? "dark" : "neutral"}>
                              #{item.rank}
                            </Badge>
                            <span className="font-mono text-xs font-semibold text-[#1e293b]">
                              {item.code}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-[#64748b]">
                            {item.brand}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.015em] text-[#1e293b]">
                            {item.model}
                          </h3>
                          <p className="mt-0.5 text-xs text-[#64748b]">{item.cpuName}</p>
                        </div>

                        <div className="space-y-2 border-y border-[#e2e8f0]/80 py-3.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-lg font-semibold tracking-[-0.02em] tabular-nums text-[#1e293b]">
                              {formatIdr(item.priceIdr)}
                            </span>
                            <span className="font-mono text-sm font-semibold tabular-nums text-[#1e3a5f]">
                              {formatDecimal(item.score, 6)}
                            </span>
                          </div>
                          <ScoreBar value={item.score} />
                        </div>

                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                              CPU Mark
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                              {formatInteger(item.cpuMark)}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                              RAM / SSD
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                              {item.ramGb} / {item.ssdGb} GB
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                              Berat
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                              {formatDecimal(item.weightKg, 2)} kg
                            </dd>
                          </div>
                          <div>
                            <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                              {c6Metric === "battery_wh" ? "Baterai (Wh)" : "Video 1080p"}
                            </dt>
                            <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                              {formatBatteryValue(item, c6Metric)}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-2 border-t border-[#e2e8f0]/80 pt-3.5">
                        <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                        <Link
                          href={`/laptop/${item.code}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] hover:underline"
                        >
                          Detail &amp; Sumber
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Asymmetric AHP Weights Section (5 / 7 split) */}
              <div className="grid gap-6 pt-4 lg:grid-cols-12">
                <div className="min-w-0 rounded-lg border border-[#e2e8f0] bg-white lg:col-span-5">
                  <div className="border-b border-[#e2e8f0] px-5 py-4">
                    <p className="editorial-kicker">Prioritas Kriteria</p>
                    <h3 className="mt-1 text-[15px] font-semibold text-[#1e293b]">
                      Bobot Eigenvector AHP (C1–C6)
                    </h3>
                  </div>
                  <div className="divide-y divide-[#e2e8f0]/75">
                    {activeCriteria.map((c) => {
                      const w = payload.ahp.weightsByCode[c.code];
                      return (
                        <div key={c.code} className="space-y-1.5 px-5 py-3">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-[#1e293b]">
                              <span className="mr-1.5 font-mono text-[#64748b]">
                                {c.code}
                              </span>
                              {c.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] uppercase text-[#64748b]">
                                {c.attribute}
                              </span>
                              <span className="font-mono font-semibold tabular-nums text-[#1e3a5f]">
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

                <div className="min-w-0 rounded-lg border border-[#e2e8f0] bg-white p-5 lg:col-span-7">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="editorial-kicker">Visualisasi Perbandingan</p>
                      <h3 className="mt-1 text-[15px] font-semibold text-[#1e293b]">
                        Bobot Utama (17 Konsisten) vs Sensitivitas (33 Respons)
                      </h3>
                    </div>
                    <span className="font-mono text-[11px] text-[#64748b]">
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

      {/* Section 4: Airy Nordic Mist 4-Step AHP–SAW Band (Zero Heavy Black Block) */}
      <section className="border-y border-[#e2e8f0] bg-[#f1f5f9]/70 text-[#1e293b]">
        <div className="mx-auto max-w-[1200px] space-y-10 px-4 py-16 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="editorial-kicker text-[#1e3a5f]">
                Arsitektur Matematis Deterministik
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] text-[#1e293b] sm:text-3xl">
                Empat Tahap dari Kuesioner ke Peringkat
              </h2>
            </div>
            <Link
              href="/metodologi"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e3a5f] hover:underline"
            >
              Lihat rumus &amp; referensi DOI
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-px overflow-hidden rounded-xl border border-[#cbd5e1] bg-[#e2e8f0] sm:grid-cols-2 lg:grid-cols-4">
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
                title: "Audit Sumber Lintas Merek",
                desc: "Setiap kandidat pada rentang Rp9–11 juta wajib menyertakan 4 tautan bukti: harga penawaran, spesifikasi SKU, PassMark CPU Mark, dan baterai resmi (kapasitas Wh sebagai proksi daya tahan).",
              },
              {
                step: "04",
                title: "Normalisasi & 37 Sensitivitas",
                desc: "SAW menormalisasi cost (min/x) dan benefit (x/max) tanpa pembulatan perantara, dilengkapi 37 skenario sensitivitas perubahan satu bobot (±5%, ±10%, ±20%) dengan total bobot tetap 1.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="space-y-3 bg-white p-6"
              >
                <span className="inline-flex rounded border border-[#c7d9ec] bg-[#eff4fa] px-2 py-0.5 font-mono text-xs font-semibold text-[#1e3a5f]">
                  {item.step}
                </span>
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[#1e293b]">
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed text-[#475569]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Research Scope & Academic Disclaimer */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-6 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1e293b]">
                <ShieldCheck className="h-4 w-4 text-[#1e3a5f]" aria-hidden="true" />
                Transparansi Sumber &amp; Batasan Ruang Lingkup
              </div>
              <p className="text-xs leading-relaxed text-[#475569]">
                {payload
                  ? c6Metric === "battery_wh"
                    ? `Snapshot aktif mencakup ${payload.researchSummary.alternativeCount} alternatif dari ${brandCount} merek (${brands.join(", ")}) hasil seleksi dari ${payload.researchSummary.candidateCount ?? payload.researchSummary.alternativeCount} kandidat pada audit ${formatDateJakarta(payload.observedAt)}. Kriteria C6 menggunakan kapasitas energi baterai (Wh) sebagai proksi daya tahan baterai dengan asumsi konsumsi daya setara — bukan jaminan durasi penggunaan aktual, bukan seluruh pasar Indonesia, dan bukan jaminan stok real-time.`
                    : `Snapshot historis ini mencakup ${payload.researchSummary.alternativeCount} alternatif pada audit ${formatDateJakarta(payload.observedAt)} dengan satuan baterai video lokal 1080p (jam). Hasil merefleksikan preferensi panel responden mahasiswa dan snapshot harga bertanggal.`
                  : "Sistem mendukung snapshot audit lintas merek pada rentang Rp9.000.000–Rp11.000.000 berdasarkan preferensi panel mahasiswa (AHP) dan data spesifikasi bersumber (SAW)."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3 text-xs font-medium">
              <Link
                href="/bandingkan"
                className="inline-flex h-10 items-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-[#1e293b] hover:bg-[#f1f5f9]"
              >
                Bandingkan Laptop
              </Link>
              <Link
                href="/tentang"
                className="inline-flex h-10 items-center rounded-lg bg-[#1e3a5f] px-4 text-white hover:bg-[#162d4a]"
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
