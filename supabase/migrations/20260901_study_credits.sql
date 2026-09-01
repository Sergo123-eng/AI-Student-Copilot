-- One-time Study Credit packs. The transaction lock prevents concurrent browser
-- requests from spending the same balance twice.
create or replace function public.consume_student_topup_credits(
  p_student_id uuid,
  p_credits integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  available integer;
begin
  if p_credits <= 0 then return false; end if;
  perform pg_advisory_xact_lock(hashtext(p_student_id::text));
  select coalesce(sum(credits), 0) into available
  from public.credit_ledger
  where student_id = p_student_id
    and (expires_at is null or expires_at > now());
  if available < p_credits then return false; end if;
  insert into public.credit_ledger (student_id, credits, kind, model_class)
  values (p_student_id, -p_credits, 'usage', 'standard');
  return true;
end;
$$;

revoke all on function public.consume_student_topup_credits(uuid, integer) from public;
