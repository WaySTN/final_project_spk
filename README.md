# LaptopMatch — Sistem Pendukung Keputusan Pemilihan Laptop Mahasiswa (AHP–SAW)

**Judul Penelitian:**  
*Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga Rp9.000.000–Rp11.000.000 Menggunakan Metode Analytical Hierarchy Process (AHP) dan Simple Additive Weighting (SAW).*

**Identitas Akademik:**  
Kelompok 13 — Wahyu Setiawan (23082010142), Lingga Dwi Al Farizi (23082010146), M. Ahnaf Zaki (23082010147)  
Program Studi Sistem Informasi, Fakultas Ilmu Komputer, Universitas Pembangunan Nasional "Veteran" Jawa Timur (2026).

---

## Ringkasan Fitur

### Website Publik (Tanpa Login)
- **Beranda (`/`)**: Ringkasan tujuan, rentang anggaran tetap Rp9–11 juta, statistik dinamis dari snapshot terpublikasi, preview peringkat teratas, grafik bobot AHP, alur AHP–SAW, dan disclaimer penelitian.
- **Rekomendasi (`/rekomendasi`)**: Pemeringkatan SAW presisi penuh, filter tampilan (*bukan perhitungan ulang*), peringatan selisih tipis A7/A6, grafik kontribusi berbobot, dan banner status publikasi (`provisional`/`final`).
- **Katalog (`/laptop`) & Detail (`/laptop/[code]`)**: Spesifikasi lengkap enam kriteria, dekomposisi normalisasi ($r_{ij}$) dan kontribusi bobot ($w_j r_{ij}$), metadata opsional Wh, serta 4 tautan sumber audit (harga, spesifikasi, PassMark CPU Mark, durasi video 1080p PSREF).
- **Bandingkan (`/bandingkan`)**: Perbandingan berdampingan maksimal 3 laptop + dukungan cetak (tidak mengubah ranking resmi).
- **Metodologi (`/metodologi`) & Tentang (`/tentang`)**: Hierarki 6 kriteria, skala Saaty sederhana, matriks AIJ gabungan, matriks X & R, analisis sensitivitas lintas skenario (S1/S2/S3), 9 referensi DOI, dan keterbatasan penelitian.

### Dashboard Administrator (`/admin`, Wajib Login)
- **Overview (`/admin`)**: Metrik aktual dari database, checklist alur penelitian, dan log audit terbaru.
- **Kriteria (`/admin/kriteria`)**: 6 kriteria tetap (`C1`–`C6`) bersifat read-only; bobot hanya berasal dari perhitungan AHP.
- **Responden (`/admin/responden`)**: Impor XLSX/CSV Google Forms dengan preview validasi, proteksi duplikat SHA-256, audit CR individual, flag kualitas (cap waktu tidak berurutan, CR ≈ 0, all-equal), serta inspeksi 15 pasangan & matriks 6×6 per responden.
- **Alternatif Laptop (`/admin/alternatif`)**: Impor workbook audit revisi, versioning dataset (`draft` → `sealed`), duplikasi ke draft baru, CRUD alternatif dengan validasi Zod & 4 URL sumber, serta nonaktif kandidat tanpa menghapus histori.
- **Perhitungan AHP (`/admin/perhitungan/ahp`) & SAW (`/admin/perhitungan/saw`)**: Komputasi deterministik di server (power iteration eigenvector, AIJ, normalisasi SAW, S1/S2/S3) dengan transparansi penuh tiap matriks.
- **Riwayat & Publikasi (`/admin/riwayat`)**: Histori run immutable, publikasi `provisional` vs gerbang konfirmasi manusia untuk `final`, dan sanitasi payload publik.
- **Laporan & Ekspor (`/admin/laporan`)**: Unduh workbook Excel `.xlsx` 7-sheet untuk presentasi/verifikasi dosen.

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
   *(atau `npm install` pada instalasi pertama)*

2. **Siapkan berkas penelitian privat (jangan commit ke Git):**
   Tempatkan kelima berkas penelitian di `research/private/` (folder ini sudah terdaftar di `.gitignore`).

3. **Salin dan isi environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Isi minimal:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (atau `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY` *(khusus skrip CLI `import:research` di mesin lokal; jangan pernah dipublikasikan ke browser)*

4. **Terapkan migrasi database & RLS di Supabase:**
   Jalankan berkas migrasi secara berurutan di Supabase SQL Editor atau via Supabase CLI (`supabase db push`):
   - `supabase/migrations/202611250001_initial_schema.sql`
   - `supabase/migrations/202611250002_rls_and_seed.sql`
   - `supabase/migrations/202611250003_table_grants.sql`

5. **Buat akun Administrator (Provisioning Manual):**
   Tidak ada pendaftaran admin publik. Buat pengguna di **Supabase Dashboard → Authentication → Users**, lalu tetapkan perannya sebagai `admin` melalui SQL Editor:
   ```sql
   insert into public.profiles (id, email, full_name, role)
   values ('<USER_UUID_DARI_AUTH_USERS>', 'admin@contoh.ac.id', 'Peneliti Kelompok 13', 'admin')
   on conflict (id) do update set role = 'admin';
   ```

6. **Impor data penelitian asli & hitung baseline (opsional via CLI atau lewat UI Admin):**
   ```bash
   npm run import:research -- \
     --survey "research/private/DATA RESPON KUESIONER AHP — SPK KELOMPOK 13 (1)!(1).xlsx" \
     --laptops "research/private/SPK_Kelompok_13_Audit_SAW_Revisi.xlsx" \
     --publish-provisional
   ```

7. **Jalankan server pengembangan:**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` (publik) dan `http://localhost:3000/admin/login` (administrator).

---

## Perintah Pengujian & Kualitas Kode

```bash
npm run typecheck   # Pemeriksaan TypeScript strict mode
npm run lint        # Pemeriksaan ESLint (Next.js + React Hooks)
npm run test        # Unit test & regression test terhadap workbook Excel asli (Vitest)
npm run build       # Production build Next.js
npm run test:e2e    # Pengujian End-to-End Playwright (desktop & mobile 360px)
```

---

## Dokumentasi Proyek

- [`AGENTS.md`](./AGENTS.md) — Aturan pengembangan & kontrak integritas penelitian.
- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — Analisis dokumen, resolusi konflik sumber, dan peta jalan implementasi.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Arsitektur full-stack dan pemisahan tanggung jawab.
- [`docs/DATA_DICTIONARY.md`](./docs/DATA_DICTIONARY.md) — Skema 13 tabel PostgreSQL & kebijakan RLS.
- [`docs/CALCULATION_METHOD.md`](./docs/CALCULATION_METHOD.md) — Rumus matematis AHP (power iteration, AIJ, CR) dan SAW.
- [`docs/TESTING.md`](./docs/TESTING.md) — Skenario pengujian dan hasil verifikasi aktual.
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Panduan deployment Supabase + Vercel dan checklist demo dosen.
- [`docs/KNOWN_LIMITATIONS.md`](./docs/KNOWN_LIMITATIONS.md) — Keterbatasan penelitian dan ruang lingkup sistem.
- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md) — Status aktual pengembangan per fase.
