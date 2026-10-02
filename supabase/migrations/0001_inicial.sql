create table public.secoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  estilo text not null check (estilo in ('destaque', 'compacto')),
  acento text not null default 'ouro' check (acento in ('ouro', 'teal')),
  ordem int not null default 0 check (ordem between 0 and 99),
  logo_path text
);

create table public.imersoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  exibir_nome boolean not null default false,
  secao_id uuid not null references public.secoes(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.professores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  foto_path text
);

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  inicio timestamptz not null,
  duracao_min int not null default 60 check (duracao_min between 15 and 600),
  professor_id uuid not null references public.professores(id) on delete restrict,
  nome_exibicao text,
  secao_id uuid not null references public.secoes(id) on delete restrict,
  imersao_id uuid references public.imersoes(id) on delete restrict,
  numero_na_imersao int check (numero_na_imersao between 1 and 50),
  imagem_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((imersao_id is null) = (numero_na_imersao is null)),
  unique (imersao_id, numero_na_imersao)
);
create index aulas_inicio_idx on public.aulas (inicio);
create index aulas_professor_idx on public.aulas (professor_id);
create index aulas_imersao_idx on public.aulas (imersao_id);

create table public.equipe (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create function public.tocar_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger aulas_updated_at before update on public.aulas
  for each row execute function public.tocar_updated_at();

create function public.eh_equipe() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.equipe where user_id = auth.uid())
$$;

alter table public.secoes enable row level security;
alter table public.imersoes enable row level security;
alter table public.professores enable row level security;
alter table public.aulas enable row level security;
alter table public.equipe enable row level security; -- sem políticas: só service role

create policy "leitura publica" on public.secoes for select to anon, authenticated using (true);
create policy "equipe escreve" on public.secoes for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());
create policy "leitura publica" on public.imersoes for select to anon, authenticated using (true);
create policy "equipe escreve" on public.imersoes for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());
create policy "leitura publica" on public.professores for select to anon, authenticated using (true);
create policy "equipe escreve" on public.professores for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());
create policy "leitura publica" on public.aulas for select to anon, authenticated using (true);
create policy "equipe escreve" on public.aulas for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "equipe envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.eh_equipe());
create policy "equipe altera fotos" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.eh_equipe());
create policy "equipe remove fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.eh_equipe());

alter table public._migracoes enable row level security;
