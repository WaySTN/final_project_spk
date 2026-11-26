-- ============================================================================
-- ROLLBACK SCRIPT for 202611260001_uas_33_alternatives_and_sensitivity.sql
-- WARNING: Execute ONLY if reverting UAS 33-alternative migration BEFORE
-- any battery_wh-only alternatives or primary_33_consistent SAW runs are retained.
-- Historical 7-alternative Lenovo datasets & publications remain untouched.
-- ============================================================================

-- Step 1: Restore previous active publication if a 33-alt snapshot was published
-- (Run manually after inspecting `select id, status, is_current, published_at from public.publications order by published_at desc;`)
-- update public.publications set is_current = false, status = 'archived' where is_current = true;
-- update public.publications set is_current = true, status = 'provisional' where id = '<PREVIOUS_7_ALT_PUBLICATION_ID>';

-- Step 2: Restore criteria C6 reference text to 25 Nov 2026 baseline
update public.criteria
set
  name = 'Daya tahan baterai',
  short_name = 'Baterai',
  unit = 'jam',
  definition = 'Estimasi maksimum durasi pemutaran video lokal 1080p pada kecerahan layar 150 nit berdasarkan dokumentasi resmi Lenovo PSREF.',
  measurement_source = 'Lenovo PSREF tingkat seri dan kapasitas baterai (Wh hanya disimpan sebagai metadata tambahan).',
  notes = 'Bukan kapasitas Wh, bukan MobileMark, dan bukan klaim durasi pemakaian kuliah aktual sehari-hari.'
where code = 'C6';

-- Step 3: Remove optional columns ONLY if no 33-alt rows depend on them
-- (Uncomment below only after removing 33-alt draft/runs from staging)
-- alter table public.saw_runs drop column if exists weight_sensitivity;
-- alter table public.saw_runs drop column if exists c6_unit;
-- alter table public.saw_runs drop column if exists c6_metric;
-- alter table public.alternatives drop constraint if exists alternatives_battery_metric_present_check;
-- alter table public.alternatives drop column if exists selection_reason;
-- alter table public.alternatives drop column if exists source_status_recorded;
-- alter table public.alternatives drop column if exists source_date_recorded;
-- alter table public.alternative_datasets drop column if exists excluded_candidates;
-- alter table public.alternative_datasets drop column if exists candidate_count;
-- alter table public.alternative_datasets drop column if exists c6_definition;
-- alter table public.alternative_datasets drop column if exists c6_unit;
-- alter table public.alternative_datasets drop column if exists c6_metric;
