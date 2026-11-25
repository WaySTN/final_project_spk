-- ============================================================================
-- LaptopMatch SPK AHP–SAW — Row Level Security (RLS) & Criteria Seed
-- ============================================================================

-- Enable RLS across ALL tables (default deny)
alter table public.profiles enable row level security;
alter table public.criteria enable row level security;
alter table public.response_batches enable row level security;
alter table public.survey_responses enable row level security;
alter table public.alternative_datasets enable row level security;
alter table public.alternatives enable row level security;
alter table public.alternative_sources enable row level security;
alter table public.ahp_runs enable row level security;
alter table public.ahp_individual_results enable row level security;
alter table public.saw_runs enable row level security;
alter table public.saw_results enable row level security;
alter table public.publications enable row level security;
alter table public.audit_logs enable row level security;

-- 1. profiles: users may read their own profile; only admins can view all
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

-- 2. criteria: public read-only (no insert/update/delete policies)
drop policy if exists "criteria_public_read" on public.criteria;
create policy "criteria_public_read"
  on public.criteria for select
  to anon, authenticated
  using (true);

-- 3. Admin-only research tables (STRICT: zero anonymous or non-admin access)
drop policy if exists "response_batches_admin_all" on public.response_batches;
create policy "response_batches_admin_all"
  on public.response_batches for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "survey_responses_admin_all" on public.survey_responses;
create policy "survey_responses_admin_all"
  on public.survey_responses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "alternative_datasets_admin_all" on public.alternative_datasets;
create policy "alternative_datasets_admin_all"
  on public.alternative_datasets for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "alternatives_admin_all" on public.alternatives;
create policy "alternatives_admin_all"
  on public.alternatives for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "alternative_sources_admin_all" on public.alternative_sources;
create policy "alternative_sources_admin_all"
  on public.alternative_sources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "ahp_runs_admin_all" on public.ahp_runs;
create policy "ahp_runs_admin_all"
  on public.ahp_runs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "ahp_individual_results_admin_all" on public.ahp_individual_results;
create policy "ahp_individual_results_admin_all"
  on public.ahp_individual_results for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "saw_runs_admin_all" on public.saw_runs;
create policy "saw_runs_admin_all"
  on public.saw_runs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "saw_results_admin_all" on public.saw_results;
create policy "saw_results_admin_all"
  on public.saw_results for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "audit_logs_admin_all" on public.audit_logs;
create policy "audit_logs_admin_all"
  on public.audit_logs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. publications: public can read ONLY the current active sanitized snapshot
drop policy if exists "publications_public_current_read" on public.publications;
create policy "publications_public_current_read"
  on public.publications for select
  to anon, authenticated
  using (is_current = true and status in ('provisional', 'final'));

drop policy if exists "publications_admin_all" on public.publications;
create policy "publications_admin_all"
  on public.publications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sanitized public view (hides internal review metadata and admin IDs)
create or replace view public.current_public_publication
with (security_invoker = true) as
select
  id,
  status,
  published_at,
  caveats,
  public_payload
from public.publications
where is_current = true
  and status in ('provisional', 'final');

grant select on public.current_public_publication to anon, authenticated;

-- ============================================================================
-- Seed 6 Fixed Research Criteria (C1–C6)
-- ============================================================================

insert into public.criteria (
  code, name, short_name, ordinal, attribute, unit, definition, measurement_source, notes, references_json
)
values
  (
    'C1',
    'Harga laptop',
    'Harga',
    1,
    'cost',
    'Rupiah (IDR)',
    'Harga penawaran ritel laptop dalam rentang anggaran penelitian Rp9.000.000–Rp11.000.000 inklusif. Semakin rendah harga, semakin menguntungkan.',
    'Penawaran ritel terpilih pada snapshot audit 25 November 2026 (bukan harga real-time).',
    'Satu penawaran dicatat per konfigurasi SKU; bukan klaim harga termurah seluruh pasar.',
    '["ardhana-indriyanti-2025","mukharir-wardoyo-2021","ardiansyah-2025"]'::jsonb
  ),
  (
    'C2',
    'Performa prosesor',
    'Prosesor',
    2,
    'benefit',
    'PassMark CPU Mark',
    'Skor benchmark sintetis PassMark CPU Mark untuk mengukur kemampuan komputasi prosesor secara objektif.',
    'PassMark Software (cpubenchmark.net) pada tanggal audit 25 November 2026.',
    'Benchmark standar lintas prosesor Intel dan AMD.',
    '["ardhana-indriyanti-2025","mukharir-wardoyo-2021"]'::jsonb
  ),
  (
    'C3',
    'Kapasitas RAM',
    'RAM',
    3,
    'benefit',
    'GB',
    'Kapasitas memori RAM terpasang bawaan pabrikan pada konfigurasi SKU yang ditawarkan.',
    'Spesifikasi resmi Lenovo PSREF / dokumentasi penjual sesuai kode SKU.',
    'Menggunakan RAM bawaan terpasang, bukan kapasitas maksimum upgrade.',
    '["ardhana-indriyanti-2025","ardiansyah-2025"]'::jsonb
  ),
  (
    'C4',
    'Kapasitas SSD',
    'SSD',
    4,
    'benefit',
    'GB',
    'Kapasitas penyimpanan Solid State Drive (SSD) terpasang bawaan pada konfigurasi SKU.',
    'Spesifikasi resmi Lenovo PSREF / dokumentasi penjual sesuai kode SKU.',
    'Seluruh 7 alternatif baseline memiliki SSD 512 GB (normalisasi konstan 1,000000); tetap dipertahankan demi konsistensi instrumen.',
    '["ardhana-indriyanti-2025","ardiansyah-2025"]'::jsonb
  ),
  (
    'C5',
    'Berat laptop',
    'Berat',
    5,
    'cost',
    'kg',
    'Bobot fisik laptop sesuai publikasi resmi pabrikan untuk mendukung mobilitas mahasiswa.',
    'Dokumentasi Lenovo PSREF (sebagian merupakan berat mulai / starting weight).',
    'Bukan hasil penimbangan aktual unit fisik oleh peneliti.',
    '["ardhana-indriyanti-2025"]'::jsonb
  ),
  (
    'C6',
    'Daya tahan baterai',
    'Baterai',
    6,
    'benefit',
    'jam',
    'Estimasi maksimum durasi pemutaran video lokal 1080p pada kecerahan layar 150 nit berdasarkan dokumentasi resmi Lenovo PSREF.',
    'Lenovo PSREF tingkat seri dan kapasitas baterai (Wh hanya disimpan sebagai metadata tambahan).',
    'Bukan kapasitas Wh, bukan MobileMark, dan bukan klaim durasi pemakaian kuliah aktual sehari-hari.',
    '["ardhana-indriyanti-2025"]'::jsonb
  )
on conflict (code) do nothing;
