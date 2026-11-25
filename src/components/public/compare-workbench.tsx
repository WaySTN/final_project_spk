"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Printer } from "lucide-react";
import {
  AlertBanner,
  Badge,
  Button,
  ScoreBar,
  formatStockStatusLabel,
} from "@/components/ui/primitives";
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

  const bestScore = Math.max(...compared.map((c) => c.score), -Infinity);
  const bestPrice = Math.min(...compared.map((c) => c.priceIdr), Infinity);
  const bestCpu = Math.max(...compared.map((c) => c.cpuMark), -Infinity);
  const bestRam = Math.max(...compared.map((c) => c.ramGb), -Infinity);
  const bestWeight = Math.min(...compared.map((c) => c.weightKg), Infinity);
  const bestBattery = Math.max(...compared.map((c) => c.batteryHours), -Infinity);

  return (
    <div className="space-y-6">
      <AlertBanner tone="neutral" title="Perbandingan Berdampingan (Tidak Mengubah Ranking Resmi)">
        Pilih maksimal <strong>3 laptop</strong> dari snapshot aktif untuk membandingkan
        spesifikasi, kontribusi bobot SAW, dan tautan sumber. Nilai terbaik pada tiap baris
        di antara kandidat terpilih diberi penanda titik hitam — peringkat global tidak berubah.
      </AlertBanner>

      {/* Selector Bar */}
      <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 sm:p-5 space-y-3.5 no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#475569]">
              Pilih Kandidat ({selectedCodes.length}/3)
            </p>
            <p className="text-xs text-[#64748b]">
              Klik kode alternatif di bawah untuk menambah atau mengganti slot perbandingan.
            </p>
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

        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const active = selectedCodes.includes(item.code);
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => toggleCode(item.code)}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                    : "border-[#cbd5e1] bg-white text-[#475569] hover:border-[#1e3a5f]/50 hover:text-[#1e293b]"
                }`}
              >
                <span className="font-mono font-semibold">{item.code}</span>
                <span className="font-mono text-[11px] opacity-75">#{item.rank}</span>
                <span className="max-w-[165px] truncate">{item.model}</span>
              </button>
            );
          })}
        </div>
      </div>

      {compared.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#cbd5e1] py-12 text-center text-sm text-[#64748b]">
          Pilih minimal 1 laptop di atas untuk menampilkan tabel perbandingan.
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between sm:hidden">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              Perbandingan {compared.length} Kandidat
            </span>
            <span className="font-mono text-[10px] text-[#64748b]">
              Geser horizontal →
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#e2e8f0] bg-white">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left">
                  <th className="sticky left-0 z-10 w-44 border-r border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
                    Kriteria
                  </th>
                  {compared.map((item) => (
                    <th key={item.code} className="px-4 py-3.5 align-top">
                      <div className="flex items-center gap-2">
                        <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                          #{item.rank}
                        </Badge>
                        <span className="font-mono text-xs text-[#64748b]">
                          {item.code}
                        </span>
                      </div>
                      <Link
                        href={`/laptop/${item.code}`}
                        className="mt-1.5 block text-sm font-semibold text-[#1e293b] hover:underline"
                      >
                        {item.model}
                      </Link>
                      <p className="text-xs font-normal text-[#64748b]">{item.cpuName}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]/80 tabular-nums">
                <tr className="bg-[#f8fafc]/60">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 text-left text-xs font-semibold text-[#1e293b]"
                  >
                    Skor SAW Resmi
                  </th>
                  {compared.map((item) => {
                    const isBest = compared.length > 1 && item.score === bestScore;
                    return (
                      <td key={item.code} className="px-4 py-3.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-[#1e293b]">
                            {formatDecimal(item.score, 6)}
                          </span>
                          {isBest && (
                            <span
                              className="h-2 w-2 rounded-full bg-[#1e3a5f]"
                              title="Tertinggi di perbandingan"
                            />
                          )}
                        </div>
                        <ScoreBar value={item.score} className="h-1" />
                      </td>
                    );
                  })}
                </tr>

                {[
                  {
                    label: "C1 — Harga (Cost)",
                    render: (i: PublicLaptopRankingItem) => ({
                      val: formatIdr(i.priceIdr),
                      sub: `Kontribusi ${formatDecimal(i.weightedValues.C1, 6)}`,
                      best: compared.length > 1 && i.priceIdr === bestPrice,
                    }),
                  },
                  {
                    label: "C2 — CPU Mark",
                    render: (i: PublicLaptopRankingItem) => ({
                      val: formatInteger(i.cpuMark),
                      sub: `Kontribusi ${formatDecimal(i.weightedValues.C2, 6)}`,
                      best: compared.length > 1 && i.cpuMark === bestCpu,
                    }),
                  },
                  {
                    label: "C3 — RAM Terpasang",
                    render: (i: PublicLaptopRankingItem) => ({
                      val: `${i.ramGb} GB`,
                      sub: `Kontribusi ${formatDecimal(i.weightedValues.C3, 6)}`,
                      best: compared.length > 1 && i.ramGb === bestRam,
                    }),
                  },
                  {
                    label: "C4 — SSD Terpasang",
                    render: (i: PublicLaptopRankingItem) => ({
                      val: `${i.ssdGb} GB`,
                      sub: `Kontribusi ${formatDecimal(i.weightedValues.C4, 6)}`,
                      best: false,
                    }),
                  },
                  {
                    label: "C5 — Berat (Cost)",
                    render: (i: PublicLaptopRankingItem) => ({
                      val: `${formatDecimal(i.weightKg, 2)} kg`,
                      sub: `Kontribusi ${formatDecimal(i.weightedValues.C5, 6)}`,
                      best: compared.length > 1 && i.weightKg === bestWeight,
                    }),
                  },
                  {
                    label: "C6 — Video 1080p",
                    render: (i: PublicLaptopRankingItem) => ({
                      val: `${formatDecimal(i.batteryHours, 1)} jam${i.batteryWh ? ` (${i.batteryWh} Wh)` : ""}`,
                      sub: `Kontribusi ${formatDecimal(i.weightedValues.C6, 6)}`,
                      best: compared.length > 1 && i.batteryHours === bestBattery,
                    }),
                  },
                ].map((row) => (
                  <tr key={row.label} className="hover:bg-[#f8fafc]/50">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-white px-4 py-3 text-left text-xs font-medium text-[#475569]"
                    >
                      {row.label}
                    </th>
                    {compared.map((item) => {
                      const info = row.render(item);
                      return (
                        <td key={item.code} className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-mono text-xs sm:text-[13px] ${
                                info.best
                                  ? "font-bold text-[#1e293b]"
                                  : "font-medium text-[#475569]"
                              }`}
                            >
                              {info.val}
                            </span>
                            {info.best && (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[#1e3a5f]"
                                title="Unggul pada perbandingan ini"
                              />
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-[#64748b]">
                            {info.sub}
                          </p>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-white px-4 py-3 text-left text-xs font-medium text-[#475569]"
                  >
                    Penjual & Status Stok
                  </th>
                  {compared.map((item) => {
                    const sb = formatStockStatusLabel(item.stockStatus);
                    return (
                      <td key={item.code} className="px-4 py-3 space-y-1.5">
                        <p className="text-xs font-medium text-[#1e293b]">{item.seller}</p>
                        <Badge tone={sb.tone}>{sb.label}</Badge>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-white px-4 py-3 text-left text-xs font-medium text-[#475569]"
                  >
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
                            className="inline-flex items-center gap-0.5 font-mono text-[11px] text-[#475569] underline hover:text-[#1e293b]"
                          >
                            {s.sourceType}
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
