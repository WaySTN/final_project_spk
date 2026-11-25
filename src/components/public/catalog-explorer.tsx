"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import {
  Badge,
  Input,
  Label,
  ScoreBar,
  Select,
  formatStockStatusLabel,
} from "@/components/ui/primitives";
import { formatDecimal, formatIdr, formatInteger } from "@/lib/formatting";
import type { PublicLaptopRankingItem } from "@/lib/repositories/types";

export function CatalogExplorer({ items }: { items: PublicLaptopRankingItem[] }) {
  const [query, setQuery] = useState("");
  const [ram, setRam] = useState("all");
  const [maxPrice, setMaxPrice] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (q) {
        const hay = `${item.code} ${item.model} ${item.sku} ${item.cpuName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (ram !== "all" && item.ramGb !== Number(ram)) return false;
      if (maxPrice !== "all" && item.priceIdr > Number(maxPrice)) return false;
      return true;
    });
  }, [items, query, ram, maxPrice]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:p-5 grid gap-3.5 sm:grid-cols-3">
        <div>
          <Label htmlFor="cat-search">Cari model, SKU, atau prosesor</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#64748b]"
              aria-hidden="true"
            />
            <Input
              id="cat-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mis. 83EQ0077ID, V14, Core i5..."
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="cat-price">Filter harga maksimum</Label>
          <Select
            id="cat-price"
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
          <Label htmlFor="cat-ram">Kapasitas RAM</Label>
          <Select id="cat-ram" value={ram} onChange={(e) => setRam(e.target.value)}>
            <option value="all">Semua RAM</option>
            <option value="8">8 GB</option>
            <option value="16">16 GB</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc]/60 px-6 py-12 text-center text-sm text-[#64748b]">
          Tidak ada laptop dalam snapshot yang sesuai dengan pencarian Anda.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const stockBadge = formatStockStatusLabel(item.stockStatus);
            return (
              <article
                key={item.code}
                className={`min-w-0 flex flex-col justify-between rounded-lg border bg-white transition-colors hover:border-[#1e3a5f]/45 ${
                  item.rank === 1
                    ? "border-[#e2e8f0] border-t-2 border-t-[#1e3a5f]"
                    : "border-[#e2e8f0]"
                }`}
              >
                <div>
                  {/* Spec-sheet header bar */}
                  <div className="flex items-center justify-between border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="font-semibold text-[#1e293b]">{item.code}</span>
                      <span className="text-[#cbd5e1]">/</span>
                      <span className="text-[11px] text-[#64748b]">{item.sku}</span>
                    </div>
                    <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                      Rank #{item.rank}
                    </Badge>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.015em] text-[#1e293b]">
                        {item.model}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#64748b]">
                        {item.cpuName} · {item.seller}
                      </p>
                    </div>

                    <div className="space-y-2 border-y border-[#e2e8f0]/80 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-lg font-semibold tracking-[-0.02em] tabular-nums text-[#1e293b]">
                          {formatIdr(item.priceIdr)}
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-[#475569]">
                          SAW {formatDecimal(item.score, 6)}
                        </span>
                      </div>
                      <ScoreBar value={item.score} className="h-1" />
                    </div>

                    <dl className="grid grid-cols-2 divide-y divide-[#e2e8f0]/60 text-xs">
                      <div className="py-1.5 pr-2">
                        <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                          C2 CPU Mark
                        </dt>
                        <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                          {formatInteger(item.cpuMark)}
                        </dd>
                      </div>
                      <div className="py-1.5 pl-2">
                        <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                          C3–C4 Memori
                        </dt>
                        <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                          {item.ramGb} / {item.ssdGb} GB
                        </dd>
                      </div>
                      <div className="py-1.5 pr-2">
                        <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                          C5 Berat
                        </dt>
                        <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                          {formatDecimal(item.weightKg, 2)} kg
                        </dd>
                      </div>
                      <div className="py-1.5 pl-2">
                        <dt className="font-mono text-[10px] uppercase text-[#64748b]">
                          C6 Video 1080p
                        </dt>
                        <dd className="mt-0.5 font-mono font-medium tabular-nums text-[#1e293b]">
                          {formatDecimal(item.batteryHours, 1)} jam
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-[#e2e8f0] px-5 py-3.5">
                  <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                  <Link
                    href={`/laptop/${item.code}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#1e3a5f] px-3 text-xs font-medium text-white hover:bg-[#162d4a]"
                  >
                    Detail
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
