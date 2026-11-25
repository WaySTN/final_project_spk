import { Download, FileSpreadsheet } from "lucide-react";
import {
  AlertBanner,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui/primitives";
import { formatDateTimeJakarta } from "@/lib/formatting";
import { getScenarioLabel } from "@/lib/publication/sanitize";
import { getRepository } from "@/lib/repositories";

export const dynamic = "force-dynamic";

const WORKBOOK_SHEETS = [
  { num: "01", name: "Ringkasan", desc: "Identitas penelitian, versi algoritma & status" },
  { num: "02", name: "Bobot AHP", desc: "Eigenvector, λmaks, CI, CR (RI = 1,24)" },
  { num: "03", name: "Matriks AIJ", desc: "Matriks gabungan 6×6 rata-rata geometrik" },
  { num: "04", name: "Alternatif & Sumber", desc: "Data mentah C1–C6 & 4 tautan bukti" },
  { num: "05", name: "Normalisasi SAW", desc: "Nilai ekstrem min/max & matriks R" },
  { num: "06", name: "Kontribusi & Ranking", desc: "Kontribusi berbobot wⱼ·rᵢⱼ & skor V" },
  { num: "07", name: "Sensitivitas", desc: "Perbandingan lintas skenario S1, S2 & S3" },
];

export default async function AdminLaporanPage() {
  const repo = await getRepository();
  const [sawRuns, publications] = await Promise.all([
    repo.listSawRuns(),
    repo.listPublications(),
  ]);

  const pubBySawId = new Map(publications.map((p) => [p.sawRunId, p]));

  return (
    <div className="space-y-6">
      <div className="border-b border-[#e5e5e0] pb-5">
        <p className="editorial-kicker">Ekspor Dokumentasi Akademik</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-[#111113]">
          Laporan &amp; Ekspor Workbook Excel (.xlsx)
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#787872]">
          Unduh workbook audit lengkap berisi 7 sheet terstruktur untuk verifikasi dosen
          pengampu dan lampiran laporan tugas akhir.
        </p>
      </div>

      {/* 7-Sheet Manifest Ledger */}
      <div className="space-y-2.5">
        <p className="editorial-kicker">Struktur 7 Sheet Workbook Audit (.xlsx)</p>
        <div className="grid gap-px overflow-hidden rounded-lg border border-[#e5e5e0] bg-[#e5e5e0] sm:grid-cols-2 lg:grid-cols-4">
          {WORKBOOK_SHEETS.map((sheet) => (
            <div key={sheet.num} className="bg-white p-3.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold text-[#787872]">
                  {sheet.num}
                </span>
                <p className="text-xs font-semibold text-[#111113]">{sheet.name}</p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#787872]">
                {sheet.desc}
              </p>
            </div>
          ))}
          <div className="bg-[#f7f7f5] p-3.5 flex flex-col justify-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#787872]">
              Keamanan Ekspor
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#52524e]">
              Formula-injection sanitized · tanpa baris mentah responden.
            </p>
          </div>
        </div>
      </div>

      <AlertBanner tone="neutral" title="Perlindungan Privasi Ekspor">
        Berkas Excel yang dihasilkan disanitasi dari potensi formula injection dan hanya
        memuat agregat perhitungan serta tautan sumber alternatif; tidak menyertakan baris
        mentah jawaban individu responden.
      </AlertBanner>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Run Perhitungan Siap Ekspor</CardTitle>
          <CardDescription>
            Setiap berkas dihasilkan secara dinamis di server dari snapshot perhitungan tersimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sawRuns.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<FileSpreadsheet className="h-5 w-5" />}
                title="Belum ada laporan yang dapat diekspor"
                description="Jalankan perhitungan AHP dan SAW terlebih dahulu agar tersedia hasil yang dapat diunduh ke format Excel."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5e0] bg-[#f7f7f5] text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-[#787872]">
                    <th className="px-4 py-3">Waktu Hitung</th>
                    <th className="px-4 py-3">Skenario</th>
                    <th className="px-4 py-3">Dataset &amp; Alternatif</th>
                    <th className="px-4 py-3">Status Publikasi</th>
                    <th className="px-4 py-3 text-right">Unduh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e0]/80">
                  {sawRuns.map((run) => {
                    const pub = pubBySawId.get(run.id);
                    return (
                      <tr key={run.id} className="transition-colors hover:bg-[#f7f7f5]/60">
                        <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap text-[#52524e]">
                          {formatDateTimeJakarta(run.createdAt)}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-semibold text-[#111113]">
                            {getScenarioLabel(run.scenario)}
                          </p>
                          <p className="font-mono text-[11px] text-[#787872]">
                            ID: {run.id.slice(0, 8)}…
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-[#52524e]">
                          v{run.inputSnapshot.datasetVersion} ({run.inputSnapshot.observedAt}) ·{" "}
                          {run.inputSnapshot.alternativeCodes.length} kandidat
                        </td>
                        <td className="px-4 py-3.5">
                          {pub ? (
                            <Badge
                              tone={
                                pub.isCurrent
                                  ? pub.status === "final"
                                    ? "success"
                                    : "warning"
                                  : "neutral"
                              }
                            >
                              {pub.status.toUpperCase()}
                              {pub.isCurrent ? " (Aktif)" : ""}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Belum dipublikasikan</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <a
                            href={`/api/admin/export/${run.id}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#111113] px-3.5 text-xs font-medium text-white transition-colors hover:bg-[#27272a]"
                          >
                            <Download className="h-3.5 w-3.5" aria-hidden="true" />
                            Unduh XLSX
                          </a>
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
    </div>
  );
}
