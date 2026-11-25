-- ============================================================================
-- LaptopMatch SPK AHP–SAW — Initial Database Schema
-- Kelompok 13, Program Studi Sistem Informasi, UPN "Veteran" Jawa Timur
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. User profiles & role authorization (admin provisioned by operator/service role)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent non-privileged users from escalating their own role
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'Perubahan role tidak diizinkan melalui klien.';
    end if;
    if tg_op = 'INSERT' and new.role <> 'viewer' then
      raise exception 'Role admin hanya dapat ditetapkan oleh operator server.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
  before insert or update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- Trusted admin check helper for RLS policies
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- 2. Fixed research criteria (C1-C6, read-only)
create table if not exists public.criteria (
  code text primary key check (code in ('C1', 'C2', 'C3', 'C4', 'C5', 'C6')),
  name text not null,
  short_name text not null,
  ordinal smallint not null unique check (ordinal between 1 and 6),
  attribute text not null check (attribute in ('cost', 'benefit')),
  unit text not null,
  definition text not null,
  measurement_source text not null,
  notes text not null default '',
  references_json jsonb not null default '[]'::jsonb
);

-- 3. Immutable respondent import batches
create table if not exists public.response_batches (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  sheet_name text not null default '',
  sha256 text not null unique,
  imported_by uuid references auth.users(id),
  imported_at timestamptz not null default now(),
  row_count integer not null check (row_count >= 0),
  eligible_count integer not null default 0 check (eligible_count >= 0),
  parent_batch_id uuid references public.response_batches(id),
  status text not null default 'active' check (status in ('active', 'superseded', 'archived')),
  notes text not null default ''
);

-- 4. Raw & parsed survey responses (ADMIN ONLY; never exposed to public)
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.response_batches(id) on delete restrict,
  row_no integer not null check (row_no >= 1),
  code text not null,
  raw_timestamp text not null default '',
  submitted_at timestamptz,
  consent boolean not null,
  active_student boolean not null,
  program_study text,
  use_case text not null default '',
  suggestion text,
  raw_answers jsonb not null,
  parsed_answers jsonb not null,
  validation_status text not null check (validation_status in ('eligible', 'ineligible_screening', 'invalid_answers')),
  validation_errors jsonb not null default '[]'::jsonb,
  audit_flags jsonb not null default '[]'::jsonb,
  unique (batch_id, row_no),
  unique (batch_id, code)
);

create index if not exists idx_survey_responses_batch on public.survey_responses(batch_id, row_no);

-- 5. Versioned laptop alternative datasets (draft -> sealed when used in SAW run)
create table if not exists public.alternative_datasets (
  id uuid primary key default gen_random_uuid(),
  version integer not null check (version >= 1),
  label text not null default '',
  source_filename text,
  source_hash text,
  observed_at date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'sealed')),
  notes text not null default ''
);

create index if not exists idx_alt_datasets_version on public.alternative_datasets(version desc);

-- 6. Laptop alternatives inside a dataset
create table if not exists public.alternatives (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references public.alternative_datasets(id) on delete restrict,
  code text not null,
  brand text not null,
  model text not null,
  sku text not null,
  cpu_name text not null,
  price_idr integer not null check (price_idr >= 9000000 and price_idr <= 11000000),
  cpu_mark double precision not null check (cpu_mark > 0),
  ram_gb double precision not null check (ram_gb > 0),
  ssd_gb double precision not null check (ssd_gb > 0),
  weight_kg double precision not null check (weight_kg > 0),
  battery_hours double precision not null check (battery_hours > 0),
  battery_wh double precision check (battery_wh is null or battery_wh > 0),
  seller text not null,
  active boolean not null default true,
  stock_status text not null check (
    stock_status in (
      'indexed_in_stock',
      'unconfirmed',
      'confirmation_required',
      'withdrawn_series',
      'confirmed_available',
      'unavailable'
    )
  ),
  evidence_status text not null check (
    evidence_status in ('provisional_unconfirmed', 'verified_by_researcher', 'incomplete')
  ),
  battery_protocol text not null,
  evidence_notes text not null default '',
  created_at timestamptz not null default now(),
  unique (dataset_id, code)
);

create index if not exists idx_alternatives_dataset on public.alternatives(dataset_id, code);

-- 7. Provenance sources per laptop (all 4 types required for eligibility)
create table if not exists public.alternative_sources (
  id uuid primary key default gen_random_uuid(),
  alternative_id uuid not null references public.alternatives(id) on delete cascade,
  source_type text not null check (source_type in ('price', 'spec', 'benchmark', 'battery')),
  url text not null check (url ~* '^https?://'),
  observed_at date not null,
  evidence_level text not null check (evidence_level in ('sku', 'series', 'listing')),
  notes text not null default '',
  unique (alternative_id, source_type)
);

create index if not exists idx_alt_sources_alt on public.alternative_sources(alternative_id);

-- Enforce immutability on sealed alternative datasets
create or replace function public.prevent_sealed_dataset_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dataset_id uuid;
  v_status text;
begin
  if tg_table_name = 'alternatives' then
    v_dataset_id := coalesce(new.dataset_id, old.dataset_id);
  elsif tg_table_name = 'alternative_sources' then
    select a.dataset_id into v_dataset_id
    from public.alternatives a
    where a.id = coalesce(new.alternative_id, old.alternative_id);
  end if;

  select d.status into v_status
  from public.alternative_datasets d
  where d.id = v_dataset_id;

  if v_status = 'sealed' then
    raise exception 'Dataset alternatif berstatus sealed tidak dapat diubah. Gandakan menjadi draft baru.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_alternatives_sealed_guard on public.alternatives;
create trigger trg_alternatives_sealed_guard
  before insert or update or delete on public.alternatives
  for each row execute function public.prevent_sealed_dataset_mutation();

drop trigger if exists trg_alternative_sources_sealed_guard on public.alternative_sources;
create trigger trg_alternative_sources_sealed_guard
  before insert or update or delete on public.alternative_sources
  for each row execute function public.prevent_sealed_dataset_mutation();

-- 8. Immutable AHP computation runs
create table if not exists public.ahp_runs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.response_batches(id) on delete restrict,
  mode text not null check (mode in ('consistent_only', 'all_eligible')),
  algorithm_version text not null,
  included_ids jsonb not null,
  excluded_ids jsonb not null,
  aggregate_matrix jsonb not null,
  weights jsonb not null,
  lambda_max double precision not null,
  ci double precision not null check (ci >= 0),
  ri double precision not null,
  cr double precision not null check (cr >= 0),
  passes_cr boolean not null,
  iterations integer not null,
  target_count integer not null default 12,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  status text not null default 'completed' check (status in ('completed', 'failed'))
);

create index if not exists idx_ahp_runs_batch on public.ahp_runs(batch_id, created_at desc);

-- 9. Per-respondent AHP audit trail (ADMIN ONLY)
create table if not exists public.ahp_individual_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ahp_runs(id) on delete cascade,
  response_id uuid not null references public.survey_responses(id) on delete restrict,
  matrix jsonb,
  weights jsonb,
  lambda_max double precision,
  ci double precision,
  ri double precision not null,
  cr double precision,
  passes_cr boolean not null,
  eligible boolean not null,
  is_all_equal boolean not null default false,
  near_zero_cr_flag boolean not null default false,
  included_in_mode boolean not null default false,
  reason text not null default '',
  unique (run_id, response_id)
);

create index if not exists idx_ahp_ind_run on public.ahp_individual_results(run_id);

-- 10. Immutable SAW computation runs
create table if not exists public.saw_runs (
  id uuid primary key default gen_random_uuid(),
  ahp_run_id uuid not null references public.ahp_runs(id) on delete restrict,
  dataset_id uuid not null references public.alternative_datasets(id) on delete restrict,
  scenario text not null check (
    scenario in ('primary_7_consistent', 'sensitivity_7_all', 'sensitivity_5_no_a6_a7', 'custom')
  ),
  algorithm_version text not null,
  input_snapshot jsonb not null,
  normalization_extrema jsonb not null,
  top_margin double precision,
  warnings jsonb not null default '[]'::jsonb,
  caveats jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  status text not null default 'completed' check (status in ('completed', 'failed'))
);

create index if not exists idx_saw_runs_created on public.saw_runs(created_at desc);

-- 11. Per-alternative SAW scores & contributions
create table if not exists public.saw_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.saw_runs(id) on delete cascade,
  alternative_id uuid not null references public.alternatives(id) on delete restrict,
  criteria_values jsonb not null,
  normalized_values jsonb not null,
  weighted_values jsonb not null,
  score double precision not null check (score > 0 and score <= 1.0000001),
  rank integer not null check (rank >= 1),
  is_tied boolean not null default false,
  unique (run_id, alternative_id)
);

create index if not exists idx_saw_results_run_rank on public.saw_results(run_id, rank asc);

-- 12. Published snapshots (sanitized public_payload; single active current snapshot)
create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  saw_run_id uuid not null references public.saw_runs(id) on delete restrict,
  sensitivity_run_ids jsonb not null default '[]'::jsonb,
  public_payload jsonb not null,
  status text not null check (status in ('provisional', 'final', 'archived')),
  is_current boolean not null default false,
  reviewed_by uuid references auth.users(id),
  published_at timestamptz not null default now(),
  caveats text not null default '',
  quality_review jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_publications_single_current
  on public.publications(is_current)
  where (is_current = true);

-- 13. Audit logs (no raw responses or secrets stored in metadata)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

-- Atomic publication switch RPC
create or replace function public.publish_snapshot_atomic(
  p_saw_run_id uuid,
  p_sensitivity_run_ids jsonb,
  p_public_payload jsonb,
  p_status text,
  p_reviewed_by uuid,
  p_caveats text,
  p_quality_review jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pub_id uuid;
begin
  if not public.is_admin() and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Akses ditolak: hanya administrator yang dapat mempublikasikan snapshot.';
  end if;

  if p_status not in ('provisional', 'final') then
    raise exception 'Status publikasi baru harus provisional atau final.';
  end if;

  update public.publications
  set is_current = false,
      status = case when status in ('provisional', 'final') then 'archived' else status end
  where is_current = true;

  insert into public.publications (
    saw_run_id,
    sensitivity_run_ids,
    public_payload,
    status,
    is_current,
    reviewed_by,
    caveats,
    quality_review
  )
  values (
    p_saw_run_id,
    p_sensitivity_run_ids,
    p_public_payload,
    p_status,
    true,
    p_reviewed_by,
    p_caveats,
    p_quality_review
  )
  returning id into v_pub_id;

  return v_pub_id;
end;
$$;
