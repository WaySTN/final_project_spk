# Dokumentasi Pengujian & Hasil Verifikasi Aktual — LaptopMatch

Dokumen ini mencatat seluruh pengujian yang benar-benar dijalankan terhadap kode sumber LaptopMatch beserta hasil aktualnya per 25 November 2026.

---

## 1. Ringkasan Eksekusi Pengujian

| Jenis Pengujian | Perintah | Hasil Aktual | Catatan |
|---|---|---|---|
| TypeScript Strict Check | `npm run typecheck` | **LULUS (0 error)** | `strict: true`, `noUncheckedIndexedAccess: true` |
| Static Analysis (ESLint) | `npm run lint` | **LULUS (0 error, 0 warning)** | `eslint-config-next/core-web-vitals` + `typescript` |
| Unit & Regression Tests (Vitest) | `npm run test` | **LULUS (25/25 test, 6 file)** | Termasuk regresi penuh terhadap 2 berkas Excel asli |
| Production Build (Next.js 16) | `npm run build` | **LULUS (31 rute, 0 warning)** | Turbopack build + static/dynamic verification |
| CLI Research Importer | `npm run import:research` | **LULUS** | Diuji pada berkas asli ke target uji lokal terisolasi |
| End-to-End Acceptance (Playwright) | `npm run test:e2e` | **LULUS (3/3 suite, E01–E12)** | Desktop 1280px & mobile 360px pada server `next start` |

---

## 2. Verifikasi Numerik Regresi Terhadap Workbook Excel Penelitian

Berkas uji: [`tests/integration/research-regression.test.ts`](../tests/integration/research-regression.test.ts)  
Sumber input: berkas mentah asli di `research/private/` (dihitung dinamis, **bukan konstanta**).

| Metrik | Target PRD / Audit Revisi | Hasil Engine Aktual | Toleransi | Status |
|---|---|---|---|---|
| Total / Eligible Responden | 33 / 33 | 33 / 33 | Eksak | Lulus |
| Konsisten (CR ≤ 0,10) / Tidak Lolos | 17 / 16 | 17 / 16 | Eksak | Lulus |
| λmaks Gabungan (17 konsisten) | 6,00790181 | 6,00790181 | ± 1e-7 | Lulus |
| CI Gabungan (17 konsisten) | 0,00158036 | 0,00158036 | ± 1e-7 | Lulus |
| CR Gabungan (17 konsisten) | 0,00127449 | 0,00127449 | ± 1e-7 | Lulus |
| CR Gabungan (33 respons) | 0,01233169 | 0,01233169 | ± 1e-7 | Lulus |
| Bobot C1–C6 (S1) | 21,32% / 19,14% / 18,20% / 13,07% / 11,33% / 16,94% | Identik hingga ± 1e-7 | ± 1e-7 | Lulus |
| S1 Rank #1 — A7 | 0,953349 | 0,953349 | ± 1e-6 | Lulus |
| S1 Rank #2 — A6 | 0,953327 | 0,953327 | ± 1e-6 | Lulus |
| Selisih A7 vs A6 | ~0,00002198 | 0,00002198 | ± 1e-7 | Lulus |
| S1 Rank #3–#7 (A2, A1, A4, A3, A5) | 0,887581 / 0,853643 / 0,800615 / 0,798297 / 0,780012 | Identik dalam ± 1e-6 | ± 1e-6 | Lulus |
| S2 Rank #1 (33 respons, 7 alt) | A6 — 0,963921 | A6 — 0,963921 | ± 1e-6 | Lulus |
| S3 Rank #1 (17 konsisten, 5 alt) | A2 — 0,979739 | A2 — 0,979739 | ± 1e-6 | Lulus |

---

## 3. Matriks Skenario Acceptance E2E (PRD §12.3)

Berkas uji: [`tests/e2e/full-workflow.spec.ts`](../tests/e2e/full-workflow.spec.ts)

- **E01 (Keamanan anonim):** Seluruh 6 endpoint `/api/admin/*` mengembalikan HTTP `401`; akses `/admin` mengarah ke `/admin/login`; nol kebocoran teks respons.
- **E02 (Login & Logout):** Kata sandi salah menampilkan pesan generik; login valid membuka `/admin`; logout membersihkan sesi dan memblokir `/admin`.
- **E03 (Impor XLSX asli & duplikat):** 33 baris R01–R33 diimpor sesuai urutan asli; unggah ulang berkas sama terdeteksi sebagai duplikat SHA-256.
- **E04 (Berkas rusak/header salah):** CSV dengan header tidak dikenal menampilkan status gagal validasi dan menonaktifkan tombol commit.
- **E05 (Komputasi AHP & SAW):** S1 (`CR 0,00127449`, `A7 0,953349`), S2 (`CR 0,01233169`, `A6 0,963921`), S3 (`A2 0,979739`) terhitung dan tersimpan di server.
- **E06 (Immutability dataset):** Dataset v1 otomatis berstatus `sealed` setelah SAW; penggandaan membuat draft v2 baru tanpa mengubah histori v1.
- **E07 (Publikasi provisional & sanitasi publik):** Halaman publik menampilkan banner bersyarat dan A7 `#1`; `/api/public/recommendation` terverifikasi bebas dari saran responden, nama prodi per baris, maupun cap waktu mentah.
- **E08 (Pemblokiran publikasi final):** Percobaan publikasi `final` sebelum checklist verifikasi manusia ditolak dengan daftar syarat belum terpenuhi.
- **E09 (Ekspor Excel):** Unduh `/api/admin/export/[runId]` menghasilkan arsip `.xlsx` valid (`PK\x03\x04`) berisi 7 sheet audit.
- **E10 (Responsif 360px & desktop):** Seluruh 7 rute utama diuji pada lebar viewport `360px` dengan `scrollWidth - innerWidth <= 2px`.
- **E11 (Filter tampilan publik):** Filter RAM = 8 GB pada `/rekomendasi` menyembunyikan A7 & A6 namun tetap mempertahankan peringkat global `#3` dan skor `0,887581` milik A2.
- **E12 (Empty state sebelum publikasi):** Sebelum publikasi aktif, `/` dan `/rekomendasi` menampilkan *empty state* jujur tanpa skor baseline hardcode.

---

## 4. Verifikasi Live Supabase Production & Cakupan Tersisa

- **Migrasi SQL, RLS & Impor Data Asli pada Supabase Cloud (`bdjazyjkavqguwgjiqjw.supabase.co`):** **LULUS TERVERIFIKASI LIVE**
  - 3 migrasi SQL (`0001`, `0002`, `0003`) berhasil diterapkan; 6 kriteria `C1`–`C6` ter-seed; 1 akun `admin` aktif pada `public.profiles`.
  - `npm run import:research --publish-provisional` berhasil mengimpor 33/33 respons asli, 7 alternatif audit revisi (28 tautan sumber), menghitung AHP 17 (`CR = 0,00127449`) & AHP 33 (`CR = 0,01233169`), SAW S1 (`A7 0,953349` vs `A6 0,953327`), S2 (`A6 0,963921`), S3 (`A2 0,979739`), serta menerbitkan snapshot `provisional`.
  - Pengujian klien anonim (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) mengonfirmasi `survey_responses`, `response_batches`, `ahp_runs`, `ahp_individual_results`, `alternatives`, dan `profiles` 100% terblokir RLS (0 baris bocor), sementara `current_public_publication` hanya mengembalikan snapshot ter-sanitasi tanpa kebocoran data mentah responden.
- **Deployment Vercel live URL:** Build produksi Next.js lulus lokal dan kode sudah di-push ke `https://github.com/WaySTN/final_project_spk.git` (`main`); deployment Vercel menunggu impor proyek oleh pemilik di dashboard Vercel.
