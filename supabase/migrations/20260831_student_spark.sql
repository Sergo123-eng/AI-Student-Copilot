-- StudentSpark Copilot: server-managed membership, credit, memory, and answer-cache data.
-- No browser client receives direct table permissions. The Vercel server uses a private
-- service-role key; the public anon/authenticated roles are denied by default.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email) and email ~* '^[^@\\s]+@[^@\\s]+\\.edu$'),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plan text not null check (plan in ('free', 'day', 'monthly', 'annual', 'admin')),
  status text not null check (status in ('active', 'canceled', 'expired', 'past_due')),
  stripe_subscription_id text unique,
  stripe_checkout_session_id text unique,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  credits integer not null check (credits <> 0),
  kind text not null check (kind in ('monthly_allowance', 'annual_allowance', 'day_pass', 'top_up', 'promo', 'admin', 'usage', 'adjustment')),
  model_class text check (model_class in ('basic', 'standard', 'premium')),
  stripe_payment_id text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_student_created_idx
  on public.credit_ledger (student_id, created_at desc);

create table if not exists public.private_memories (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  memory_key text not null check (char_length(memory_key) <= 80),
  memory_value text not null check (char_length(memory_value) <= 1000),
  consented_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, memory_key)
);

create table if not exists public.shared_answers (
  id uuid primary key default gen_random_uuid(),
  question_key text not null unique check (char_length(question_key) = 64),
  question_preview text not null check (char_length(question_preview) <= 500),
  category text not null check (category in ('academic', 'study', 'campus_information', 'financial_aid', 'career')),
  answer_json jsonb not null,
  sources_json jsonb not null default '[]'::jsonb,
  prompt_version text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shared_answers_expiry_idx on public.shared_answers (expires_at);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (char_length(code_hash) = 64),
  plan text not null check (plan in ('day', 'monthly', 'annual')),
  credits integer not null check (credits > 0),
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (promotion_id, student_id)
);

-- Defense in depth: only the Vercel server (using its private service-role key)
-- can access these tables. There are intentionally no browser-facing policies.
alter table public.students enable row level security;
alter table public.memberships enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.private_memories enable row level security;
alter table public.shared_answers enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_redemptions enable row level security;

revoke all on table public.students, public.memberships, public.credit_ledger,
  public.private_memories, public.shared_answers, public.promotions,
  public.promotion_redemptions from anon, authenticated;
