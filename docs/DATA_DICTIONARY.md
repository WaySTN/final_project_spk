# Kamus Data (Data Dictionary) — LaptopMatch

Seluruh tabel berada pada skema `public` PostgreSQL (Supabase) dengan Row Level Security (RLS) aktif pada 100% tabel. Waktu disimpan dalam UTC (`timestamptz`) dan diformat ke `Asia/Jakarta` (WIB) di antarmuka.

| Tabel | Akses Publik | Akses Admin | Keterangan Utama |
|---|---|---|---|
| `profiles` | Tidak | Baca sendiri / admin | Menghubungkan `auth.users` dengan `role` (`admin`/`viewer`). Dilindungi trigger anti-eskalasi role. |
| `criteria` | Baca (read-only) | Baca | 6 kriteria tetap (`C1`–`C6`), atribut `cost`/`benefit`, satuan, definisi, dan referensi. |
| `response_batches` | Tidak | Penuh | Metadata impor kuesioner (nama berkas, `sha256` unik anti-duplikasi, jumlah baris, `parent_batch_id`). |
| `survey_responses` | Tidak | Penuh | Respons asli per baris (`R01`..`Rn`), `raw_timestamp`, `submitted_at`, jawaban asli (`raw_answers`), hasil parse (`parsed_answers`), status validasi, dan `audit_flags`. |
| `alternative_datasets` | Tidak | Penuh | Versi dataset laptop (`draft` atau `sealed`), tanggal observasi (`observed_at`), dan hash berkas sumber. |
| `alternatives` | Tidak | Penuh | Konfigurasi laptop dalam dataset (kode unik per dataset, model/SKU, prosesor, 6 nilai kriteria dengan check constraint, `battery_wh` opsional, penjual, `stock_status`, `evidence_status`, `battery_protocol`). Dilindungi trigger immutability saat dataset `sealed`. |
| `alternative_sources` | Tidak | Penuh | 4 jenis tautan bukti per alternatif (`price`, `spec`, `benchmark`, `battery`), `url` tervalidasi `http/https`, `observed_at`, `evidence_level` (`sku`/`series`/`listing`). |
| `ahp_runs` | Tidak | Penuh | Hasil immutable perhitungan AHP kelompok (`mode`, `aggregate_matrix`, `weights`, `lambda_max`, `ci`, `ri`, `cr`, `passes_cr`, `included_ids`, `excluded_ids`, `warnings`). |
| `ahp_individual_results` | Tidak | Penuh | Audit matriks 6×6, bobot, `lambda_max`, `ci`, `cr`, `passes_cr`, flag `is_all_equal` & `near_zero_cr_flag`, dan alasan eksklusi per responden. |
| `saw_runs` | Tidak | Penuh | Hasil immutable perhitungan SAW (`ahp_run_id`, `dataset_id`, `scenario`, `input_snapshot`, `normalization_extrema`, `top_margin`, `warnings`, `caveats`). |
| `saw_results` | Tidak | Penuh | Nilai `criteria_values`, `normalized_values`, `weighted_values`, `score` (`double precision`), `rank`, dan `is_tied` per alternatif. |
| `publications` | Hanya baris `is_current = true` (`provisional`/`final`) | Penuh | Snapshot publik ter-sanitasi (`public_payload` tanpa data mentah responden), `status`, `quality_review`, dan partial unique index agar hanya satu publikasi aktif. |
| `audit_logs` | Tidak | Penuh | Jejak aktivitas admin (tanpa menyimpan respons mentah atau kredensial). |
