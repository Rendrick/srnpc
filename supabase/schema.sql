-- Esquema do Supabase para o app NPS.
-- Cenário atual: admin funciona sem Auth (telas públicas), e
-- respondentes podem inserir apenas em pesquisas com status = 'published'.

-- Sugestão: execute este script via Supabase SQL Editor.

-- =========
-- Tabela: surveys
-- =========
create table if not exists public.surveys (
  id text primary key,
  slug text not null unique,
  name text not null,
  sector text not null default '',
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

create index if not exists surveys_status_idx on public.surveys (status);

-- =========
-- Tabela: survey_responses
-- =========
create table if not exists public.survey_responses (
  id text primary key,
  survey_id text not null references public.surveys (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  date date not null
);

create index if not exists survey_responses_survey_id_idx on public.survey_responses (survey_id);
create index if not exists survey_responses_date_idx on public.survey_responses (date);

-- =========
-- RLS
-- =========
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

-- Em modo "mixed" (sem Auth no app por enquanto), liberamos RW completo para anon.
-- Isso permite que as telas de admin funcionem sem login.
drop policy if exists surveys_anon_rw on public.surveys;
create policy surveys_anon_rw
on public.surveys
for all
to anon
using (true)
with check (true);

-- survey_responses: respondentes podem inserir apenas se survey_id pertencer a uma survey publicada.
drop policy if exists survey_responses_select_anon on public.survey_responses;
create policy survey_responses_select_anon
on public.survey_responses
for select
to anon
using (true);

drop policy if exists survey_responses_insert_published_anon on public.survey_responses;
create policy survey_responses_insert_published_anon
on public.survey_responses
for insert
to anon
with check (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_id
      and s.status = 'published'
  )
);

-- Delete: necessário para o cascade funcionar quando admin remover uma survey.
drop policy if exists survey_responses_delete_anon on public.survey_responses;
create policy survey_responses_delete_anon
on public.survey_responses
for delete
to anon
using (true);

