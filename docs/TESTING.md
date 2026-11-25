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

## 4. Cakupan yang Belum Diverifikasi Secara Live (Terbatas Kredensial Eksternal)

- **Eksekusi migrasi SQL & RLS pada proyek Supabase cloud aktif:** Skema SQL, trigger immutability, fungsi `publish_snapshot_atomic`, dan kebijakan RLS telah ditulis lengkap di `supabase/migrations/`, namun belum dijalankan terhadap instance Supabase cloud karena kredensial proyek Supabase production belum disediakan.
- **Deployment Vercel live URL:** Build produksi Next.js telah lulus lokal; deployment publik ke GitHub/Vercel belum dilakukan sesuai aturan menunggu persetujuan dan kredensial pemilik proyek.
