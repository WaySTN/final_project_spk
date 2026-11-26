-- ============================================================================
-- LaptopMatch SPK AHP–SAW — UAS Revision Migration (33 Alternatives, C6 Wh,
-- 37-Scenario Weight Sensitivity & Excluded Candidate Audit Archive)
-- Safe, non-destructive, backwards-compatible with historical 7-alt dataset.
-- ============================================================================

-- 1. Extend alternative_datasets with per-version C6 metric metadata & excluded archive
alter table public.alternative_datasets
  add column if not exists c6_metric text not null default 'battery_hours'
    check (c6_metric in ('battery_hours', 'battery_wh')),
  add column if not exists c6_unit text not null default 'jam',
  add column if not exists c6_definition text not null default '',
  add column if not exists candidate_count integer check (candidate_count is null or candidate_count >= 0),
  add column if not exists excluded_candidates jsonb not null default '[]'::jsonb;

-- Ensure historical datasets remain explicitly annotated as battery_hours / jam
update public.alternative_datasets
set c6_definition = 'Estimasi maksimum durasi pemutaran video lokal 1080p pada 150 nit (Lenovo PSREF).'
where c6_metric = 'battery_hours'
  and c6_definition = '';

-- 2. Make alternatives.battery_hours nullable so Wh-based datasets NEVER fabricate hours,
--    while enforcing that at least one valid positive battery metric exists per row.
alter table public.alternatives
  alter column battery_hours drop not null;

alter table public.alternatives
  drop constraint if exists alternatives_battery_hours_check;

alter table public.alternatives
  add constraint alternatives_battery_hours_check
    check (battery_hours is null or battery_hours > 0);

alter table public.alternatives
  drop constraint if exists alternatives_battery_metric_present_check;

alter table public.alternatives
  add constraint alternatives_battery_metric_present_check
    check (battery_hours is not null or battery_wh is not null);

alter table public.alternatives
  add column if not exists source_date_recorded text not null default '',
  add column if not exists source_status_recorded text not null default '',
  add column if not exists selection_reason text not null default '';

-- 3. Extend saw_runs for 33-alternative UAS scenarios, C6 unit tracking, and weight sensitivity
alter table public.saw_runs
  drop constraint if exists saw_runs_scenario_check;

alter table public.saw_runs
  add constraint saw_runs_scenario_check
    check (
      scenario in (
        'primary_33_consistent',
        'sensitivity_33_all',
        'primary_7_consistent',
        'sensitivity_7_all',
        'sensitivity_5_no_a6_a7',
        'custom'
      )
    );

alter table public.saw_runs
  add column if not exists c6_metric text not null default 'battery_hours'
    check (c6_metric in ('battery_hours', 'battery_wh')),
  add column if not exists c6_unit text not null default 'jam',
  add column if not exists weight_sensitivity jsonb;

-- 4. Update read-only criteria reference table to reflect latest UAS operational definitions
--    (Historical datasets & runs retain their own c6_metric/c6_unit metadata.)
update public.criteria
set
  measurement_source = 'Penawaran ritel terpilih pada snapshot audit 26 November 2026 (bukan harga real-time dan tidak termasuk ongkos kirim).'
where code = 'C1';

update public.criteria
set
  measurement_source = 'PassMark Software (cpubenchmark.net) skor model prosesor pada audit 26 November 2026 (bukan uji unit laptop).'
where code = 'C2';

update public.criteria
set
  measurement_source = 'Spesifikasi resmi pabrikan / dokumentasi penjual sesuai konfigurasi SKU lintas merek.'
where code = 'C3';

update public.criteria
set
  measurement_source = 'Spesifikasi resmi pabrikan / dokumentasi penjual sesuai konfigurasi SKU (1 TB dicatat sebagai 1.000 GB desimal pada A41).',
  notes = 'Pada dataset revisi 33 alternatif, kapasitas SSD bervariasi (256 GB, 512 GB, dan 1.000 GB).'
where code = 'C4';

update public.criteria
set
  measurement_source = 'Publikasi spesifikasi resmi pabrikan / listing SKU (sebagian merupakan berat mulai / starting weight).'
where code = 'C5';

update public.criteria
set
  name = 'Kapasitas baterai',
  short_name = 'Baterai',
  unit = 'Wh',
  definition = 'Kapasitas energi baterai (Watt-hour / Wh) yang digunakan sebagai indikator pendekatan (proksi) daya tahan baterai. Dengan asumsi konsumsi daya setara, kapasitas lebih besar berpotensi memberi durasi penggunaan lebih panjang.',
  measurement_source = 'Spesifikasi resmi pabrikan / dokumentasi SKU (audit 26 November 2026).',
  notes = 'Proksi kapasitas Wh bukan jaminan durasi penggunaan aktual; bobot C6 tetap berasal dari preferensi daya tahan baterai pada kuesioner awal. Dataset historis 7 alternatif tetap memakai satuan jam (Lenovo PSREF).'
where code = 'C6';
