"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Laptop, Search } from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
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
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="cat-search">Cari nama model, SKU, atau prosesor</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400"
              aria-hidden="true"
            />
            <Input
              id="cat-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mis. 83EQ0077ID, V14, Core i5..."
              className="pl-9 bg-white"
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
        <p className="py-12 text-center text-sm text-zinc-500">
          Tidak ada laptop dalam snapshot yang sesuai dengan kriteria pencarian.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const stockBadge = formatStockStatusLabel(item.stockStatus);
            return (
              <Card key={item.code} className="flex flex-col justify-between">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-800">
                        <Laptop className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-semibold text-zinc-900">
                          {item.code}
                        </span>
                        <span className="block font-mono text-[11px] text-zinc-500">
                          SKU: {item.sku}
                        </span>
                      </div>
                    </div>
                    <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                      Rank #{item.rank}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-base leading-snug">{item.model}</CardTitle>
                    <p className="mt-0.5 text-xs text-zinc-500">{item.cpuName}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-baseline justify-between border-b border-zinc-100 pb-3">
                    <span className="text-lg font-bold tabular-nums text-zinc-900">
                      {formatIdr(item.priceIdr)}
                    </span>
                    <span className="font-mono text-xs text-zinc-600 tabular-nums">
                      SAW {formatDecimal(item.score, 6)}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-zinc-50 p-2">
                      <dt className="text-zinc-500">CPU Mark</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatInteger(item.cpuMark)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-2">
                      <dt className="text-zinc-500">RAM / SSD</dt>
                      <dd className="font-semibold tabular-nums">
                        {item.ramGb} / {item.ssdGb} GB
                      </dd>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-2">
                      <dt className="text-zinc-500">Berat</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatDecimal(item.weightKg, 2)} kg
                      </dd>
                    </div>
                    <div className="rounded-lg bg-zinc-50 p-2">
                      <dt className="text-zinc-500">Video 1080p</dt>
                      <dd className="font-semibold tabular-nums">
                        {formatDecimal(item.batteryHours, 1)} jam
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                    <Link
                      href={`/laptop/${item.code}`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      Lihat Detail
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
