"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AlertTriangle, CheckCircle2, Eye, FileUp, ShieldAlert } from "lucide-react";
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
  Input,
  Label,
  Select,
  SlideOverDrawer,
} from "@/components/ui/primitives";
import { PAIRWISE_DEFINITIONS, type AhpMatrix } from "@/lib/decision";
import { formatDateTimeJakarta, formatDecimal } from "@/lib/formatting";
import type { SurveyImportPreview } from "@/lib/import";
import type {
  ResponseBatchRecord,
  SurveyResponseRecord,
} from "@/lib/repositories/types";

interface EnrichedResponse extends SurveyResponseRecord {
  cr: number | null;
  lambdaMax: number | null;
  ci: number | null;
  passesCr: boolean;
  individualMatrix: AhpMatrix | null;
  individualWeights: number[] | null;
  ahpReason: string;
}

interface PreviewResponseData extends SurveyImportPreview {
  duplicateBatch: { id: string; filename: string; importedAt: string } | null;
}

const FLAG_LABELS: Record<string, string> = {
  out_of_order_timestamp: "Cap waktu tidak berurutan",
  duplicate_answer_pattern: "Pola jawaban sama",
  all_equal_answers: "Semua = 1 (all-equal)",
  near_zero_cr: "CR ≈ 0 (perlu cek independensi)",
  label_mismatch_warning: "Label vs token perlu review",
};

export function RespondenWorkbench({
  initialBatches,
}: {
  initialBatches: ResponseBatchRecord[];
}) {
  const [batches, setBatches] = useState<ResponseBatchRecord[]>(initialBatches);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatches[0]?.id ?? "",
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [responses, setResponses] = useState<EnrichedResponse[]>([]);
  const [metaStats, setMetaStats] = useState<{
    total: number;
    consistentCount: number;
    inconsistentCount: number;
  }>({ total: 0, consistentCount: 0, inconsistentCount: 0 });
  const [loadingRows, setLoadingRows] = useState(false);

  // Upload & preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<PreviewResponseData | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error" | "warning";
    message: string;
  } | null>(null);

  // Slide-over inspection drawer state
  const [inspected, setInspected] = useState<EnrichedResponse | null>(null);

  useEffect(() => {
    if (!selectedBatchId) return;
    let active = true;
    const controller = new AbortController();

    async function loadRows() {
      try {
        const res = await fetch(
          `/api/admin/responses/${selectedBatchId}?status=${statusFilter}`,
          { signal: controller.signal },
        );
        const json = (await res.json()) as {
          data?: { responses: EnrichedResponse[] };
          meta?: { total: number; consistentCount: number; inconsistentCount: number };
        };
        if (!active) return;
        setResponses(json.data?.responses ?? []);
        if (json.meta) setMetaStats(json.meta);
        setLoadingRows(false);
      } catch {
        if (active) setLoadingRows(false);
      }
    }

    void loadRows();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedBatchId, statusFilter]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setFile(picked);
    setPreview(null);
    setFeedback(null);
  }

  async function handlePreview() {
    if (!file) return;
    setPreviewing(true);
    setFeedback(null);
    setPreview(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/responses/preview", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        data?: PreviewResponseData;
        error?: { message?: string };
      };

      if (json.data) {
        setPreview(json.data);
        if (!json.data.ok) {
          setFeedback({
            tone: "error",
            message: json.data.errors[0] ?? "Validasi berkas kuesioner gagal.",
          });
        } else if (json.data.duplicateBatch) {
          setFeedback({
            tone: "warning",
            message: `Berkas dengan SHA-256 sama sudah pernah diimpor (${json.data.duplicateBatch.filename}). Duplikasi diblokir otomatis.`,
          });
        }
      } else {
        setFeedback({
          tone: "error",
          message: json.error?.message ?? "Gagal memproses preview berkas.",
        });
      }
    } catch {
      setFeedback({ tone: "error", message: "Terjadi kesalahan jaringan saat preview." });
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCommit() {
    if (!file || !preview?.ok || preview.duplicateBatch) return;
    setCommitting(true);
    setFeedback(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("expectedHash", preview.sha256);
      fd.append("notes", notes);

      const res = await fetch("/api/admin/responses/import", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        data?: { batch: ResponseBatchRecord };
        error?: { message?: string };
      };

      if (!res.ok || !json.data) {
        setFeedback({
          tone: "error",
          message: json.error?.message ?? "Gagal menyimpan batch respons.",
        });
        return;
      }

      const newBatch = json.data.batch;
      setBatches((prev) => [
        newBatch,
        ...prev.map((b) =>
          b.status === "active" ? { ...b, status: "superseded" as const } : b,
        ),
      ]);
      setSelectedBatchId(newBatch.id);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotes("");
      setFeedback({
        tone: "success",
        message: `Batch "${newBatch.filename}" (${newBatch.rowCount} respons) berhasil disimpan secara atomik.`,
      });
    } catch {
      setFeedback({ tone: "error", message: "Gagal menyimpan batch respons." });
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle>Impor Data Respons Kuesioner (XLSX / CSV)</CardTitle>
          <CardDescription>
            Unggah berkas ekspor Google Forms (
            <code className="rounded bg-[#f2f2ee] px-1 py-0.5 font-mono text-[11px] text-[#111113]">
              Jawaban Formulir 1
            </code>
            ). Urutan baris asli R01–Rn dipertahankan, hash SHA-256 dicek anti-duplikasi, dan
            data mentah tidak pernah diubah diam-diam.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback && (
            <AlertBanner tone={feedback.tone}>{feedback.message}</AlertBanner>
          )}

          <div className="rounded-lg border border-dashed border-[#d0d0c8] bg-[#f7f7f5] p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label htmlFor="survey-file">Pilih berkas kuesioner (.xlsx atau .csv)</Label>
                <input
                  ref={fileInputRef}
                  id="survey-file"
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={handleFileChange}
                  className="h-10 w-full rounded-lg border border-[#d0d0c8] bg-white px-3 pt-2 text-sm text-[#111113] transition-colors focus:border-[#111113] focus:outline-none focus:ring-2 focus:ring-[#111113]/10"
                />
              </div>
              <div>
                <Label htmlFor="batch-notes">Catatan batch (opsional)</Label>
                <Input
                  id="batch-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mis. Ekspor final 33 respons"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={!file || previewing}
              >
                <FileUp className="h-4 w-4" aria-hidden="true" />
                {previewing ? "Memvalidasi berkas..." : "1. Preview & Validasi"}
              </Button>
              <Button
                onClick={handleCommit}
                disabled={
                  !preview?.ok || Boolean(preview.duplicateBatch) || committing
                }
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {committing ? "Menyimpan batch..." : "2. Simpan Batch Atomik"}
              </Button>
            </div>
          </div>

          {/* Preview result */}
          {preview && (
            <div className="space-y-3 rounded-lg border border-[#e5e5e0] bg-[#f7f7f5] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[#111113]">
                    Hasil Preview: {preview.filename} ({preview.sheetName})
                  </p>
                  <p className="font-mono text-xs text-[#787872]">
                    SHA-256: {preview.sha256.slice(0, 24)}…
                  </p>
                </div>
                <Badge tone={preview.ok && !preview.duplicateBatch ? "success" : "error"}>
                  {preview.ok
                    ? preview.duplicateBatch
                      ? "Duplikat SHA-256"
                      : "Siap Disimpan"
                    : "Gagal Validasi"}
                </Badge>
              </div>

              {preview.errors.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-red-700">
                  {preview.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}

              {preview.ok && (
                <>
                  <div className="grid gap-px overflow-hidden rounded-lg border border-[#e5e5e0] bg-[#e5e5e0] text-xs sm:grid-cols-4">
                    <div className="bg-white p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                        Total baris
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#111113]">
                        {preview.summary.totalRows}
                      </p>
                    </div>
                    <div className="bg-white p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                        Eligible
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#111113]">
                        {preview.summary.eligibleRows}
                      </p>
                    </div>
                    <div className="bg-white p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                        Lolos CR ≤ 0,10
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-emerald-700">
                        {preview.summary.consistentPreviewCount}
                      </p>
                    </div>
                    <div className="bg-white p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                        Flag Audit
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-amber-700">
                        {preview.summary.flaggedCount}
                      </p>
                    </div>
                  </div>

                  {preview.warnings.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-amber-200 border-l-2 border-l-amber-600 bg-amber-50/75 p-3 text-xs text-amber-950">
                      {preview.warnings.map((w, i) => (
                        <p key={i}>• {w}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch audit list */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Audit Data Responden per Batch</CardTitle>
              <CardDescription>
                Urutan baris asli, status kelayakan, CR individual dengan indikator ambang
                0,10, flag audit, dan inspeksi matriks 6×6 per responden.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                aria-label="Pilih batch responden"
                value={selectedBatchId}
                onChange={(e) => {
                  setLoadingRows(true);
                  setSelectedBatchId(e.target.value);
                }}
                className="w-full sm:w-auto sm:min-w-[220px]"
              >
                {batches.length === 0 && <option value="">Belum ada batch</option>}
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.filename} ({b.rowCount} baris · {b.status})
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Filter status responden"
                value={statusFilter}
                onChange={(e) => {
                  setLoadingRows(true);
                  setStatusFilter(e.target.value);
                }}
                className="w-full sm:w-auto"
              >
                <option value="all">Semua ({metaStats.total})</option>
                <option value="consistent">
                  Lolos CR ≤ 0,10 ({metaStats.consistentCount})
                </option>
                <option value="inconsistent">
                  CR &gt; 0,10 ({metaStats.inconsistentCount})
                </option>
                <option value="flagged">Memiliki Flag Audit</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {batches.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<ShieldAlert className="h-5 w-5" />}
                title="Belum ada batch responden tersimpan"
                description="Unggah berkas ekspor Google Forms (.xlsx/.csv) di atas untuk melakukan preview, validasi, dan penyimpanan atomik."
              />
            </div>
          ) : loadingRows ? (
            <div className="p-8 text-center text-sm text-[#787872]">
              Memuat data responden dan audit CR individual...
            </div>
          ) : (
            <>
              {/* Mobile vertical audit cards (< md) */}
              <div className="divide-y divide-[#e5e5e0] md:hidden">
                {responses.map((row) => (
                  <div key={row.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-sm font-semibold text-[#111113]">
                          {row.code}
                        </span>
                        <p className="mt-0.5 text-[11px] text-[#787872]">
                          {row.submittedAt
                            ? formatDateTimeJakarta(row.submittedAt)
                            : row.rawTimestamp || "—"}
                        </p>
                      </div>
                      {row.validationStatus !== "eligible" ? (
                        <Badge tone="error">Tidak eligible</Badge>
                      ) : row.passesCr ? (
                        <Badge tone="success">Lolos CR ≤ 0,10</Badge>
                      ) : (
                        <Badge tone="error">Tidak lolos</Badge>
                      )}
                    </div>

                    <div className="text-xs">
                      <p className="font-medium text-[#111113]">
                        {row.programStudy || "(Prodi tidak diisi)"}
                      </p>
                      <p className="text-[#787872]">{row.useCase}</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 rounded-md border border-[#e5e5e0] bg-[#f7f7f5] px-3 py-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                          CR Individu
                        </p>
                        <p className="font-mono text-xs font-semibold tabular-nums text-[#111113]">
                          {row.cr !== null ? formatDecimal(row.cr, 6) : "—"}
                        </p>
                        <CrGaugeBar cr={row.cr} />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspected(row)}
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Detail
                      </Button>
                    </div>

                    {row.auditFlags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {row.auditFlags.map((f) => (
                          <Badge key={f} tone="warning">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {FLAG_LABELS[f] ?? f}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop precision audit table (>= md) */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[840px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e5e0] bg-[#f7f7f5] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#787872]">
                      <th className="px-4 py-3">Kode</th>
                      <th className="px-4 py-3">Cap Waktu (WIB)</th>
                      <th className="px-4 py-3">Program Studi / Penggunaan</th>
                      <th className="px-4 py-3 text-right">CR Individu</th>
                      <th className="px-4 py-3">Status CR</th>
                      <th className="px-4 py-3">Flag Audit</th>
                      <th className="px-4 py-3 text-right">Inspeksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e0]/80">
                    {responses.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-[#f7f7f5]/60">
                        <td className="px-4 py-3 font-mono font-semibold text-[#111113]">
                          {row.code}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-[#52524e]">
                          {row.submittedAt
                            ? formatDateTimeJakarta(row.submittedAt)
                            : row.rawTimestamp || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-[#111113]">
                            {row.programStudy || "(Prodi tidak diisi)"}
                          </p>
                          <p className="text-xs text-[#787872]">{row.useCase}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-xs font-medium tabular-nums text-[#111113]">
                              {row.cr !== null ? formatDecimal(row.cr, 6) : "-"}
                            </span>
                            <CrGaugeBar cr={row.cr} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.validationStatus !== "eligible" ? (
                            <Badge tone="error">Tidak eligible</Badge>
                          ) : row.passesCr ? (
                            <Badge tone="success">Lolos CR ≤ 0,10</Badge>
                          ) : (
                            <Badge tone="error">Tidak lolos</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.auditFlags.length === 0 ? (
                              <span className="text-xs text-[#9c9c95]">—</span>
                            ) : (
                              row.auditFlags.map((f) => (
                                <Badge key={f} tone="warning">
                                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                  {FLAG_LABELS[f] ?? f}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInspected(row)}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Slide-Over Inspection Drawer */}
      <SlideOverDrawer
        open={Boolean(inspected)}
        onClose={() => setInspected(null)}
        title={inspected ? `Audit Responden ${inspected.code}` : ""}
        subtitle={
          inspected
            ? `CR = ${inspected.cr !== null ? formatDecimal(inspected.cr, 8) : "-"} · λmaks = ${inspected.lambdaMax !== null ? formatDecimal(inspected.lambdaMax, 6) : "-"} · ${inspected.ahpReason}`
            : undefined
        }
        ariaLabel={inspected ? `Detail responden ${inspected.code}` : undefined}
      >
        {inspected && (
          <div className="space-y-6">
            <div className="grid gap-px overflow-hidden rounded-lg border border-[#e5e5e0] bg-[#e5e5e0] text-xs sm:grid-cols-3">
              <div className="bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                  Program Studi
                </p>
                <p className="mt-1 font-medium text-[#111113]">
                  {inspected.programStudy || "-"}
                </p>
              </div>
              <div className="bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                  Penggunaan Utama
                </p>
                <p className="mt-1 font-medium text-[#111113]">{inspected.useCase}</p>
              </div>
              <div className="bg-white p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
                  Cap Waktu Mentah
                </p>
                <p className="mt-1 break-all font-mono text-[#52524e]">
                  {inspected.rawTimestamp || "-"}
                </p>
              </div>
            </div>

            {inspected.suggestion && (
              <div className="rounded-lg border border-[#e5e5e0] bg-[#f7f7f5] p-3.5 text-xs">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#787872]">
                  Saran responden (admin-only)
                </p>
                <p className="mt-1 leading-relaxed text-[#111113]">{inspected.suggestion}</p>
              </div>
            )}

            {inspected.individualMatrix && (
              <div>
                <h3 className="mb-2 text-sm font-semibold tracking-[-0.01em] text-[#111113]">
                  Matriks Perbandingan Berpasangan 6×6 ({inspected.code})
                </h3>
                <PairwiseMatrixTable
                  matrix={inspected.individualMatrix}
                  digits={4}
                  caption={`Matriks AHP individual ${inspected.code}`}
                />
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold tracking-[-0.01em] text-[#111113]">
                15 Jawaban Perbandingan Asli &amp; Hasil Konversi
              </h3>
              <div className="overflow-x-auto rounded-lg border border-[#e5e5e0]">
                <table className="w-full min-w-[540px] border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#e5e5e0] bg-[#f7f7f5] text-left font-mono text-[10px] uppercase tracking-[0.08em] text-[#787872]">
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Pasangan</th>
                      <th className="px-3 py-2.5">Jawaban Asli</th>
                      <th className="px-3 py-2.5 text-right">Token</th>
                      <th className="px-3 py-2.5 text-right">Nilai Numerik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e0]/80">
                    {PAIRWISE_DEFINITIONS.map((def) => {
                      const ans = inspected.parsedAnswers.find(
                        (a) => a.questionNo === def.questionNo,
                      );
                      return (
                        <tr key={def.pairKey}>
                          <td className="px-3 py-2 font-mono text-[#787872]">
                            {def.questionNo}
                          </td>
                          <td className="px-3 py-2 font-medium text-[#111113]">
                            {def.pairKey} ({def.leftLabel} vs {def.rightLabel})
                          </td>
                          <td className="px-3 py-2 text-[#52524e]">
                            {inspected.rawAnswers[def.pairKey] || "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-[#111113]">
                            {ans?.token ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-[#52524e]">
                            {ans ? formatDecimal(ans.numericValue, 6) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
