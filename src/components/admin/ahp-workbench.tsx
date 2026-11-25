"use client";

import { useEffect, useState } from "react";
import { Eye, Play, Scale } from "lucide-react";
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
  CrGaugeBar,
  EmptyState,
  Label,
  ScoreBar,
  Select,
  SlideOverDrawer,
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

  const maxWeight = sortedWeights[0]?.weight ?? 1;

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
            <div className="flex flex-wrap items-center gap-3 border-t border-[#e2e8f0] pt-4">
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
                className="w-full sm:w-auto sm:min-w-[300px]"
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
        <p className="py-8 text-center text-sm text-[#64748b]">
          Memuat detail matriks dan audit konsistensi AHP...
        </p>
      ) : (
        <>
          {/* 5-Column Hairline Metrics Strip */}
          <div className="grid gap-px overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#e2e8f0] sm:grid-cols-2 lg:grid-cols-5">
            <div className="bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                Disertakan / Eksklusi
              </p>
              <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#1e293b]">
                {runDetail.run.includedIds.length} / {runDetail.run.excludedIds.length}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                Lambda Maksimum
              </p>
              <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#1e293b]">
                {formatDecimal(runDetail.run.lambdaMax, 8)}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                Consistency Index (CI)
              </p>
              <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#1e293b]">
                {formatDecimal(runDetail.run.ci, 8)}
              </p>
            </div>
            <div className="bg-[#eff4fa] p-4 text-[#1e293b]">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[#1e3a5f]">
                Consistency Ratio (CR)
              </p>
              <p className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#1e3a5f]">
                {formatDecimal(runDetail.run.cr, 8)}
              </p>
            </div>
            <div className="bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                Status (RI = 1,24)
              </p>
              <div className="mt-1.5">
                <Badge tone={runDetail.run.passesCr ? "success" : "error"}>
                  {runDetail.run.passesCr ? "Konsisten (CR ≤ 0,10)" : "Tidak Konsisten"}
                </Badge>
              </div>
              <p className="mt-1.5 font-mono text-[11px] text-[#64748b]">
                Konvergen: {runDetail.run.iterations} iterasi
              </p>
            </div>
          </div>

          {runDetail.run.warnings.length > 0 && (
            <AlertBanner tone="warning" title="Catatan Kualitas & Peringatan Metodologi">
              <ul className="list-disc space-y-1 pl-4 text-xs">
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
                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
                        <th className="px-4 py-2.5">Prioritas</th>
                        <th className="px-4 py-2.5">Kriteria</th>
                        <th className="px-4 py-2.5 text-right">Bobot</th>
                        <th className="px-4 py-2.5 text-right">Persen</th>
                        {comparisonRun && (
                          <th className="px-4 py-2.5 text-right">Pembanding</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]/80">
                      {sortedWeights.map((row, idx) => (
                        <tr key={row.criterion.code} className="hover:bg-[#f8fafc]/60">
                          <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1e293b]">
                            #{idx + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="mr-1.5 font-mono text-xs text-[#64748b]">
                                {row.criterion.code}
                              </span>
                              <span className="font-medium text-[#1e293b]">
                                {row.criterion.name}
                              </span>
                            </div>
                            <ScoreBar
                              value={row.weight}
                              max={maxWeight}
                              className="mt-1.5 max-w-[160px]"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[#475569]">
                            {formatDecimal(row.weight, 8)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold tabular-nums text-[#1e293b]">
                            {formatWeightPercent(row.weight, 2)}
                          </td>
                          {comparisonRun && (
                            <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[#64748b]">
                              {row.compWeight !== null
                                ? formatWeightPercent(row.compWeight, 2)
                                : "—"}
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
                Seluruh responden tetap ditampilkan secara transparan beserta indikator ambang
                CR 0,10 dan alasan inklusi atau eksklusi.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[740px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
                      <th className="px-4 py-2.5">Kode</th>
                      <th className="px-4 py-2.5 text-right">λmaks</th>
                      <th className="px-4 py-2.5 text-right">CR Individu</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Keterangan / Alasan</th>
                      <th className="px-4 py-2.5 text-right">Matriks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]/80">
                    {runDetail.individualResults.map((ir) => (
                      <tr key={ir.id} className="transition-colors hover:bg-[#f8fafc]/60">
                        <td className="px-4 py-3 font-mono font-semibold text-[#1e293b]">
                          {ir.responseCode}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-[#475569]">
                          {ir.lambdaMax !== null ? formatDecimal(ir.lambdaMax, 6) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-xs font-medium tabular-nums text-[#1e293b]">
                              {ir.cr !== null ? formatDecimal(ir.cr, 6) : "—"}
                            </span>
                            <CrGaugeBar cr={ir.cr} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={ir.passesCr ? "success" : "error"}>
                            {ir.passesCr ? "Lolos" : "Tidak lolos"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#475569]">{ir.reason}</td>
                        <td className="px-4 py-3 text-right">
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

      {/* Slide-Over Individual Matrix Drawer */}
      <SlideOverDrawer
        open={Boolean(inspectedInd?.matrix)}
        onClose={() => setInspectedInd(null)}
        title={
          inspectedInd ? `Matriks AHP Individual — ${inspectedInd.responseCode}` : ""
        }
        subtitle={
          inspectedInd
            ? `CR = ${inspectedInd.cr !== null ? formatDecimal(inspectedInd.cr, 8) : "-"} · ${inspectedInd.reason}`
            : undefined
        }
      >
        {inspectedInd?.matrix && (
          <PairwiseMatrixTable
            matrix={inspectedInd.matrix}
            digits={4}
            caption={`Matriks 6x6 individual ${inspectedInd.responseCode}`}
          />
        )}
      </SlideOverDrawer>
    </div>
  );
}
