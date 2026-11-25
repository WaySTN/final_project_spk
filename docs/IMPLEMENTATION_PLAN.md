# Rencana Implementasi — LaptopMatch SPK AHP–SAW

Dokumen ini merinci hasil analisis dokumen penelitian (Phase 0), resolusi perbedaan sumber, peta jalan implementasi (Phase 0–8), serta kriteria penerimaan (*acceptance criteria*).

## 1. Sumber Data Penelitian dan Prioritas

Seluruh berkas asli disimpan tanpa modifikasi di `research/private/` (diabaikan Git):

| Berkas | Fungsi | Prioritas |
|---|---|---|
| `PRD_LaptopMatch_SPK_Kelompok_13.md` | Kontrak kebutuhan teknis, rute, skema, API, UI, dan target uji | Kontrak utama implementasi |
| `DATA RESPON KUESIONER AHP — SPK KELOMPOK 13 (1)!(1).xlsx` | Data mentah Google Forms (`Jawaban Formulir 1`, A1:U34) | Sumber utama perhitungan AHP |
| `SPK_Kelompok_13_Audit_SAW_Revisi.xlsx` | Data alternatif terbaru (`Data Audit`), `Bobot`, `SAW 7`, `SAW 5`, `Catatan` | Sumber utama data laptop & target SAW |
| `SPK_Kelompok_13_AHP_SAW_Riset.xlsx` | Audit CR per responden (R01–R33), matriks AHP gabungan, data riset awal | Referensi audit AHP |
| `Laporan_Final_Project_SPK_Kelompok_13.docx` | Metodologi BAB I–V, daftar pustaka DOI, Lampiran A–C | Acuan akademik & teks metodologi |

## 2. Temuan Konflik Antardokumen dan Keputusan Resolusi

1. **Nama berkas kuesioner aktual:** Berkas lokal bernama `DATA RESPON KUESIONER AHP — SPK KELOMPOK 13 (1)!(1).xlsx` (terdapat akhiran `(1)` tambahan dari proses unduh dibanding dokumentasi). Importer dan skrip CLI menerima argumen path berkas dan memvalidasi isi sheet `Jawaban Formulir 1`, bukan bergantung pada satu nama berkas kaku.
2. **Perbedaan harga dan penjual antara workbook Riset awal vs Audit Revisi:**
   - `A3`: Rp9.269.000 (Cahaya Surya Komputer) → **Rp9.650.000** (Plaza IT)
   - `A5`: Rp9.485.000 (Shopee) → **Rp9.899.000** (Notebook 88 / Blibli)
   - `A7`: Rp9.699.000 (Lenovo Authorized Bogor / Blibli) → **Rp9.466.080** (Mbizmarket)
   - `A2`: Penjual diperbarui dari `MDP Superstore / Blibli` ke `MDP` (`mdp.co.id`) dengan harga tetap Rp10.299.000.
   - **Resolusi:** Memprioritaskan `SPK_Kelompok_13_Audit_SAW_Revisi.xlsx` sesuai PRD & Master Instruction, sehingga peringkat utama menghasilkan A7 (#1, `0.953349`) unggul tipis `0.000022` atas A6 (#2, `0.953327`).
3. **Tahun rujukan Ardiansyah dkk.:** Sheet `Rujukan` di workbook Riset menuliskan `(2024)`, sedangkan Laporan & PRD menuliskan `(2025)` dengan DOI identik `10.47134/jtsi.v2i1.3398`. Mengikuti Laporan & PRD (`2025`).
4. **Anomali data responden untuk audit transparan:**
   - `R09` dan `R32` memilih `1 | Keduanya sama penting` di seluruh 15 pasangan (`CR = 0`). Sah secara matematis, tetap disimpan dan diberi tanda audit informatif.
   - `R23`–`R32` (10 baris tambahan) memiliki `CR ≈ 0` dan cap waktu Excel (`46351.4964`–`46351.7289`) yang lebih awal daripada `R20`–`R22` (`46351.7458`–`46351.7606`). Urutan baris asli R01–R33 dipertahankan (tidak diurutkan ulang menurut timestamp) dan diberi flag audit `needs_independence_review`.
5. **Keterbatasan stok & merek:** Semua 7 alternatif bermerek Lenovo dengan SSD 512 GB; A4, A6, A7 bertanda *withdrawn*; stok belum terkonfirmasi langsung. Publikasi baseline wajib bertipe `provisional`.

## 3. Peta Jalan Implementasi (Phase 0–8)

- [x] **Phase 0 — Analisis Penelitian & Perencanaan:** Ekstrak & audit 5 file, pindahkan file asli ke `research/private/`, buat `.gitignore`, `AGENTS.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATUS.md`, `docs/KNOWN_LIMITATIONS.md`.
- [x] **Phase 1 — Inisialisasi Proyek:** Next.js App Router, TypeScript strict, Tailwind CSS, komponen UI monochrome, Lucide React, Recharts, React Hook Form, Zod, ExcelJS, Papa Parse, Vitest, Playwright, ESLint, `.env.example`, design tokens monochrome.
- [x] **Phase 2 — Mesin Matematis AHP–SAW (`src/lib/decision/*`):** Definisi kriteria/pasangan, parser skala rasio, pembentuk matriks 6×6, power iteration eigenvector, CI/RI/CR, agregasi geometrik AIJ, normalisasi SAW, perhitungan kontribusi & ranking tie-safe, mesin skenario sensitivitas (S1/S2/S3), unit test & regression test terhadap berkas Excel asli.
- [x] **Phase 3 — Database, Migrasi, RLS & Autentikasi:** Migrasi SQL lengkap di `supabase/migrations/`, RLS pada seluruh tabel, autentikasi admin via Supabase Auth (`@supabase/ssr`), server-side admin guard, repositori data akses (Supabase + repositori lokal terisolasi untuk uji lokal).
- [x] **Phase 4 — Manajemen Data & Impor:** Parser & preview XLSX/CSV untuk kuesioner Google Forms (SHA-256, audit flag, validasi header/token) dan workbook laptop (`Data Audit`), validasi 4 URL sumber, CRUD draft alternatif, dataset sealing/versioning, skrip `npm run import:research`.
- [x] **Phase 5 — Dashboard Administrator (`/admin/*`):** Login, Overview, Kriteria (read-only), Responden (impor + preview + detail 15 pasangan & matriks 6×6), Alternatif (impor + CRUD + sumber), Perhitungan AHP (audit individual + matriks AIJ + sensitivitas 17 vs 33), Perhitungan SAW (X, min/max, R, kontribusi, ranking, S1/S2/S3), Riwayat immutable + publikasi (`provisional`/`final` gate), Laporan & ekspor XLSX multi-sheet.
- [x] **Phase 6 — Website Publik (`/` dll.):** Beranda, `/rekomendasi` (filter tampilan tanpa ubah rank global), `/laptop`, `/laptop/[code]` (breakdown kontribusi + 4 sumber), `/metodologi` (hierarki, matriks, sensitivitas, DOI, keterbatasan), `/tentang`, serta fitur P1 `/bandingkan` (maks 3 laptop).
- [x] **Phase 7 — Pengujian & QA:** Unit test, integration test, regression test Excel, Playwright E2E (E01–E12 termasuk responsif 360px & desktop), `typecheck`, `lint`, `build`.
- [ ] **Phase 8 — Deployment Production (Menunggu Kredensial):** Dokumentasi lengkap (`README.md`, `docs/DATA_DICTIONARY.md`, `docs/CALCULATION_METHOD.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`) telah selesai; penerapan migrasi pada proyek Supabase production dan deploy ke Vercel menunggu kredensial serta persetujuan pemilik.

## 4. Acceptance Criteria Numerik (Regression Targets)

Dihitung dari berkas mentah (bukan konstanta):
- Total / eligible responden: `33 / 33`; Lolos / tidak lolos CR ≤ 0,10: `17 / 16`.
- Matriks gabungan S1 (17 konsisten): `λmax = 6.00790181 (±1e-7)`, `CI = 0.00158036 (±1e-7)`, `CR = 0.00127449 (±1e-7)`.
- Bobot S1 (C1–C6): `0.21319209, 0.19140985, 0.18199344, 0.13068068, 0.11332254, 0.16940139 (±1e-7)`.
- CR gabungan S2 (33 respons): `0.01233169 (±1e-7)`.
- Ranking SAW S1 (7 alternatif, 17 konsisten, ±1e-6):
  1. A7 (`0.953349`)
  2. A6 (`0.953327`) — selisih ~`0.00002198`
  3. A2 (`0.887581`)
  4. A1 (`0.853643`)
  5. A4 (`0.800615`)
  6. A3 (`0.798297`)
  7. A5 (`0.780012`)
- Peringkat 1 S2 (7 alternatif, 33 respons): A6 (`0.963921 ±1e-6`).
- Peringkat 1 S3 (5 alternatif tanpa A6/A7, 17 konsisten): A2 (`0.979739 ±1e-6`).
