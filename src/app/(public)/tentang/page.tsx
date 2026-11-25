const TEAM_MEMBERS = [
  { no: "01", name: "Wahyu Setiawan", npm: "23082010142" },
  { no: "02", name: "Lingga Dwi Al Farizi", npm: "23082010146" },
  { no: "03", name: "M. Ahnaf Zaki", npm: "23082010147" },
];

export default function TentangPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 lg:py-14 space-y-10">
      <div className="border-b border-[#e2e8f0] pb-8 max-w-3xl space-y-3">
        <p className="editorial-kicker">
          Final Project Mata Kuliah Sistem Pendukung Keputusan · 2026
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#1e293b] sm:text-4xl">
          Tentang LaptopMatch
        </h1>
        <p className="text-base leading-relaxed text-[#475569]">
          Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga
          Rp9.000.000–Rp11.000.000 Menggunakan Metode Analytical Hierarchy Process (AHP) dan
          Simple Additive Weighting (SAW).
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Academic Team Ledger */}
        <div className="lg:col-span-5 rounded-lg border border-[#e2e8f0] bg-white overflow-hidden">
          <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-5 py-4">
            <p className="editorial-kicker">Tim Penyusun</p>
            <h2 className="mt-1 text-base font-semibold text-[#1e293b]">
              Kelompok 13 — Sistem Informasi
            </h2>
          </div>
          <ul className="divide-y divide-[#e2e8f0]/80">
            {TEAM_MEMBERS.map((m) => (
              <li
                key={m.npm}
                className="flex items-center justify-between px-5 py-3.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-[#64748b]">{m.no}</span>
                  <span className="font-medium text-[#1e293b]">{m.name}</span>
                </div>
                <span className="font-mono text-xs text-[#475569]">{m.npm}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 text-xs leading-relaxed text-[#475569]">
            <p className="font-semibold text-[#1e293b]">
              Program Studi Sistem Informasi, Fakultas Ilmu Komputer
            </p>
            <p>Universitas Pembangunan Nasional &ldquo;Veteran&rdquo; Jawa Timur</p>
          </div>
        </div>

        {/* Scope vs Out-of-Scope Architectural Split */}
        <div className="lg:col-span-7 grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-5 space-y-3">
            <p className="editorial-kicker">Dalam Ruang Lingkup</p>
            <h2 className="text-base font-semibold text-[#1e293b]">
              Yang Dilakukan Sistem
            </h2>
            <ul className="list-disc pl-4 space-y-2 text-xs sm:text-[13px] leading-relaxed text-[#475569]">
              <li>Membaca data kuesioner asli 15 pasangan perbandingan dan menguji CR tiap responden.</li>
              <li>Mengagregasi matriks 6×6 via rata-rata geometrik (AIJ) dan menghitung bobot eigenvector power iteration.</li>
              <li>Menormalisasi 6 kriteria SAW (cost/benefit), menampilkan kontribusi tiap sel, dan menjalankan sensitivitas S1/S2/S3.</li>
              <li>Menyediakan 4 tautan bukti sumber per kandidat dan ekspor laporan audit Excel 7-sheet.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-5 space-y-3">
            <p className="editorial-kicker">Di Luar Ruang Lingkup</p>
            <h2 className="text-base font-semibold text-[#1e293b]">
              Batasan & Non-Klaim
            </h2>
            <ul className="list-disc pl-4 space-y-2 text-xs sm:text-[13px] leading-relaxed text-[#475569]">
              <li>Bukan platform e-commerce, marketplace transaksi, maupun jaminan ketersediaan stok real-time.</li>
              <li>Tidak melakukan scraping harga otomatis maupun peramalan harga masa depan.</li>
              <li>Tidak menggunakan machine learning atau AI generatif untuk menghasilkan skor rekomendasi.</li>
              <li>Tidak mengklaim hasil mewakili seluruh populasi mahasiswa atau seluruh merek laptop di Indonesia.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
