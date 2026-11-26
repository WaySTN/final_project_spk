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
import {
  getCriteriaForMetric,
  type C6MetricType,
  type CriterionCode,
} from "@/lib/decision";
import {
  formatDateJakarta,
  formatDecimal,
  formatIdr,
  formatInteger,
  formatWeightPercent,
} from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

function getSourceLabel(sourceType: string, c6Metric: C6MetricType): string {
  switch (sourceType) {
    case "price":
      return "Sumber Harga Penawaran";
    case "spec":
      return "Sumber Spesifikasi Produk";
    case "benchmark":
      return "Sumber Benchmark PassMark CPU Mark";
    case "battery":
      return c6Metric === "battery_wh"
        ? "Sumber Kapasitas Baterai (Wh)"
        : "Sumber Durasi Baterai (Lenovo PSREF)";
    default:
      return sourceType;
  }
}

function formatRawCriterionValue(
  code: CriterionCode,
  val: number,
  c6Metric: C6MetricType,
): string {
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
      if (c6Metric === "battery_wh") {
        const digits = Number.isInteger(val) ? 0 : 2;
        return `${formatDecimal(val, digits)} Wh`;
      }
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

  const c6Metric: C6MetricType = payload.c6Metric ?? payload.saw.c6Metric ?? "battery_wh";
  const activeCriteria = getCriteriaForMetric(c6Metric);
  const stockBadge = formatStockStatusLabel(item.stockStatus);
  const evBadge = formatEvidenceStatusLabel(item.evidenceStatus);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/rekomendasi"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#475569] hover:text-[#1e3a5f]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Rekomendasi
        </Link>
        <Link
          href={`/bandingkan?codes=${item.code}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3.5 text-xs font-medium text-[#1e293b] hover:border-[#1e3a5f]/50 hover:bg-[#f8fafc]"
        >
          <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
          Bandingkan dengan Laptop Lain
        </Link>
      </div>

      <PublicationBanner payload={payload} />

      {/* Split 8/4 Product Dossier Header */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 flex flex-col justify-between space-y-5 rounded-lg border border-[#e2e8f0] bg-white p-5 sm:p-6 lg:col-span-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                Peringkat #{item.rank} dari {payload.saw.items.length}
              </Badge>
              <span className="font-mono text-xs font-semibold text-[#1e293b]">
                {item.code}
              </span>
              <span className="rounded bg-[#eff4fa] px-2 py-0.5 font-mono text-[11px] font-medium text-[#1e3a5f]">
                {item.brand}
              </span>
              <span className="text-[#cbd5e1]">/</span>
              <span className="font-mono text-xs text-[#64748b]">SKU {item.sku}</span>
            </div>

            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#1e293b] sm:text-3xl">
              {item.model}
            </h1>

            <p className="text-sm text-[#475569]">
              Prosesor <strong className="text-[#1e293b]">{item.cpuName}</strong> · Penjual
              dicatat: <strong className="text-[#1e293b]">{item.seller}</strong>
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
              <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
            </div>
          </div>

          {item.evidenceNotes && (
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs leading-relaxed text-[#475569]">
              <strong className="text-[#1e293b]">Catatan audit &amp; ketersediaan:</strong>{" "}
              {item.evidenceNotes}
            </div>
          )}
        </div>

        {/* Light Nordic Navy-Accented Scorecard (Zero Heavy Black Block) */}
        <div className="min-w-0 flex flex-col justify-between space-y-5 rounded-lg border border-[#cbd5e1] border-t-[3px] border-t-[#1e3a5f] bg-[#f8fafc] p-5 text-[#1e293b] sm:p-6 lg:col-span-4">
          <div className="space-y-4">
            <div className="border-b border-[#e2e8f0] pb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                Harga Penawaran Snapshot
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[#1e293b] sm:text-3xl">
                {formatIdr(item.priceIdr)}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[#64748b]">
                Audit {formatDateJakarta(payload.observedAt)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                  Nilai Preferensi SAW
                </p>
                <span className="font-mono text-[11px] text-[#64748b]">Presisi Penuh</span>
              </div>
              <p className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-[#1e3a5f]">
                {formatDecimal(item.score, 6)}
              </p>
              <ScoreBar value={item.score} />
            </div>
          </div>

          <p className="font-mono text-[11px] text-[#64748b]">
            Σ (wⱼ × rᵢⱼ) terhadap 6 kriteria penelitian
          </p>
        </div>
      </div>

      {/* Breakdown Section — Mobile Cards + Desktop Precision Table */}
      <section className="space-y-3">
        <div>
          <p className="editorial-kicker">Audit Perhitungan SAW</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#1e293b]">
            Dekomposisi Nilai Kriteria, Normalisasi &amp; Kontribusi Bobot
          </h2>
        </div>

        {/* Mobile per-criterion cards */}
        <div className="space-y-3 md:hidden">
          {activeCriteria.map((c) => {
            const raw = item.criteriaValues[c.code];
            const norm = item.normalizedValues[c.code];
            const weight = payload.ahp.weightsByCode[c.code];
            const contrib = item.weightedValues[c.code];
            const ext = payload.saw.extrema[c.code];
            return (
              <div
                key={c.code}
                className="space-y-2.5 rounded-lg border border-[#e2e8f0] bg-white p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1e293b]">
                    <span className="mr-1.5 font-mono text-xs text-[#64748b]">
                      {c.code}
                    </span>
                    {c.name}
                  </span>
                  <Badge tone={c.attribute === "cost" ? "dark" : "neutral"}>
                    {c.attribute}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-[#f8fafc] p-2">
                    <span className="block font-mono text-[10px] uppercase text-[#64748b]">
                      Nilai (xᵢⱼ)
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#1e293b]">
                      {formatRawCriterionValue(c.code, raw, c6Metric)}
                    </span>
                  </div>
                  <div className="rounded bg-[#f8fafc] p-2">
                    <span className="block font-mono text-[10px] uppercase text-[#64748b]">
                      Basis ({ext.extremaType})
                    </span>
                    <span className="font-mono tabular-nums text-[#475569]">
                      {formatRawCriterionValue(c.code, ext.value, c6Metric)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between font-mono text-[11px] tabular-nums">
                    <span className="text-[#64748b]">
                      r = {formatDecimal(norm, 6)} × w = {formatWeightPercent(weight, 2)}
                    </span>
                    <span className="font-semibold text-[#1e3a5f]">
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
        <div className="hidden overflow-hidden rounded-lg border border-[#e2e8f0] bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
                  <th className="px-4 py-3">Kriteria</th>
                  <th className="px-3 py-3">Atribut</th>
                  <th className="px-3 py-3 text-right">Nilai (xᵢⱼ)</th>
                  <th className="px-3 py-3 text-right">Basis Ekstrem</th>
                  <th className="px-3 py-3 text-right">Normalisasi (rᵢⱼ)</th>
                  <th className="px-3 py-3 text-right">Bobot (wⱼ)</th>
                  <th className="px-4 py-3 text-right">Kontribusi (wⱼ·rᵢⱼ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]/75 tabular-nums">
                {activeCriteria.map((c) => {
                  const raw = item.criteriaValues[c.code];
                  const norm = item.normalizedValues[c.code];
                  const weight = payload.ahp.weightsByCode[c.code];
                  const contrib = item.weightedValues[c.code];
                  const ext = payload.saw.extrema[c.code];
                  return (
                    <tr key={c.code} className="hover:bg-[#f8fafc]">
                      <td className="px-4 py-3.5">
                        <span className="mr-2 font-mono text-xs text-[#64748b]">
                          {c.code}
                        </span>
                        <span className="font-medium text-[#1e293b]">{c.name}</span>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-[11px] uppercase text-[#475569]">
                        {c.attribute}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-xs font-medium text-[#1e293b]">
                        {formatRawCriterionValue(c.code, raw, c6Metric)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-xs text-[#64748b]">
                        {ext.extremaType} {formatRawCriterionValue(c.code, ext.value, c6Metric)}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="font-mono text-xs text-[#475569]">
                          {formatDecimal(norm, 6)}
                        </span>
                        <ScoreBar value={norm} className="mt-1 h-1" />
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-xs text-[#475569]">
                        {formatWeightPercent(weight, 2)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-[#1e3a5f]">
                        {formatDecimal(contrib, 6)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[#cbd5e1] bg-[#eff4fa]/60 font-semibold">
                  <td
                    colSpan={6}
                    className="px-4 py-3.5 text-right font-mono text-xs uppercase tracking-[0.06em] text-[#475569]"
                  >
                    Total Nilai Preferensi SAW (Σ wⱼ · rᵢⱼ)
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-[#1e3a5f]">
                    {formatDecimal(item.score, 6)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <AlertBanner tone="neutral" title="Catatan Protokol Pengukuran Berat (C5) & Baterai (C6)">
        {c6Metric === "battery_wh" ? (
          <>
            Kriteria C6 pada snapshot ini menggunakan{" "}
            <strong>kapasitas baterai dalam satuan Watt-hour ({item.batteryWh} Wh)</strong>{" "}
            sebagai indikator pendekatan (proksi) daya tahan baterai. Dengan asumsi konsumsi
            daya yang setara, kapasitas energi yang lebih besar berpotensi memberikan durasi
            penggunaan lebih panjang, namun{" "}
            <strong>bukan jaminan durasi pemakaian aktual (jam)</strong> karena dipengaruhi
            efisiensi prosesor, layar, dan beban kerja.
          </>
        ) : (
          <>
            Protokol baterai historis: <strong>{item.batteryProtocol}</strong>.{" "}
            {item.batteryWh !== null && (
              <>
                Kapasitas baterai <strong>{item.batteryWh} Wh</strong> dicatat hanya sebagai
                metadata tambahan pada dataset historis ini.
              </>
            )}
          </>
        )}{" "}
        Nilai berat C5 berasal dari publikasi resmi pabrikan atau dokumentasi SKU (sebagian
        merupakan berat mulai / starting weight).
      </AlertBanner>

      {/* 4 Provenance Dossier Cards */}
      <section className="space-y-3">
        <div>
          <p className="editorial-kicker">Verifikasi Data Sekunder</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[#1e293b]">
            Empat Tautan Sumber Bukti Audit ({formatDateJakarta(payload.observedAt)})
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {item.sources.map((src, idx) => (
            <div
              key={src.sourceType}
              className="flex flex-col justify-between space-y-3 rounded-lg border border-[#e2e8f0] bg-white p-4 transition-colors hover:border-[#1e3a5f]/40 sm:p-5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                    0{idx + 1} / {src.sourceType}
                  </span>
                  <Badge tone="neutral">Tingkat: {src.evidenceLevel}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-[#1e293b]">
                  {getSourceLabel(src.sourceType, c6Metric)}
                </h3>
                <p className="text-xs leading-relaxed text-[#475569]">{src.notes}</p>
              </div>
              <div className="border-t border-[#e2e8f0]/80 pt-3">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-xs font-medium text-[#1e3a5f] hover:underline"
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
