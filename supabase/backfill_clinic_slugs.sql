-- Executar no Supabase SQL Editor (projeto existente) para URLs /clinicas/:slug e /p/:slug/...
-- Idempotente: coluna/índice com IF NOT EXISTS; updates só preenchem slug vazio.

alter table public.clinics add column if not exists slug text;
create unique index if not exists clinics_slug_unique on public.clinics (slug) where slug is not null;

-- Gerar slug a partir do nome (fallback se nome não gera slug: clinica-{prefixo do id})
update public.clinics c
set slug = sub.nslug
from (
  select
    id,
    coalesce(
      nullif(
        trim(both '-' from lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g'))),
        ''
      ),
      'clinica-' || left(replace(id::text, '-', ''), 8)
    ) as nslug
  from public.clinics
) sub
where c.id = sub.id
  and (c.slug is null or btrim(c.slug) = '');

-- Resolver slugs duplicados ( acrescenta sufixo do id )
update public.clinics c
set slug = c.slug || '-' || left(replace(c.id::text, '-', ''), 8)
where c.slug in (
  select slug from public.clinics group by slug having count(*) > 1
);
