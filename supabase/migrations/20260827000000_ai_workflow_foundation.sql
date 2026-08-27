alter table public.ai_generations
add column prompt_version text not null default 'legacy';

alter table public.reel_memories
add column source_generation_id uuid,
add column generation_mode text check (generation_mode in ('project', 'scene')),
add foreign key (source_generation_id, owner_id)
  references public.ai_generations(id, owner_id) on delete set null (source_generation_id);

create index reel_memories_generation_idx
on public.reel_memories (source_generation_id)
where source_generation_id is not null;

drop function if exists public.match_reel_memories(extensions.vector, text, integer);

create function public.match_reel_memories(
  query_embedding extensions.vector,
  query_model text,
  query_template text,
  query_mode text,
  minimum_similarity double precision default 0.72,
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
  inner join public.projects as projects
    on projects.id = memories.project_id
    and projects.owner_id = memories.owner_id
  where memories.owner_id = (select auth.uid())
    and memories.embedding_model = query_model
    and projects.template_id = query_template
    and (memories.generation_mode is null or memories.generation_mode = query_mode)
    and 1 - (memories.embedding operator(extensions.<=>) query_embedding) >= minimum_similarity
  order by memories.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 8);
$$;

revoke all on function public.match_reel_memories(extensions.vector, text, text, text, double precision, integer) from public, anon;
grant execute on function public.match_reel_memories(extensions.vector, text, text, text, double precision, integer) to authenticated;
