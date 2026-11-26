"use client";

import { useState } from "react";
import { Play, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { WeightSensitivityExplorer } from "@/components/decision/weight-sensitivity-explorer";
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
  Input,
  Label,
  Select,
} from "@/components/ui/primitives";
import {
  getCriteriaForMetric,
  type C6MetricType,
  type CriterionCode,
  type WeightSensitivityScenarioResult,
  type WeightSensitivitySuiteResult,
} from "@/lib/decision";
import { formatDateTimeJakarta } from "@/lib/formatting";
import { getScenarioLabel } from "@/lib/publication/sanitize";
import type { SawRunRecord } from "@/lib/repositories/types";

export function SensitivitasWorkbench({
  initialSawRuns,
  initialSelectedRun,
  initialSuite,
}: {
  initialSawRuns: SawRunRecord[];
  initialSelectedRun: SawRunRecord | null;
  initialSuite: WeightSensitivitySuiteResult | null;
}) {
  const [selectedRunId, setSelectedRunId] = useState<string>(initialSelectedRun?.id ?? "");
  const [selectedRun, setSelectedRun] = useState<SawRunRecord | null>(initialSelectedRun);
  const [suite, setSuite] = useState<WeightSensitivitySuiteResult | null>(initialSuite);
  const [loadingSuite, setLoadingSuite] = useState(false);

  // Custom one-at-a-time simulation via server API (read-only)
  const [criterion, setCriterion] = useState<CriterionCode>("C2");
  const [deltaPercent, setDeltaPercent] = useState<string>("20");
  const [simulating, setSimulating] = useState(false);
  const [customScenario, setCustomScenario] =
    useState<WeightSensitivityScenarioResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const c6Metric: C6MetricType = selectedRun?.c6Metric ?? "battery_wh";
  const criteriaDefs = getCriteriaForMetric(c6Metric);

  async function handleRunChange(newRunId: string) {
    setSelectedRunId(newRunId);
    setCustomScenario(null);
    setErrorMsg(null);
    if (!newRunId) return;
    setLoadingSuite(true);
    try {
      const res = await fetch(
        `/api/admin/sensitivity?sawRunId=${encodeURIComponent(newRunId)}`,
      );
      const json = (await res.json()) as {
        data?: {
          selectedRun: SawRunRecord | null;
          weightSensitivity: WeightSensitivitySuiteResult | null;
        };
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        setErrorMsg(json.error?.message ?? "Gagal memuat hasil analisis sensitivitas.");
        return;
      }
      setSelectedRun(json.data.selectedRun);
      setSuite(json.data.weightSensitivity);
    } finally {
      setLoadingSuite(false);
    }
  }

  async function handleCustomSimulate() {
    if (!selectedRunId) return;
    const pctNum = Number(deltaPercent);
    if (!Number.isFinite(pctNum) || pctNum < -50 || pctNum > 50) {
      setErrorMsg("Masukkan perubahan bobot antara -50% hingga +50%.");
      return;
    }

    setSimulating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/sensitivity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sawRunId: selectedRunId,
          criterion,
          relativeDelta: pctNum / 100,
        }),
      });
      const json = (await res.json()) as {
        data?: { scenario: WeightSensitivityScenarioResult };
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        setErrorMsg(json.error?.message ?? "Simulasi sensitivitas gagal.");
        return;
      }
      setCustomScenario(json.data.scenario);
    } finally {
      setSimulating(false);
    }
  }

  if (initialSawRuns.length === 0) {
    return (
      <EmptyState
        icon={<SlidersHorizontal className="h-5 w-5" />}
        title="Belum ada perhitungan SAW untuk analisis sensitivitas"
        description="Jalankan perhitungan AHP dan SAW terlebih dahulu agar tersedia matriks normalisasi R dan bobot kriteria sebagai baseline sensitivitas."
      />
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && <AlertBanner tone="error">{errorMsg}</AlertBanner>}

      <AlertBanner tone="neutral" title="Simulasi Read-Only — Data Utama Tidak Berubah">
        <span className="inline-flex items-start gap-1.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1e3a5f]" aria-hidden="true" />
          <span>
            Seluruh simulasi perubahan bobot di halaman ini hanya bersifat analitis. Bobot AHP
            hasil agregasi AIJ, hasil SAW tersimpan, dan snapshot publikasi aktif{" "}
            <strong>tidak pernah diubah atau ditimpa</strong>.
          </span>
        </span>
      </AlertBanner>

      {/* Run Selector & Custom Perturbation Simulator */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Kontrol Skenario &amp; Simulator Bobot Kustom</CardTitle>
              <CardDescription>
                Pilih run SAW sebagai baseline, lalu klik salah satu sel pada matriks 6×6 di bawah
                atau jalankan simulasi delta kustom (−50% s.d. +50%) melalui server.
              </CardDescription>
            </div>
            {selectedRun && (
              <Badge tone="neutral">
                v{selectedRun.inputSnapshot.datasetVersion} ·{" "}
                {selectedRun.inputSnapshot.alternativeCodes.length} alt · C6 {selectedRun.c6Unit}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Label htmlFor="sens-saw-run">Run SAW Baseline</Label>
              <Select
                id="sens-saw-run"
                value={selectedRunId}
                onChange={(e) => void handleRunChange(e.target.value)}
              >
                {initialSawRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDateTimeJakarta(r.createdAt)} · {r.scenario} (v
                    {r.inputSnapshot.datasetVersion} · {r.inputSnapshot.alternativeCodes.length}{" "}
                    alt)
                  </option>
                ))}
              </Select>
            </div>

            <div className="lg:col-span-3">
              <Label htmlFor="sens-crit">Kriteria Diubah (1 Kriteria)</Label>
              <Select
                id="sens-crit"
                value={criterion}
                onChange={(e) => setCriterion(e.target.value as CriterionCode)}
              >
                {criteriaDefs.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="lg:col-span-2">
              <Label htmlFor="sens-delta">Delta Relatif (%)</Label>
              <Input
                id="sens-delta"
                type="number"
                min={-50}
                max={50}
                step={1}
                value={deltaPercent}
                onChange={(e) => setDeltaPercent(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2 lg:col-span-2">
              <Button
                className="flex-1"
                onClick={handleCustomSimulate}
                disabled={!selectedRunId || simulating}
                data-testid="sensitivity-custom-run"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                {simulating ? "Uji..." : "Simulasi"}
              </Button>
              {customScenario && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomScenario(null)}
                  title="Kembali ke skenario preset"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>

          {selectedRun && (
            <p className="font-mono text-[11px] text-[#64748b]">
              Baseline aktif: {getScenarioLabel(selectedRun.scenario)} · ID{" "}
              {selectedRun.id.slice(0, 8)}…
            </p>
          )}
        </CardContent>
      </Card>

      {loadingSuite ? (
        <p className="py-10 text-center text-sm text-[#64748b]">
          Menghitung 37 skenario analisis sensitivitas bobot...
        </p>
      ) : suite ? (
        <WeightSensitivityExplorer
          suite={suite}
          c6Metric={c6Metric}
          customScenario={customScenario}
          onClearCustom={() => setCustomScenario(null)}
        />
      ) : null}
    </div>
  );
}
