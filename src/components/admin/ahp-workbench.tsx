"use client";

import { useEffect, useState } from "react";
import { Eye, Play, Scale, X } from "lucide-react";
import { CriteriaWeightsChart } from "@/components/decision/charts";
import { PairwiseMatrixTable } from "@/components/decision/matrix-table";
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
} from "@/components/ui/primitives";
import { CRITERIA, type AhpMode } from "@/lib/decision";
import {
  formatDateTimeJakarta,
  formatDecimal,
  formatWeightPercent,
} from "@/lib/formatting";
import type {
  AhpIndividualResultRecord,
  AhpRunRecord,
  ResponseBatchRecord,
} from "@/lib/repositories/types";

export function AhpWorkbench({
  initialBatches,
  initialRuns,
}: {
  initialBatches: ResponseBatchRecord[];
  initialRuns: AhpRunRecord[];
}) {
  const [runs, setRuns] = useState<AhpRunRecord[]>(initialRuns);
  const [batchId, setBatchId] = useState<string>(initialBatches[0]?.id ?? "");
  const [mode, setMode] = useState<AhpMode>("consistent_only");
  const [selectedRunId, setSelectedRunId] = useState<string>(
    initialRuns[0]?.id ?? "",
  );
  const [runDetail, setRunDetail] = useState<{
    run: AhpRunRecord;
    individualResults: AhpIndividualResultRecord[];
  } | null>(null);
  const [computing, setComputing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [inspectedInd, setInspectedInd] =
    useState<AhpIndividualResultRecord | null>(null);

  useEffect(() => {
    if (!selectedRunId) return;
    let active = true;
    const controller = new AbortController();

    async function loadRun() {
      try {
        const res = await fetch(`/api/admin/ahp/runs/${selectedRunId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as {
          data?: {
            run: AhpRunRecord;
            individualResults: AhpIndividualResultRecord[];
          };
        };
        if (active) {
          setRunDetail(json.data ?? null);
          setLoadingDetail(false);
        }
      } catch {
        if (active) setLoadingDetail(false);
      }
    }

    void loadRun();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedRunId]);

  async function handleCompute() {
    if (!batchId) return;
    setComputing(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/ahp/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, mode }),
      });
      const json = (await res.json()) as {
        data?: { run: AhpRunRecord };
        error?: { message?: string };
      };

      if (!res.ok || !json.data) {
        setFeedback({
          tone: "error",
          message: json.error?.message ?? "Gagal menghitung AHP di server.",
        });
        return;
      }

      const created = json.data.run;
      setRuns((prev) => [created, ...prev]);
      setSelectedRunId(created.id);
      setFeedback({
        tone: "success",
        message: `Perhitungan AHP (${created.mode === "consistent_only" ? "Konsisten CR ≤ 0,10" : "Seluruh Responden"}) selesai. CR gabungan = ${formatDecimal(created.cr, 8)}.`,
      });
    } finally {
      setComputing(false);
    }
  }

  const comparisonRun = runDetail
    ? runs.find(
        (r) =>
          r.batchId === runDetail.run.batchId &&
          r.mode !== runDetail.run.mode,
      ) ?? null
    : null;

  const sortedWeights = runDetail
    ? [...CRITERIA]
        .map((c) => ({
          criterion: c,
          weight: runDetail.run.weightsByCode[c.code],
          compWeight: comparisonRun?.weightsByCode[c.code] ?? null,
        }))
        .sort((a, b) => b.weight - a.weight)
    : [];

  return (
    <div className="space-y-6">
      {feedback && (
        <AlertBanner tone={feedback.tone}>{feedback.message}</AlertBanner>
      )}

      {/* Run Trigger Card */}
      <Card>
        <CardHeader>
          <CardTitle>Jalankan Komputasi AHP di Server</CardTitle>
          <CardDescription>
            Menghitung matriks resiprokal 6×6 tiap responden, principal eigenvector via power
            iteration, CR individual (RI = 1,24), agregasi geometrik AIJ, serta bobot dan CR kelompok.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="ahp-batch">Batch Responden</Label>
              <Select
                id="ahp-batch"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
              >
                {initialBatches.length === 0 && (
                  <option value="">Belum ada batch responden</option>
                )}
                {initialBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.filename} ({b.rowCount} baris)
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ahp-mode">Mode Seleksi Responden</Label>
              <Select
                id="ahp-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as AhpMode)}
              >
                <option value="consistent_only">
                  Skenario Utama — Lolos CR ≤ 0,10 saja
                </option>
                <option value="all_eligible">
                  Sensitivitas — Seluruh Responden Eligible
                </option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleCompute}
                disabled={!batchId || computing}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {computing ? "Menghitung Eigenvector..." : "Hitung AHP Sekarang"}
              </Button>
            </div>
          </div>

          {runs.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3">
              <Label htmlFor="ahp-history-select" className="mb-0">
                Tampilkan hasil run tersimpan:
              </Label>
              <Select
                id="ahp-history-select"
                value={selectedRunId}
                onChange={(e) => {
                  setLoadingDetail(true);
                  setSelectedRunId(e.target.value);
                }}
                className="w-auto min-w-[300px]"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDateTimeJakarta(r.createdAt)} ·{" "}
                    {r.mode === "consistent_only" ? "Konsisten" : "Semua"} ({r.includedIds.length}{" "}
                    resp · CR {formatDecimal(r.cr, 6)})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {runs.length === 0 ? (
        <EmptyState
          icon={<Scale className="h-5 w-5" />}
          title="Belum ada hasil perhitungan AHP"
          description="Pilih batch responden yang sudah diimpor lalu klik Hitung AHP Sekarang untuk menjalankan algoritma eigenvector dan agregasi geometrik."
        />
      ) : loadingDetail || !runDetail ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Memuat detail matriks dan audit konsistensi AHP...
        </p>
      ) : (
        <>
          {/* Summary metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Disertakan / Dieksklusi</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {runDetail.run.includedIds.length} / {runDetail.run.excludedIds.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Lambda Maksimum</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatDecimal(runDetail.run.lambdaMax, 8)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Consistency Index (CI)</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatDecimal(runDetail.run.ci, 8)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Consistency Ratio (CR)</p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {formatDecimal(runDetail.run.cr, 8)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500">Status (RI = 1,24)</p>
                <div className="mt-1.5">
                  <Badge tone={runDetail.run.passesCr ? "success" : "error"}>
                    {runDetail.run.passesCr ? "Konsisten (CR ≤ 0,10)" : "Tidak Konsisten"}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Konvergen: {runDetail.run.iterations} iterasi
                </p>
              </CardContent>
            </Card>
          </div>

          {runDetail.run.warnings.length > 0 && (
            <AlertBanner tone="warning" title="Catatan Kualitas & Peringatan Metodologi">
              <ul className="list-disc pl-4 space-y-1 text-xs">
                {runDetail.run.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </AlertBanner>
          )}

          {/* Weights Table + Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vektor Bobot Prioritas Kriteria</CardTitle>
                <CardDescription>
                  Hasil principal eigenvector presisi penuh (jumlah = 1,00000000).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                        <th className="px-4 py-2.5">Prioritas</th>
                        <th className="px-4 py-2.5">Kriteria</th>
                        <th className="px-4 py-2.5 text-right">Bobot</th>
                        <th className="px-4 py-2.5 text-right">Persen</th>
                        {comparisonRun && (
                          <th className="px-4 py-2.5 text-right">Pembanding</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {sortedWeights.map((row, idx) => (
                        <tr key={row.criterion.code}>
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold">
                            #{idx + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs text-zinc-500 mr-1.5">
                              {row.criterion.code}
                            </span>
                            <span className="font-medium text-zinc-900">
                              {row.criterion.name}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                            {formatDecimal(row.weight, 8)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                            {formatWeightPercent(row.weight, 2)}
                          </td>
                          {comparisonRun && (
                            <td className="px-4 py-2.5 text-right text-xs text-zinc-500 tabular-nums">
                              {row.compWeight !== null
                                ? formatWeightPercent(row.compWeight, 2)
                                : "-"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visualisasi Bobot AHP</CardTitle>
                <CardDescription>
                  {comparisonRun
                    ? "Membandingkan skenario aktif dengan mode pembanding pada batch yang sama."
                    : "Distribusi persentase bobot enam kriteria penelitian."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CriteriaWeightsChart
                  weightsByCode={runDetail.run.weightsByCode}
                  comparisonWeightsByCode={comparisonRun?.weightsByCode ?? null}
                  primaryLabel={
                    runDetail.run.mode === "consistent_only"
                      ? `Konsisten (${runDetail.run.includedIds.length})`
                      : `Semua (${runDetail.run.includedIds.length})`
                  }
                  comparisonLabel={
                    comparisonRun
                      ? comparisonRun.mode === "consistent_only"
                        ? `Konsisten (${comparisonRun.includedIds.length})`
                        : `Semua (${comparisonRun.includedIds.length})`
                      : undefined
                  }
                />
              </CardContent>
            </Card>
          </div>

          {/* Group AIJ Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>
                Matriks Perbandingan Gabungan (AIJ — Rata-rata Geometrik)
              </CardTitle>
              <CardDescription>
                Diagregasikan dari {runDetail.run.includedIds.length} responden terpilih dengan
                bobot setara untuk menjaga sifat resiprokal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PairwiseMatrixTable
                matrix={runDetail.run.aggregateMatrix}
                digits={4}
                caption="Matriks perbandingan gabungan AIJ"
              />
            </CardContent>
          </Card>

          {/* Individual CR Audit Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Konsistensi Individual per Responden</CardTitle>
              <CardDescription>
                Seluruh responden tetap ditampilkan secara transparan beserta alasan inklusi
                atau eksklusi.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                      <th className="px-4 py-2.5">Kode</th>
                      <th className="px-4 py-2.5 text-right">λmaks</th>
                      <th className="px-4 py-2.5 text-right">CR Individu</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Keterangan / Alasan</th>
                      <th className="px-4 py-2.5 text-right">Matriks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {runDetail.individualResults.map((ir) => (
                      <tr key={ir.id} className="hover:bg-zinc-50/70">
                        <td className="px-4 py-2.5 font-mono font-semibold">
                          {ir.responseCode}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                          {ir.lambdaMax !== null ? formatDecimal(ir.lambdaMax, 6) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                          {ir.cr !== null ? formatDecimal(ir.cr, 6) : "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge tone={ir.passesCr ? "success" : "error"}>
                            {ir.passesCr ? "Lolos" : "Tidak lolos"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-600">
                          {ir.reason}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {ir.matrix && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInspectedInd(ir)}
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              6×6
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Individual Matrix Modal */}
      {inspectedInd && inspectedInd.matrix && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <div>
                <h3 className="text-base font-bold">
                  Matriks AHP Individual — {inspectedInd.responseCode}
                </h3>
                <p className="text-xs text-zinc-500">
                  CR = {inspectedInd.cr !== null ? formatDecimal(inspectedInd.cr, 8) : "-"} ·{" "}
                  {inspectedInd.reason}
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup modal"
                onClick={() => setInspectedInd(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-5">
              <PairwiseMatrixTable matrix={inspectedInd.matrix} digits={4} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
