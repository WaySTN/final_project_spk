import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Laptop,
  Scale,
  Users,
} from "lucide-react";
import {
  AlertBanner,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/primitives";
import {
  formatDateJakarta,
  formatDateTimeJakarta,
  formatDecimal,
} from "@/lib/formatting";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const repo = await getRepository();
  const stats = await repo.getAdminOverview();

  const pipelineSteps = [
    {
      label: "Impor data respons kuesioner",
      done: Boolean(stats.latestBatch),
      detail: stats.latestBatch
        ? `${stats.totalResponses} respons (${stats.eligibleResponses} eligible)`
        : "Belum ada batch responden",
      href: "/admin/responden",
    },
    {
      label: "Perhitungan & uji konsistensi AHP",
      done: Boolean(stats.latestAhpPrimary),
      detail: stats.latestAhpPrimary
        ? `CR gabungan ${formatDecimal(stats.latestAhpPrimary.cr, 8)} (${stats.consistentResponses} konsisten)`
        : "Belum ada run AHP",
      href: "/admin/perhitungan/ahp",
    },
    {
      label: "Impor / kelola data alternatif laptop",
      done: Boolean(stats.latestDataset),
      detail: stats.latestDataset
        ? `v${stats.latestDataset.version} — ${stats.activeAlternativesCount} alternatif aktif (${stats.latestDataset.status})`
        : "Belum ada dataset laptop",
      href: "/admin/alternatif",
    },
    {
      label: "Perhitungan normalisasi & ranking SAW",
      done: Boolean(stats.latestSawRun),
      detail: stats.latestSawRun
        ? `Run terbaru: ${stats.latestSawRun.scenario} (${formatDateTimeJakarta(stats.latestSawRun.createdAt)})`
        : "Belum ada run SAW",
      href: "/admin/perhitungan/saw",
    },
    {
      label: "Publikasi snapshot ke website publik",
      done: Boolean(stats.currentPublication),
      detail: stats.currentPublication
        ? `Aktif (${stats.currentPublication.status}) sejak ${formatDateTimeJakarta(stats.currentPublication.publishedAt)}`
        : "Website publik masih dalam empty state",
      href: "/admin/riwayat",
    },
  ];

  const pubItems = stats.currentPublication?.publicPayload.saw.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Dashboard Administrator
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Ringkasan Penelitian LaptopMatch
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={stats.storageMode === "supabase" ? "success" : "warning"}>
            Penyimpanan:{" "}
            {stats.storageMode === "supabase"
              ? "Supabase PostgreSQL"
              : stats.storageMode === "local_test"
                ? "Mode Uji Lokal"
                : "Belum Dikonfigurasi"}
          </Badge>
          {stats.currentPublication ? (
            <Badge
              tone={
                stats.currentPublication.status === "final" ? "success" : "warning"
              }
            >
              Publikasi aktif: {stats.currentPublication.status.toUpperCase()}
            </Badge>
          ) : (
            <Badge tone="neutral">Belum dipublikasikan</Badge>
          )}
        </div>
      </div>

      {stats.currentPublication?.status === "provisional" && (
        <AlertBanner tone="warning" title="Publikasi aktif berstatus Provisional">
          Snapshot publik menampilkan peringatan bahwa validasi independensi respons
          tambahan dan konfirmasi stok ritel langsung belum seluruhnya diverifikasi.
          Lakukan konfirmasi pada halaman{" "}
          <Link href="/admin/riwayat" className="font-semibold underline">
            Riwayat & Publikasi
          </Link>{" "}
          bila syarat publikasi final telah terpenuhi.
        </AlertBanner>
      )}

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium">Responden Kuesioner</span>
              <Users className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">
              {stats.totalResponses}
            </p>
            <p className="mt-1 text-xs text-zinc-500 tabular-nums">
              Eligible: {stats.eligibleResponses} · Lolos CR: {stats.consistentResponses} ·
              Tidak lolos: {stats.inconsistentResponses}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium">CR Gabungan AHP (Utama)</span>
              <Scale className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">
              {stats.latestAhpPrimary
                ? formatDecimal(stats.latestAhpPrimary.cr, 8)
                : "-"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {stats.latestAhpPrimary
                ? stats.latestAhpPrimary.passesCr
                  ? "Memenuhi ambang CR ≤ 0,10"
                  : "Melebihi ambang 0,10 (diblokir)"
                : "Belum dihitung"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium">Alternatif Laptop Aktif</span>
              <Laptop className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">
              {stats.activeAlternativesCount}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {stats.latestDataset
                ? `Audit ${formatDateJakarta(stats.latestDataset.observedAt)} · Withdrawn: ${stats.withdrawnCount}`
                : "Belum ada dataset"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-zinc-500">
              <span className="text-xs font-medium">Peringkat #1 Snapshot Aktif</span>
              <Calculator className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className="mt-2 truncate text-lg font-bold text-zinc-900">
              {pubItems[0] ? `${pubItems[0].code} — ${formatDecimal(pubItems[0].score, 6)}` : "-"}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {pubItems[0]?.model ?? "Belum ada snapshot publik"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Status & Quick Navigation */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Alur Kerja Penelitian End-to-End</CardTitle>
            <CardDescription>
              Status aktual setiap tahapan pengolahan AHP–SAW berdasarkan data database.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-zinc-100 p-0">
            {pipelineSteps.map((step, idx) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      step.done
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-300 bg-white text-zinc-500"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{step.label}</p>
                    <p className="truncate text-xs text-zinc-500">{step.detail}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Aktivitas Audit Terbaru</CardTitle>
            <CardDescription>
              Log immutable tindakan admin (tanpa menyimpan respons mentah/kredensial).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recentAuditLogs.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">
                Belum ada aktivitas audit tercatat.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {stats.recentAuditLogs.slice(0, 6).map((log) => (
                  <li key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-medium text-zinc-900">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {formatDateTimeJakarta(log.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Resource: {log.resourceType}
                      {log.resourceId ? ` (${log.resourceId.slice(0, 8)}…)` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shortcuts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/perhitungan/ahp"
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Scale className="h-4 w-4 text-zinc-700" aria-hidden="true" />
            <span className="text-sm font-medium">Audit & Hitung AHP</span>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        </Link>
        <Link
          href="/admin/riwayat"
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-zinc-700" aria-hidden="true" />
            <span className="text-sm font-medium">Riwayat & Publikasi</span>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        </Link>
        <Link
          href="/admin/laporan"
          className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-4 w-4 text-zinc-700" aria-hidden="true" />
            <span className="text-sm font-medium">Ekspor Laporan Excel</span>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
