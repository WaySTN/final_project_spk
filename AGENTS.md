# AGENTS.md — Instruksi Pengembangan LaptopMatch (SPK AHP–SAW)

Dokumen ini menjadi panduan wajib bagi setiap AI coding agent atau pengembang yang melanjutkan proyek **LaptopMatch**.

## 1. Identitas dan Prinsip Akademik

- **Aplikasi:** LaptopMatch — Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga Rp9.000.000–Rp11.000.000 Menggunakan Metode AHP dan SAW.
- **Pemilik:** Kelompok 13 (Wahyu Setiawan, Lingga Dwi Al Farizi, M. Ahnaf Zaki), Program Studi Sistem Informasi, Fakultas Ilmu Komputer, UPN "Veteran" Jawa Timur.
- **Bahasa:** Bahasa Indonesia untuk antarmuka pengguna, komunikasi, dan dokumentasi; bahasa Inggris untuk penamaan kode (variabel, fungsi, tipe, komponen, file).

## 2. Kontrak Data dan Integritas Penelitian (DILARANG DIUBAH)

1. **Enam kriteria tetap (C1–C6):**
   - `C1` Harga (IDR integer, `cost`)
   - `C2` Performa prosesor (PassMark CPU Mark, `benefit`)
   - `C3` Kapasitas RAM terpasang (GB, `benefit`)
   - `C4` Kapasitas SSD terpasang (GB, `benefit`)
   - `C5` Berat laptop (kg, `cost`)
   - `C6` Daya tahan baterai — estimasi maksimum video lokal 1080p 150 nit dari Lenovo PSREF (jam, `benefit`). **Jangan** mengganti C6 dengan Wh atau MobileMark.
2. **Rentang harga:** Rp9.000.000–Rp11.000.000 inklusif.
3. **Skala AHP:** `{1, 3, 5, 7, 9, 1/3, 1/5, 1/7, 1/9}`. Parser wajib membaca pecahan numerik secara eksak (tanpa `eval`, tanpa `parseInt('1/3')`).
4. **Algoritma AHP:**
   - Matriks 6×6 resiprokal positif.
   - Eigenvector utama melalui **power iteration** (konvergensi `maxAbsDelta < 1e-12`, maks 10.000 iterasi). Jangan diganti dengan metode rata-rata baris normalisasi.
   - `RI = 1.24` untuk `n = 6`, ambang konsistensi `CR <= 0.10` tanpa pembulatan.
   - Agregasi kelompok dengan rata-rata geometrik (AIJ: `exp(mean(log(a_ij)))`).
5. **Algoritma SAW:**
   - Normalisasi benefit `x_ij / max(x_j)`, cost `min(x_j) / x_ij`.
   - Tidak membulatkan nilai perantara; ranking memakai presisi penuh (tie tolerance `1e-12`).
   - Normalisasi ulang wajib dilakukan saat himpunan alternatif berubah.
6. **Larangan keras:**
   - Jangan pernah memodifikasi atau menghapus file asli di `research/private/`.
   - Jangan menaruh data mentah responden di `public/` atau commit ke Git.
   - Jangan hardcode bobot, skor, atau peringkat sebagai hasil perhitungan.
   - Jangan mengarang responden, harga, spesifikasi, stok, gambar SKU, atau URL sumber.
   - Jangan mengubah jawaban responden untuk menurunkan CR atau menyembunyikan responden tidak konsisten.
   - Jangan mempublikasikan dataset baseline secara otomatis sebagai `final` (wajib `provisional` sampai verifikasi manusia).

## 3. Arsitektur dan Standar Kode

- `src/lib/decision/*` harus **pure TypeScript** (tanpa dependensi React, database, atau HTTP) agar deterministik dan mudah diuji.
- Validasi dan komputasi selalu dijalankan di sisi server (`Route Handlers` / `Server Actions`).
- Semua akses `/admin` (kecuali `/admin/login`) dan `/api/admin/*` wajib diverifikasi di server-side + RLS PostgreSQL.
- Desain UI: monochrome minimalis (`#ffffff`, `#18181b`, `#71717a`, `#e4e4e7`, `#fafafa`), warna semantik hanya untuk status validasi, tanpa gradien berlebihan, tanpa emoji sebagai ikon, angka tabel menggunakan `tabular-nums` dan format `id-ID`.

## 4. Perintah Verifikasi Wajib

Sebelum menyatakan perubahan selesai, jalankan:
```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
Untuk E2E (Playwright):
```bash
npm run test:e2e
```
