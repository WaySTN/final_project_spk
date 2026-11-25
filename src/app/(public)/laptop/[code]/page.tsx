import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, GitCompare } from "lucide-react";
import { PublicationBanner } from "@/components/public/publication-banner";
import {
  AlertBanner,
  Badge,
  ScoreBar,
  formatEvidenceStatusLabel,
  formatStockStatusLabel,
} from "@/components/ui/primitives";
import { CRITERIA, type CriterionCode } from "@/lib/decision";
import {
  formatDateJakarta,
  formatDecimal,
  formatIdr,
  formatInteger,
  formatWeightPercent,
} from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  price: "Sumber Harga Penawaran",
  spec: "Sumber Spesifikasi Produk",
  benchmark: "Sumber Benchmark PassMark CPU Mark",
  battery: "Sumber Durasi Baterai (Lenovo PSREF)",
};

function formatRawCriterionValue(code: CriterionCode, val: number): string {
  switch (code) {
    case "C1":
      return formatIdr(val);
    case "C2":
      return formatInteger(val);
    case "C3":
    case "C4":
      return `${val} GB`;
    case "C5":
      return `${formatDecimal(val, 2)} kg`;
    case "C6":
      return `${formatDecimal(val, 1)} jam`;
  }
}

export default async function LaptopDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const repo = await getRepository();
  const publication = await repo.getCurrentPublication();
  const payload = publication?.publicPayload ?? null;

  if (!payload) {
    notFound();
  }

  const item = payload.saw.items.find(
    (x) => x.code.toLowerCase() === code.toLowerCase(),
  );
  if (!item) {
    notFound();
  }

  const stockBadge = formatStockStatusLabel(item.stockStatus);
  const evBadge = formatEvidenceStatusLabel(item.evidenceStatus);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:py-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          href="/rekomendasi"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#52524e] hover:text-[#111113]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Rekomendasi
        </Link>
        <Link
          href={`/bandingkan?codes=${item.code}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d0d0c8] bg-white px-3.5 text-xs font-medium text-[#111113] hover:border-[#111113] hover:bg-[#f7f7f5]"
        >
          <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
          Bandingkan dengan Laptop Lain
        </Link>
      </div>

      <PublicationBanner payload={payload} />

      {/* Split 8/4 Product Dossier Header */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 rounded-lg border border-[#e5e5e0] bg-white p-5 sm:p-6 lg:col-span-8 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                Peringkat #{item.rank} dari {payload.saw.items.length}
              </Badge>
              <span className="font-mono text-xs font-semibold text-[#111113]">
                {item.code}
              </span>
              <span className="text-[#d0d0c8]">/</span>
              <span className="font-mono text-xs text-[#787872]">SKU {item.sku}</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#111113] sm:text-3xl">
              {item.model}
            </h1>

            <p className="text-sm text-[#52524e]">
              Prosesor <strong className="text-[#111113]">{item.cpuName}</strong> · Penjual
              dicatat: <strong className="text-[#111113]">{item.seller}</strong>
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
              <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
            </div>
          </div>

          {item.evidenceNotes && (
            <div className="rounded-lg border border-[#e5e5e0] bg-[#f7f7f5] px-4 py-3 text-xs leading-relaxed text-[#52524e]">
              <strong className="text-[#111113]">Catatan audit & ketersediaan:</strong>{" "}
              {item.evidenceNotes}
            </div>
          )}
        </div>

        {/* Obsidian Scorecard */}
        <div className="min-w-0 rounded-lg border border-[#232327] bg-[#111113] p-5 sm:p-6 text-white lg:col-span-4 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                Harga Penawaran Snapshot
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums text-white sm:text-3xl">
                {formatIdr(item.priceIdr)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                Audit {formatDateJakarta(payload.observedAt)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                  Nilai Preferensi SAW
                </p>
                <span className="font-mono text-[11px] text-zinc-400">Presisi Penuh</span>
              </div>
              <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-white">
                {formatDecimal(item.score, 6)}
              </p>
              <ScoreBar value={item.score} inverted />
            </div>
          </div>

          <p className="font-mono text-[11px] text-zinc-400">
            Σ (wⱼ × rᵢⱼ) terhadap 6 kriteria penelitian
          </p>
        </div>
      </div>

      {/* Breakdown Section — Mobile Cards + Desktop Precision Table */}
      <section className="space-y-3">
        <div>
          <p className="editorial-kicker">Audit Perhitungan SAW</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#111113]">
            Dekomposisi Nilai Kriteria, Normalisasi & Kontribusi Bobot
          </h2>
        </div>

        {/* Mobile per-criterion cards */}
        <div className="space-y-3 md:hidden">
          {CRITERIA.map((c) => {
            const raw = item.criteriaValues[c.code];
            const norm = item.normalizedValues[c.code];
            const weight = payload.ahp.weightsByCode[c.code];
            const contrib = item.weightedValues[c.code];
            const ext = payload.saw.extrema[c.code];
            return (
              <div
                key={c.code}
                className="rounded-lg border border-[#e5e5e0] bg-white p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#111113]">
                    <span className="font-mono text-xs text-[#787872] mr-1.5">
                      {c.code}
                    </span>
                    {c.name}
                  </span>
                  <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                    {c.attribute}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-[#f7f7f5] p-2">
                    <span className="block font-mono text-[10px] uppercase text-[#787872]">
                      Nilai (xᵢⱼ)
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#111113]">
                      {formatRawCriterionValue(c.code, raw)}
                    </span>
                  </div>
                  <div className="rounded bg-[#f7f7f5] p-2">
                    <span className="block font-mono text-[10px] uppercase text-[#787872]">
                      Basis ({ext.extremaType})
                    </span>
                    <span className="font-mono tabular-nums text-[#52524e]">
                      {formatRawCriterionValue(c.code, ext.value)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between font-mono text-[11px] tabular-nums">
                    <span className="text-[#787872]">
                      r = {formatDecimal(norm, 6)} × w = {formatWeightPercent(weight, 2)}
                    </span>
                    <span className="font-semibold text-[#111113]">
                      +{formatDecimal(contrib, 6)}
                    </span>
                  </div>
                  <ScoreBar value={norm} className="h-1" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-hidden rounded-lg border border-[#e5e5e0] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e0] bg-[#f7f7f5] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#787872]">
                  <th className="px-4 py-3">Kriteria</th>
                  <th className="px-3 py-3">Atribut</th>
                  <th className="px-3 py-3 text-right">Nilai (xᵢⱼ)</th>
                  <th className="px-3 py-3 text-right">Basis Ekstrem</th>
                  <th className="px-3 py-3 text-right">Normalisasi (rᵢⱼ)</th>
                  <th className="px-3 py-3 text-right">Bobot (wⱼ)</th>
                  <th className="px-4 py-3 text-right">Kontribusi (wⱼ·rᵢⱼ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e0]/70 tabular-nums">
                {CRITERIA.map((c) => {
                  const raw = item.criteriaValues[c.code];
                  const norm = item.normalizedValues[c.code];
                  const weight = payload.ahp.weightsByCode[c.code];
                  const contrib = item.weightedValues[c.code];
                  const ext = payload.saw.extrema[c.code];
                  return (
                    <tr key={c.code} className="hover:bg-[#f7f7f5]/60">
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-[#787872] mr-2">
                          {c.code}
                        </span>
                        <span className="font-medium text-[#111113]">{c.name}</span>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[11px] uppercase text-[#52524e]">
                        {c.attribute}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-xs font-medium text-[#111113]">
                        {formatRawCriterionValue(c.code, raw)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-xs text-[#787872]">
                        {ext.extremaType} {formatRawCriterionValue(c.code, ext.value)}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="font-mono text-xs text-[#52524e]">
                          {formatDecimal(norm, 6)}
                        </span>
                        <ScoreBar value={norm} className="mt-1 h-1" />
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-xs text-[#52524e]">
                        {formatWeightPercent(weight, 2)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-[#111113]">
                        {formatDecimal(contrib, 6)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[#111113]/20 bg-[#f7f7f5] font-semibold">
                  <td
                    colSpan={6}
                    className="px-4 py-3.5 text-right font-mono text-xs uppercase tracking-[0.06em] text-[#52524e]"
                  >
                    Total Nilai Preferensi SAW (Σ wⱼ · rᵢⱼ)
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-[#111113]">
                    {formatDecimal(item.score, 6)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AlertBanner tone="neutral" title="Catatan Protokol Pengukuran Berat (C5) & Baterai (C6)">
        Protokol baterai: <strong>{item.batteryProtocol}</strong>.{" "}
        {item.batteryWh !== null && (
          <>
            Kapasitas baterai <strong>{item.batteryWh} Wh</strong> dicatat hanya sebagai
            metadata tambahan dan tidak menggantikan durasi pemutaran video lokal 1080p dalam
            jam pada perhitungan SAW.
          </>
        )}{" "}
        Nilai berat C5 berasal dari publikasi resmi pabrikan (sebagian merupakan berat mulai /
        starting weight).
      </AlertBanner>

      {/* 4 Provenance Dossier Cards */}
      <section className="space-y-3">
        <div>
          <p className="editorial-kicker">Verifikasi Data Sekunder</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#111113]">
            Empat Tautan Sumber Bukti Audit ({formatDateJakarta(payload.observedAt)})
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {item.sources.map((src, idx) => (
            <div
              key={src.sourceType}
              className="flex flex-col justify-between rounded-lg border border-[#e5e5e0] bg-white p-4 sm:p-5 space-y-3 hover:border-[#111113]/40 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#787872]">
                    0{idx + 1} / {src.sourceType}
                  </span>
                  <Badge tone="neutral">Tingkat: {src.evidenceLevel}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-[#111113]">
                  {SOURCE_LABELS[src.sourceType] ?? src.sourceType}
                </h3>
                <p className="text-xs leading-relaxed text-[#52524e]">{src.notes}</p>
              </div>
              <div className="border-t border-[#e5e5e0]/80 pt-3">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#111113] hover:underline break-all"
                >
                  Buka halaman sumber asli
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
