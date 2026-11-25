import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";

const TEAM_MEMBERS = [
  { name: "Wahyu Setiawan", npm: "23082010142" },
  { name: "Lingga Dwi Al Farizi", npm: "23082010146" },
  { name: "M. Ahnaf Zaki", npm: "23082010147" },
];

export default function TentangPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 space-y-8">
      <div className="max-w-3xl space-y-2">
        <Badge tone="dark">Final Project Mata Kuliah Sistem Pendukung Keputusan</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Tentang LaptopMatch
        </h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga
          Rp9.000.000–Rp11.000.000 Menggunakan Metode Analytical Hierarchy Process (AHP) dan
          Simple Additive Weighting (SAW).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identitas Akademik — Kelompok 13</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {TEAM_MEMBERS.map((m) => (
                <li
                  key={m.npm}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="font-medium text-zinc-900">{m.name}</span>
                  <span className="font-mono text-xs text-zinc-500">{m.npm}</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-zinc-600 space-y-1">
              <p className="font-semibold text-zinc-900">
                Program Studi Sistem Informasi
              </p>
              <p>Fakultas Ilmu Komputer</p>
              <p>Universitas Pembangunan Nasional &ldquo;Veteran&rdquo; Jawa Timur (2026)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tujuan & Ruang Lingkup Aplikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-700 leading-relaxed">
            <p>
              LaptopMatch dikembangkan untuk menerjemahkan model penelitian AHP–SAW Kelompok
              13 menjadi perangkat lunak web full-stack yang deterministik, transparan, dan
              dapat diaudit oleh mahasiswa maupun dosen pengampu.
            </p>
            <p>
              <strong>Apa yang dilakukan aplikasi ini:</strong> membaca data kuesioner asli,
              menguji konsistensi CR tiap responden, mengagregasi matriks kelompok melalui
              rata-rata geometrik (AIJ), menghitung bobot eigenvector, melakukan normalisasi
              dan pemeringkatan SAW, serta menyajikan bukti sumber setiap spesifikasi.
            </p>
            <p>
              <strong>Apa yang bukan tujuan aplikasi ini:</strong> LaptopMatch bukan platform
              e-commerce, bukan marketplace transaksi, tidak melakukan scraping harga
              real-time, tidak meramalkan harga, dan tidak menggunakan machine learning atau
              AI generatif untuk menghasilkan rekomendasi.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
