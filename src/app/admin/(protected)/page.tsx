import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Check,
  FileSpreadsheet,
  History,
  Laptop,
  Scale,
  SlidersHorizontal,
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

  const completedSteps = pipelineSteps.filter((s) => s.done).length;
  const pubItems = stats.currentPublication?.publicPayload.saw.items ?? [];

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col gap-3 border-b border-[#e2e8f0] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="editorial-kicker">Dashboard Administrator</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#1e293b]">
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
            Riwayat &amp; Publikasi
          </Link>{" "}
          bila syarat publikasi final telah terpenuhi.
        </AlertBanner>
      )}

      {/* 4-Column Hairline KPI Ledger */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#e2e8f0] sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white p-5">
          <div className="flex items-center justify-between text-[#64748b]">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
              Responden Kuesioner
            </span>
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="mt-2.5 font-mono text-2xl font-semibold tabular-nums text-[#1e293b]">
            {stats.totalResponses}
          </p>
          <p className="mt-1.5 text-xs tabular-nums text-[#64748b]">
            Eligible: {stats.eligibleResponses} · Lolos CR: {stats.consistentResponses} ·
            Tidak lolos: {stats.inconsistentResponses}
          </p>
        </div>

        <div className="bg-white p-5">
          <div className="flex items-center justify-between text-[#64748b]">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
              CR Gabungan AHP (Utama)
            </span>
            <Scale className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="mt-2.5 font-mono text-2xl font-semibold tabular-nums text-[#1e293b]">
            {stats.latestAhpPrimary
              ? formatDecimal(stats.latestAhpPrimary.cr, 8)
              : "—"}
          </p>
          <p className="mt-1.5 text-xs text-[#64748b]">
            {stats.latestAhpPrimary
              ? stats.latestAhpPrimary.passesCr
                ? "Memenuhi ambang CR ≤ 0,10"
                : "Melebihi ambang 0,10 (diblokir)"
              : "Belum dihitung"}
          </p>
        </div>

        <div className="bg-white p-5">
          <div className="flex items-center justify-between text-[#64748b]">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
              Alternatif Laptop Aktif
            </span>
            <Laptop className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="mt-2.5 font-mono text-2xl font-semibold tabular-nums text-[#1e293b]">
            {stats.activeAlternativesCount}
          </p>
          <p className="mt-1.5 text-xs text-[#64748b]">
            {stats.latestDataset
              ? `v${stats.latestDataset.version} · C6 ${stats.latestDataset.c6Unit} · Audit ${formatDateJakarta(stats.latestDataset.observedAt)}${stats.latestDataset.excludedCandidates.length > 0 ? ` · Arsip dikeluarkan: ${stats.latestDataset.excludedCandidates.length}` : ""}`
              : "Belum ada dataset"}
          </p>
        </div>

        <div className="bg-[#eff4fa] p-5 text-[#1e293b]">
          <div className="flex items-center justify-between text-[#1e3a5f]">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em]">
              Peringkat #1 Snapshot Aktif
            </span>
            <Calculator className="h-4 w-4" aria-hidden="true" />
          </div>
          <p className="mt-2.5 truncate font-mono text-xl font-semibold tabular-nums text-[#1e3a5f]">
            {pubItems[0]
              ? `${pubItems[0].code} — ${formatDecimal(pubItems[0].score, 6)}`
              : "—"}
          </p>
          <p className="mt-1.5 truncate text-xs text-[#475569]">
            {pubItems[0]?.model ?? "Belum ada snapshot publik"}
          </p>
        </div>
      </div>

      {/* Pipeline Status & Audit Trail */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Alur Kerja Penelitian End-to-End</CardTitle>
                <CardDescription>
                  Status aktual setiap tahapan pengolahan AHP–SAW berdasarkan data database.
                </CardDescription>
              </div>
              <Badge tone={completedSteps === pipelineSteps.length ? "success" : "neutral"}>
                {completedSteps} / {pipelineSteps.length} tahap
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-[#e2e8f0]/80 p-0">
            {pipelineSteps.map((step, idx) => (
              <Link
                key={step.label}
                href={step.href}
                className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-[#f8fafc]"
              >
                <div className="flex min-w-0 items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold ${
                      step.done
                        ? "bg-[#1e3a5f] text-white"
                        : "border border-[#cbd5e1] bg-white text-[#64748b]"
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      `0${idx + 1}`
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1e293b]">{step.label}</p>
                    <p className="truncate text-xs text-[#64748b]">{step.detail}</p>
                  </div>
                </div>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[#94a3b8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1e3a5f]"
                  aria-hidden="true"
                />
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
              <p className="px-5 py-10 text-center text-sm text-[#64748b]">
                Belum ada aktivitas audit tercatat.
              </p>
            ) : (
              <ul className="divide-y divide-[#e2e8f0]/80">
                {stats.recentAuditLogs.slice(0, 6).map((log) => (
                  <li key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#1e3a5f]">
                        {log.action}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums text-[#64748b]">
                        {formatDateTimeJakarta(log.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-[#64748b]">
                      Resource: <span className="text-[#475569]">{log.resourceType}</span>
                      {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}…` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shortcuts Ledger */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#e2e8f0] sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/perhitungan/ahp"
          className="group flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-[#f8fafc]"
        >
          <div className="flex items-center gap-3">
            <Scale className="h-4 w-4 text-[#1e3a5f]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#1e293b]">Audit &amp; Hitung AHP</span>
          </div>
          <ArrowRight
            className="h-4 w-4 text-[#94a3b8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1e3a5f]"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/admin/perhitungan/sensitivitas"
          className="group flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-[#f8fafc]"
        >
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="h-4 w-4 text-[#1e3a5f]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#1e293b]">Sensitivitas 37 Skenario</span>
          </div>
          <ArrowRight
            className="h-4 w-4 text-[#94a3b8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1e3a5f]"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/admin/riwayat"
          className="group flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-[#f8fafc]"
        >
          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-[#1e3a5f]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#1e293b]">Riwayat &amp; Publikasi</span>
          </div>
          <ArrowRight
            className="h-4 w-4 text-[#94a3b8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1e3a5f]"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/admin/laporan"
          className="group flex items-center justify-between bg-white px-5 py-4 transition-colors hover:bg-[#f8fafc]"
        >
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-4 w-4 text-[#1e3a5f]" aria-hidden="true" />
            <span className="text-sm font-medium text-[#1e293b]">Ekspor Laporan Excel</span>
          </div>
          <ArrowRight
            className="h-4 w-4 text-[#94a3b8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1e3a5f]"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
