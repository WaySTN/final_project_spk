# Laporan Hasil Pengujian Aktual — Revisi UAS LaptopMatch (33 Alternatif)

**Tanggal Pengujian:** 26 November 2026  
**Target Aplikasi:** LaptopMatch (Next.js 16.4.6 + TypeScript Strict + Vitest + Playwright + Pure TS AHP–SAW Engine `ahp-saw-v2.0.0`)  
**Sumber Acuan Regresi:** `research/private/LaptopMatch_Dataset_33_Regression.json` & `research/private/SPK_Kelompok_13_AHP_SAW_Terintegrasi_33_Alternatif.xlsx` (12 sheet)  
**Prinsip Pelaporan:** Seluruh status di bawah ini mencerminkan eksekusi aktual (`PASS` / `FAIL` / `NOT RUN`), termasuk verifikasi langsung pada database Supabase produksi pasca-persetujuan pengguna.

---

## 1. Ringkasan Perintah Verifikasi Utama

| Perintah | Hasil Aktual | Ringkasan Output |
|---|---|---|
| `npm run typecheck` | **PASS** | `tsc --noEmit` exit code `0` (0 error) |
| `npm run lint` | **PASS** | ESLint Next.js + React Hooks exit code `0` (0 error, 0 warning) |
| `npm run test` | **PASS** | Vitest `8 test files passed (8)`, `31 tests passed (31)` |
| `npm run build` | **PASS** | `next build` (Turbopack) exit code `0`, 30 route statis & dinamis terkompilasi bersih |
| `npm run test:e2e` | **PASS** | Playwright Chromium `3 passed (11.4s)` (mencakup alur penuh E01–E12 + responsif mobile 360px) |
| CLI `scripts/import-research.ts` (v1 + v2 + re-import v2) | **PASS** | `batches=1, responses=33, datasets=2, sawRuns=7, publications=1` (idempotent SHA-256) |

---

## 2. Daftar Rinci Pengujian Regresi & Fungsional (19 Butir Evaluasi UAS)

| No | Area Pengujian | Metode / Lokasi Uji | Hasil Aktual | Status |
|---|---|---|---|---|
| 1 | Parsing skala pecahan AHP (`1/9..9`) tanpa `eval`/`parseInt` pecahan | `tests/unit/ahp.test.ts` | Seluruh 9 skala (termasuk `1/3`, `1/5`, `1/7`, `1/9`) terurai eksak; token ilegal ditolak | **PASS** |
| 2 | Matriks 6×6 resiprokal, principal eigenvector (power iteration `< 1e-12`), `λmax`, `CI`, `RI=1,24`, `CR` | `tests/unit/ahp.test.ts` & `tests/integration/uas-33-regression.test.ts` | 33 responden → 17 lolos (`CR ≤ 0,10`), 16 ditolak; `λmax = 6,00790181`, `CI = 0,00158036`, `CR = 0,001274485166245` (`≤ 1e-7` terhadap acuan) | **PASS** |
| 3 | Kecocokan 6 bobot AHP & 36 elemen matriks AIJ terhadap acuan regresi | `tests/integration/uas-33-regression.test.ts` | Seluruh 6 bobot (`0,2131920910`; `0,1914098539`; `0,1819934435`; `0,1306806817`; `0,1133225420`; `0,1694013878`) & 36 sel AIJ cocok dalam toleransi `1e-7` | **PASS** |
| 4 | Paritas impor JSON 33 alternatif vs Workbook XLSX 12-sheet | `tests/integration/uas-33-regression.test.ts` | Kedua parser menghasilkan 33 alternatif identik, 8 merek, 9 `excluded_candidates`, dan mengabaikan `expected_regression` | **PASS** |
| 5 | Acuan normalisasi `min/max` C1–C6 pada 33 alternatif | `tests/integration/uas-33-regression.test.ts` | `C1 min = 9.199.000`, `C2 max = 22.722`, `C3 max = 16`, `C4 max = 1.000`, `C5 min = 0,999`, `C6 max = 75 Wh` | **PASS** |
| 6 | Regresi penuh 198 nilai normalisasi `R`, 198 kontribusi `w × r`, 33 skor & ranking SAW | `tests/integration/uas-33-regression.test.ts` | `#1 A33 (0,834353526965)`, `#2 A29 (0,830313719942)`, `#3 A28 (0,821223072022)`, `#33 A11 (0,601887518692)`; seluruh 33 skor & 396 nilai sel cocok `≤ 1e-7` | **PASS** |
| 7 | Regresi penuh 37 skenario sensitivitas bobot (`1 baseline + 36 variasi`, total bobot = 1) | `tests/unit/sensitivity.test.ts` & `tests/integration/uas-33-regression.test.ts` | 37 × 33 skor & ranking cocok `≤ 1e-7`; total bobot = `1,00000000` di setiap skenario; `A33` menang `31/36 (86,11%)`, `A29` menang `5/36` (`C1 -20%`, `C2 +10%`, `C2 +20%`, `C6 -20%`, `C6 -10%`) | **PASS** |
| 8 | Kompatibilitas histori dataset v1 (7 alternatif Lenovo, C6 `jam`, #1 `A7`) | `tests/integration/research-regression.test.ts` | Seluruh skenario historis (`primary_7_consistent`, `sensitivity_7_all`, `sensitivity_5_no_a6_a7`) tetap cocok `≤ 1e-7` tanpa perubahan satuan `jam` | **PASS** |
| 9 | Dynamic recalculation (ubah harga pada dataset draft, bandingkan rumus independen, histori tak berubah) | `tests/integration/uas-33-regression.test.ts` & `tests/e2e/full-workflow.spec.ts` | Perubahan harga pada draft v2 menghitung ulang min/max, `R`, skor & ranking secara dinamis sesuai kalkulasi independen; dataset v1 tersegel & snapshot historis tetap utuh | **PASS** |
| 10 | Penolakan input tidak valid (harga `< Rp9.000.000` / `> Rp11.000.000`, angka negatif/NaN, kode duplikat) | `tests/unit/import-validation.test.ts` & `tests/e2e/full-workflow.spec.ts` | Impor & CRUD menolak tegas input di luar batas harga/tidak valid dengan pesan galat Bahasa Indonesia yang jelas | **PASS** |
| 11 | Idempotensi impor (tidak menggandakan 33 responden maupun dataset dengan SHA-256 identik) | `tests/integration/uas-33-regression.test.ts`, `tests/e2e/full-workflow.spec.ts`, & CLI `import-research.ts` | Re-impor berkas sama terdeteksi lewat SHA-256: `batches=1`, `responses=33`, `datasets=2` (v1 + v2) tanpa duplikasi | **PASS** |
| 12 | Proteksi autentikasi & otorisasi `/admin/*` dan `/api/admin/*` | `tests/e2e/full-workflow.spec.ts` (E01) | Akses `/admin` tanpa sesi dialihkan ke `/admin/login`; `GET /api/admin/sensitivity`, `/api/admin/alternatives`, dll. mengembalikan HTTP `401` | **PASS** |
| 13 | Sanitasi API publik & larangan kebocoran respons mentah/PII | `tests/integration/publication-and-export.test.ts` & `tests/e2e/full-workflow.spec.ts` (E12) | `/api/public/recommendation` bebas dari `survey_responses`, `raw_answers`, email, nama, dan saran responden; `excluded_candidates` tidak pernah masuk ranking utama | **PASS** |
| 14 | Filter publik (merek, RAM, SSD, rentang harga) tidak mengubah peringkat global SAW | `tests/e2e/full-workflow.spec.ts` (E11) | Filter merek (`Axioo`, `Lenovo`, dll.) hanya menyaring tampilan; peringkat global `#2 A29` dan `#3 A28` tetap dipertahankan | **PASS** |
| 15 | Eksplorasi sensitivitas interaktif & simulasi delta kustom read-only | `tests/e2e/full-workflow.spec.ts` (E06b) | Klik `C2 +20%` mengubah pemenang simulasi ke `A29` dengan `Total = 1,00000000`; simulasi `POST /api/admin/sensitivity` tidak menimpa bobot AHP atau publikasi | **PASS** |
| 16 | Gate publikasi (`provisional` diperbolehkan; `final` diblokir sebelum verifikasi lengkap) | `tests/e2e/full-workflow.spec.ts` (E08–E09) | Publikasi `final` ditolak (`400`) jika ada item belum terverifikasi; publikasi `provisional` berhasil dan tampil pada situs publik | **PASS** |
| 17 | Ekspor laporan workbook Excel 8 sheet | `tests/integration/publication-and-export.test.ts` & `tests/e2e/full-workflow.spec.ts` (E10) | File `.xlsx` valid berisi 8 sheet lengkap (`Ringkasan`, `Bobot AHP`, `Matriks AIJ`, `Alternatif & Sumber`, `Normalisasi SAW`, `Kontribusi & Ranking`, `Sensitivitas Bobot 37`, `Sensitivitas`) | **PASS** |
| 18 | Responsivitas mobile (viewport `360×800`) tanpa horizontal overflow halaman | `tests/e2e/full-workflow.spec.ts` | Seluruh 8 rute utama (`/`, `/rekomendasi`, `/laptop`, `/laptop/A33`, `/bandingkan`, `/metodologi`, `/tentang`, `/admin/login`) lolos uji overflow `≤ 2px` | **PASS** |
| 19 | Eksekusi migrasi SQL `202611260001`, impor idempotent v2 & verifikasi RLS langsung pada database Supabase produksi | Supabase Production (`bdjazyjkavqguwgjiqjw`) | Migration `Success`; backup pre-import tersimpan; impor idempotent (`response_batches=1`, `survey_responses=33`, `alternative_datasets=2` [v1 `jam` + v2 `Wh`], `alternatives=40`, `publications=2` [v1 `archived`, v2 `provisional` aktif 37 skenario]); kunci anon diblokir RLS (`42501`) pada `response_batches`, `survey_responses`, dan `audit_logs` | **PASS** |

---

## 3. Rincian 8 Berkas Uji Vitest (`31/31 PASS`)

1. `tests/unit/pairs.test.ts` — Parser 9 skala pecahan AHP (`1/9..9`) tanpa `eval`/`parseInt`, validasi 15 header Google Forms, dan penolakan token ilegal.
2. `tests/unit/saw.test.ts` — Normalisasi cost/benefit, kontribusi berbobot, tie tolerance `1e-12`, batas harga inklusif Rp9–11 juta, dan re-normalisasi subset.
3. `tests/unit/ahp.test.ts` — Matriks 6×6 resiprokal, konvergensi eigenvector power iteration (`< 1e-12`), CI/CR (`RI = 1,24`), dan agregasi geometrik AIJ.
4. `tests/unit/sensitivity.test.ts` — Rebalancing bobot `w'_k` & `w'_j`, validasi `∑ w = 1`, suite 37 skenario, dan pelacakan perubahan pemenang.
5. `tests/unit/import-validation.test.ts` — Validasi keamanan unggahan (anti-macro/corrupt zip/formula injection), batas harga Rp9–11 juta, dan skema draft alternatif.
6. `tests/integration/research-regression.test.ts` — Regresi penuh dataset historis v1 (7 alternatif Lenovo, C6 jam, skenario S1–S3).
7. `tests/integration/publication-and-export.test.ts` — Persistensi lokal & penyegelan dataset, gerbang publikasi `final`, sanitasi snapshot publik (zero raw response leak), dan validasi workbook ekspor 8 sheet.
8. `tests/integration/uas-33-regression.test.ts` — Regresi penuh UAS v2 (paritas JSON vs XLSX 12-sheet, 33 responden, 33 alternatif, 37 skenario sensitivitas `≤ 1e-7`, dan dynamic recalculation draft v2 dengan v1 immutable).

---

## 4. Bukti Visual Hasil Pengujian

Tangkapan layar hasil pengujian aktual tersimpan pada [17-bukti-hasil-pengujian.png](file:///c:/laragon/www/final_project_spk/docs/uas-evidence/17-bukti-hasil-pengujian.png).
