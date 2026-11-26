# Status Revisi UAS — LaptopMatch (SPK AHP–SAW 33 Alternatif)

**Judul Penelitian:** Sistem Pendukung Keputusan Pemilihan Laptop bagi Mahasiswa pada Kisaran Harga Rp9.000.000–Rp11.000.000 Menggunakan Metode *Analytical Hierarchy Process* (AHP) dan *Simple Additive Weighting* (SAW)  
**Tim Peneliti:** Kelompok 13 — Wahyu Setiawan (23082010142), Lingga Dwi Al Farizi (23082010146), M. Ahnaf Zaki (23082010147)  
**Institusi:** Program Studi Sistem Informasi, Fakultas Ilmu Komputer, UPN "Veteran" Jawa Timur (Kelas D, Semester Gasal 2026)  
**Tanggal Revisi:** 26 November 2026  
**Status Lingkungan Lokal:** **SELESAI & TERVERIFIKASI**  
**Status Produksi (Supabase & Vercel):** **MIGRASI & IMPOR SUPABASE SELESAI (26 Nov 2026)** — Backup v1 tersimpan, migration `202611260001` sukses, dataset v2 (33 alt, `C6 Wh`, 9 arsip dikeluarkan) & publikasi `provisional` (`6a40d1e5-2fc8-4d57-94da-94d3106bc85f`) aktif dengan histori v1 utuh, dilanjutkan deployment Vercel.

---

## 1. Ringkasan Perubahan Kebutuhan UAS

Berdasarkan **Naskah Resmi UAS FP SPK Kelas D 2026**, kontrak teknis `Prompt_Revisi_LaptopMatch_UAS_33_Alternatif.md`, workbook terintegrasi `SPK_Kelompok_13_AHP_SAW_Terintegrasi_33_Alternatif.xlsx` (12 sheet), dataset regresi `LaptopMatch_Dataset_33_Regression.json`, serta draf laporan UAS terbaru, dilakukan revisi menyeluruh tanpa membangun ulang aplikasi, tanpa mengganti stack teknologi, dan tanpa menghapus histori penelitian lama.

| Aspek Penelitian | Versi Historis v1 (Tersimpan Utuh) | Versi Terbaru UAS v2 |
|---|---|---|
| Jumlah alternatif aktif | 7 laptop | **33 laptop** (dari 42 kandidat; 9 kandidat diarsipkan sebagai `excluded_candidates`) |
| Cakupan merek | 1 merek (Lenovo) | **8 merek** (Lenovo, ASUS, Acer, HP, MSI, Axioo, TECNO, Infinix) |
| Pengkodean alternatif | `A1`–`A7` | Kode asli non-berurutan `A1`–`A42` dipertahankan (`A9, A19, A24, A25, A26, A31, A32, A35, A36` dikeluarkan) |
| Rentang harga | Rp9.000.000–Rp11.000.000 | Tetap Rp9.000.000–Rp11.000.000 inklusif (min Rp9.199.000, maks Rp10.999.000) |
| Kriteria C6 (Baterai) | Durasi video lokal 1080p (`jam`, benefit) | **Kapasitas baterai (`Wh`, benefit)** sebagai indikator pendekatan daya tahan |
| Panel responden AHP | 33 responden (17 konsisten `CR ≤ 0,10`, 16 tidak konsisten) | **Tetap 33 responden (17 / 16)** tanpa wawancara tambahan sesuai hasil konsultasi kelompok dengan dosen |
| CR gabungan (AIJ) | `0,00127449` (`λmax = 6,00790181`, `CI = 0,00158036`) | **Tetap `0,00127449`** (dihitung ulang otomatis dari raw batch asli) |
| Peringkat #1 baseline | `A7` Lenovo IdeaPad Slim 3 (`0,953349`) | **`A33` TECNO Megabook T1 14** (`0,834354`), diikuti `#2 A29` Axioo Hype 7 AMD X8-11 (`0,830314`), `#3 A28` Axioo Hype 5 AMD X6 (`0,821223`), hingga `#33 A11` ASUS Vivobook Go 14 (`0,601888`) |
| Analisis sensitivitas | Skenario historis 17/33 responden & subset 5/7 | **Wajib UAS: 37 skenario** (1 baseline + 6 kriteria × 6 delta `-20%, -10%, -5%, +5%, +10%, +20%`, total bobot selalu = 1) + skenario historis tetap kompatibel |
| Status publikasi | `provisional` | Tetap **`provisional`** hingga verifikasi manusia terhadap bukti SKU/harga selesai |

---

## 2. Audit Konsistensi Lima Dokumen Penelitian Terbaru

Sebelum mengubah kode, seluruh data pada workbook 12 sheet (`SPK_Kelompok_13_AHP_SAW_Terintegrasi_33_Alternatif.xlsx`, SHA-256 `ffaace9ee177f8f2dabf2fae74e78a9d42da3c3b4d059aff733ed52058a58b25`) dibandingkan silang dengan `LaptopMatch_Dataset_33_Regression.json`, draf laporan DOCX, dan naskah UAS PDF:

- **Konflik numerik:** **0 konflik** (seluruh 6 bobot AHP, 36 elemen matriks AIJ, `λmax`, `CI`, `CR`, 33 alternatif, 198 nilai normalisasi `R`, 198 kontribusi `w × r`, 33 skor & ranking, serta seluruh 37 × 33 skenario sensitivitas cocok dengan selisih `≤ 1e-9`).
- **Kandidat dikeluarkan (9 unit):** `A9, A19, A24, A25, A26, A31, A32, A35, A36` disimpan hanya sebagai arsip audit (`excluded_candidates`) dan tidak pernah masuk matriks SAW maupun publikasi publik.
- **Integritas direktori privat:** Seluruh 10 file (5 lama + 5 baru) pada `research/private/` tidak dimodifikasi, tidak dihapus, dan tetap dikecualikan oleh `.gitignore`.

---

## 3. Daftar Perubahan Teknis per Lapisan

### 3.1 Basis Data & Migrasi Non-Destruktif
- **Migration baru:** `supabase/migrations/202611260001_uas_33_alternatives_and_sensitivity.sql`
  - Menambahkan kolom metadata versi C6 (`c6_metric`, `c6_unit`, `c6_definition`), `candidate_count`, dan `excluded_candidates` (`jsonb`) pada tabel `alternative_datasets` (baris historis v1 otomatis diberi default `battery_hours` / `jam`).
  - Menjadikan kolom `alternatives.battery_hours` nullable dengan constraint keamanan (`(battery_hours IS NOT NULL AND battery_hours > 0) OR (battery_wh IS NOT NULL AND battery_wh > 0)`) agar dataset Wh tidak pernah mengisi kolom `battery_hours` secara keliru dan data v1 tetap utuh.
  - Menambahkan kolom audit `source_date_recorded`, `source_status_recorded`, dan `selection_reason` pada tabel `alternatives`.
  - Memperluas constraint `saw_runs.scenario` untuk mendukung `primary_33_consistent` dan `sensitivity_33_all` sekaligus menambahkan kolom `c6_metric`, `c6_unit`, dan `weight_sensitivity` (`jsonb`).
- **Rollback script:** `supabase/migrations/202611260001_rollback_uas_33_alternatives.sql` (tersedia untuk memulihkan skema secara aman apabila diperlukan).
- **Keamanan & RLS:** Seluruh kebijakan Row Level Security, autentikasi server-side `/admin` & `/api/admin/*`, serta pemisahan data mentah responden tetap dipertahankan penuh.

### 3.2 Importer, Repository & CLI Idempotent
- `src/lib/import/laptops.ts` & `src/lib/import/validation.ts`: mendukung impor **UAS JSON** (`alternatives` + arsip `excluded_candidates`; properti `expected_regression` diabaikan total), **UAS XLSX 12-sheet** (`Kandidat` + `Sumber`), dan **legacy XLSX/CSV** 7 alternatif. Validasi ketat menolak harga di luar `Rp9.000.000–Rp11.000.000`, angka non-finit/negatif, kode duplikat, dan sumber kosong.
- `src/lib/repositories/local-repository.ts` & `src/lib/repositories/supabase-repository.ts`: kompatibel mundur penuh untuk dataset v1 (`battery_hours`) & v2 (`battery_wh`), mengurutkan kode alternatif secara natural (`A1`–`A42`), dan menyimpan `excludedCandidates` serta `weightSensitivity`.
- `src/app/api/admin/alternatives/import/route.ts` & `scripts/import-research.ts`: impor **idempotent** berdasarkan SHA-256 berkas sehingga pengulangan impor tidak pernah menggandakan 33 responden maupun dataset.

### 3.3 Mathematical Engine AHP–SAW & Sensitivitas (`src/lib/decision/*`)
- **Pure TypeScript** (`ALGORITHM_VERSION = "ahp-saw-v2.0.0"`, `RESEARCH_AUDIT_DATE = "2026-11-26"`), tanpa dependensi React/DB/HTTP.
- **AHP (`ahp.ts`):** matriks 6×6 resiprokal, parser pecahan eksak 9 skala (`1/9..9`), principal eigenvector via power iteration (`maxAbsDelta < 1e-12`), `RI = 1,24`, ambang `CR ≤ 0,10` tanpa pembulatan, agregasi AIJ (`exp(mean(log(a_ij)))`).
- **SAW (`saw.ts`, `criteria.ts`):** normalisasi `min/x` (`C1`, `C5`) dan `x/max` (`C2`, `C3`, `C4`, `C6`), memilih `batteryWh` atau `batteryHours` berdasarkan `c6Metric` versi dataset tanpa konversi spekulatif, presisi penuh (`tie tolerance 1e-12`).
- **Sensitivitas Bobot 37 Skenario (`sensitivity.ts`):**
  - Rumus: `w'_k = w_k(1 + δ)` dan `w'_j = w_j(1 - w'_k)/(1 - w_k)` untuk `j ≠ k`, validasi `w'_i > 0` dan `∑ w'_i = 1`, matriks `X` dan `R` tetap.
  - Fungsi: `rebalanceWeightsOneAtATime`, `runWeightSensitivityScenario`, `runWeightSensitivitySuite` (1 baseline + 36 variasi `-20%, -10%, -5%, +5%, +10%, +20%`), dan `buildDecisionEvaluation` (analisis peringkat #1 vs #2, peringkat terbawah, alasan kontribusi, dan batasan praktis).
- **API & Ekspor:**
  - Endpoint baru terautentikasi `GET/POST /api/admin/sensitivity` (mendukung simulasi delta kustom `-50%..+50%` secara *read-only* tanpa mengubah bobot AHP maupun snapshot publik).
  - `src/lib/publication/sanitize.ts`: menyertakan `weightSensitivity`, `c6Metric`, `c6Unit`, `c6Definition`, dan daftar merek pada snapshot publik sambil tetap memblokir total data individual responden.
  - `src/lib/export/excel.ts`: ditingkatkan menjadi **8 sheet XLSX** (`Ringkasan`, `Bobot AHP`, `Matriks AIJ`, `Alternatif & Sumber`, `Normalisasi SAW`, `Kontribusi & Ranking`, `Sensitivitas Bobot 37`, dan `Sensitivitas`).

### 3.4 Pembaruan Antarmuka Publik & Dashboard Admin
Seluruh halaman mempertahankan sistem desain **Nordic Slate & Deep Navy Ink** (`#FFFFFF`, `#F8FAFC`, `#1E293B`, `#475569`, `#1E3A5F`, `#EFF4FA`), responsif mobile 360px, `tabular-nums`, format `id-ID`, dan nol gambar produk rekaan:
- **Publik:** `/` (Beranda), `/rekomendasi` (filter merek/RAM/SSD/harga tanpa mengubah peringkat global + panel Evaluasi Hasil Keputusan), `/laptop` (katalog 33 unit 8 merek), `/laptop/[code]` (detail spesifikasi, Wh, sumber & kontribusi), `/bandingkan`, `/metodologi` (skala AHP 9 tingkat lengkap, catatan konsultasi dosen, explorer sensitivitas 37 skenario interaktif), `/tentang`.
- **Admin:** `/admin` (ringkasan versi dataset, 33 alt, 33/17/16, status publikasi), `/admin/kriteria` (definisi 6 kriteria dinamis + tabel Skala Pembobotan AHP Lengkap), `/admin/alternatif` (impor `.json/.xlsx/.csv`, filter merek/pencarian, arsip lipat 9 kandidat dikeluarkan, drawer CRUD sadar C6), `/admin/perhitungan/ahp`, `/admin/perhitungan/saw` (matriks `X`, `R`, kontribusi `w × r`, grafik Top-12/Semua-33, evaluasi hasil), `/admin/perhitungan/sensitivitas` (**halaman baru** dengan matriks interaktif 6×6, indikator `Total = 1,00000000`, simulator delta kustom, perbandingan peringkat seluruh 33 alternatif), `/admin/riwayat`, `/admin/laporan` (manifest ekspor 8 sheet).

---

## 4. Batasan Penelitian & Kejujuran Akademik

1. **Snapshot Audit 26 November 2026:** Harga dan spesifikasi merupakan penawaran terdokumentasi pada tanggal audit (sebagian bersumber dari indeks/arsip). Stok aktual dan harga checkout akhir belum seluruhnya dikonfirmasi.
2. **Status Publikasi `Provisional`:** Publikasi tidak pernah ditandai `final` secara otomatis; verifikasi akhir bukti harga/SKU menjadi tanggung jawab peneliti.
3. **Kapasitas Baterai (`Wh`) sebagai Proksi:** Kapasitas `Wh` digunakan sebagai indikator pendekatan daya tahan dengan asumsi konsumsi daya setara. Aplikasi tidak mengklaim kapasitas `Wh` yang lebih besar pasti menghasilkan durasi baterai aktual yang lebih lama.
4. **Faktor di Luar Model:** Sistem operasi bawaan, GPU diskrit, kualitas layar/panel, garansi resmi, ergonomi keyboard, ketersediaan stok real-time, dan efisiensi termal/daya tidak masuk perhitungan skor SAW.
5. **Panel Kuesioner:** Menggunakan 33 responden mahasiswa non-probabilitas (17 konsisten `CR ≤ 0,10`) tanpa wawancara tambahan berdasarkan hasil konsultasi kelompok dengan dosen pengampu; tidak ada klaim wawancara atau UAT yang tidak dilakukan.

---

## 5. Panduan Migrasi Produksi, Deployment & Rollback (MENUNGGU PERSETUJUAN)

> **PERINGATAN:** Seluruh langkah di bawah ini **BELUM DIJALANKAN** terhadap Supabase production maupun Vercel. Jalankan hanya setelah persetujuan eksplisit pemilik proyek.

### Tahap A — Backup Database Produksi Sebelum Migrasi
1. Buka Supabase Dashboard proyek produksi (`bdjazyjkavqguwgjiqjw`) → **Database → Backups** atau jalankan `pg_dump` terenkripsi dari terminal lokal:
   ```bash
   pg_dump "$SUPABASE_DB_URL" --format=custom --file="backup_pre_uas_33_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. Simpan ekspor JSON/CSV tabel `alternative_datasets`, `alternatives`, `saw_runs`, dan `publications` sebagai arsip tambahan.

### Tahap B — Eksekusi Migration Non-Destruktif di Supabase
1. Buka **Supabase SQL Editor** (atau gunakan Supabase CLI `supabase db push` setelah verifikasi di cabang staging) dan jalankan seluruh isi berkas:
   - `supabase/migrations/202611260001_uas_33_alternatives_and_sensitivity.sql`
2. Verifikasi pasca-migration bahwa dataset historis v1 masih utuh dan memiliki `c6_metric = 'battery_hours'` serta `c6_unit = 'jam'`:
   ```sql
   SELECT id, version, label, status, c6_metric, c6_unit, candidate_count
   FROM public.alternative_datasets
   ORDER BY version;
   ```

### Tahap C — Impor Dataset 33 Alternatif ke Produksi (Idempotent)
1. Pastikan `.env.local` mengarah ke Supabase produksi (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
2. Jalankan perintah CLI idempotent berikut (otomatis mendeteksi batch 33 responden eksisting tanpa duplikasi, mengimpor dataset v2 33 alternatif dari JSON, menghitung ulang AHP + SAW + 37 skenario sensitivitas di server, dan menerbitkan snapshot baru berstatus `provisional` dengan tetap menyimpan riwayat publikasi v1):
   ```bash
   npm run import:research -- --survey "research/private/DATA RESPON KUESIONER AHP — SPK KELOMPOK 13 (1)!(1).xlsx" --laptops "research/private/LaptopMatch_Dataset_33_Regression.json" --observed-at 2026-11-26 --publish-provisional
   ```
3. Verifikasi tabel Supabase:
   - `response_batches` tetap 1 batch, `survey_responses` tetap 33 baris (tidak ganda).
   - `alternative_datasets` memiliki 2 versi (v1: 7 alt `jam`, v2: 33 alt `Wh` + 9 `excluded_candidates`).
   - `publications` memiliki publikasi historis v1 (`is_current = false`) dan publikasi UAS v2 (`is_current = true`, `status = 'provisional'`).

### Tahap D — Push Repository & Deploy Vercel
1. Pastikan `git status` bersih dari berkas privat (`.env.local` dan `research/private/*` tidak ikut ter-commit).
2. Commit perubahan revisi UAS dan push ke branch `main`:
   ```bash
   git add -A
   git commit -m "feat(uas): revisi dataset 33 alternatif lintas merek, C6 Wh, dan sensitivitas 37 skenario"
   git push origin main
   ```
3. Vercel otomatis membangun dan men-deploy ke `https://finalprojectspk.vercel.app/`.

### Tahap E — Verifikasi Pasca-Deploy Produksi
1. Buka `https://finalprojectspk.vercel.app/` dan pastikan tampil **33 alternatif**, **8 merek**, **CR 0,001274**, **C6 Wh**, dan peringkat #1 **A33 TECNO Megabook T1 14 (`0,834354`)**.
2. Uji `/api/public/recommendation` tidak mengandung properti `survey_responses`, `raw_answers`, atau email/identitas responden.
3. Login ke `/admin`, verifikasi halaman `/admin/perhitungan/sensitivitas` menampilkan 37 skenario (`A33` 31/36, `A29` 5/36) dan unduhan XLSX menghasilkan 8 sheet.
4. Pastikan `/admin/riwayat` tetap menampilkan histori dataset v1 (7 alternatif) dan v2 (33 alternatif).

### Tahap F — Prosedur Rollback (Jika Diperlukan)
1. **Rollback publikasi cepat (tanpa mengubah skema):** melalui `/admin/riwayat`, aktifkan kembali snapshot publikasi historis v1 (7 alternatif) atau jalankan query SQL untuk mengembalikan `is_current = true` pada publikasi v1.
2. **Rollback skema & data UAS penuh:**
   - Hapus publikasi/run/dataset v2 (opsional) lalu jalankan `supabase/migrations/202611260001_rollback_uas_33_alternatives.sql`.
   - Rollback deployment Vercel ke commit `04eebff` dari menu **Deployments → Instant Rollback**.
