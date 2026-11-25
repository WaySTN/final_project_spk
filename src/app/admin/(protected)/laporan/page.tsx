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

export default async function AdminLaporanPage() {
  const repo = await getRepository();
  const [sawRuns, publications] = await Promise.all([
    repo.listSawRuns(),
    repo.listPublications(),
  ]);

  const pubBySawId = new Map(publications.map((p) => [p.sawRunId, p]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Ekspor Dokumentasi Akademik
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Laporan & Ekspor Workbook Excel (.xlsx)
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Unduh workbook audit lengkap berisi 7 sheet (Ringkasan, Bobot AHP, Matriks AIJ,
          Alternatif & Sumber, Normalisasi SAW, Kontribusi & Ranking, serta Sensitivitas)
          untuk verifikasi dosen pengampu.
        </p>
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
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold text-zinc-600">
                    <th className="px-4 py-3">Waktu Hitung</th>
                    <th className="px-4 py-3">Skenario</th>
                    <th className="px-4 py-3">Dataset & Alternatif</th>
                    <th className="px-4 py-3">Status Publikasi</th>
                    <th className="px-4 py-3 text-right">Unduh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sawRuns.map((run) => {
                    const pub = pubBySawId.get(run.id);
                    return (
                      <tr key={run.id} className="hover:bg-zinc-50/70">
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {formatDateTimeJakarta(run.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-zinc-900">
                            {getScenarioLabel(run.scenario)}
                          </p>
                          <p className="font-mono text-[11px] text-zinc-500">
                            ID: {run.id.slice(0, 8)}…
                          </p>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-700">
                          v{run.inputSnapshot.datasetVersion} ({run.inputSnapshot.observedAt}) ·{" "}
                          {run.inputSnapshot.alternativeCodes.length} kandidat
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`/api/admin/export/${run.id}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
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
