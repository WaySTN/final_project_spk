"use client";

import { useState } from "react";
import { CheckCircle2, Globe, ShieldCheck } from "lucide-react";
import {
  AlertBanner,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Label,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { formatDateTimeJakarta } from "@/lib/formatting";
import { getScenarioLabel } from "@/lib/publication/sanitize";
import type {
  PublicationRecord,
  QualityReviewChecklist,
  SawRunRecord,
} from "@/lib/repositories/types";

export function RiwayatWorkbench({
  initialSawRuns,
  initialPublications,
}: {
  initialSawRuns: SawRunRecord[];
  initialPublications: PublicationRecord[];
}) {
  const [publications, setPublications] =
    useState<PublicationRecord[]>(initialPublications);
  const [selectedSawRunId, setSelectedSawRunId] = useState<string>(
    initialSawRuns.find((r) => r.scenario === "primary_7_consistent")?.id ??
      initialSawRuns[0]?.id ??
      "",
  );
  const [intendedStatus, setIntendedStatus] = useState<"provisional" | "final">(
    "provisional",
  );
  const [caveats, setCaveats] = useState(
    "Snapshot penelitian terbatas pada 7 konfigurasi Lenovo dalam rentang Rp9.000.000–Rp11.000.000 pada tanggal audit 25 November 2026. Harga dan stok dapat berubah; independensi 10 respons tambahan serta konfirmasi stok ritel langsung memerlukan verifikasi lanjutan.",
  );
  const [checklist, setChecklist] = useState<QualityReviewChecklist>({
    primaryRuleVerified: true,
    sourcesAndSkuReviewed: false,
    responseIndependenceConfirmed: false,
    stockOrArchivalScopeRecorded: false,
    caveatsAcknowledged: true,
    methodologyExceptionNote: "",
  });

  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
    unmet?: string[];
  } | null>(null);

  async function handlePublish() {
    if (!selectedSawRunId) return;
    setPublishing(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sawRunId: selectedSawRunId,
          intendedStatus,
          caveats,
          qualityReview: checklist,
        }),
      });
      const json = (await res.json()) as {
        data?: { publication: PublicationRecord };
        error?: { message?: string; details?: { unmetRequirements?: string[] } };
      };

      if (!res.ok || !json.data) {
        setFeedback({
          tone: "error",
          message: json.error?.message ?? "Publikasi ditolak oleh server.",
          unmet: json.error?.details?.unmetRequirements,
        });
        return;
      }

      const pub = json.data.publication;
      setPublications((prev) => [
        pub,
        ...prev.map((p) =>
          p.isCurrent ? { ...p, isCurrent: false, status: "archived" as const } : p,
        ),
      ]);
      setFeedback({
        tone: "success",
        message: `Snapshot berhasil dipublikasikan dengan status ${pub.status.toUpperCase()} dan langsung aktif pada website publik.`,
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <AlertBanner
          tone={feedback.tone}
          title={
            feedback.tone === "error"
              ? "Gerbang Publikasi Memblokir Permintaan"
              : "Snapshot Dipublikasikan"
          }
        >
          <p>{feedback.message}</p>
          {feedback.unmet && feedback.unmet.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
              {feedback.unmet.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          )}
        </AlertBanner>
      )}

      {/* Publication Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Publikasikan Snapshot ke Website Publik</CardTitle>
          <CardDescription>
            Hanya satu publikasi yang aktif pada satu waktu. Publikasi{" "}
            <strong>provisional</strong> cukup untuk mendemonstrasikan hasil penelitian dengan
            peringatan bersyarat; status <strong>final</strong> hanya dibuka setelah seluruh
            checklist verifikasi manusia dikonfirmasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {initialSawRuns.length === 0 ? (
            <EmptyState
              title="Belum ada run SAW yang dapat dipublikasikan"
              description="Jalankan perhitungan AHP dan SAW terlebih dahulu sebelum mempublikasikan snapshot ke halaman publik."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pub-saw-run">Pilih Run SAW Utama</Label>
                  <Select
                    id="pub-saw-run"
                    value={selectedSawRunId}
                    onChange={(e) => setSelectedSawRunId(e.target.value)}
                  >
                    {initialSawRuns.map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatDateTimeJakarta(r.createdAt)} · {r.scenario} (v
                        {r.inputSnapshot.datasetVersion} ·{" "}
                        {r.inputSnapshot.alternativeCodes.length} alt)
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Label htmlFor="pub-status">Status Publikasi Tujuan</Label>
                  <Select
                    id="pub-status"
                    value={intendedStatus}
                    onChange={(e) =>
                      setIntendedStatus(e.target.value as "provisional" | "final")
                    }
                  >
                    <option value="provisional">
                      Provisional — Snapshot Penelitian Bersyarat (Direkomendasikan untuk baseline)
                    </option>
                    <option value="final">
                      Final — Memerlukan Seluruh Konfirmasi Verifikasi Manusia
                    </option>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="pub-caveats">Catatan Batasan Publik (Caveats)</Label>
                <Textarea
                  id="pub-caveats"
                  rows={3}
                  value={caveats}
                  onChange={(e) => setCaveats(e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Checklist Verifikasi Kualitas (Wajib Penuh untuk Status Final)
                </p>
                {(
                  [
                    [
                      "primaryRuleVerified",
                      "Aturan konsistensi AHP individu (CR ≤ 0,10) dan CR gabungan telah diverifikasi.",
                    ],
                    [
                      "sourcesAndSkuReviewed",
                      "Keempat tautan sumber, tingkat SKU, dan protokol baterai C6 telah diperiksa manual.",
                    ],
                    [
                      "responseIndependenceConfirmed",
                      "Independensi & keaslian respons kuesioner tambahan (termasuk 10 baris CR ≈ 0) telah dikonfirmasi peneliti.",
                    ],
                    [
                      "stockOrArchivalScopeRecorded",
                      "Hasil konfirmasi stok penjual (atau pembatasan eksplisit ke arsip penawaran bertanggal) telah dicatat.",
                    ],
                    [
                      "caveatsAcknowledged",
                      "Keterbatasan merek tunggal (Lenovo), sensitivitas A7/A6, dan snapshot tanggal telah diakui.",
                    ],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-start gap-2.5 text-xs text-zinc-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checklist[key])}
                      onChange={(e) =>
                        setChecklist({ ...checklist, [key]: e.target.checked })
                      }
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handlePublish} disabled={publishing}>
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  {publishing
                    ? "Memvalidasi & Mempublikasikan..."
                    : `Publikasikan sebagai ${intendedStatus.toUpperCase()}`}
                </Button>
                <span className="text-xs text-zinc-500">
                  Payload publik disanitasi di server: tidak memuat data mentah responden.
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Publication History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Publikasi Snapshot</CardTitle>
          <CardDescription>
            Publikasi lama diarsipkan secara otomatis saat snapshot baru diaktifkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {publications.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">
              Belum ada snapshot yang dipublikasikan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                    <th className="px-4 py-2.5">Waktu Publikasi</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Skenario</th>
                    <th className="px-4 py-2.5">Peringkat #1</th>
                    <th className="px-4 py-2.5">Status Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {publications.map((pub) => {
                    const top = pub.publicPayload.saw.items[0];
                    return (
                      <tr key={pub.id}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {formatDateTimeJakarta(pub.publishedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              pub.status === "final"
                                ? "success"
                                : pub.status === "provisional"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {pub.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-700">
                          {getScenarioLabel(pub.publicPayload.scenario)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">
                          {top ? `${top.code} — ${top.model}` : "-"}
                        </td>
                        <td className="px-4 py-3">
                          {pub.isCurrent ? (
                            <Badge tone="dark">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              Aktif di Publik
                            </Badge>
                          ) : (
                            <span className="text-xs text-zinc-400">Diarsipkan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Immutable SAW Run History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Perhitungan SAW (Immutable)</CardTitle>
          <CardDescription>
            Setiap perubahan dataset atau skenario menghasilkan versi perhitungan baru tanpa
            menimpa histori lama.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {initialSawRuns.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">
              Belum ada histori perhitungan SAW.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                    <th className="px-4 py-2.5">Waktu</th>
                    <th className="px-4 py-2.5">Skenario</th>
                    <th className="px-4 py-2.5">Mode AHP</th>
                    <th className="px-4 py-2.5">Dataset</th>
                    <th className="px-4 py-2.5">Alternatif</th>
                    <th className="px-4 py-2.5">Algoritma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {initialSawRuns.map((run) => (
                    <tr key={run.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDateTimeJakarta(run.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {run.scenario}
                      </td>
                      <td className="px-4 py-3">{run.inputSnapshot.ahpMode}</td>
                      <td className="px-4 py-3">
                        v{run.inputSnapshot.datasetVersion} ({run.inputSnapshot.observedAt})
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {run.inputSnapshot.alternativeCodes.join(", ")}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500">
                        {run.algorithmVersion}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
