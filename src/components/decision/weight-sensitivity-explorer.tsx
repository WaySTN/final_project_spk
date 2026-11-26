"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Minus, SlidersHorizontal } from "lucide-react";
import {
  AlertBanner,
  Badge,
  Button,
  ScoreBar,
} from "@/components/ui/primitives";
import {
  CRITERION_CODES,
  getCriteriaForMetric,
  type C6MetricType,
  type CriterionCode,
  type WeightSensitivityScenarioResult,
  type WeightSensitivitySuiteResult,
} from "@/lib/decision";
import {
  formatDecimal,
  formatRelativeDeltaPercent,
  formatWeightPercent,
} from "@/lib/formatting";

export interface WeightSensitivityExplorerProps {
  suite: WeightSensitivitySuiteResult;
  c6Metric?: C6MetricType;
  /** Optional externally simulated scenario (used in admin custom delta workbench). */
  customScenario?: WeightSensitivityScenarioResult | null;
  onClearCustom?: () => void;
  /** Default scenario label to open on initial render (defaults to "Baseline"). */
  initialScenarioLabel?: string;
}

export function WeightSensitivityExplorer({
  suite,
  c6Metric = "battery_wh",
  customScenario = null,
  onClearCustom,
  initialScenarioLabel = "Baseline",
}: WeightSensitivityExplorerProps) {
  const criteriaDefs = useMemo(() => getCriteriaForMetric(c6Metric), [c6Metric]);
  const criteriaNameMap = useMemo(
    () =>
      Object.fromEntries(criteriaDefs.map((c) => [c.code, c.shortName])) as Record<
        CriterionCode,
        string
      >,
    [criteriaDefs],
  );

  const [selectedLabel, setSelectedLabel] = useState<string>(initialScenarioLabel);
  const [onlyRankChanged, setOnlyRankChanged] = useState(false);

  const scenarioByLabel = useMemo(
    () => new Map(suite.scenarios.map((s) => [s.label, s])),
    [suite.scenarios],
  );

  const scenarioByKey = useMemo(() => {
    const map = new Map<string, WeightSensitivityScenarioResult>();
    for (const sc of suite.scenarios) {
      if (sc.criterion) {
        map.set(`${sc.criterion}:${sc.relativeDelta}`, sc);
      }
    }
    return map;
  }, [suite.scenarios]);

  const activeScenario: WeightSensitivityScenarioResult =
    customScenario ??
    scenarioByLabel.get(selectedLabel) ??
    suite.scenarios[0]!;

  const displayedResults = useMemo(() => {
    if (!onlyRankChanged) return activeScenario.results;
    return activeScenario.results.filter((r) => r.rankDelta !== 0);
  }, [activeScenario.results, onlyRankChanged]);

  const changedRowsCount = useMemo(
    () => activeScenario.results.filter((r) => r.rankDelta !== 0).length,
    [activeScenario.results],
  );

  function selectPreset(label: string) {
    if (customScenario && onClearCustom) {
      onClearCustom();
    }
    setSelectedLabel(label);
  }

  return (
    <div className="space-y-6" data-testid="weight-sensitivity-explorer">
      {/* KPI Summary Ledger */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#e2e8f0] sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
            Total Skenario Diuji
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-[#1e293b]">
            {suite.totalScenarios}
          </p>
          <p className="mt-0.5 text-xs text-[#64748b]">
            1 baseline + {suite.perturbedScenarioCount} perubahan satu bobot
          </p>
        </div>

        <div className="bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
            Stabilitas Peringkat #1
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-[#1e3a5f]">
            {suite.baselineWinnerWinsCount}/{suite.perturbedScenarioCount}
          </p>
          <p className="mt-0.5 text-xs text-[#64748b]">
            {suite.baselineWinnerCode} bertahan ({formatDecimal(suite.baselineWinnerStabilityPct, 2)}%)
          </p>
        </div>

        <div className="bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
            Pergantian Peringkat #1
          </p>
          <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-[#1e293b]">
            {suite.winnerChangeScenarios.length}
          </p>
          <p className="mt-0.5 text-xs text-[#64748b]">
            {suite.winnerChangeScenarios.length > 0
              ? `Pesaing: ${Array.from(new Set(suite.winnerChangeScenarios.map((s) => s.winnerCode))).join(", ")}`
              : "Tidak ada pergantian pemenang"}
          </p>
        </div>

        <div className="bg-[#eff4fa] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#1e3a5f]">
            Skenario Sedang Ditinjau
          </p>
          <p
            className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#1e3a5f]"
            data-testid="sensitivity-active-winner"
          >
            {activeScenario.winnerCode} · {formatDecimal(activeScenario.maxScore, 6)}
          </p>
          <p className="mt-0.5 truncate text-xs text-[#475569]">
            {activeScenario.label} · Σw = {formatDecimal(activeScenario.weightSum, 8)}
          </p>
        </div>
      </div>

      {/* Interactive 6x6 Winner Matrix */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3.5 sm:px-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
              Matriks Stabilitas Pemenang (Klik Sel untuk Simulasi)
            </p>
            <h3 className="mt-0.5 text-sm font-semibold text-[#1e293b]">
              6 Kriteria × 6 Perubahan Bobot Relatif (±5%, ±10%, ±20%)
            </h3>
          </div>
          <Button
            variant={activeScenario.label === "Baseline" && !customScenario ? "primary" : "outline"}
            size="sm"
            onClick={() => selectPreset("Baseline")}
            data-testid="sensitivity-btn-baseline"
          >
            Baseline ({suite.baselineWinnerCode})
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] font-mono text-[11px] uppercase tracking-[0.06em] text-[#64748b]">
                <th className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-left">
                  Kriteria
                </th>
                {suite.deltas.map((delta) => (
                  <th key={delta} className="px-2.5 py-2.5 text-center">
                    {formatRelativeDeltaPercent(delta)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]/80">
              {CRITERION_CODES.map((code) => (
                <tr key={code}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-[#e2e8f0] bg-white px-4 py-2.5 text-left font-medium text-[#1e293b] whitespace-nowrap"
                  >
                    <span className="mr-1.5 font-mono text-[#64748b]">{code}</span>
                    {criteriaNameMap[code]}
                  </th>
                  {suite.deltas.map((delta) => {
                    const sc = scenarioByKey.get(`${code}:${delta}`);
                    if (!sc) {
                      return (
                        <td key={delta} className="px-2 py-2 text-center text-[#94a3b8]">
                          —
                        </td>
                      );
                    }
                    const isSelected = !customScenario && activeScenario.label === sc.label;
                    const changed = sc.winnerChangedFromBaseline;
                    return (
                      <td key={delta} className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => selectPreset(sc.label)}
                          data-testid={`sensitivity-cell-${code}-${Math.round(delta * 100)}`}
                          className={`w-full rounded-md border px-2 py-2 font-mono text-xs transition-all cursor-pointer ${
                            isSelected
                              ? "border-[#1e3a5f] bg-[#1e3a5f] text-white shadow-sm"
                              : changed
                                ? "border-amber-300 bg-amber-50/90 font-semibold text-amber-950 hover:border-amber-400"
                                : "border-[#e2e8f0] bg-[#f8fafc] text-[#1e293b] hover:border-[#1e3a5f]/50 hover:bg-[#eff4fa]"
                          }`}
                        >
                          <span className="block font-semibold">{sc.winnerCode}</span>
                          <span
                            className={`block text-[10px] tabular-nums ${
                              isSelected ? "text-slate-200" : "text-[#64748b]"
                            }`}
                          >
                            {formatDecimal(sc.maxScore, 4)}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 text-[11px] text-[#64748b]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#cbd5e1] bg-[#f8fafc]" />
              Tetap {suite.baselineWinnerCode}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" />
              Berubah peringkat #1
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#1e3a5f]" />
              Skenario aktif ditampilkan
            </span>
          </div>
          <span className="font-mono">
            Rumus: w&apos;ₖ = wₖ(1+δ) · w&apos;ⱼ = wⱼ(1−w&apos;ₖ)/(1−wₖ)
          </span>
        </div>
      </div>

      {/* Active Scenario Weight Comparison & Winner Callout */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="min-w-0 rounded-lg border border-[#e2e8f0] bg-white lg:col-span-5">
          <div className="flex items-center justify-between gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#1e3a5f]" aria-hidden="true" />
              <p className="text-xs font-semibold text-[#1e293b]">
                Vektor Bobot: {activeScenario.label}
              </p>
            </div>
            <span data-testid="sensitivity-weight-sum">
              <Badge tone="success">
                Total = {formatDecimal(activeScenario.weightSum, 8)}
              </Badge>
            </span>
          </div>
          <div className="divide-y divide-[#e2e8f0]/75 text-xs">
            {CRITERION_CODES.map((code) => {
              const baseW = activeScenario.baseWeightsByCode[code];
              const newW = activeScenario.weightsByCode[code];
              const diff = newW - baseW;
              const isTarget = activeScenario.criterion === code;
              return (
                <div
                  key={code}
                  className={`px-4 py-2.5 space-y-1 ${isTarget ? "bg-[#eff4fa]/70" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[#1e293b]">
                      <span className="mr-1.5 font-mono text-[#64748b]">{code}</span>
                      {criteriaNameMap[code]}
                      {isTarget && (
                        <span className="ml-1.5 rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[10px] text-white">
                          {formatRelativeDeltaPercent(activeScenario.relativeDelta)}
                        </span>
                      )}
                    </span>
                    <div className="font-mono tabular-nums text-right">
                      <span className="text-[#64748b]">{formatDecimal(baseW, 6)}</span>
                      <span className="mx-1 text-[#94a3b8]">→</span>
                      <span className="font-semibold text-[#1e3a5f]">
                        {formatDecimal(newW, 6)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBar value={newW} max={0.32} className="h-1 flex-1" />
                    <span className="w-16 text-right font-mono text-[10px] tabular-nums text-[#64748b]">
                      {Math.abs(diff) < 1e-12
                        ? "0,00%"
                        : `${diff > 0 ? "+" : ""}${formatWeightPercent(diff, 2)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-4 lg:col-span-7">
          <AlertBanner
            tone={activeScenario.winnerChangedFromBaseline ? "warning" : "neutral"}
            title={
              activeScenario.winnerChangedFromBaseline
                ? `Peringkat #1 Berubah pada Skenario ${activeScenario.label}`
                : `Peringkat #1 Tetap Stabil pada Skenario ${activeScenario.label}`
            }
          >
            <p className="text-xs leading-relaxed">
              Pemenang skenario ini adalah{" "}
              <strong>
                {activeScenario.winnerCode} — {activeScenario.winnerModel}
              </strong>{" "}
              dengan skor preferensi{" "}
              <strong className="font-mono tabular-nums">
                {formatDecimal(activeScenario.maxScore, 6)}
              </strong>
              .{" "}
              {activeScenario.winnerChangedFromBaseline
                ? `Terjadi pergeseran dari pemenang baseline (${suite.baselineWinnerCode}) akibat perubahan bobot ${activeScenario.criterion} sebesar ${formatRelativeDeltaPercent(activeScenario.relativeDelta)}.`
                : `Peringkat pertama tetap dipegang oleh ${suite.baselineWinnerCode}.`}{" "}
              Matriks normalisasi R tidak berubah dan total bobot tetap tepat 1.
            </p>
          </AlertBanner>

          {/* Top 5 Snapshot for Active Scenario */}
          <div className="rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
            <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#64748b]">
                Lima Besar — {activeScenario.label}
              </span>
              <span className="font-mono text-[11px] text-[#64748b]">
                {changedRowsCount} alternatif mengalami perubahan posisi
              </span>
            </div>
            <div className="divide-y divide-[#e2e8f0]/75">
              {activeScenario.results.slice(0, 5).map((r) => (
                <div
                  key={r.code}
                  className={`flex items-center justify-between gap-3 px-4 py-2.5 text-xs ${
                    r.rank === 1 ? "bg-[#eff4fa]/60" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Badge tone={r.rank === 1 ? "dark" : "neutral"}>#{r.rank}</Badge>
                    <span className="font-mono font-semibold text-[#1e293b]">{r.code}</span>
                    <span className="truncate text-[#475569]">{r.model}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 font-mono tabular-nums">
                    <span className="font-semibold text-[#1e293b]">
                      {formatDecimal(r.score, 6)}
                    </span>
                    <span
                      className={`inline-flex w-12 items-center justify-end gap-0.5 text-[11px] ${
                        r.rankDelta > 0
                          ? "text-emerald-700 font-semibold"
                          : r.rankDelta < 0
                            ? "text-amber-700 font-semibold"
                            : "text-[#94a3b8]"
                      }`}
                    >
                      {r.rankDelta > 0 ? (
                        <>
                          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />+{r.rankDelta}
                        </>
                      ) : r.rankDelta < 0 ? (
                        <>
                          <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                          {r.rankDelta}
                        </>
                      ) : (
                        <>
                          <Minus className="h-3 w-3" aria-hidden="true" />0
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {suite.winnerChangeScenarios.length > 0 && (
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs text-[#475569]">
              <p className="font-semibold text-[#1e293b] mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#1e3a5f]" aria-hidden="true" />
                Ringkasan Skenario Pergantian Pemenang ({suite.winnerChangeScenarios.length}/
                {suite.perturbedScenarioCount}):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suite.winnerChangeScenarios.map((sc) => (
                  <button
                    key={sc.label}
                    type="button"
                    onClick={() => selectPreset(sc.label)}
                    className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 font-mono text-[11px] text-amber-950 hover:bg-amber-100 cursor-pointer"
                  >
                    {sc.label} → <strong>{sc.winnerCode}</strong> ({formatDecimal(sc.maxScore, 4)})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Alternative Rank Comparison Table */}
      <div className="rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-[#1e293b]">
              Perbandingan Peringkat Lengkap ({displayedResults.length}/{activeScenario.results.length} Alternatif)
            </p>
            <p className="text-[11px] text-[#64748b]">
              Skenario {activeScenario.label} dibandingkan terhadap Baseline ({suite.baselineWinnerCode}).
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#475569]">
            <input
              type="checkbox"
              checked={onlyRankChanged}
              onChange={(e) => setOnlyRankChanged(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#cbd5e1] accent-[#1e3a5f]"
            />
            Hanya tampilkan yang berubah peringkat ({changedRowsCount})
          </label>
        </div>

        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full min-w-[680px] border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] font-mono text-[10px] uppercase tracking-[0.06em] text-[#64748b]">
                <th className="px-3.5 py-2.5 text-left">Rank Simulasi</th>
                <th className="px-3.5 py-2.5 text-left">Kode &amp; Model</th>
                <th className="px-3 py-2.5 text-right">Rank Baseline</th>
                <th className="px-3 py-2.5 text-right">Δ Peringkat</th>
                <th className="px-3 py-2.5 text-right">Skor Baseline</th>
                <th className="px-3.5 py-2.5 text-right">Skor Simulasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]/75 tabular-nums">
              {displayedResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#64748b]">
                    Tidak ada perubahan peringkat pada skenario ini — seluruh posisi identik dengan baseline.
                  </td>
                </tr>
              ) : (
                displayedResults.map((r) => (
                  <tr
                    key={r.code}
                    className={
                      r.rank === 1
                        ? "bg-[#eff4fa]/60 font-medium"
                        : "hover:bg-[#f8fafc]/70"
                    }
                  >
                    <td className="px-3.5 py-2.5">
                      <Badge tone={r.rank === 1 ? "dark" : "neutral"}>#{r.rank}</Badge>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="mr-1.5 font-mono font-semibold text-[#1e293b]">
                        {r.code}
                      </span>
                      <span className="text-[#475569]">{r.model}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#64748b]">
                      #{r.baselineRank}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">
                      {r.rankDelta > 0 ? (
                        <span className="font-semibold text-emerald-700">+{r.rankDelta}</span>
                      ) : r.rankDelta < 0 ? (
                        <span className="font-semibold text-amber-700">{r.rankDelta}</span>
                      ) : (
                        <span className="text-[#94a3b8]">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#64748b]">
                      {formatDecimal(r.baselineScore, 6)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-[#1e293b]">
                      {formatDecimal(r.score, 6)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
