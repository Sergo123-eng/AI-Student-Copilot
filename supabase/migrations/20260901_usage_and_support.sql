-- Server-side fair-use counters and support request archive.
-- Browser clients have no access; the Vercel server uses the service-role key.
create table if not exists public.usage_counters (
  student_id uuid not null references public.students(id) on delete cascade,
  period_start date not null,
  plan text not null check (plan in ('day', 'plus', 'pro', 'super', 'free', 'admin')),
  usage_type text not null check (usage_type in ('guidance', 'reference', 'practice', 'analogy', 'email')),
  used integer not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (student_id, period_start, plan, usage_type)
);

create or replace function public.consume_student_usage(
  p_student_id uuid,
  p_period_start date,
  p_plan text,
  p_usage_type text,
  p_limit integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  resulting_used integer;
begin
  if p_limit < 1 then return false; end if;
  insert into public.usage_counters (student_id, period_start, plan, usage_type, used)
  values (p_student_id, p_period_start, p_plan, p_usage_type, 1)
  on conflict (student_id, period_start, plan, usage_type)
  do update set used = public.usage_counters.used + 1, updated_at = now()
  where public.usage_counters.used < p_limit
  returning used into resulting_used;
  return found;
end;
$$;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 320),
  message text not null check (char_length(message) between 20 and 2000),
  created_at timestamptz not null default now()
);

alter table public.usage_counters enable row level security;
alter table public.support_requests enable row level security;
revoke all on public.usage_counters, public.support_requests from anon, authenticated;
revoke all on function public.consume_student_usage(uuid, date, text, text, integer) from anon, authenticated;
