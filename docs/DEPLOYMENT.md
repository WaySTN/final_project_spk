# Panduan Deployment & Checklist Presentasi Dosen — LaptopMatch

Dokumen ini menjelaskan langkah persiapan production pada **Supabase** dan **Vercel**, serta panduan demo presentasi kepada dosen pengampu mata kuliah Sistem Pendukung Keputusan.

---

## 1. Persiapan Supabase Production

1. Buat proyek baru di [Supabase](https://supabase.com/) (pilih region terdekat, mis. `ap-southeast-1` Singapore).
2. Buka **SQL Editor** dan jalankan tiga migrasi secara berurutan:
   - [`supabase/migrations/202611250001_initial_schema.sql`](../supabase/migrations/202611250001_initial_schema.sql)
   - [`supabase/migrations/202611250002_rls_and_seed.sql`](../supabase/migrations/202611250002_rls_and_seed.sql)
   - [`supabase/migrations/202611250003_table_grants.sql`](../supabase/migrations/202611250003_table_grants.sql)
   *(Atau gunakan Supabase CLI: `supabase link --project-ref <REF>` lalu `supabase db push`.)*
3. Verifikasi bahwa **Row Level Security (RLS)** aktif pada seluruh 13 tabel dan 6 baris `criteria` (`C1`–`C6`) telah ter-seed.
4. Matikan pendaftaran akun publik jika tidak diperlukan di **Authentication → Providers → Email**.
5. Buat akun peneliti/admin di **Authentication → Users → Add User**, lalu jalankan SQL berikut di SQL Editor:
   ```sql
   insert into public.profiles (id, email, full_name, role)
   values ('<UUID_USER_BARU>', 'peneliti@upnjatim.ac.id', 'Kelompok 13 SPK', 'admin')
   on conflict (id) do update set role = 'admin', full_name = excluded.full_name;
   ```
6. Catat `Project URL` dan `anon / publishable key` dari **Project Settings → API**.

---

## 2. Deployment ke Vercel via GitHub

1. Pastikan berkas privat dan kredensial **tidak** ter-commit ke Git:
   ```bash
   git status
   ```
   Pastikan folder `research/private/` dan `.env.local` tidak muncul di daftar untracked/staged.
2. Push repositori ke GitHub (hanya setelah disetujui pemilik proyek).
3. Impor repositori ke **Vercel**, pilih framework **Next.js**.
4. Tambahkan Environment Variables di **Vercel → Settings → Environment Variables** (untuk Production & Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = URL proyek Supabase Anda
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Kunci anon/publishable Supabase Anda
   - `NEXT_PUBLIC_APP_URL` = URL production Vercel Anda (mis. `https://laptopmatch-spk.vercel.app`)
   - **JANGAN** menambahkan `LAPTOPMATCH_LOCAL_STORE_PATH` di Vercel.
   - **JANGAN** menaruh `SUPABASE_SERVICE_ROLE_KEY` pada variabel berawalan `NEXT_PUBLIC_`.
5. Jalankan deploy dan tunggu build Next.js selesai.

---

## 3. Verifikasi Pasca-Deployment (Wajib Sebelum Demo)

- [ ] Akses `/` sebelum publikasi → menampilkan *empty state* jujur (tanpa skor statis).
- [ ] Akses `/api/admin/overview` tanpa login → mengembalikan HTTP `401`.
- [ ] Login di `/admin/login` dengan akun admin Supabase yang telah dibuat.
- [ ] Impor `DATA RESPON KUESIONER AHP` di `/admin/responden` → verifikasi 33/33 eligible, 17 lolos CR, 16 tidak lolos.
- [ ] Impor `SPK_Kelompok_13_Audit_SAW_Revisi.xlsx` di `/admin/alternatif` → verifikasi 7 alternatif & 4 URL sumber masing-masing.
- [ ] Hitung AHP (`consistent_only` → CR `0,00127449` dan `all_eligible` → CR `0,01233169`) di `/admin/perhitungan/ahp`.
- [ ] Hitung SAW S1 (`A7 #1 = 0,953349`, `A6 #2 = 0,953327`), S2 (`A6 #1 = 0,963921`), dan S3 (`A2 #1 = 0,979739`) di `/admin/perhitungan/saw`.
- [ ] Uji gerbang `final` di `/admin/riwayat` → terblokir bila checklist belum lengkap.
- [ ] Publikasikan S1 berstatus `provisional` → verifikasi `/` dan `/rekomendasi` menampilkan banner bersyarat, dan `/api/public/recommendation` bebas dari data mentah responden.
- [ ] Unduh laporan `.xlsx` di `/admin/laporan` dan bandingkan angkanya dengan workbook penelitian.

---

## 4. Urutan Demo Presentasi kepada Dosen (PRD §14)

1. **Beranda (`/`)**: Tunjukkan judul penelitian, batasan anggaran Rp9–11 juta, statistik panel, dan disclaimer.
2. **Rekomendasi & Detail (`/rekomendasi` → `/laptop/A7`)**: Tunjukkan A7 (#1, `0,953349`) vs A6 (#2, `0,953327`) yang terpaut sangat tipis (`0,000022`), dekomposisi kontribusi 6 kriteria, serta 4 tautan sumber asli.
3. **Login Admin & Impor Kuesioner (`/admin/responden`)**: Tunjukkan preview berkas Google Forms, proteksi SHA-256, dan audit 17/33 beserta flag kualitas (tanpa menyembunyikan respons tidak konsisten).
4. **Inspeksi Matriks Individual & Kelompok (`/admin/perhitungan/ahp`)**: Buka matriks 6×6 individual salah satu responden, lalu tunjukkan matriks gabungan AIJ, bobot eigen (`21,32%`, `19,14%`, `18,20%`, `13,07%`, `11,33%`, `16,94%`), dan `CR = 0,00127449`.
5. **Data Laptop & Sumber (`/admin/alternatif`)**: Tunjukkan dataset `sealed` immutable dan cara menduplikasi ke `draft` untuk uji perubahan harga.
6. **Transparansi SAW & Sensitivitas (`/admin/perhitungan/saw`)**: Tunjukkan matriks X, nilai min/max ekstrem, matriks normalisasi R, kontribusi berbobot, lalu tunjukkan pergeseran pemenang pada S2 (`A6`) dan S3 5 alternatif (`A2`).
7. **Publikasi & Ekspor (`/admin/riwayat`, `/admin/laporan`)**: Tunjukkan pemblokiran status `final` sebelum verifikasi manusia, status `provisional` yang jujur, dan unduh workbook `.xlsx` 7-sheet untuk dicocokkan langsung dengan Excel penelitian.

---

## 5. Rencana Rollback

- Sebelum mempublikasikan snapshot baru, unduh laporan `.xlsx` dari run aktif sebagai arsip.
- Publikasi lama tidak pernah dihapus melainkan diberi status `archived`. Bila perlu kembali ke snapshot sebelumnya, pilih run SAW sebelumnya pada `/admin/riwayat` dan publikasikan ulang (pengalihan `is_current` berjalan atomik via `publish_snapshot_atomic`).
