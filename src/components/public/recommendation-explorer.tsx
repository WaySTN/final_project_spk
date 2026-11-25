"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Filter, Search } from "lucide-react";
import { SawContributionChart } from "@/components/decision/charts";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
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
        const hay = `${item.code} ${item.model} ${item.sku} ${item.cpuName} ${item.seller}`.toLowerCase();
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
    <div className="space-y-6">
      {/* Display-only filters (never re-ranks global SAW run per PRD §4.1 & E11) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-zinc-600" aria-hidden="true" />
              Pencarian & Filter Tampilan
            </CardTitle>
            <Badge tone="neutral">Filter tampilan, bukan perhitungan ulang</Badge>
          </div>
          <CardDescription className="text-xs">
            Menyaring daftar di bawah tidak mengubah peringkat global maupun nilai preferensi
            SAW dari snapshot resmi yang dipublikasikan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="rec-search">Cari model, SKU, prosesor, atau kode</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400"
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
        </CardContent>
      </Card>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tabel Pemeringkatan SAW ({filtered.length} dari {items.length} alternatif)
          </CardTitle>
          <CardDescription>
            Diurutkan berdasarkan nilai preferensi SAW presisi penuh dari tertinggi ke terendah.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">
              Tidak ada alternatif yang cocok dengan filter pencarian Anda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Kode & Model / SKU</th>
                    <th className="px-3 py-3 text-right">Harga (C1)</th>
                    <th className="px-3 py-3 text-right">CPU Mark (C2)</th>
                    <th className="px-3 py-3 text-right">RAM / SSD</th>
                    <th className="px-3 py-3 text-right">Berat / Baterai</th>
                    <th className="px-3 py-3 text-right">Skor SAW</th>
                    <th className="px-3 py-3">Status Stok & Bukti</th>
                    <th className="px-4 py-3 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((item) => {
                    const stockBadge = formatStockStatusLabel(item.stockStatus);
                    const evBadge = formatEvidenceStatusLabel(item.evidenceStatus);
                    return (
                      <tr
                        key={item.code}
                        data-testid={`ranking-row-${item.code}`}
                        className={
                          item.rank === 1 ? "bg-zinc-50/90" : "hover:bg-zinc-50/60"
                        }
                      >
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                            #{item.rank}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-zinc-900">
                            <span className="font-mono text-xs text-zinc-500 mr-1.5">
                              {item.code}
                            </span>
                            {item.model}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {item.cpuName} · Penjual: {item.seller}
                          </p>
                        </td>
                        <td className="px-3 py-3.5 text-right font-medium tabular-nums whitespace-nowrap">
                          {formatIdr(item.priceIdr)}
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums">
                          {formatInteger(item.cpuMark)}
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap">
                          {item.ramGb} GB / {item.ssdGb} GB
                        </td>
                        <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap">
                          <p>{formatDecimal(item.weightKg, 2)} kg</p>
                          <p className="text-xs text-zinc-500">
                            {formatDecimal(item.batteryHours, 1)} jam
                          </p>
                        </td>
                        <td
                          className="px-3 py-3.5 text-right font-mono font-bold tabular-nums text-zinc-900"
                          data-testid={`ranking-score-${item.code}`}
                        >
                          {formatDecimal(item.score, 6)}
                        </td>
                        <td className="px-3 py-3.5 space-y-1">
                          <div>
                            <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                          </div>
                          <div>
                            <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link
                            href={`/laptop/${item.code}`}
                            className="inline-flex h-9 items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                          >
                            Detail
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contribution Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Kontribusi Kriteria terhadap Nilai Preferensi SAW</CardTitle>
          <CardDescription>
            Setiap batang memperlihatkan dekomposisi skor akhir dari enam kriteria (wⱼ × rᵢⱼ).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SawContributionChart
            items={items.map((item) => ({
              code: item.code,
              model: item.model,
              score: item.score,
              weightedValues: item.weightedValues,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
