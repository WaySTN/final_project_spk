import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { AlertBanner, Badge, EmptyState } from "@/components/ui/primitives";
import { formatDateJakarta } from "@/lib/formatting";
import type { PublicRecommendationPayload } from "@/lib/repositories/types";

export function PublicationBanner({
  payload,
}: {
  payload: PublicRecommendationPayload;
}) {
  const isProvisional = payload.publicationStatus === "provisional";
  return (
    <AlertBanner
      tone={isProvisional ? "warning" : "neutral"}
      title={
        isProvisional
          ? `Snapshot Penelitian Bersyarat (Provisional) · Audit ${formatDateJakarta(payload.observedAt)}`
          : `Snapshot Penelitian Terverifikasi · Audit ${formatDateJakarta(payload.observedAt)}`
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-[13px]">{payload.bannerText}</p>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Badge tone={isProvisional ? "warning" : "success"}>
            {isProvisional ? "Provisional" : "Final"}
          </Badge>
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-75">
            {payload.saw.items.length} kandidat
          </span>
        </div>
      </div>
    </AlertBanner>
  );
}

export function NoPublicationState() {
  return (
    <EmptyState
      icon={<FileQuestion className="h-5 w-5" />}
      title="Belum ada snapshot rekomendasi yang dipublikasikan"
      description="Hasil rekomendasi hanya ditampilkan setelah administrator mengimpor data kuesioner, menghitung bobot AHP dan pemeringkatan SAW, serta mempublikasikan snapshot tervalidasi. Tidak ada angka ranking statis yang ditampilkan."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/metodologi"
            className="inline-flex h-10 items-center rounded-lg border border-[#cbd5e1] bg-white px-4 text-sm font-medium text-[#1e293b] hover:bg-[#f8fafc]"
          >
            Pelajari Metodologi
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center rounded-lg bg-[#1e3a5f] px-4 text-sm font-medium text-white hover:bg-[#162d4a]"
          >
            Masuk Panel Admin
          </Link>
        </div>
      }
    />
  );
}
