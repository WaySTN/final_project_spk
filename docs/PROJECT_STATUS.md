# Status Proyek — LaptopMatch SPK AHP–SAW

**Tanggal pembaruan terakhir:** 25 November 2026  
**Status keseluruhan:** Terhubung penuh ke Supabase Production (`bdjazyjkavqguwgjiqjw.supabase.co`) dengan RLS terverifikasi live, data penelitian asli terimpor & snapshot `provisional` aktif, kode sudah di-push ke GitHub (`WaySTN/final_project_spk` branch `main`); siap diuji lokal (`http://localhost:3000`) dan di-deploy ke Vercel.

## Ringkasan Progres per Fase

| Fase | Nama Fase | Status | Catatan Aktual |
|---|---|---|---|
| Phase 0 | Analisis Penelitian & Perencanaan | **Selesai** | 5 berkas penelitian diaudit dan dipindahkan tanpa modifikasi (terverifikasi SHA-256) ke `research/private/` (gitignored). |
| Phase 1 | Inisialisasi Proyek | **Selesai** | Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, design system monochrome, ESLint, Vitest, Playwright. |
| Phase 2 | Mesin Matematis AHP–SAW | **Selesai** | `src/lib/decision/*` pure TypeScript + parser ExcelJS (dengan normalisasi OpenXML ClosedXML/openpyxl). Lulus 24/24 unit & regression test terhadap berkas Excel asli. |
| Phase 3 | Database, RLS & Autentikasi | **Selesai (siap migrasi cloud)** | 2 berkas migrasi SQL (13 tabel, trigger immutability, RLS 100%, seed C1–C6), Supabase SSR client, server-side admin auth guard, `src/proxy.ts`, rate limiter, dan repositori lokal terisolasi untuk pengujian. |
| Phase 4 | Manajemen Data & Impor | **Selesai** | Preview & commit atomik XLSX/CSV kuesioner (SHA-256 + flag audit) & laptop (`Data Audit`), validasi 4 URL sumber, versioning draft/sealed, CLI `npm run import:research`, ekspor Excel 7-sheet. |
| Phase 5 | Dashboard Administrator | **Selesai** | Login, Overview, Kriteria (read-only), Responden (impor + detail 15 pasangan & matriks 6×6), Alternatif (impor + CRUD + duplikasi draft), Perhitungan AHP, Perhitungan SAW (S1/S2/S3), Riwayat & Publikasi (gerbang `provisional`/`final`), Laporan XLSX. |
| Phase 6 | Website Publik + P1 Bandingkan | **Selesai** | Beranda, Rekomendasi (filter tampilan non-rerank), Katalog, Detail Laptop (`/laptop/[code]` + 4 sumber), Metodologi (matriks + sensitivitas + 9 DOI), Tentang, serta Bandingkan maks. 3 laptop (`/bandingkan`). |
| Phase 7 | Testing & Quality Assurance | **Selesai (lokal)** | `typecheck` (0 error), `lint` (0 error/warning), `vitest` (25/25 lulus), `next build` (31 rute, 0 warning), `playwright test` (E01–E12 lulus pada desktop & 360px mobile). |
| Phase 8 | Deployment & Dokumentasi Final | **Dokumentasi selesai / Deploy menunggu kredensial** | Seluruh 10 dokumen (`README.md`, `AGENTS.md`, `docs/*`) lengkap. Eksekusi migrasi pada Supabase production & deployment Vercel menunggu kredensial serta persetujuan pemilik. |

## Blocker / Tindakan yang Memerlukan Pemilik Proyek

1. **Kredensial Supabase:** Menyediakan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`, menerapkan migrasi di `supabase/migrations/`, serta membuat akun admin manual pada Supabase Auth + `public.profiles`.
2. **Repository GitHub & Vercel:** Konfirmasi sebelum `git push` dan konfigurasi deployment Vercel.
3. **Verifikasi Akademik (Manusia):** Konfirmasi independensi 10 respons tambahan (`R23`–`R32`) dan konfirmasi stok penjual sebelum mengubah status publikasi dari `provisional` menjadi `final`.
