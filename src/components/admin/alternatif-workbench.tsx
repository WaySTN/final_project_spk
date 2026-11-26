"use client";

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Archive,
  CheckCircle2,
  Copy,
  Edit3,
  ExternalLink,
  FileUp,
  Lock,
  Plus,
  Power,
  Search,
} from "lucide-react";
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
  SlideOverDrawer,
  Textarea,
  formatEvidenceStatusLabel,
  formatStockStatusLabel,
} from "@/components/ui/primitives";
import {
  PRICE_MAX_IDR,
  PRICE_MIN_IDR,
  RESEARCH_AUDIT_DATE,
  type C6MetricType,
} from "@/lib/decision";
import {
  formatBatteryValue,
  formatDateJakarta,
  formatDecimal,
  formatIdr,
  formatInteger,
} from "@/lib/formatting";
import type {
  EvidenceLevel,
  EvidenceStatus,
  LaptopImportPreview,
  StockStatus,
} from "@/lib/import";
import type {
  AlternativeDatasetRecord,
  AlternativeRecord,
} from "@/lib/repositories/types";

function subscribeMobileViewport(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(max-width: 767px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getMobileViewportSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

function useIsMobileViewport() {
  return useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    () => false,
  );
}

interface DraftFormState {
  id?: string;
  code: string;
  brand: string;
  model: string;
  sku: string;
  cpuName: string;
  priceIdr: string;
  cpuMark: string;
  ramGb: string;
  ssdGb: string;
  weightKg: string;
  batteryHours: string;
  batteryWh: string;
  seller: string;
  active: boolean;
  stockStatus: StockStatus;
  evidenceStatus: EvidenceStatus;
  batteryProtocol: string;
  evidenceNotes: string;
  urlPrice: string;
  urlSpec: string;
  urlBenchmark: string;
  urlBattery: string;
  specEvidenceLevel: EvidenceLevel;
}

function emptyDraftForm(c6Metric: C6MetricType = "battery_wh"): DraftFormState {
  return {
    code: "",
    brand: "Lenovo",
    model: "",
    sku: "",
    cpuName: "",
    priceIdr: "9500000",
    cpuMark: "",
    ramGb: "16",
    ssdGb: "512",
    weightKg: "1.40",
    batteryHours: c6Metric === "battery_hours" ? "12" : "",
    batteryWh: "50",
    seller: "",
    active: true,
    stockStatus: "unconfirmed",
    evidenceStatus: "provisional_unconfirmed",
    batteryProtocol:
      c6Metric === "battery_wh"
        ? "Kapasitas energi baterai (Wh) sebagai proksi daya tahan baterai — asumsi konsumsi daya setara, bukan durasi pemakaian aktual."
        : "Lenovo PSREF — pemutaran video lokal 1080p @ 150 nit (tingkat seri/kapasitas)",
    evidenceNotes: "",
    urlPrice: "",
    urlSpec: "",
    urlBenchmark: "",
    urlBattery: "",
    specEvidenceLevel: "sku",
  };
}

function recordToForm(alt: AlternativeRecord): DraftFormState {
  const getSrc = (t: string) => alt.sources.find((s) => s.sourceType === t);
  return {
    id: alt.id,
    code: alt.code,
    brand: alt.brand,
    model: alt.model,
    sku: alt.sku,
    cpuName: alt.cpuName,
    priceIdr: String(alt.priceIdr),
    cpuMark: String(alt.cpuMark),
    ramGb: String(alt.ramGb),
    ssdGb: String(alt.ssdGb),
    weightKg: String(alt.weightKg),
    batteryHours: alt.batteryHours !== null ? String(alt.batteryHours) : "",
    batteryWh: alt.batteryWh !== null ? String(alt.batteryWh) : "",
    seller: alt.seller,
    active: alt.active,
    stockStatus: alt.stockStatus,
    evidenceStatus: alt.evidenceStatus,
    batteryProtocol: alt.batteryProtocol,
    evidenceNotes: alt.evidenceNotes,
    urlPrice: getSrc("price")?.url ?? "",
    urlSpec: getSrc("spec")?.url ?? "",
    urlBenchmark: getSrc("benchmark")?.url ?? "",
    urlBattery: getSrc("battery")?.url ?? "",
    specEvidenceLevel: getSrc("spec")?.evidenceLevel ?? "sku",
  };
}

export function AlternatifWorkbench({
  initialDatasets,
  initialSelectedDataset,
  initialAlternatives,
}: {
  initialDatasets: AlternativeDatasetRecord[];
  initialSelectedDataset: AlternativeDatasetRecord | null;
  initialAlternatives: AlternativeRecord[];
}) {
  const isMobile = useIsMobileViewport();
  const [datasets, setDatasets] = useState<AlternativeDatasetRecord[]>(initialDatasets);
  const [selectedId, setSelectedId] = useState<string>(
    initialSelectedDataset?.id ?? "",
  );
  const [selectedDataset, setSelectedDataset] =
    useState<AlternativeDatasetRecord | null>(initialSelectedDataset);
  const [alternatives, setAlternatives] =
    useState<AlternativeRecord[]>(initialAlternatives);
  const [loading, setLoading] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [observedAt, setObservedAt] = useState(RESEARCH_AUDIT_DATE);
  const [importLabel, setImportLabel] = useState("");
  const [preview, setPreview] = useState<LaptopImportPreview | null>(null);
  const [busyImport, setBusyImport] = useState(false);

  // Slide-over CRUD drawer state
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DraftFormState>(
    emptyDraftForm(initialSelectedDataset?.c6Metric ?? "battery_wh"),
  );
  const [savingForm, setSavingForm] = useState(false);

  // Table filter & excluded archive toggle
  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [showExcluded, setShowExcluded] = useState(false);

  const [feedback, setFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  const activeC6Metric: C6MetricType = selectedDataset?.c6Metric ?? "battery_wh";
  const brands = useMemo(
    () =>
      Array.from(new Set(alternatives.map((a) => a.brand))).sort((a, b) =>
        a.localeCompare(b, "id"),
      ),
    [alternatives],
  );
  const filteredAlternatives = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return alternatives.filter((alt) => {
      if (brandFilter !== "all" && alt.brand !== brandFilter) return false;
      if (q) {
        const hay =
          `${alt.code} ${alt.brand} ${alt.model} ${alt.sku} ${alt.cpuName} ${alt.seller}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [alternatives, searchQuery, brandFilter]);

  async function refreshDataset(targetId?: string) {
    setLoading(true);
    try {
      const qs = targetId ? `?datasetId=${encodeURIComponent(targetId)}` : "";
      const res = await fetch(`/api/admin/alternatives${qs}`);
      const json = (await res.json()) as {
        data?: {
          datasets: AlternativeDatasetRecord[];
          selectedDataset: AlternativeDatasetRecord | null;
          alternatives: AlternativeRecord[];
        };
      };
      if (json.data) {
        setDatasets(json.data.datasets);
        setSelectedDataset(json.data.selectedDataset);
        setSelectedId(json.data.selectedDataset?.id ?? "");
        setAlternatives(json.data.alternatives);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDatasetSwitch(newId: string) {
    setSelectedId(newId);
    if (newId && newId !== selectedDataset?.id) {
      void refreshDataset(newId);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setPreview(null);
    setFeedback(null);
  }

  async function handleImport(commit: boolean) {
    if (!file) return;
    setBusyImport(true);
    setFeedback(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("commit", commit ? "true" : "false");
      fd.append("observedAt", observedAt);
      fd.append("label", importLabel);

      const res = await fetch("/api/admin/alternatives/import", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        data?: LaptopImportPreview & { dataset?: AlternativeDatasetRecord };
        error?: { message?: string };
      };

      if (!commit) {
        if (json.data) {
          setPreview(json.data);
          if (!json.data.ok) {
            setFeedback({
              tone: "error",
              message:
                json.data.errors[0] ??
                "Terdapat alternatif yang tidak valid pada berkas impor.",
            });
          }
        } else {
          setFeedback({
            tone: "error",
            message: json.error?.message ?? "Preview gagal.",
          });
        }
        return;
      }

      if (!res.ok || !json.data?.dataset) {
        setFeedback({
          tone: "error",
          message: json.error?.message ?? "Gagal menyimpan dataset alternatif.",
        });
        return;
      }

      const created = json.data.dataset;
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImportLabel("");
      setFeedback({
        tone: "success",
        message: `Dataset v${created.version} ("${created.label}") berhasil diimpor sebagai draft.`,
      });
      await refreshDataset(created.id);
    } finally {
      setBusyImport(false);
    }
  }

  async function handleDuplicateToDraft() {
    if (!selectedDataset) return;
    setFeedback(null);
    const res = await fetch("/api/admin/alternatives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "duplicate",
        sourceDatasetId: selectedDataset.id,
        label: `Draft revisi dari v${selectedDataset.version}`,
      }),
    });
    const json = (await res.json()) as {
      data?: { dataset: AlternativeDatasetRecord };
      error?: { message?: string };
    };

    if (!res.ok || !json.data) {
      setFeedback({
        tone: "error",
        message: json.error?.message ?? "Gagal menggandakan dataset.",
      });
      return;
    }

    setFeedback({
      tone: "success",
      message: `Draft baru v${json.data.dataset.version} berhasil dibuat. Dataset lama tetap immutable.`,
    });
    await refreshDataset(json.data.dataset.id);
  }

  async function handleToggleActive(alt: AlternativeRecord) {
    setFeedback(null);
    const res = await fetch("/api/admin/alternatives", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_active",
        alternativeId: alt.id,
        active: !alt.active,
      }),
    });
    const json = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      setFeedback({
        tone: "error",
        message: json.error?.message ?? "Gagal mengubah status aktif.",
      });
      return;
    }
    setFeedback({
      tone: "success",
      message: `Alternatif ${alt.code} diubah menjadi ${!alt.active ? "aktif" : "nonaktif"}.`,
    });
    await refreshDataset(selectedId);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedDataset) return;
    setSavingForm(true);
    setFeedback(null);

    const payload = {
      ...(form.id ? { id: form.id } : {}),
      datasetId: selectedDataset.id,
      code: form.code.trim().toUpperCase(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      sku: form.sku.trim(),
      cpuName: form.cpuName.trim(),
      priceIdr: Number(form.priceIdr),
      cpuMark: Number(form.cpuMark),
      ramGb: Number(form.ramGb),
      ssdGb: Number(form.ssdGb),
      weightKg: Number(form.weightKg),
      batteryHours: form.batteryHours.trim() ? Number(form.batteryHours) : null,
      batteryWh: form.batteryWh.trim() ? Number(form.batteryWh) : null,
      seller: form.seller.trim(),
      active: form.active,
      stockStatus: form.stockStatus,
      evidenceStatus: form.evidenceStatus,
      batteryProtocol: form.batteryProtocol.trim(),
      evidenceNotes: form.evidenceNotes.trim(),
      sources: [
        {
          sourceType: "price" as const,
          url: form.urlPrice.trim(),
          observedAt: selectedDataset.observedAt,
          evidenceLevel: "listing" as const,
          notes: `Penawaran harga oleh ${form.seller.trim()}`,
        },
        {
          sourceType: "spec" as const,
          url: form.urlSpec.trim(),
          observedAt: selectedDataset.observedAt,
          evidenceLevel: form.specEvidenceLevel,
          notes: "Dokumentasi spesifikasi SKU/model",
        },
        {
          sourceType: "benchmark" as const,
          url: form.urlBenchmark.trim(),
          observedAt: selectedDataset.observedAt,
          evidenceLevel: "series" as const,
          notes: "PassMark CPU Mark",
        },
        {
          sourceType: "battery" as const,
          url: form.urlBattery.trim(),
          observedAt: selectedDataset.observedAt,
          evidenceLevel: "series" as const,
          notes: form.batteryProtocol.trim(),
        },
      ],
    };

    try {
      const res = await fetch("/api/admin/alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        error?: { message?: string; details?: Array<{ path: string; message: string }> };
      };

      if (!res.ok) {
        const detailMsg = json.error?.details
          ?.map((d) => `${d.path}: ${d.message}`)
          .join("; ");
        setFeedback({
          tone: "error",
          message: detailMsg || json.error?.message || "Validasi alternatif gagal.",
        });
        return;
      }

      setFormOpen(false);
      setFeedback({
        tone: "success",
        message: `Alternatif ${payload.code} berhasil disimpan pada dataset draft v${selectedDataset.version}.`,
      });
      await refreshDataset(selectedDataset.id);
    } finally {
      setSavingForm(false);
    }
  }

  const isSealed = selectedDataset?.status === "sealed";

  return (
    <div className="space-y-6">
      {feedback && (
        <AlertBanner tone={feedback.tone}>{feedback.message}</AlertBanner>
      )}

      {/* Import Workbook / JSON Card */}
      <Card>
        <CardHeader>
          <CardTitle>Impor Dataset Alternatif Laptop (JSON 33 Alternatif / Workbook XLSX / CSV)</CardTitle>
          <CardDescription>
            Mendukung{" "}
            <code className="rounded bg-[#f1f5f9] px-1 py-0.5 font-mono text-[11px] text-[#1e293b]">
              LaptopMatch_Dataset_33_Regression.json
            </code>{" "}
            (hanya bagian <code className="font-mono text-[11px]">alternatives</code> &amp; arsip{" "}
            <code className="font-mono text-[11px]">excluded_candidates</code>), workbook 12-sheet{" "}
            <code className="rounded bg-[#f1f5f9] px-1 py-0.5 font-mono text-[11px] text-[#1e293b]">
              Kandidat / Sumber
            </code>
            , maupun workbook historis{" "}
            <code className="rounded bg-[#f1f5f9] px-1 py-0.5 font-mono text-[11px] text-[#1e293b]">
              Data Audit
            </code>
            . Impor bersifat idempotent (deteksi duplikat SHA-256) tanpa menimpa histori lama.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Label htmlFor="laptop-file">Berkas alternatif (.json / .xlsx / .csv)</Label>
                <input
                  ref={fileInputRef}
                  id="laptop-file"
                  type="file"
                  accept=".json,.xlsx,.csv"
                  onChange={handleFileChange}
                  className="h-10 w-full rounded-lg border border-[#cbd5e1] bg-white px-3 pt-2 text-sm text-[#1e293b] transition-colors focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/10"
                />
              </div>
              <div>
                <Label htmlFor="observed-at">Tanggal audit snapshot</Label>
                <Input
                  id="observed-at"
                  type="date"
                  value={observedAt}
                  onChange={(e) => setObservedAt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="import-label">Label dataset (opsional)</Label>
                <Input
                  id="import-label"
                  value={importLabel}
                  onChange={(e) => setImportLabel(e.target.value)}
                  placeholder="Mis. Dataset UAS 33 Alternatif"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                onClick={() => handleImport(false)}
                disabled={!file || busyImport}
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                {busyImport ? "Memproses..." : "1. Preview Alternatif"}
              </Button>
              <Button
                onClick={() => handleImport(true)}
                disabled={!preview?.ok || busyImport}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                2. Simpan sebagai Draft Baru
              </Button>
            </div>
          </div>

          {preview && (
            <div className="space-y-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#1e293b]">
                  Preview: {preview.filename} ({preview.sheetName}) —{" "}
                  {preview.summary.eligibleRows}/{preview.summary.totalRows} eligible ·{" "}
                  {preview.summary.brandCount} merek · C6 {preview.c6Unit}
                  {preview.summary.excludedCount > 0
                    ? ` · ${preview.summary.excludedCount} arsip dikeluarkan`
                    : ""}
                </p>
                <Badge tone={preview.ok ? "success" : "error"}>
                  {preview.ok ? "Lolos Validasi" : "Ada Baris Invalid"}
                </Badge>
              </div>
              {preview.warnings.map((w, idx) => (
                <p key={idx} className="text-xs text-amber-800">
                  • {w}
                </p>
              ))}
              {preview.rows.length > 0 && (
                <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-[#e2e8f0] bg-white">
                  <table className="w-full min-w-[680px] border-collapse text-xs">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[10px] uppercase tracking-[0.08em] text-[#64748b]">
                        <th className="px-3 py-2.5">Kode</th>
                        <th className="px-3 py-2.5">Merek &amp; Model</th>
                        <th className="px-3 py-2.5 text-right">Harga</th>
                        <th className="px-3 py-2.5 text-right">CPU Mark</th>
                        <th className="px-3 py-2.5 text-right">RAM/SSD</th>
                        <th className="px-3 py-2.5 text-right">
                          kg / {preview.c6Unit}
                        </th>
                        <th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]/80">
                      {preview.rows.map((r) => (
                        <tr key={r.rowNo}>
                          <td className="px-3 py-2 font-mono font-semibold text-[#1e293b]">
                            {r.code}
                          </td>
                          <td className="px-3 py-2 text-[#1e293b]">
                            <span className="mr-1.5 font-mono text-[10px] text-[#1e3a5f]">
                              [{r.brand}]
                            </span>
                            {r.model}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {formatIdr(r.priceIdr)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {formatInteger(r.cpuMark)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {r.ramGb} / {r.ssdGb} GB
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {formatDecimal(r.weightKg, 2)} kg /{" "}
                            {formatBatteryValue(r, preview.c6Metric)}
                          </td>
                          <td className="px-3 py-2">
                            {r.eligible ? (
                              <Badge tone="success">4 sumber valid</Badge>
                            ) : (
                              <Badge tone="error">{r.validationErrors[0]}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Dataset Table / Cards & Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Daftar Alternatif &amp; Sumber Bukti</CardTitle>
              <CardDescription>
                {selectedDataset
                  ? `Dataset v${selectedDataset.version} · ${alternatives.length} alternatif lintas ${brands.length} merek · C6 ${selectedDataset.c6Unit} · Audit ${formatDateJakarta(selectedDataset.observedAt)} · Status: ${selectedDataset.status.toUpperCase()}`
                  : "Pilih atau impor dataset alternatif terlebih dahulu."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label="Pilih versi dataset alternatif"
                value={selectedId}
                onChange={(e) => handleDatasetSwitch(e.target.value)}
                className="w-full sm:w-auto sm:min-w-[240px]"
              >
                {datasets.length === 0 && <option value="">Belum ada dataset</option>}
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    v{d.version} — {d.label} ({d.c6Unit} · {d.status})
                  </option>
                ))}
              </Select>

              {selectedDataset && isSealed && (
                <Button variant="outline" size="sm" onClick={handleDuplicateToDraft}>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Gandakan ke Draft
                </Button>
              )}

              {selectedDataset && !isSealed && (
                <Button
                  size="sm"
                  onClick={() => {
                    setForm(emptyDraftForm(activeC6Metric));
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Tambah Alternatif
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isSealed && (
            <AlertBanner tone="neutral" title="Dataset berstatus Sealed (Immutable)">
              <span className="inline-flex items-start gap-1.5">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Dataset ini telah digunakan pada perhitungan SAW sehingga terkunci agar histori
                  penelitian tetap dapat diaudit. Klik <strong>Gandakan ke Draft</strong> untuk
                  membuat versi baru apabila ingin mengubah harga atau menonaktifkan alternatif.
                </span>
              </span>
            </AlertBanner>
          )}

          {alternatives.length > 0 && (
            <div className="grid gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3.5 sm:grid-cols-3">
              <div className="relative sm:col-span-2">
                <Search
                  className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#64748b]"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Cari alternatif pada dataset aktif"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kode (A33, A29), merek, model, prosesor, atau penjual..."
                  className="pl-9"
                />
              </div>
              <Select
                aria-label="Filter merek pada tabel admin"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                <option value="all">
                  Semua Merek ({brands.length} merek · {alternatives.length} alt)
                </option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b} ({alternatives.filter((a) => a.brand === b).length})
                  </option>
                ))}
              </Select>
            </div>
          )}

          {datasets.length === 0 ? (
            <EmptyState
              title="Belum ada dataset alternatif laptop"
              description="Impor LaptopMatch_Dataset_33_Regression.json atau workbook SPK pada formulir di atas untuk mengisi 33 alternatif lintas 8 merek beserta 4 tautan sumbernya."
            />
          ) : loading ? (
            <p className="py-8 text-center text-sm text-[#64748b]">Memuat dataset...</p>
          ) : isMobile ? (
            /* Mobile Hardware Spec Sheet Cards (< 768px) */
            <div className="space-y-3">
              {filteredAlternatives.map((alt) => {
                const stockBadge = formatStockStatusLabel(alt.stockStatus);
                const evBadge = formatEvidenceStatusLabel(alt.evidenceStatus);
                return (
                  <div
                    key={alt.id}
                    className={`rounded-lg border border-[#e2e8f0] p-4 space-y-3 ${
                      !alt.active ? "bg-[#f8fafc] opacity-65" : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-[#1e3a5f] px-2 py-0.5 font-mono text-xs font-semibold text-white">
                            {alt.code}
                          </span>
                          <span className="rounded bg-[#eff4fa] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#1e3a5f]">
                            {alt.brand}
                          </span>
                          {!alt.active && <Badge tone="neutral">Nonaktif</Badge>}
                        </div>
                        <p className="mt-1.5 text-sm font-semibold text-[#1e293b]">
                          {alt.model}
                        </p>
                        <p className="text-xs text-[#64748b]">
                          {alt.cpuName} · {alt.seller}
                        </p>
                      </div>
                      <p className="shrink-0 font-mono text-xs font-semibold tabular-nums text-[#1e293b]">
                        {formatIdr(alt.priceIdr)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#e2e8f0] bg-[#e2e8f0] text-xs">
                      <div className="bg-[#f8fafc] p-2.5">
                        <p className="font-mono text-[10px] uppercase text-[#64748b]">CPU Mark</p>
                        <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#1e293b]">
                          {formatInteger(alt.cpuMark)}
                        </p>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5">
                        <p className="font-mono text-[10px] uppercase text-[#64748b]">RAM / SSD</p>
                        <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#1e293b]">
                          {alt.ramGb} / {alt.ssdGb} GB
                        </p>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5">
                        <p className="font-mono text-[10px] uppercase text-[#64748b]">Berat</p>
                        <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#1e293b]">
                          {formatDecimal(alt.weightKg, 2)} kg
                        </p>
                      </div>
                      <div className="bg-[#f8fafc] p-2.5">
                        <p className="font-mono text-[10px] uppercase text-[#64748b]">
                          Baterai C6 ({activeC6Metric === "battery_wh" ? "Wh" : "jam"})
                        </p>
                        <p className="mt-0.5 font-mono font-semibold tabular-nums text-[#1e293b]">
                          {formatBatteryValue(alt, activeC6Metric)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                      <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e8f0] pt-3">
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {alt.sources.map((s) => (
                          <a
                            key={s.id}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 font-mono text-[#475569] underline hover:text-[#1e293b]"
                          >
                            {s.sourceType}
                            <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                      <div className="inline-flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isSealed}
                          onClick={() => {
                            setForm(recordToForm(alt));
                            setFormOpen(true);
                          }}
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Ubah
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isSealed}
                          onClick={() => handleToggleActive(alt)}
                          title={alt.active ? "Nonaktifkan kandidat" : "Aktifkan kandidat"}
                        >
                          <Power className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop Precision Ledger Table (>= 768px) */
            <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
              <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748b]">
                    <th className="px-3.5 py-3">Kode</th>
                    <th className="px-3.5 py-3">Merek, Model &amp; Prosesor</th>
                    <th className="px-3.5 py-3 text-right">Harga (C1)</th>
                    <th className="px-3.5 py-3 text-right">CPU (C2)</th>
                    <th className="px-3.5 py-3 text-right">RAM/SSD</th>
                    <th className="px-3.5 py-3 text-right">
                      Berat / {activeC6Metric === "battery_wh" ? "Baterai Wh" : "Video Jam"}
                    </th>
                    <th className="px-3.5 py-3">Status &amp; Sumber</th>
                    <th className="px-3.5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]/80">
                  {filteredAlternatives.map((alt) => {
                    const stockBadge = formatStockStatusLabel(alt.stockStatus);
                    const evBadge = formatEvidenceStatusLabel(alt.evidenceStatus);
                    return (
                      <tr
                        key={alt.id}
                        className={
                          !alt.active
                            ? "bg-[#f8fafc] opacity-60"
                            : "transition-colors hover:bg-[#f8fafc]/60"
                        }
                      >
                        <td className="px-3.5 py-3.5 font-mono font-semibold text-[#1e293b]">
                          {alt.code}
                          {!alt.active && (
                            <div className="mt-1">
                              <Badge tone="neutral">Nonaktif</Badge>
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-[#eff4fa] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#1e3a5f]">
                              {alt.brand}
                            </span>
                            <p className="font-medium text-[#1e293b]">{alt.model}</p>
                          </div>
                          <p className="text-xs text-[#64748b]">
                            {alt.cpuName} · {alt.seller}
                          </p>
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap text-[#1e293b]">
                          {formatIdr(alt.priceIdr)}
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-mono text-xs tabular-nums text-[#475569]">
                          {formatInteger(alt.cpuMark)}
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-mono text-xs tabular-nums whitespace-nowrap text-[#475569]">
                          {alt.ramGb} GB / {alt.ssdGb} GB
                        </td>
                        <td className="px-3.5 py-3.5 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                          <p className="text-[#1e293b]">{formatDecimal(alt.weightKg, 2)} kg</p>
                          <p className="text-[11px] text-[#64748b]">
                            {formatBatteryValue(alt, activeC6Metric)}
                          </p>
                        </td>
                        <td className="space-y-1.5 px-3.5 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            <Badge tone={stockBadge.tone}>{stockBadge.label}</Badge>
                            <Badge tone={evBadge.tone}>{evBadge.label}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {alt.sources.map((s) => (
                              <a
                                key={s.id}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 font-mono text-[#475569] underline hover:text-[#1e293b]"
                              >
                                {s.sourceType}
                                <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                        </td>
                        <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSealed}
                              onClick={() => {
                                setForm(recordToForm(alt));
                                setFormOpen(true);
                              }}
                            >
                              <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                              Ubah
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSealed}
                              onClick={() => handleToggleActive(alt)}
                              title={alt.active ? "Nonaktifkan kandidat" : "Aktifkan kandidat"}
                            >
                              <Power className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                          </div>
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

      {/* Excluded Candidates Audit Archive (Read-Only, Never Included in SAW) */}
      {selectedDataset && selectedDataset.excludedCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-[#64748b]" aria-hidden="true" />
                  Arsip Kandidat Dikeluarkan ({selectedDataset.excludedCandidates.length} Kandidat)
                </CardTitle>
                <CardDescription>
                  Disimpan semata untuk transparansi seleksi dari{" "}
                  {selectedDataset.candidateCount ??
                    alternatives.length + selectedDataset.excludedCandidates.length}{" "}
                  kandidat menjadi {alternatives.length} alternatif aktif —{" "}
                  <strong>tidak pernah dimasukkan ke pemeringkatan SAW utama</strong>.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExcluded((v) => !v)}
              >
                {showExcluded ? "Sembunyikan Arsip" : "Tampilkan Arsip Audit"}
              </Button>
            </div>
          </CardHeader>
          {showExcluded && (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] bg-[#f8fafc] text-left font-mono text-[10px] uppercase tracking-[0.06em] text-[#64748b]">
                      <th className="px-4 py-2.5">Kode</th>
                      <th className="px-4 py-2.5">Merek &amp; Model</th>
                      <th className="px-3 py-2.5 text-right">Harga Tercatat</th>
                      <th className="px-4 py-2.5">Status Tercatat</th>
                      <th className="px-4 py-2.5">Alasan Dikeluarkan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]/80">
                    {selectedDataset.excludedCandidates.map((ex) => (
                      <tr key={ex.code} className="bg-[#f8fafc]/40">
                        <td className="px-4 py-3 font-mono font-semibold text-[#64748b]">
                          {ex.code}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#1e293b]">
                            [{ex.brand}] {ex.model}
                          </p>
                          <p className="text-[11px] text-[#64748b]">
                            {ex.cpuName} · {ex.seller}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-right font-mono tabular-nums text-[#475569]">
                          {ex.priceIdr ? formatIdr(ex.priceIdr) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="neutral">{ex.sourceStatusRecorded || "Dikeluarkan"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-[#475569]">
                          <p className="font-medium text-[#1e293b]">{ex.selectionReason}</p>
                          {ex.evidenceNotes && (
                            <p className="mt-0.5 text-[11px] text-[#64748b]">{ex.evidenceNotes}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Slide-Over CRUD Drawer */}
      <SlideOverDrawer
        open={formOpen && Boolean(selectedDataset) && !isSealed}
        onClose={() => setFormOpen(false)}
        title={form.id ? `Ubah Alternatif ${form.code}` : "Tambah Alternatif ke Draft"}
        subtitle={
          selectedDataset
            ? `Dataset draft v${selectedDataset.version} · Audit ${formatDateJakarta(selectedDataset.observedAt)}`
            : undefined
        }
        ariaLabel="Form alternatif laptop"
      >
        <form onSubmit={handleFormSubmit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="f-code">Kode (mis. A1)</Label>
              <Input
                id="f-code"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="f-brand">Merek</Label>
              <Input
                id="f-brand"
                required
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="f-sku">SKU</Label>
              <Input
                id="f-sku"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="f-model">Nama Model Lengkap &amp; SKU</Label>
              <Input
                id="f-model"
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="f-cpu">Prosesor</Label>
              <Input
                id="f-cpu"
                required
                value={form.cpuName}
                onChange={(e) => setForm({ ...form, cpuName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-[#e2e8f0] pt-4">
            <p className="editorial-kicker">Nilai Enam Kriteria (C1–C6)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="f-price">
                  C1 Harga Rp ({PRICE_MIN_IDR.toLocaleString("id-ID")}–
                  {PRICE_MAX_IDR.toLocaleString("id-ID")})
                </Label>
                <Input
                  id="f-price"
                  type="number"
                  required
                  min={PRICE_MIN_IDR}
                  max={PRICE_MAX_IDR}
                  value={form.priceIdr}
                  onChange={(e) => setForm({ ...form, priceIdr: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-cpumark">C2 PassMark CPU Mark</Label>
                <Input
                  id="f-cpumark"
                  type="number"
                  required
                  min={1}
                  value={form.cpuMark}
                  onChange={(e) => setForm({ ...form, cpuMark: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-ram">C3 RAM (GB)</Label>
                <Input
                  id="f-ram"
                  type="number"
                  required
                  min={1}
                  value={form.ramGb}
                  onChange={(e) => setForm({ ...form, ramGb: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-ssd">C4 SSD (GB)</Label>
                <Input
                  id="f-ssd"
                  type="number"
                  required
                  min={1}
                  value={form.ssdGb}
                  onChange={(e) => setForm({ ...form, ssdGb: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-weight">C5 Berat (kg)</Label>
                <Input
                  id="f-weight"
                  type="number"
                  step="0.001"
                  required
                  min={0.1}
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </div>
              {activeC6Metric === "battery_wh" ? (
                <div>
                  <Label htmlFor="f-wh">C6 Kapasitas Baterai (Wh) — Wajib</Label>
                  <Input
                    id="f-wh"
                    type="number"
                    step="0.01"
                    required
                    min={1}
                    max={200}
                    value={form.batteryWh}
                    onChange={(e) => setForm({ ...form, batteryWh: e.target.value })}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="f-bat">C6 Baterai Video 1080p (jam) — Wajib</Label>
                  <Input
                    id="f-bat"
                    type="number"
                    step="0.1"
                    required
                    min={0.5}
                    value={form.batteryHours}
                    onChange={(e) => setForm({ ...form, batteryHours: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#e2e8f0] pt-4 sm:grid-cols-3">
            {activeC6Metric === "battery_wh" ? (
              <div>
                <Label htmlFor="f-bat">Durasi Jam (opsional, tidak dipakai di SAW Wh)</Label>
                <Input
                  id="f-bat"
                  type="number"
                  step="0.1"
                  value={form.batteryHours}
                  onChange={(e) => setForm({ ...form, batteryHours: e.target.value })}
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="f-wh">Baterai Wh (opsional, metadata)</Label>
                <Input
                  id="f-wh"
                  type="number"
                  step="0.1"
                  value={form.batteryWh}
                  onChange={(e) => setForm({ ...form, batteryWh: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="f-seller">Penjual</Label>
              <Input
                id="f-seller"
                required
                value={form.seller}
                onChange={(e) => setForm({ ...form, seller: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="f-stock">Status Stok</Label>
              <Select
                id="f-stock"
                value={form.stockStatus}
                onChange={(e) =>
                  setForm({ ...form, stockStatus: e.target.value as StockStatus })
                }
              >
                <option value="indexed_in_stock">Tercatat tersedia di indeks</option>
                <option value="unconfirmed">Stok belum dikonfirmasi</option>
                <option value="confirmation_required">Perlu konfirmasi penjual</option>
                <option value="withdrawn_series">Seri withdrawn</option>
                <option value="confirmed_available">Terkonfirmasi tersedia</option>
                <option value="unavailable">Tidak tersedia</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="f-ev">Status Bukti</Label>
              <Select
                id="f-ev"
                value={form.evidenceStatus}
                onChange={(e) =>
                  setForm({
                    ...form,
                    evidenceStatus: e.target.value as EvidenceStatus,
                  })
                }
              >
                <option value="provisional_unconfirmed">
                  Provisional (belum konfirmasi penuh)
                </option>
                <option value="verified_by_researcher">Terverifikasi oleh peneliti</option>
                <option value="incomplete">Belum lengkap</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="f-proto">Protokol Pengukuran Baterai</Label>
              <Input
                id="f-proto"
                required
                value={form.batteryProtocol}
                onChange={(e) =>
                  setForm({ ...form, batteryProtocol: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-[#e2e8f0] pt-4">
            <p className="editorial-kicker">
              4 Tautan Sumber Bukti Wajib (http:// atau https://)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="f-uprice">URL Harga</Label>
                <Input
                  id="f-uprice"
                  type="url"
                  required
                  value={form.urlPrice}
                  onChange={(e) => setForm({ ...form, urlPrice: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-uspec">URL Spesifikasi</Label>
                <Input
                  id="f-uspec"
                  type="url"
                  required
                  value={form.urlSpec}
                  onChange={(e) => setForm({ ...form, urlSpec: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="f-ubench">URL PassMark CPU Mark</Label>
                <Input
                  id="f-ubench"
                  type="url"
                  required
                  value={form.urlBenchmark}
                  onChange={(e) =>
                    setForm({ ...form, urlBenchmark: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="f-ubat">URL Baterai (PSREF)</Label>
                <Input
                  id="f-ubat"
                  type="url"
                  required
                  value={form.urlBattery}
                  onChange={(e) => setForm({ ...form, urlBattery: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="f-notes">Catatan Audit &amp; Ketersediaan</Label>
            <Textarea
              id="f-notes"
              rows={2}
              value={form.evidenceNotes}
              onChange={(e) => setForm({ ...form, evidenceNotes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e2e8f0] pt-4">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={savingForm}>
              {savingForm ? "Menyimpan..." : "Simpan Alternatif"}
            </Button>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
