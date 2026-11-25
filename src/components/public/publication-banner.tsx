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
      <div className="space-y-1.5">
        <p className="text-xs sm:text-sm">{payload.bannerText}</p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Badge tone={isProvisional ? "warning" : "success"}>
            Status: {isProvisional ? "Provisional" : "Final"}
          </Badge>
          <Badge tone="neutral">{payload.scenarioLabel}</Badge>
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
            className="inline-flex h-10 items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Pelajari Metodologi
          </Link>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Masuk Panel Admin
          </Link>
        </div>
      }
    />
  );
}
