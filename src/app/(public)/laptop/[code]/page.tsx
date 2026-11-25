import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, GitCompare, Laptop } from "lucide-react";
import { PublicationBanner } from "@/components/public/publication-banner";
import {
  AlertBanner,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          href="/rekomendasi"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Rekomendasi
        </Link>
        <Link
          href={`/bandingkan?codes=${item.code}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
        >
          <GitCompare className="h-3.5 w-3.5" aria-hidden="true" />
          Bandingkan dengan Laptop Lain
        </Link>
      </div>

      <PublicationBanner payload={payload} />

      {/* Product Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900">
                <Laptop className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.rank === 1 ? "dark" : "neutral"}>
                    Peringkat #{item.rank} dari {payload.saw.items.length}
                  </Badge>
                  <span className="font-mono text-xs font-semibold text-zinc-600">
                    {item.code} · SKU {item.sku}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  {item.model}
                </h1>
                <p className="text-sm text-zinc-600">
                  Prosesor: <strong className="text-zinc-900">{item.cpuName}</strong> ·
                  Penjual dicatat: <strong className="text-zinc-900">{item.seller}</strong>
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                  <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-6 border-t border-zinc-100 pt-4 lg:border-t-0 lg:pt-0 lg:text-right">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Harga Snapshot
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">
                  {formatIdr(item.priceIdr)}
                </p>
                <p className="text-xs text-zinc-500">
                  Audit {formatDateJakarta(payload.observedAt)}
                </p>
              </div>
              <div className="border-l border-zinc-200 pl-6">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Skor Preferensi SAW
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-zinc-900">
                  {formatDecimal(item.score, 6)}
                </p>
                <p className="text-xs text-zinc-500">Presisi penuh</p>
              </div>
            </div>
          </div>

          {item.evidenceNotes && (
            <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-700">
              <strong className="text-zinc-900">Catatan audit & ketersediaan:</strong>{" "}
              {item.evidenceNotes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dekomposisi Nilai Kriteria, Normalisasi SAW & Kontribusi Bobot</CardTitle>
          <CardDescription>
            Menampilkan secara transparan bagaimana nilai mentah xᵢⱼ dinormalisasi menjadi rᵢⱼ
            dan dikalikan bobot AHP wⱼ hingga membentuk skor akhir{" "}
            <strong className="font-mono text-zinc-900">
              {formatDecimal(item.score, 6)}
            </strong>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                  <th className="px-4 py-3">Kriteria</th>
                  <th className="px-3 py-3">Atribut</th>
                  <th className="px-3 py-3 text-right">Nilai (xᵢⱼ)</th>
                  <th className="px-3 py-3 text-right">Basis Ekstrem</th>
                  <th className="px-3 py-3 text-right">Normalisasi (rᵢⱼ)</th>
                  <th className="px-3 py-3 text-right">Bobot AHP (wⱼ)</th>
                  <th className="px-4 py-3 text-right">Kontribusi (wⱼ·rᵢⱼ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 tabular-nums">
                {CRITERIA.map((c) => {
                  const raw = item.criteriaValues[c.code];
                  const norm = item.normalizedValues[c.code];
                  const weight = payload.ahp.weightsByCode[c.code];
                  const contrib = item.weightedValues[c.code];
                  const ext = payload.saw.extrema[c.code];
                  return (
                    <tr key={c.code}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-zinc-500 mr-1.5">
                          {c.code}
                        </span>
                        <span className="font-medium text-zinc-900">{c.name}</span>
                      </td>
                      <td className="px-3 py-3 text-xs uppercase text-zinc-600">
                        {c.attribute}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        {formatRawCriterionValue(c.code, raw)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs text-zinc-500">
                        {ext.extremaType} {formatRawCriterionValue(c.code, ext.value)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-xs">
                        {formatDecimal(norm, 6)}
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        {formatWeightPercent(weight, 2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-zinc-900">
                        {formatDecimal(contrib, 6)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-zinc-300 bg-zinc-50 font-semibold">
                  <td colSpan={6} className="px-4 py-3 text-right text-xs uppercase text-zinc-600">
                    Total Nilai Preferensi SAW (Σ wⱼ · rᵢⱼ)
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-zinc-900">
                    {formatDecimal(item.score, 6)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Metadata & Battery Protocol Note */}
      <AlertBanner tone="neutral" title="Catatan Protokol Pengukuran Berat (C5) & Baterai (C6)">
        <p className="text-xs leading-relaxed">
          Protokol baterai: <strong>{item.batteryProtocol}</strong>.{" "}
          {item.batteryWh !== null && (
            <>
              Kapasitas fisik baterai <strong>{item.batteryWh} Wh</strong> dicatat semata
              sebagai metadata tambahan dan tidak menggantikan durasi pemutaran video lokal
              1080p dalam satuan jam pada perhitungan SAW.
            </>
          )}{" "}
          Nilai berat C5 berasal dari publikasi resmi pabrikan (sebagian merupakan berat mulai /
          starting weight).
        </p>
      </AlertBanner>

      {/* 4 Provenance Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Sumber Data & Tautan Bukti Audit</CardTitle>
          <CardDescription>
            Seluruh tautan berasal langsung dari sheet <code className="font-mono">Data Audit</code>{" "}
            penelitian per tanggal {formatDateJakarta(payload.observedAt)}. Tautan bukan jaminan
            stok aktual saat ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {item.sources.map((src) => (
            <div
              key={src.sourceType}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">
                  {SOURCE_LABELS[src.sourceType] ?? src.sourceType}
                </p>
                <Badge tone="neutral">Tingkat: {src.evidenceLevel}</Badge>
              </div>
              <p className="text-xs text-zinc-600">{src.notes}</p>
              <div className="pt-1">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-900 underline break-all hover:text-zinc-700"
                >
                  Buka halaman sumber
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
