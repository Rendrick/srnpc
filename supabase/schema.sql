-- Esquema do Supabase para o app NPS (multi-clínicas).
-- Cenário:
-- - Página pública (/p/:slug): anon pode ler surveys publicadas e inserir respostas.
-- - Área admin: usuários autenticados só podem ver/criar/editar/apagar surveys e respostas
--   vinculadas a clínicas às quais estão associados.
-- - Superadmin: tabela `superadmins`; CRUD de clínicas/membros pelo app (RLS + JWT). Edge Function só para Admin API (criar/apagar usuário Auth).
--
-- Sugestão: execute este script via Supabase SQL Editor.

-- =========
-- Tabela: clinics
-- =========
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Slug amigável para URLs (/clinicas/:slug, /p/:slug/:pesquisa). Ver backfill abaixo em instalações antigas.
alter table public.clinics add column if not exists slug text;
create unique index if not exists clinics_slug_unique on public.clinics (slug) where slug is not null;

-- Backfill em instalações antigas: copiar e colar no SQL Editor o ficheiro supabase/backfill_clinic_slugs.sql
-- (gera slug a partir do nome, fallback e desduplicação).

-- =========
-- Tabela: clinic_members
-- =========
create table if not exists public.clinic_members (
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

-- =========
-- Tabela: superadmins
-- =========
create table if not exists public.superadmins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- =========
-- Tabela: clinic_sectors (setores por clínica, para filtros e relatórios)
-- =========
create table if not exists public.clinic_sectors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (clinic_id, name)
);

create index if not exists clinic_sectors_clinic_id_idx on public.clinic_sectors (clinic_id);

-- Migração opcional (SQL Editor): popular setores a partir do texto legacy e ligar pesquisas
-- insert into public.clinic_sectors (clinic_id, name)
--   select distinct clinic_id, trim(sector) from public.surveys where trim(sector) <> ''
--   on conflict (clinic_id, name) do nothing;
-- update public.surveys s set sector_id = cs.id
--   from public.clinic_sectors cs
--   where cs.clinic_id = s.clinic_id and cs.name = trim(s.sector) and s.sector_id is null;

-- =========
-- Tabela: surveys
-- =========
-- id continua text (padrão do app atual).
create table if not exists public.surveys (
  id text primary key,
  slug text not null,
  clinic_id uuid references public.clinics (id) on delete cascade,
  name text not null,
  sector text not null default '',
  questions jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now()
);

-- Remover unicidade global de slug (para permitir mesmo slug em clínicas diferentes).
alter table public.surveys drop constraint if exists surveys_slug_key;

-- Unicidade por clínica.
create unique index if not exists surveys_clinic_id_slug_unique
  on public.surveys (clinic_id, slug);

create index if not exists surveys_status_idx on public.surveys (status);
create index if not exists surveys_clinic_id_idx on public.surveys (clinic_id);

-- Referência opcional a setor cadastrado (texto legacy em surveys.sector permanece para anon/exibição).
alter table public.surveys add column if not exists sector_id uuid references public.clinic_sectors (id) on delete set null;
create index if not exists surveys_sector_id_idx on public.surveys (sector_id);

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
alter table public.clinic_members enable row level security;
alter table public.clinic_sectors enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_responses enable row level security;

-- =========
-- Políticas: clinic_members
-- =========
drop policy if exists clinic_members_select_self on public.clinic_members;
create policy clinic_members_select_self
on public.clinic_members
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

-- =========
-- Políticas: clinic_sectors
-- =========
drop policy if exists clinic_sectors_member_all on public.clinic_sectors;
create policy clinic_sectors_member_all
on public.clinic_sectors
for all
to authenticated
using (
  exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = clinic_sectors.clinic_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = clinic_sectors.clinic_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

-- =========
-- Políticas: surveys
-- =========
drop policy if exists surveys_anon_published_select on public.surveys;
create policy surveys_anon_published_select
on public.surveys
for select
to anon
using (status = 'published');

drop policy if exists surveys_member_crud on public.surveys;
create policy surveys_member_crud
on public.surveys
for all
to authenticated
using (
  exists (
    select 1
    from public.clinic_members cm
    where cm.user_id = auth.uid()
      and cm.clinic_id = surveys.clinic_id
  )
  or exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.clinic_members cm
    where cm.user_id = auth.uid()
      and cm.clinic_id = surveys.clinic_id
  )
  or exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

-- =========
-- Políticas: survey_responses
-- =========
-- Respostas podem ser inseridas publicamente, mas apenas para surveys publicadas.
drop policy if exists survey_responses_anon_insert_published on public.survey_responses;
create policy survey_responses_anon_insert_published
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

-- Mesma regra para usuários autenticados (ex.: respondente com sessão aberta no app).
drop policy if exists survey_responses_authenticated_insert_published on public.survey_responses;
create policy survey_responses_authenticated_insert_published
on public.survey_responses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.surveys s
    where s.id = survey_id
      and s.status = 'published'
  )
);

-- Admin (authenticated) lê respostas apenas das clínicas do usuário.
drop policy if exists survey_responses_member_select on public.survey_responses;
create policy survey_responses_member_select
on public.survey_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    join public.clinic_members cm on cm.clinic_id = s.clinic_id
    where s.id = survey_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

-- Delete via cascade (ao deletar a survey) precisa de policy para permitir o delete das respostas.
drop policy if exists survey_responses_member_delete on public.survey_responses;
create policy survey_responses_member_delete
on public.survey_responses
for delete
to authenticated
using (
  exists (
    select 1
    from public.surveys s
    join public.clinic_members cm on cm.clinic_id = s.clinic_id
    where s.id = survey_id
      and cm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

-- =========
-- RLS: clinics + superadmins + membros (CRUD pelo app com JWT; sem depender da Edge Function)
-- Se o banco já existia, rode só este bloco no SQL Editor.
-- =========
alter table public.clinics enable row level security;

drop policy if exists clinics_select_member on public.clinics;
create policy clinics_select_member
on public.clinics
for select
to authenticated
using (
  exists (
    select 1
    from public.clinic_members cm
    where cm.clinic_id = clinics.id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists clinics_superadmin_all on public.clinics;
create policy clinics_superadmin_all
on public.clinics
for all
to authenticated
using (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

-- Anon: ler clínica apenas se houver pesquisa publicada (resolver slug na URL pública).
drop policy if exists clinics_anon_select_with_published on public.clinics;
create policy clinics_anon_select_with_published
on public.clinics
for select
to anon
using (
  exists (
    select 1
    from public.surveys s
    where s.clinic_id = clinics.id
      and s.status = 'published'
  )
);

alter table public.superadmins enable row level security;

drop policy if exists superadmins_select_own on public.superadmins;
create policy superadmins_select_own
on public.superadmins
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists superadmins_insert_by_superadmin on public.superadmins;
create policy superadmins_insert_by_superadmin
on public.superadmins
for insert
to authenticated
with check (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

drop policy if exists superadmins_delete_by_superadmin on public.superadmins;
create policy superadmins_delete_by_superadmin
on public.superadmins
for delete
to authenticated
using (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

drop policy if exists clinic_members_superadmin_insert on public.clinic_members;
create policy clinic_members_superadmin_insert
on public.clinic_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

drop policy if exists clinic_members_superadmin_update on public.clinic_members;
create policy clinic_members_superadmin_update
on public.clinic_members
for update
to authenticated
using (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

drop policy if exists clinic_members_superadmin_delete on public.clinic_members;
create policy clinic_members_superadmin_delete
on public.clinic_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.superadmins sa
    where sa.user_id = auth.uid()
  )
);

