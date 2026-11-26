# AGENTS.md — Instruksi Pengembangan LaptopMatch (SPK AHP–SAW)

Dokumen ini menjadi panduan wajib bagi setiap AI coding agent atau pengembang yang melanjutkan proyek **LaptopMatch**.

## 1. Identitas dan Prinsip Akademik

- **Aplikasi:** LaptopMatch — Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga Rp9.000.000–Rp11.000.000 Menggunakan Metode AHP dan SAW.
- **Pemilik:** Kelompok 13 — Wahyu Setiawan (23082010142), Lingga Dwi Al Farizi (23082010146), M. Ahnaf Zaki (23082010147), Kelas D, Program Studi Sistem Informasi, Fakultas Ilmu Komputer, UPN "Veteran" Jawa Timur.
- **Bahasa:** Bahasa Indonesia untuk antarmuka pengguna, komunikasi, dan dokumentasi; bahasa Inggris untuk penamaan kode (variabel, fungsi, tipe, komponen, file).

## 2. Kontrak Data dan Integritas Penelitian (Versi Terbaru UAS — 33 Alternatif)

1. **Versi Dataset Aktif (Revisi UAS 2026 — 33 Alternatif Lintas 8 Merek):**
   - Total **42 kandidat** dievaluasi: **33 alternatif aktif** masuk pemeringkatan SAW utama lintas **8 merek** (Lenovo, ASUS, Acer, HP, MSI, Axioo, TECNO, Infinix) dan **9 kandidat dikeluarkan** (`A9, A19, A24, A25, A26, A31, A32, A35, A36`) disimpan terpisah sebagai arsip audit (dilarang dimasukkan ke pemeringkatan utama).
   - **Kode alternatif asli wajib dipertahankan** (`A1..A8, A10..A18, A20..A23, A27..A30, A33, A34, A37..A42`); dilarang menomori ulang secara berurutan menjadi `A1..A33`.
   - **Histori dataset lama (v1, 7 alternatif Lenovo, C6 satuan jam)** wajib tetap aman dan dapat ditelusuri tanpa menimpa atau menghapus data historis.
2. **Enam kriteria tetap (C1–C6):**
   - `C1` Harga laptop (IDR integer, `cost`)
   - `C2` Performa prosesor (PassMark CPU Mark, `benefit`)
   - `C3` Kapasitas RAM terpasang (GB, `benefit`)
   - `C4` Kapasitas SSD terpasang (GB, `benefit` — pada dataset UAS bervariasi `256`, `512`, dan `1.000` GB)
   - `C5` Berat laptop (kg, `cost`)
   - `C6` **Versi terbaru UAS:** Kapasitas baterai dalam satuan **Wh** (`battery_wh`, `benefit`) sebagai indikator pendekatan (*proksi*) daya tahan baterai dengan asumsi konsumsi daya setara. Dilarang menampilkan Wh sebagai jam, dilarang mengklaim Wh selalu menjamin durasi pemakaian aktual lebih lama, dan dilarang mengonversi satuan jam historis menjadi Wh tanpa sumber. **Dataset historis v1** mempertahankan satuan aslinya (`battery_hours`, jam video lokal 1080p PSREF).
3. **Rentang harga:** Rp9.000.000–Rp11.000.000 inklusif.
4. **Skala AHP:** `{1, 3, 5, 7, 9, 1/3, 1/5, 1/7, 1/9}` (nilai genap `2, 4, 6, 8` tidak digunakan pada instrumen kuesioner). Parser wajib membaca pecahan numerik secara eksak (tanpa `eval`, tanpa `parseInt('1/3')`). Data kuesioner 33 mahasiswa (17 konsisten `CR <= 0,10`, 16 tidak konsisten) digunakan tanpa wawancara tambahan sesuai hasil konsultasi dosen.
5. **Algoritma AHP:**
   - Matriks 6×6 resiprokal positif.
   - Eigenvector utama melalui **power iteration** (konvergensi `maxAbsDelta < 1e-12`, maks 10.000 iterasi). Jangan diganti dengan metode rata-rata baris normalisasi.
   - `RI = 1.24` untuk `n = 6`, ambang konsistensi `CR <= 0.10` tanpa pembulatan.
   - Agregasi kelompok dengan rata-rata geometrik (AIJ: `exp(mean(log(a_ij)))`).
6. **Algoritma SAW & Analisis Sensitivitas Bobot (37 Skenario):**
   - Normalisasi benefit `x_ij / max(x_j)`, cost `min(x_j) / x_ij`, presisi penuh (tie tolerance `1e-12`), normalisasi ulang wajib saat himpunan alternatif berubah.
   - Analisis sensitivitas perubahan satu bobot (*One-At-A-Time*): `w'_k = w_k * (1 + delta)`, `w'_j = w_j * (1 - w'_k) / (1 - w_k)` untuk `j != k`, `sum(w') = 1`, matriks `R` tetap, pada `delta ∈ {-20%, -10%, -5%, +5%, +10%, +20%}` untuk `C1..C6` (36 skenario + 1 baseline = 37 skenario). Simulasi sensitivitas **dilarang** mengubah bobot AHP asli atau menimpa snapshot aktif.
7. **Larangan keras:**
   - Jangan pernah memodifikasi atau menghapus file asli di `research/private/`.
   - Jangan menaruh data mentah responden di `public/` atau commit ke Git.
   - Jangan menggunakan bagian `expected_regression` pada JSON sebagai input aplikasi atau hardcode bobot, skor, maupun peringkat.
   - Jangan mengarang responden, harga, spesifikasi, stok, gambar SKU, hasil wawancara, atau URL sumber.
   - Jangan mengubah jawaban responden untuk menurunkan CR atau menyembunyikan responden tidak konsisten.
   - Jangan mempublikasikan dataset baseline secara otomatis sebagai `final` (wajib `provisional` sampai verifikasi manusia).

## 3. Arsitektur dan Standar Kode

- `src/lib/decision/*` harus **pure TypeScript** (tanpa dependensi React, database, atau HTTP) agar deterministik dan mudah diuji.
- Validasi dan komputasi selalu dijalankan di sisi server (`Route Handlers` / `Server Actions`).
- Semua akses `/admin` (kecuali `/admin/login`) dan `/api/admin/*` wajib diverifikasi di server-side + RLS PostgreSQL.
- Desain UI: **Nordic Slate & Deep Navy Ink** minimalis (`#ffffff`, `#f8fafc`, `#f1f5f9`, `#e2e8f0`, `#cbd5e1`, `#1e293b`, `#475569`, `#64748b`, aksen `#1e3a5f`, hover `#162d4a`, tint `#eff4fa`), tanpa blok hitam berat, warna semantik hanya untuk status validasi, tanpa emoji sebagai ikon, angka tabel menggunakan `tabular-nums` dan format `id-ID`.

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
