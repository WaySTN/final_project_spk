"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, Download, Play, SlidersHorizontal } from "lucide-react";
import { SawContributionChart } from "@/components/decision/charts";
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
  ScoreBar,
  Select,
} from "@/components/ui/primitives";
import {
  buildDecisionEvaluation,
  getCriteriaForMetric,
  type C6MetricType,
  type SawScenarioKey,
} from "@/lib/decision";
import {
  formatDateTimeJakarta,
  formatDecimal,
  formatIdr,
  formatInteger,
  formatWeightPercent,
} from "@/lib/formatting";
import { getScenarioLabel } from "@/lib/publication/sanitize";
import type {
  AhpRunRecord,
  AlternativeDatasetRecord,
  AlternativeRecord,
  SawResultRecord,
  SawRunRecord,
} from "@/lib/repositories/types";

interface SawDetailPayload {
  run: SawRunRecord;
  results: SawResultRecord[];
  ahpRun: AhpRunRecord;
  dataset: AlternativeDatasetRecord;
  alternatives: AlternativeRecord[];
}

export function SawWorkbench({
  initialAhpRuns,
  initialDatasets,
  initialSawRuns,
}: {
  initialAhpRuns: AhpRunRecord[];
  initialDatasets: AlternativeDatasetRecord[];
  initialSawRuns: SawRunRecord[];
}) {
  const [sawRuns, setSawRuns] = useState<SawRunRecord[]>(initialSawRuns);
  const [ahpRunId, setAhpRunId] = useState<string>(
    initialAhpRuns.find((r) => r.mode === "consistent_only")?.id ??
      initialAhpRuns[0]?.id ??
      "",
  );
  const [datasetId, setDatasetId] = useState<string>(initialDatasets[0]?.id ?? "");
  const initialDsMetric: C6MetricType = initialDatasets[0]?.c6Metric ?? "battery_wh";
  const [scenario, setScenario] = useState<SawScenarioKey>(
    initialDsMetric === "battery_wh" ? "primary_33_consistent" : "primary_7_consistent",
  );
  const [selectedRunId, setSelectedRunId] = useState<string>(
    initialSawRuns[0]?.id ?? "",
  );
  const [detail, setDetail] = useState<SawDetailPayload | null>(null);
  const [computing, setComputing] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  function handleDatasetChange(newId: string) {
    setDatasetId(newId);
    const ds = initialDatasets.find((d) => d.id === newId);
    if (ds) {
      setScenario(
        ds.c6Metric === "battery_wh" ? "primary_33_consistent" : "primary_7_consistent",
      );
    }
  }

  useEffect(() => {
    if (!selectedRunId) return;
    let active = true;
    const controller = new AbortController();

    async function loadDetail() {
      try {
        const res = await fetch(`/api/admin/saw/runs/${selectedRunId}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as { data?: SawDetailPayload };
        if (active) {
          setDetail(json.data ?? null);
          setLoadingDetail(false);
        }
      } catch {
        if (active) setLoadingDetail(false);
      }
    }

    void loadDetail();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedRunId]);

  async function handleCompute() {
    if (!ahpRunId || !datasetId) return;
    setComputing(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/saw/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ahpRunId, datasetId, scenario }),
      });
      const json = (await res.json()) as {
        data?: { run: SawRunRecord; results: Array<{ code: string; score: number }> };
        error?: { message?: string };
      };

      if (!res.ok || !json.data) {
        setFeedback({
          tone: "error",
          message: json.error?.message ?? "Gagal menghitung SAW di server.",
        });
        return;
      }

      const created = json.data.run;
      const top = json.data.results[0];
      setSawRuns((prev) => [created, ...prev]);
      setSelectedRunId(created.id);
      setFeedback({
        tone: "success",
        message: `Perhitungan SAW selesai (${getScenarioLabel(created.scenario)}). Peringkat #1: ${top?.code ?? "-"} (${top ? formatDecimal(top.score, 6) : "-"}). Dataset telah disegel (sealed) agar histori immutable.`,
      });
    } finally {
      setComputing(false);
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <AlertBanner tone={feedback.tone}>{feedback.message}</AlertBanner>
      )}

      {/* Compute Control Card */}
      <Card>
        <CardHeader>
          <CardTitle>Jalankan Komputasi SAW &amp; Skenario Sensitivitas</CardTitle>
          <CardDescription>
            Bobot diambil langsung dari run AHP tersimpan di server. Perubahan himpunan alternatif
            (mis. skenario 5 alternatif tanpa A6 &amp; A7) otomatis menghitung ulang nilai min/max normalisasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="saw-ahp">Run AHP (Sumber Bobot)</Label>
              <Select
                id="saw-ahp"
                value={ahpRunId}
                onChange={(e) => setAhpRunId(e.target.value)}
              >
                {initialAhpRuns.length === 0 && <option value="">Belum ada run AHP</option>}
                {initialAhpRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.mode === "consistent_only" ? "Konsisten" : "Semua"} ({r.includedIds.length}{" "}
                    resp · CR {formatDecimal(r.cr, 6)})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="saw-dataset">Dataset Alternatif</Label>
              <Select
                id="saw-dataset"
                value={datasetId}
                onChange={(e) => handleDatasetChange(e.target.value)}
              >
                {initialDatasets.length === 0 && (
                  <option value="">Belum ada dataset</option>
                )}
                {initialDatasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    v{d.version} — {d.label} ({d.c6Unit} · {d.status})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="saw-scenario">Skenario Penelitian</Label>
              <Select
                id="saw-scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value as SawScenarioKey)}
              >
                <option value="primary_33_consistent">
                  Utama UAS — 33 Alternatif (17 Konsisten · C6 Wh)
                </option>
                <option value="sensitivity_33_all">
                  Pembanding UAS — 33 Alternatif (33 Responden)
                </option>
                <option value="primary_7_consistent">
                  Historis S1 — 7 Alternatif (17 Konsisten · C6 jam)
                </option>
                <option value="sensitivity_7_all">
                  Historis S2 — 7 Alternatif (33 Responden)
                </option>
                <option value="sensitivity_5_no_a6_a7">
                  Historis S3 — 5 Alternatif Tanpa A6 &amp; A7
                </option>
                <option value="custom">Kustom (Semua Alternatif Aktif)</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={handleCompute}
                disabled={!ahpRunId || !datasetId || computing}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                {computing ? "Menghitung SAW..." : "Hitung SAW Sekarang"}
              </Button>
            </div>
          </div>

          {sawRuns.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="saw-select" className="mb-0">
                  Run SAW ditampilkan:
                </Label>
                <Select
                  id="saw-select"
                  value={selectedRunId}
                  onChange={(e) => {
                    setLoadingDetail(true);
                    setSelectedRunId(e.target.value);
                  }}
                  className="w-full sm:w-auto sm:min-w-[300px]"
                >
                  {sawRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatDateTimeJakarta(r.createdAt)} · {r.scenario} (v
                      {r.inputSnapshot.datasetVersion} ·{" "}
                      {r.inputSnapshot.alternativeCodes.length} alt)
                    </option>
                  ))}
                </Select>
              </div>
              {selectedRunId && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/admin/perhitungan/sensitivitas"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#1e3a5f]/30 bg-[#eff4fa] px-3 text-xs font-medium text-[#1e3a5f] transition-colors hover:bg-[#e2ecf7]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    Sensitivitas 37 Skenario
                  </Link>
                  <a
                    href={`/api/admin/export/${selectedRunId}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 text-xs font-medium text-[#1e293b] transition-colors hover:border-[#1e3a5f]/40 hover:bg-[#f8fafc]"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Ekspor XLSX Run Ini
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {sawRuns.length === 0 ? (
        <EmptyState
          icon={<Calculator className="h-5 w-5" />}
          title="Belum ada hasil perhitungan SAW"
          description="Pilih run AHP dan dataset alternatif laptop, lalu klik Hitung SAW Sekarang untuk memproses matriks keputusan X, normalisasi R, kontribusi berbobot, dan peringkat."
        />
      ) : loadingDetail || !detail ? (
        <p className="py-8 text-center text-sm text-[#64748b]">
          Memuat matriks keputusan, normalisasi, dan peringkat SAW...
        </p>
      ) : (() => {
        const detailC6Metric: C6MetricType =
          detail.run.c6Metric ?? detail.dataset.c6Metric ?? "battery_wh";
        const detailC6Unit = detail.run.c6Unit ?? detail.dataset.c6Unit ?? (detailC6Metric === "battery_wh" ? "Wh" : "jam");
        const activeCriteria = getCriteriaForMetric(detailC6Metric);
        const evaluation = buildDecisionEvaluation({
          items: detail.results.map((r) => ({
            code: r.alternativeCode,
            model: r.alternativeModel,
            score: r.score,
            rank: r.rank,
            weightedValues: r.weightedValues,
          })),
          weightSensitivity: detail.run.weightSensitivity ?? null,
          c6Metric: detailC6Metric,
        });

        const formatC6Raw = (val: number) => {
          if (detailC6Metric === "battery_wh") {
            const digits = Number.isInteger(val) ? 0 : 2;
            return `${formatDecimal(val, digits)} Wh`;
          }
          return `${formatDecimal(val, 1)} jam`;
        };

        return (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">{getScenarioLabel(detail.run.scenario)}</Badge>
            <Badge tone="neutral">
              Dataset v{detail.dataset.version} · Audit {detail.dataset.observedAt}
            </Badge>
            <Badge tone="neutral">C6: {detailC6Unit}</Badge>
            <Badge tone="neutral">
              CR AHP = {formatDecimal(detail.ahpRun.cr, 8)}
            </Badge>
          </div>

          {(detail.run.warnings.length > 0 || detail.run.caveats.length > 0) && (
            <AlertBanner tone="warning" title="Catatan Sensitivitas & Normalisasi">
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {detail.run.warnings.map((w, i) => (
                  <li key={`w-${i}`}>{w}</li>
                ))}
                {detail.run.caveats.map((c, i) => (
                  <li key={`c-${i}`}>{c}</li>
                ))}
              </ul>
            </AlertBanner>
          )}

          {/* Step 1: Decision Matrix X + Extrema */}
          <Card id="saw-matrix-x">
            <CardHeader>
              <CardTitle>Tahap 1 — Matriks Keputusan (X) &amp; Nilai Ekstrem Kolom</CardTitle>
              <CardDescription>
                Nilai mentah enam kriteria untuk {detail.results.length} alternatif pada
                skenario ini beserta nilai min (cost) / max (benefit) basis normalisasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
                      <th className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5">
                        Kode
                      </th>
                      <th className="px-4 py-2.5">Alternatif</th>
                      <th className="px-3 py-2.5 text-right">C1 Harga (Rp)</th>
                      <th className="px-3 py-2.5 text-right">C2 CPU Mark</th>
                      <th className="px-3 py-2.5 text-right">C3 RAM</th>
                      <th className="px-3 py-2.5 text-right">C4 SSD</th>
                      <th className="px-3 py-2.5 text-right">C5 Berat</th>
                      <th className="px-3 py-2.5 text-right">C6 Baterai ({detailC6Unit})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]/80 font-mono text-xs tabular-nums">
                    {detail.results.map((r) => (
                      <tr key={r.id} className="hover:bg-[#f8fafc]/60">
                        <td className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-white px-4 py-2.5 font-semibold text-[#1e293b]">
                          {r.alternativeCode}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-xs text-[#1e293b]">
                          {r.alternativeModel}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[#1e293b]">
                          {formatIdr(r.criteriaValues.C1)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[#475569]">
                          {formatInteger(r.criteriaValues.C2)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[#475569]">
                          {r.criteriaValues.C3} GB
                        </td>
                        <td className="px-3 py-2.5 text-right text-[#475569]">
                          {r.criteriaValues.C4} GB
                        </td>
                        <td className="px-3 py-2.5 text-right text-[#475569]">
                          {formatDecimal(r.criteriaValues.C5, 3)} kg
                        </td>
                        <td className="px-3 py-2.5 text-right text-[#475569]">
                          {formatC6Raw(r.criteriaValues.C6)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#cbd5e1] bg-[#f8fafc] text-xs font-semibold text-[#1e293b]">
                      <td className="px-4 py-2.5 font-sans" colSpan={2}>
                        Basis Normalisasi (Min Cost · Max Benefit)
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        min {formatIdr(detail.run.normalizationExtrema.C1.value)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        max {formatInteger(detail.run.normalizationExtrema.C2.value)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        max {detail.run.normalizationExtrema.C3.value}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        max {detail.run.normalizationExtrema.C4.value}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        min {formatDecimal(detail.run.normalizationExtrema.C5.value, 3)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        max {formatC6Raw(detail.run.normalizationExtrema.C6.value)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Normalization Matrix R */}
          <Card id="saw-matrix-r">
            <CardHeader>
              <CardTitle>Tahap 2 — Matriks Normalisasi (R)</CardTitle>
              <CardDescription>
                Cost: min(x) / x · Benefit: x / max(x). Seluruh nilai dihitung tanpa pembulatan
                perantara; tampilan dibulatkan 6 angka di belakang koma.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
                      <th className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5">
                        Kode
                      </th>
                      {activeCriteria.map((c) => (
                        <th key={c.code} className="px-3 py-2.5 text-right">
                          {c.code} ({c.attribute})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]/80 font-mono text-xs tabular-nums">
                    {detail.results.map((r) => (
                      <tr key={r.id} className="hover:bg-[#f8fafc]/60">
                        <td className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-white px-4 py-2.5 font-semibold text-[#1e293b]">
                          {r.alternativeCode}
                        </td>
                        {activeCriteria.map((c) => (
                          <td
                            key={c.code}
                            className="px-3 py-2.5 text-right text-[#475569]"
                          >
                            {formatDecimal(r.normalizedValues[c.code], 6)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Weighted Contributions & Final Ranking */}
          <Card id="saw-contributions">
            <CardHeader>
              <CardTitle>
                Tahap 3 — Kontribusi Berbobot (wⱼ · rᵢⱼ) &amp; Pemeringkatan Akhir
              </CardTitle>
              <CardDescription>
                Bobot AHP:{" "}
                {activeCriteria.map(
                  (c) =>
                    `${c.code} ${formatWeightPercent(detail.ahpRun.weightsByCode[c.code], 2)}`,
                ).join(" · ")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {evaluation.insights.length > 0 && (
                <AlertBanner tone="neutral" title="Ringkasan Evaluasi Hasil Keputusan">
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {evaluation.insights.map((ins, i) => (
                      <li key={i}>{ins}</li>
                    ))}
                  </ul>
                </AlertBanner>
              )}

              <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
                <table className="w-full min-w-[840px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#64748b]">
                      <th className="px-3.5 py-2.5">Rank</th>
                      <th className="px-3.5 py-2.5">Kode &amp; Model</th>
                      {activeCriteria.map((c) => (
                        <th key={c.code} className="px-2.5 py-2.5 text-right">
                          {c.code}
                        </th>
                      ))}
                      <th className="px-3.5 py-2.5 text-right">Nilai Preferensi (V)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]/80 tabular-nums">
                    {detail.results.map((r) => (
                      <tr
                        key={r.id}
                        className={
                          r.rank === 1
                            ? "bg-[#eff4fa]/60 font-medium"
                            : "transition-colors hover:bg-[#f8fafc]/60"
                        }
                      >
                        <td className="px-3.5 py-3">
                          <Badge tone={r.rank === 1 ? "dark" : "neutral"}>
                            #{r.rank}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="mr-1.5 font-mono text-xs font-semibold text-[#1e293b]">
                            {r.alternativeCode}
                          </span>
                          <span className="text-xs text-[#1e293b]">
                            {r.alternativeModel}
                          </span>
                        </td>
                        {activeCriteria.map((c) => (
                          <td
                            key={c.code}
                            className="px-2.5 py-3 text-right font-mono text-xs text-[#475569]"
                          >
                            {formatDecimal(r.weightedValues[c.code], 6)}
                          </td>
                        ))}
                        <td className="px-3.5 py-3 text-right">
                          <div className="ml-auto w-28 space-y-1">
                            <p className="font-mono text-sm font-bold text-[#1e3a5f]">
                              {formatDecimal(r.score, 6)}
                            </p>
                            <ScoreBar value={r.score} max={1} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="mb-2.5 text-sm font-semibold tracking-[-0.01em] text-[#1e293b]">
                  Visualisasi Dekomposisi Skor SAW per Kriteria
                </h3>
                <SawContributionChart
                  items={detail.results.map((r) => ({
                    code: r.alternativeCode,
                    model: r.alternativeModel,
                    score: r.score,
                    weightedValues: r.weightedValues,
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </>
        );
      })()}
    </div>
  );
}
