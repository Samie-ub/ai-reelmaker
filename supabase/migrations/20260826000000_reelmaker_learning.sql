create extension if not exists vector with schema extensions;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled reel' check (char_length(title) between 1 and 120),
  template_id text not null check (template_id in ('signal', 'editorial', 'metric')),
  schema_version integer not null default 2 check (schema_version > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null,
  schema_version integer not null check (schema_version > 0),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  source text not null check (source in ('manual', 'ai', 'export')),
  created_at timestamptz not null default now(),
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete cascade,
  unique (id, owner_id)
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null,
  mode text not null check (mode in ('project', 'scene')),
  model text not null,
  prompt text not null check (char_length(prompt) between 1 and 4000),
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete cascade,
  unique (id, owner_id)
);

create table public.generation_feedback (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null check (outcome in ('edited', 'exported', 'rejected')),
  edited_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(edited_fields) = 'array'),
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  foreign key (generation_id, owner_id) references public.ai_generations(id, owner_id) on delete cascade
);

create table public.reel_memories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  project_version_id uuid not null,
  owner_id uuid not null,
  content text not null check (char_length(content) between 1 and 12000),
  embedding extensions.vector(768) not null,
  embedding_model text not null,
  quality_score real not null default 1 check (quality_score between 0 and 1),
  created_at timestamptz not null default now(),
  foreign key (project_id, owner_id) references public.projects(id, owner_id) on delete cascade,
  foreign key (project_version_id, owner_id) references public.project_versions(id, owner_id) on delete cascade
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);
create index project_versions_project_created_idx on public.project_versions (project_id, created_at desc);
create index ai_generations_project_created_idx on public.ai_generations (project_id, created_at desc);
create index reel_memories_owner_model_idx on public.reel_memories (owner_id, embedding_model);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.ai_generations enable row level security;
alter table public.generation_feedback enable row level security;
alter table public.reel_memories enable row level security;

create policy projects_owner_all on public.projects
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy project_versions_owner_all on public.project_versions
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy ai_generations_owner_all on public.ai_generations
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy generation_feedback_owner_all on public.generation_feedback
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy reel_memories_owner_all on public.reel_memories
for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create or replace function public.match_reel_memories(
  query_embedding extensions.vector,
  query_model text,
  match_count integer default 4
)
returns table (
  memory_id uuid,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    memories.id,
    memories.content,
    1 - (memories.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.reel_memories as memories
  where memories.owner_id = (select auth.uid())
    and memories.embedding_model = query_model
  order by memories.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 8);
$$;

revoke all on public.projects, public.project_versions, public.ai_generations, public.generation_feedback, public.reel_memories from anon;
grant select, insert, update, delete on public.projects, public.project_versions, public.ai_generations, public.generation_feedback, public.reel_memories to authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.match_reel_memories(extensions.vector, text, integer) from public, anon;
grant execute on function public.match_reel_memories(extensions.vector, text, integer) to authenticated;
