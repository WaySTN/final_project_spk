# LaptopMatch — Sistem Pendukung Keputusan Pemilihan Laptop Mahasiswa (AHP–SAW)

**Judul Penelitian:**  
*Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga Rp9.000.000–Rp11.000.000 Menggunakan Metode Analytical Hierarchy Process (AHP) dan Simple Additive Weighting (SAW).*

**Identitas Akademik:**  
Kelompok 13 (Kelas D) — Wahyu Setiawan (23082010142), Lingga Dwi Al Farizi (23082010146), M. Ahnaf Zaki (23082010147)  
Program Studi Sistem Informasi, Fakultas Ilmu Komputer, Universitas Pembangunan Nasional "Veteran" Jawa Timur (2026).

---

## Ringkasan Revisi UAS 2026 (33 Alternatif Lintas 8 Merek)

Versi terbaru sistem telah direvisi agar sesuai dengan naskah resmi UAS SPK Kelas D 2026 sambil tetap menjaga kompatibilitas penuh dengan histori dataset v1 (7 alternatif Lenovo):

- **Alternatif & Merek:** 33 alternatif laptop aktif lintas **8 merek** (Lenovo, ASUS, Acer, HP, MSI, Axioo, TECNO, Infinix) hasil seleksi dari 42 kandidat pada rentang **Rp9.000.000–Rp11.000.000** (snapshot audit **26 November 2026**). Sembilan kandidat dikeluarkan (`A9, A19, A24, A25, A26, A31, A32, A35, A36`) disimpan terpisah sebagai arsip audit.
- **Responden AHP:** 33 respons kuesioner mahasiswa (17 konsisten `CR ≤ 0,10`; 16 tidak konsisten; CR gabungan `0,00127449`), digunakan tanpa wawancara tambahan sesuai konsultasi kelompok dengan dosen.
- **Kriteria C6:** Menggunakan **kapasitas baterai (Wh)** sebagai indikator pendekatan (*proksi*) daya tahan baterai pada asumsi konsumsi daya setara (bukan durasi penggunaan aktual). Dataset historis v1 tetap mempertahankan satuan aslinya (`jam`).
- **Analisis Sensitivitas Bobot (37 Skenario):** Perubahan satu bobot pada kisaran `±5%, ±10%, ±20%` untuk C1–C6 dengan penyesuaian proporsional lima bobot lainnya (`Total = 1,00000000`). `A33` (TECNO Megabook T1 14, skor `0,834354`) bertahan pada 31/36 skenario (`86,11%`), sementara `A29` (Axioo Hype 7 AMD X8-11, skor `0,830314`) menjadi peringkat #1 pada 5 skenario (`C1 -20%`, `C2 +10%`, `C2 +20%`, `C6 -10%`, `C6 -20%`).

---

## Ringkasan Fitur

### Website Publik (Tanpa Login)
- **Beranda (`/`)**: Ringkasan penelitian, statistik dinamis 33 alternatif & 8 merek, podium peringkat teratas, selisih skor `#1` vs `#2`, grafik bobot AHP, alur 4 tahap AHP–SAW, dan disclaimer batasan ruang lingkup.
- **Rekomendasi (`/rekomendasi`)**: Pemeringkatan penuh 33 alternatif, pencarian & filter berdasarkan merek, harga, RAM, dan SSD (*tanpa mengubah ranking global*), panel **Evaluasi Hasil Keputusan**, grafik kontribusi berbobot, dan banner status publikasi (`provisional`/`final`).
- **Katalog (`/laptop`) & Detail (`/laptop/[code]`)**: Spesifikasi enam kriteria termasuk kapasitas baterai Wh (dengan catatan proksi), dekomposisi normalisasi ($r_{ij}$) & kontribusi bobot ($w_j r_{ij}$), serta 4 tautan sumber bukti audit.
- **Bandingkan (`/bandingkan`)**: Pencarian & filter merek untuk membandingkan maksimal 3 laptop berdampingan + dukungan cetak.
- **Metodologi (`/metodologi`) & Tentang (`/tentang`)**: Enam kriteria dinamis, skala pembobotan AHP lengkap (`1, 3, 5, 7, 9` & resiprokal), matriks AIJ, matriks X & R, **explorer interaktif 37 skenario sensitivitas**, evaluasi keputusan, 9 referensi DOI, dan keterbatasan penelitian.

### Dashboard Administrator (`/admin`, Wajib Login)
- **Overview (`/admin`)**: Metrik aktual database, versi dataset & satuan C6, alur kerja 5 tahap, shortcut cepat, dan log audit terbaru.
- **Kriteria (`/admin/kriteria`)**: Enam kriteria tetap (`C1`–`C6`) read-only, penjelasan proksi baterai Wh, serta tabel **Skala Pembobotan AHP Lengkap**.
- **Responden (`/admin/responden`)**: Impor XLSX/CSV Google Forms dengan validasi, proteksi duplikat SHA-256, audit CR individual, dan inspeksi matriks 6×6 per responden.
- **Alternatif Laptop (`/admin/alternatif`)**: Impor JSON 33 alternatif / workbook 12-sheet XLSX / workbook historis secara idempotent, filter merek, arsip 9 kandidat dikeluarkan, versioning (`draft` → `sealed`), duplikasi draft, dan CRUD dengan 4 URL sumber.
- **Perhitungan AHP (`/admin/perhitungan/ahp`) & SAW (`/admin/perhitungan/saw`)**: Komputasi deterministik di server dengan transparansi penuh matriks X, nilai ekstrem, matriks R, kontribusi berbobot, dan peringkat.
- **Analisis Sensitivitas (`/admin/perhitungan/sensitivitas`)**: Matriks interaktif 6×6 (37 skenario), simulasi delta kustom (`-50%` s.d. `+50%`) tanpa mengubah bobot AHP maupun snapshot publikasi, serta perbandingan perubahan posisi 33 alternatif.
- **Riwayat & Publikasi (`/admin/riwayat`)**: Histori run immutable lintas versi (v1 & v2), publikasi `provisional` vs gerbang verifikasi manusia untuk `final`, dan sanitasi payload publik.
- **Laporan & Ekspor (`/admin/laporan`)**: Unduh workbook Excel `.xlsx` **8-sheet** (termasuk `Sensitivitas Bobot 37`) ter-sanitasi formula injection.

---

## Persyaratan Lingkungan

- Node.js 20+ LTS (diuji pada Node.js 24 LTS) & npm 10+
- Akun/proyek **Supabase** (PostgreSQL + Auth + RLS) untuk penggunaan penuh & production
- (Opsional) **Vercel** untuk deployment aplikasi Next.js

---

## Instalasi & Konfigurasi Lokal

1. **Instal dependensi:**
   ```bash
   npm ci
   ```
2. **Siapkan berkas penelitian privat (jangan commit ke Git):**
   Tempatkan berkas penelitian di `research/private/` (sudah terdaftar di `.gitignore`).
3. **Salin dan isi environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan (khusus CLI lokal) `SUPABASE_SERVICE_ROLE_KEY`.
4. **Terapkan migrasi database non-destruktif di Supabase secara berurutan:**
   - `supabase/migrations/202611250001_initial_schema.sql`
   - `supabase/migrations/202611250002_rls_and_seed.sql`
   - `supabase/migrations/202611250003_table_grants.sql`
   - `supabase/migrations/202611260001_uas_33_alternatives_and_sensitivity.sql` *(revisi UAS 33 alternatif — rollback tersedia pada `202611260001_rollback_uas_33_alternatives.sql`)*
5. **Impor dataset UAS 33 alternatif secara idempotent via CLI (atau via UI Admin):**
   ```bash
   npm run import:research -- \
     --survey "research/private/DATA RESPON KUESIONER AHP — SPK KELOMPOK 13 (1)!(1).xlsx" \
     --laptops "research/private/LaptopMatch_Dataset_33_Regression.json" \
     --observed-at 2026-11-26 \
     --publish-provisional
   ```
6. **Jalankan server pengembangan:**
   ```bash
   npm run dev
   ```

---

## Perintah Pengujian & Kualitas Kode

```bash
npm run typecheck   # Pemeriksaan TypeScript strict mode
npm run lint        # Pemeriksaan ESLint (Next.js + React Hooks)
npm run test        # Unit test & regression test 33 alternatif + 37 sensitivitas (Vitest)
npm run build       # Production build Next.js
npm run test:e2e    # Pengujian End-to-End Playwright (desktop & mobile 360px)
```

---

## Dokumentasi Proyek

- [`AGENTS.md`](./AGENTS.md) — Aturan pengembangan & kontrak integritas penelitian versi UAS.
- [`docs/UAS_REVISION_STATUS.md`](./docs/UAS_REVISION_STATUS.md) — Status lengkap revisi UAS 33 alternatif, migrasi DB, panduan deployment & rollback.
- [`docs/UAS_TEST_RESULTS.md`](./docs/UAS_TEST_RESULTS.md) — Laporan hasil pengujian aktual (PASS/FAIL/NOT RUN) & regression tolerance `1e-7`.
- [`docs/UAS_SCREENSHOT_CHECKLIST.md`](./docs/UAS_SCREENSHOT_CHECKLIST.md) — Daftar lengkap 17 screenshot bukti nyata aplikasi di `docs/uas-evidence/`.
- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) · [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) · [`docs/DATA_DICTIONARY.md`](./docs/DATA_DICTIONARY.md) · [`docs/CALCULATION_METHOD.md`](./docs/CALCULATION_METHOD.md) · [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
