"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
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
  formatDecimal,
  formatIdr,
  formatInteger,
} from "@/lib/formatting";
import type { PublicLaptopRankingItem } from "@/lib/repositories/types";

export function RecommendationExplorer({
  items,
}: {
  items: PublicLaptopRankingItem[];
}) {
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<string>("all");
  const [ramFilter, setRamFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay =
          `${item.code} ${item.model} ${item.sku} ${item.cpuName} ${item.seller}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (maxPrice !== "all" && item.priceIdr > Number(maxPrice)) {
        return false;
      }
      if (ramFilter !== "all" && item.ramGb !== Number(ramFilter)) {
        return false;
      }
      return true;
    });
  }, [items, query, maxPrice, ramFilter]);

  return (
    <div className="space-y-8">
      {/* Integrated Editorial Filter Rail */}
      <div className="rounded-lg border border-[#e5e5e0] bg-[#f7f7f5] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e5e0] pb-3">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#52524e]">
            Pencarian & Filter Tampilan · {filtered.length}/{items.length} Kandidat
          </p>
          <Badge tone="neutral">Filter tampilan, bukan perhitungan ulang</Badge>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <div>
            <Label htmlFor="rec-search">Model, SKU, prosesor, atau kode</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#787872]"
                aria-hidden="true"
              />
              <Input
                id="rec-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mis. 14IAH8, Ryzen, i5, A7..."
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rec-price">Batas atas harga</Label>
            <Select
              id="rec-price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            >
              <option value="all">Semua (Rp9.000.000–Rp11.000.000)</option>
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
              <option value="8">8 GB</option>
              <option value="16">16 GB</option>
            </Select>
          </div>
        </div>

        <p className="text-[11px] text-[#787872]">
          Menyaring tampilan tidak mengubah peringkat global maupun skor preferensi SAW dari
          snapshot resmi.
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#d0d0c8] bg-[#f7f7f5]/60 px-6 py-12 text-center">
          <p className="text-sm font-medium text-[#111113]">
            Tidak ada alternatif yang cocok dengan filter Anda
          </p>
          <p className="mt-1 text-xs text-[#787872]">
            Coba reset filter harga atau RAM untuk menampilkan seluruh kandidat snapshot.
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
                      ? "border-[#e5e5e0] border-t-2 border-t-[#111113]"
                      : "border-[#e5e5e0]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                          #{item.rank}
                        </Badge>
                        <span className="font-mono text-xs font-semibold text-[#111113]">
                          {item.code}
                        </span>
                        <span className="truncate font-mono text-[11px] text-[#787872]">
                          {item.sku}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold leading-snug text-[#111113]">
                        {item.model}
                      </h3>
                      <p className="text-xs text-[#787872]">
                        {item.cpuName} · {item.seller}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block font-mono text-[10px] uppercase text-[#787872]">
                        Skor SAW
                      </span>
                      <span className="font-mono text-base font-bold tabular-nums text-[#111113]">
                        {formatDecimal(item.score, 6)}
                      </span>
                    </div>
                  </div>

                  <ScoreBar value={item.score} />

                  <div className="flex items-baseline justify-between border-y border-[#e5e5e0]/80 py-2.5">
                    <span className="font-mono text-[10px] uppercase text-[#787872]">
                      Harga Snapshot
                    </span>
                    <span className="text-base font-semibold tabular-nums text-[#111113]">
                      {formatIdr(item.priceIdr)}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded bg-[#f7f7f5] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#787872]">
                        CPU Mark
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                        {formatInteger(item.cpuMark)}
                      </dd>
                    </div>
                    <div className="rounded bg-[#f7f7f5] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#787872]">
                        RAM / SSD
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                        {item.ramGb} / {item.ssdGb} GB
                      </dd>
                    </div>
                    <div className="rounded bg-[#f7f7f5] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#787872]">
                        Berat
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                        {formatDecimal(item.weightKg, 2)} kg
                      </dd>
                    </div>
                    <div className="rounded bg-[#f7f7f5] px-2.5 py-2">
                      <dt className="font-mono text-[10px] uppercase text-[#787872]">
                        Video 1080p
                      </dt>
                      <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#111113]">
                        {formatDecimal(item.batteryHours, 1)} jam
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                    <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                  </div>

                  <Link
                    href={`/laptop/${item.code}`}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#111113] text-xs font-medium text-white hover:bg-[#27272a]"
                  >
                    Lihat Dekomposisi & 4 Sumber
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>

          {/* Desktop Precision Analytical Ranking Table (md+) */}
          <div className="hidden md:block rounded-lg border border-[#e5e5e0] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5e0] bg-[#f7f7f5] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#787872]">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Alternatif & Penjual</th>
                    <th className="px-3 py-3 text-right">Harga (C1)</th>
                    <th className="px-3 py-3 text-right">CPU (C2)</th>
                    <th className="px-3 py-3 text-right">RAM / SSD</th>
                    <th className="px-3 py-3 text-right">Berat / Video</th>
                    <th className="px-4 py-3 text-right w-40">Skor SAW</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e0]/80">
                  {filtered.map((item) => {
                    const stockBadge = formatStockStatusLabel(item.stockStatus);
                    const evBadge = formatEvidenceStatusLabel(item.evidenceStatus);
                    return (
                      <tr
                        key={item.code}
                        data-testid={`ranking-row-${item.code}`}
                        className={`transition-colors hover:bg-[#f7f7f5]/80 ${
                          item.rank === 1 ? "bg-[#f7f7f5]/50" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-4 align-top whitespace-nowrap">
                          <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                            #{item.rank}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-[#111113]">
                              {item.code}
                            </span>
                            <Link
                              href={`/laptop/${item.code}`}
                              className="font-semibold text-[#111113] hover:underline"
                            >
                              {item.model}
                            </Link>
                          </div>
                          <p className="mt-0.5 text-xs text-[#787872]">
                            {item.cpuName} · {item.seller}
                          </p>
                        </td>
                        <td className="px-3 py-4 align-top text-right font-mono text-[13px] font-medium tabular-nums whitespace-nowrap text-[#111113]">
                          {formatIdr(item.priceIdr)}
                        </td>
                        <td className="px-3 py-4 align-top text-right font-mono text-xs tabular-nums text-[#52524e]">
                          {formatInteger(item.cpuMark)}
                        </td>
                        <td className="px-3 py-4 align-top text-right font-mono text-xs tabular-nums whitespace-nowrap text-[#52524e]">
                          {item.ramGb} / {item.ssdGb} GB
                        </td>
                        <td className="px-3 py-4 align-top text-right font-mono text-xs tabular-nums whitespace-nowrap text-[#52524e]">
                          <div>{formatDecimal(item.weightKg, 2)} kg</div>
                          <div className="text-[11px] text-[#787872]">
                            {formatDecimal(item.batteryHours, 1)} jam
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-right">
                          <span
                            className="block font-mono text-sm font-semibold tabular-nums text-[#111113]"
                            data-testid={`ranking-score-${item.code}`}
                          >
                            {formatDecimal(item.score, 6)}
                          </span>
                          <ScoreBar value={item.score} className="mt-1.5 h-1" />
                        </td>
                        <td className="px-3 py-4 align-top space-y-1">
                          <div>
                            <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                          </div>
                          <div>
                            <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-right whitespace-nowrap">
                          <Link
                            href={`/laptop/${item.code}`}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d0d0c8] bg-white px-2.5 text-xs font-medium text-[#111113] hover:border-[#111113] hover:bg-[#f7f7f5]"
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

      {/* Contribution Breakdown Chart */}
      <div className="rounded-lg border border-[#e5e5e0] bg-white p-5 sm:p-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="editorial-kicker">Dekomposisi Preferensi</p>
            <h2 className="mt-1 text-base font-semibold text-[#111113]">
              Kontribusi Berbobot Setiap Kriteria (wⱼ × rᵢⱼ)
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[#787872]">
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
