"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search } from "lucide-react";
import { SawContributionChart } from "@/components/decision/charts";
import {
  Badge,
  Input,
  Label,
  ScoreBar,
  Select,
  formatEvidenceStatusLabel,
  formatStockStatusLabel,
} from "@/components/ui/primitives";
import {
  buildDecisionEvaluation,
  type C6MetricType,
  type WeightSensitivitySuiteResult,
} from "@/lib/decision";
import {
  formatBatteryValue,
  formatDecimal,
  formatIdr,
  formatInteger,
} from "@/lib/formatting";
import type { PublicLaptopRankingItem } from "@/lib/repositories/types";

export function RecommendationExplorer({
  items,
  c6Metric = "battery_wh",
  weightSensitivity = null,
}: {
  items: PublicLaptopRankingItem[];
  c6Metric?: C6MetricType;
  weightSensitivity?: WeightSensitivitySuiteResult | null;
}) {
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("all");
  const [ramFilter, setRamFilter] = useState<string>("all");
  const [ssdFilter, setSsdFilter] = useState<string>("all");

  const brands = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.brand))).sort((a, b) =>
        a.localeCompare(b, "id"),
      ),
    [items],
  );
  const ramOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.ramGb))).sort((a, b) => a - b),
    [items],
  );
  const ssdOptions = useMemo(
    () => Array.from(new Set(items.map((i) => i.ssdGb))).sort((a, b) => a - b),
    [items],
  );

  const evaluation = useMemo(
    () => buildDecisionEvaluation({ items, weightSensitivity, c6Metric }),
    [items, weightSensitivity, c6Metric],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay =
          `${item.code} ${item.brand} ${item.model} ${item.sku} ${item.cpuName} ${item.seller}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (brandFilter !== "all" && item.brand !== brandFilter) {
        return false;
      }
      if (maxPrice !== "all" && item.priceIdr > Number(maxPrice)) {
        return false;
      }
      if (ramFilter !== "all" && item.ramGb !== Number(ramFilter)) {
        return false;
      }
      if (ssdFilter !== "all" && item.ssdGb !== Number(ssdFilter)) {
        return false;
      }
      return true;
    });
  }, [items, query, brandFilter, maxPrice, ramFilter, ssdFilter]);

  const c6ShortLabel = c6Metric === "battery_wh" ? "Baterai (Wh)" : "Video 1080p";

  return (
    <div className="space-y-8">
      {/* Integrated Editorial Filter Rail */}
      <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#475569]">
            Pencarian &amp; Filter Tampilan · {filtered.length}/{items.length} Kandidat
          </p>
          <Badge tone="neutral">Filter tampilan, peringkat global tetap</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="rec-search">Cari model, prosesor, atau kode</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#64748b]"
                aria-hidden="true"
              />
              <Input
                id="rec-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mis. A33, TECNO, Ryzen, i5..."
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rec-brand">Merek ({brands.length})</Label>
            <Select
              id="rec-brand"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="all">Semua Merek</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="rec-price">Batas atas harga</Label>
            <Select
              id="rec-price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            >
              <option value="all">Semua (Rp9–11 juta)</option>
              <option value="9500000">≤ Rp9.500.000</option>
              <option value="9800000">≤ Rp9.800.000</option>
              <option value="10000000">≤ Rp10.000.000</option>
              <option value="10500000">≤ Rp10.500.000</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="rec-ram">Kapasitas RAM</Label>
            <Select
              id="rec-ram"
              value={ramFilter}
              onChange={(e) => setRamFilter(e.target.value)}
            >
              <option value="all">Semua RAM</option>
              {ramOptions.map((gb) => (
                <option key={gb} value={String(gb)}>
                  {gb} GB
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="rec-ssd">Kapasitas SSD</Label>
            <Select
              id="rec-ssd"
              value={ssdFilter}
              onChange={(e) => setSsdFilter(e.target.value)}
            >
              <option value="all">Semua SSD</option>
              {ssdOptions.map((gb) => (
                <option key={gb} value={String(gb)}>
                  {gb === 1000 ? "1.000 GB (1 TB)" : `${gb} GB`}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <p className="text-[11px] text-[#64748b]">
          Menyaring tampilan berdasarkan merek, harga, RAM, atau SSD tidak mengubah peringkat
          global maupun skor preferensi SAW dari snapshot resmi.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc]/60 px-6 py-12 text-center">
          <p className="text-sm font-medium text-[#1e293b]">
            Tidak ada alternatif yang cocok dengan filter Anda
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            Coba reset filter merek, harga, RAM, atau SSD untuk menampilkan seluruh kandidat snapshot.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile First-Class Spec Cards (< md: zero horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {filtered.map((item) => {
              const stockBadge = formatStockStatusLabel(item.stockStatus);
              const evBadge = formatEvidenceStatusLabel(item.evidenceStatus);
              return (
                <article
                  key={item.code}
                  data-testid={`mobile-ranking-card-${item.code}`}
                  className={`rounded-lg border bg-white p-4 space-y-3.5 ${
                    item.rank === 1
                      ? "border-[#e2e8f0] border-t-2 border-t-[#1e3a5f]"
                      : "border-[#e2e8f0]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                          #{item.rank}
                        </Badge>
                        <span className="font-mono text-xs font-semibold text-[#1e293b]">
                          {item.code}
                        </span>
                        <span className="rounded bg-[#eff4fa] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#1e3a5f]">
                          {item.brand}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold leading-snug text-[#1e293b]">
                        {item.model}
                      </h3>
                      <p className="text-xs text-[#64748b]">
                        {item.cpuName} · {item.seller}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block font-mono text-[10px] uppercase text-[#64748b]">
                        Skor SAW
                      </span>
                      <span className="font-mono text-base font-bold tabular-nums text-[#1e3a5f]">
                        {formatDecimal(item.score, 6)}
                      </span>
                    </div>
                  </div>

                  <ScoreBar value={item.score} />

                  <div className="flex items-baseline justify-between border-y border-[#e2e8f0]/80 py-2.5">
                    <span className="font-mono text-[10px] uppercase text-[#64748b]">
                      Harga Snapshot
                    </span>
                    <span className="text-base font-semibold tabular-nums text-[#1e293b]">
                      {formatIdr(item.priceIdr)}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded bg-[#f8fafc] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                        CPU Mark
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                        {formatInteger(item.cpuMark)}
                      </dd>
                    </div>
                    <div className="rounded bg-[#f8fafc] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                        RAM / SSD
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                        {item.ramGb} / {item.ssdGb} GB
                      </dd>
                    </div>
                    <div className="rounded bg-[#f8fafc] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                        Berat
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                        {formatDecimal(item.weightKg, 2)} kg
                      </dd>
                    </div>
                    <div className="rounded bg-[#f8fafc] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                        {c6ShortLabel}
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                        {formatBatteryValue(item, c6Metric)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                    <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                  </div>

                  <Link
                    href={`/laptop/${item.code}`}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] text-xs font-medium text-white hover:bg-[#162d4a]"
                  >
                    Lihat Dekomposisi &amp; 4 Sumber
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>

          {/* Desktop Precision Analytical Ranking Table (md+) */}
          <div className="hidden md:block rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Alternatif, Merek &amp; Penjual</th>
                    <th className="px-3 py-3 text-right">Harga (C1)</th>
                    <th className="px-3 py-3 text-right">CPU (C2)</th>
                    <th className="px-3 py-3 text-right">RAM / SSD</th>
                    <th className="px-3 py-3 text-right">
                      Berat / {c6Metric === "battery_wh" ? "Wh" : "Jam"}
                    </th>
                    <th className="px-4 py-3 text-right w-40">Skor SAW</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/80">
                  {filtered.map((item) => {
                    const stockBadge = formatStockStatusLabel(item.stockStatus);
                    const evBadge = formatEvidenceStatusLabel(item.evidenceStatus);
                    return (
                      <tr
                        key={item.code}
                        data-testid={`ranking-row-${item.code}`}
                        className={`transition-colors hover:bg-[#f8fafc]/80 ${
                          item.rank === 1 ? "bg-[#eff4fa]/45" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                            #{item.rank}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-[#1e293b]">
                              {item.code}
                            </span>
                            <span className="rounded bg-[#eff4fa] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#1e3a5f]">
                              {item.brand}
                            </span>
                            <Link
                              href={`/laptop/${item.code}`}
                              className="font-semibold text-[#1e293b] hover:underline"
                            >
                              {item.model}
                            </Link>
                          </div>
                          <p className="mt-0.5 text-xs text-[#64748b]">
                            {item.cpuName} · {item.seller}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 align-top text-right font-mono text-[13px] font-medium tabular-nums whitespace-nowrap text-[#1e293b]">
                          {formatIdr(item.priceIdr)}
                        </td>
                        <td className="px-3 py-3.5 align-top text-right font-mono text-xs tabular-nums text-[#475569]">
                          {formatInteger(item.cpuMark)}
                        </td>
                        <td className="px-3 py-3.5 align-top text-right font-mono text-xs tabular-nums whitespace-nowrap text-[#475569]">
                          {item.ramGb} / {item.ssdGb} GB
                        </td>
                        <td className="px-3 py-3.5 align-top text-right font-mono text-xs tabular-nums whitespace-nowrap text-[#475569]">
                          <div>{formatDecimal(item.weightKg, 2)} kg</div>
                          <div className="text-[11px] text-[#64748b]">
                            {formatBatteryValue(item, c6Metric)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top text-right">
                          <span
                            className="block font-mono text-sm font-semibold tabular-nums text-[#1e3a5f]"
                            data-testid={`ranking-score-${item.code}`}
                          >
                            {formatDecimal(item.score, 6)}
                          </span>
                          <ScoreBar value={item.score} className="mt-1.5 h-1" />
                        </td>
                        <td className="px-3 py-3.5 align-top space-y-1">
                          <div>
                            <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                          </div>
                          <div>
                            <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                          <Link
                            href={`/laptop/${item.code}`}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#cbd5e1] bg-white px-2.5 text-xs font-medium text-[#1e293b] hover:border-[#1e3a5f] hover:bg-[#f8fafc]"
                          >
                            Detail
                            <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Dynamic Decision Evaluation Panel (UAS Requirement) */}
      {evaluation.winner && (
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#e2e8f0] pb-3.5">
            <div>
              <p className="editorial-kicker">Evaluasi Kesesuaian Hasil Keputusan</p>
              <h2 className="mt-1 text-base font-semibold text-[#1e293b]">
                Analisis Kontribusi Kriteria &amp; Perbandingan Peringkat Ekstrem
              </h2>
            </div>
            <Link
              href="/metodologi#sensitivitas"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] hover:underline"
            >
              Buka Analisis Sensitivitas 37 Skenario
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#cbd5e1] bg-[#eff4fa]/60 p-4 space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#1e3a5f]">
                Peringkat Tertinggi (#1)
              </p>
              <p className="font-mono text-sm font-semibold text-[#1e293b]">
                {evaluation.winner.code} · {formatDecimal(evaluation.winner.score, 6)}
              </p>
              <p className="text-xs text-[#475569]">{evaluation.winner.model}</p>
              <p className="pt-1 text-[11px] text-[#64748b]">
                Penopang utama:{" "}
                {evaluation.winner.strongestCriteria
                  .slice(0, 2)
                  .map((c) => `${c.code} ${c.name} (${formatDecimal(c.contribution, 4)})`)
                  .join(", ")}
              </p>
            </div>

            {evaluation.runnerUp && (
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                  Pesaing Terdekat (#2)
                </p>
                <p className="font-mono text-sm font-semibold text-[#1e293b]">
                  {evaluation.runnerUp.code} · {formatDecimal(evaluation.runnerUp.score, 6)}
                </p>
                <p className="text-xs text-[#475569]">{evaluation.runnerUp.model}</p>
                <p className="pt-1 text-[11px] text-[#64748b]">
                  Margin: {formatDecimal(evaluation.runnerUp.marginFromWinner, 6)}
                  {evaluation.runnerUp.advantageCriteria.length > 0
                    ? ` · Unggul di ${evaluation.runnerUp.advantageCriteria
                        .slice(0, 2)
                        .map((c) => `${c.code} ${c.name}`)
                        .join(", ")}`
                    : ""}
                </p>
              </div>
            )}

            {evaluation.lowest && (
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                  Peringkat Terendah (#{evaluation.totalAlternatives})
                </p>
                <p className="font-mono text-sm font-semibold text-[#1e293b]">
                  {evaluation.lowest.code} · {formatDecimal(evaluation.lowest.score, 6)}
                </p>
                <p className="text-xs text-[#475569]">{evaluation.lowest.model}</p>
                <p className="pt-1 text-[11px] text-[#64748b]">
                  Selisih dari #1: {formatDecimal(evaluation.lowest.gapFromWinner, 6)} ·
                  Terlemah di {evaluation.lowest.weakestCriteria[0]?.code}{" "}
                  {evaluation.lowest.weakestCriteria[0]?.name}
                </p>
              </div>
            )}
          </div>

          <ul className="space-y-1.5 text-xs leading-relaxed text-[#475569]">
            {evaluation.insights.map((line, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1e3a5f]"
                  aria-hidden="true"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contribution Breakdown Chart */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="editorial-kicker">Dekomposisi Preferensi</p>
            <h2 className="mt-1 text-base font-semibold text-[#1e293b]">
              Kontribusi Berbobot Setiap Kriteria (wⱼ × rᵢⱼ)
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[#64748b]">
            Skala 0,000000 – 1,000000
          </span>
        </div>
        <SawContributionChart
          items={items.map((item) => ({
            code: item.code,
            model: item.model,
            score: item.score,
            weightedValues: item.weightedValues,
          }))}
        />
      </div>
    </div>
  );
}
