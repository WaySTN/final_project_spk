-- ============================================================================
-- LaptopMatch SPK AHP–SAW — Explicit Role Table & Function Grants
-- Required on newer Supabase projects where SQL Editor tables do not receive
-- implicit default privileges for anon, authenticated, and service_role.
-- Security remains enforced by Row Level Security (RLS) on all 13 tables.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Public (anon) only receives SELECT on read-only criteria and sanitized current publication
grant select on public.criteria to anon, authenticated;
grant select on public.publications to anon, authenticated;
grant select on public.current_public_publication to anon, authenticated;

-- Authenticated users receive table privileges constrained strictly by RLS (is_admin())
grant select on public.profiles to authenticated;
grant select, insert, update, delete on
  public.response_batches,
  public.survey_responses,
  public.alternative_datasets,
  public.alternatives,
  public.alternative_sources,
  public.ahp_runs,
  public.ahp_individual_results,
  public.saw_runs,
  public.saw_results,
  public.publications,
  public.audit_logs
to authenticated;

-- Service role (server CLI scripts only) receives full privileges on public tables
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Harden publish_snapshot_atomic to check auth.role() instead of SECURITY DEFINER current_user
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
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
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

-- Function execution grants
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.publish_snapshot_atomic(
  uuid, jsonb, jsonb, text, uuid, text, jsonb
) to authenticated, service_role;
