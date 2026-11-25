"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Printer } from "lucide-react";
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  formatStockStatusLabel,
} from "@/components/ui/primitives";
import { CRITERIA } from "@/lib/decision";
import {
  formatDecimal,
  formatIdr,
  formatInteger,
} from "@/lib/formatting";
import type { PublicLaptopRankingItem } from "@/lib/repositories/types";

export function CompareWorkbench({
  items,
  initialCodes,
}: {
  items: PublicLaptopRankingItem[];
  initialCodes: string[];
}) {
  const defaultSelection =
    initialCodes.length > 0
      ? initialCodes.slice(0, 3)
      : items.slice(0, 3).map((i) => i.code);

  const [selectedCodes, setSelectedCodes] = useState<string[]>(defaultSelection);

  function toggleCode(code: string) {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) {
        return prev.filter((c) => c !== code);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), code];
      }
      return [...prev, code];
    });
  }

  const compared = selectedCodes
    .map((code) => items.find((i) => i.code === code))
    .filter((x): x is PublicLaptopRankingItem => Boolean(x));

  return (
    <div className="space-y-6">
      <AlertBanner tone="neutral" title="Perbandingan Berdampingan (Tidak Mengubah Ranking Resmi)">
        Pilih maksimal <strong>3 laptop</strong> dari snapshot aktif untuk membandingkan
        spesifikasi, nilai normalisasi, kontribusi bobot, skor SAW resmi, dan tautan sumber.
        Pemilihan di sini tidak melakukan perhitungan ulang maupun mengubah peringkat global.
      </AlertBanner>

      {/* Selector Chips */}
      <Card className="no-print">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Pilih Laptop untuk Dibandingkan ({selectedCodes.length}/3)</CardTitle>
              <CardDescription>
                Klik kode alternatif di bawah untuk menambah atau melepas perbandingan.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={compared.length === 0}
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              Cetak Perbandingan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {items.map((item) => {
            const active = selectedCodes.includes(item.code);
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => toggleCode(item.code)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                <span className="font-mono font-semibold">{item.code}</span>
                <span>#{item.rank}</span>
                <span className="max-w-[180px] truncate">{item.model}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {compared.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          Pilih minimal 1 laptop di atas untuk menampilkan tabel perbandingan.
        </p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left">
                    <th className="w-48 px-4 py-3 text-xs font-semibold text-zinc-600">
                      Atribut / Kriteria
                    </th>
                    {compared.map((item) => (
                      <th key={item.code} className="px-4 py-3 align-top">
                        <div className="flex items-center gap-2">
                          <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                            Rank #{item.rank}
                          </Badge>
                          <span className="font-mono text-xs text-zinc-500">
                            {item.code}
                          </span>
                        </div>
                        <Link
                          href={`/laptop/${item.code}`}
                          className="mt-1 block text-sm font-bold text-zinc-900 hover:underline"
                        >
                          {item.model}
                        </Link>
                        <p className="text-xs font-normal text-zinc-500">{item.cpuName}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 tabular-nums">
                  <tr className="bg-zinc-50/70">
                    <th scope="row" className="px-4 py-3 text-left text-xs font-semibold text-zinc-700">
                      Skor SAW Resmi
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3 font-mono text-base font-bold">
                        {formatDecimal(item.score, 6)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      C1 — Harga (Cost)
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3">
                        <p className="font-semibold">{formatIdr(item.priceIdr)}</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          Kontribusi: {formatDecimal(item.weightedValues.C1, 6)}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      C2 — PassMark CPU Mark
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3">
                        <p className="font-semibold">{formatInteger(item.cpuMark)}</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          Kontribusi: {formatDecimal(item.weightedValues.C2, 6)}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      C3 — Kapasitas RAM
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3">
                        <p className="font-semibold">{item.ramGb} GB</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          Kontribusi: {formatDecimal(item.weightedValues.C3, 6)}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      C4 — Kapasitas SSD
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3">
                        <p className="font-semibold">{item.ssdGb} GB</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          Kontribusi: {formatDecimal(item.weightedValues.C4, 6)}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      C5 — Berat Laptop (Cost)
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3">
                        <p className="font-semibold">{formatDecimal(item.weightKg, 2)} kg</p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          Kontribusi: {formatDecimal(item.weightedValues.C5, 6)}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      C6 — Video 1080p @ 150 nit
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3">
                        <p className="font-semibold">
                          {formatDecimal(item.batteryHours, 1)} jam
                          {item.batteryWh ? ` (${item.batteryWh} Wh)` : ""}
                        </p>
                        <p className="font-mono text-[11px] text-zinc-500">
                          Kontribusi: {formatDecimal(item.weightedValues.C6, 6)}
                        </p>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      Penjual & Status Stok
                    </th>
                    {compared.map((item) => {
                      const sb = formatStockStatusLabel(item.stockStatus);
                      return (
                        <td key={item.code} className="px-4 py-3 space-y-1">
                          <p className="text-xs font-medium text-zinc-900">{item.seller}</p>
                          <Badge tone={sb.tone}>{sb.label}</Badge>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <th scope="row" className="px-4 py-3 text-left text-xs font-medium text-zinc-600">
                      Tautan Sumber Audit
                    </th>
                    {compared.map((item) => (
                      <td key={item.code} className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {item.sources.map((s) => (
                            <a
                              key={s.sourceType}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-zinc-700 underline hover:text-zinc-900"
                            >
                              {s.sourceType}
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      {void CRITERIA}
    </div>
  );
}
