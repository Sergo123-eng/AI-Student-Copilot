-- StudentSpark national university-source registry.
-- This stores public institutional sources only.  It must never contain
-- transcripts, student-portal data, student IDs, or other education records.

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  ipeds_unitid text unique,
  name text not null,
  state_code text,
  official_domain text not null unique,
  official_website_url text not null,
  source_status text not null default 'pending'
    check (source_status in ('pending', 'verified', 'needs_review', 'unavailable')),
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.university_sources (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  source_type text not null check (source_type in (
    'catalog', 'course_catalog', 'academic_calendar', 'registrar',
    'financial_aid', 'degree_requirements', 'counseling', 'other'
  )),
  title text not null,
  canonical_url text not null,
  catalog_year text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'possibly_outdated', 'not_verified', 'retired')),
  last_checked_at timestamptz,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, canonical_url)
);

create table if not exists public.university_source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.university_sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) <= 12000),
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);

create index if not exists university_sources_institution_type_idx
  on public.university_sources (institution_id, source_type, verification_status);
create index if not exists university_source_chunks_source_idx
  on public.university_source_chunks (source_id, chunk_index);

alter table public.institutions enable row level security;
alter table public.university_sources enable row level security;
alter table public.university_source_chunks enable row level security;

revoke all on table public.institutions, public.university_sources,
  public.university_source_chunks from anon, authenticated;
