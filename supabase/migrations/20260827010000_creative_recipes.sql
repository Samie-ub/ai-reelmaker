create table public.creative_recipes (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  name text not null check (char_length(name) between 1 and 120),
  description text not null check (char_length(description) between 1 and 300),
  template_id text not null check (template_id in ('signal', 'editorial', 'metric')),
  style_tags text[] not null default '{}',
  use_case_tags text[] not null default '{}',
  palette jsonb not null check (
    jsonb_typeof(palette) = 'object'
    and palette ?& array['background', 'accent', 'textColor', 'secondaryTextColor']
  ),
  alignment text not null check (alignment in ('left', 'center')),
  animation text not null check (animation in ('rise', 'fade', 'scale', 'slide-left')),
  copy_guidance text not null check (char_length(copy_guidance) between 1 and 500),
  composition_guidance text not null check (char_length(composition_guidance) between 1 and 500),
  quality_score real not null default 1 check (quality_score between 0 and 1),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index creative_recipes_template_quality_idx
on public.creative_recipes (template_id, quality_score desc)
where active;

create trigger creative_recipes_set_updated_at
before update on public.creative_recipes
for each row execute function public.set_updated_at();

alter table public.creative_recipes enable row level security;

create policy creative_recipes_authenticated_read on public.creative_recipes
for select to authenticated
using (active);

revoke all on public.creative_recipes from anon, authenticated;
grant select on public.creative_recipes to authenticated;

insert into public.creative_recipes (
  id, name, description, template_id, style_tags, use_case_tags, palette,
  alignment, animation, copy_guidance, composition_guidance, quality_score
) values
  ('signal-electric-launch', 'Electric launch', 'High-voltage product announcement with a sharp yellow signal.', 'signal', array['bold','electric','yellow','black','high-energy'], array['launch','announcement','product'], '{"background":"#0a0a0a","accent":"#faff69","textColor":"#ffffff","secondaryTextColor":"#c7c7c7"}', 'left', 'rise', 'Use terse, decisive headlines and a direct final action.', 'Alternate high-contrast hooks with restrained supporting copy.', 1),
  ('signal-neon-purple', 'Neon purple', 'Nightlife-inspired purple and lavender launch treatment.', 'signal', array['purple','lavender','violet','neon','nightlife'], array['event','music','fashion','launch'], '{"background":"#1e0a3c","accent":"#c084fc","textColor":"#ffffff","secondaryTextColor":"#e9d5ff"}', 'left', 'scale', 'Keep the hook provocative and the supporting line atmospheric.', 'Use purple consistently, reserving lavender for the rotating signal and labels.', 0.98),
  ('signal-fitness-red', 'Performance red', 'Urgent black, red, and white campaign treatment.', 'signal', array['red','black','intense','sport','energetic'], array['fitness','sports','sale','challenge'], '{"background":"#090909","accent":"#ef4444","textColor":"#ffffff","secondaryTextColor":"#d4d4d4"}', 'left', 'slide-left', 'Use active verbs, short claims, and a concrete challenge.', 'Keep backgrounds dark and use red only for motion signals and emphasis.', 0.96),
  ('signal-citrus-pop', 'Citrus pop', 'Playful orange and cream launch palette for consumer products.', 'signal', array['orange','cream','playful','bright','friendly'], array['food','drink','consumer','promotion'], '{"background":"#fff7ed","accent":"#f97316","textColor":"#431407","secondaryTextColor":"#7c2d12"}', 'left', 'rise', 'Sound warm, specific, and immediately useful.', 'Use the cream field as breathing room and orange as the single energetic signal.', 0.94),
  ('editorial-luxury-gold', 'Quiet luxury', 'Charcoal, ivory, and muted gold for premium storytelling.', 'editorial', array['luxury','gold','ivory','charcoal','premium','elegant'], array['fashion','jewelry','hospitality','brand'], '{"background":"#171717","accent":"#d4af37","textColor":"#fffaf0","secondaryTextColor":"#d6d3d1"}', 'center', 'fade', 'Prefer confident understatement over promotional language.', 'Center measured copy and let the gold rule act as the only ornament.', 1),
  ('editorial-beauty-blush', 'Beauty blush', 'Soft cream, blush, and burgundy editorial treatment.', 'editorial', array['pink','blush','cream','burgundy','soft','beauty'], array['beauty','skincare','wellness','editorial'], '{"background":"#fff1f2","accent":"#9f1239","textColor":"#4c0519","secondaryTextColor":"#881337"}', 'center', 'fade', 'Use sensory language with calm, credible claims.', 'Maintain soft fields and let burgundy define hierarchy without visual noise.', 0.98),
  ('editorial-sage-story', 'Sage story', 'Natural sage and forest tones for thoughtful sustainable stories.', 'editorial', array['green','sage','natural','organic','calm'], array['sustainability','wellness','food','story'], '{"background":"#ecf4e8","accent":"#3f6212","textColor":"#1a2e05","secondaryTextColor":"#365314"}', 'center', 'fade', 'Lead with human meaning and support it with one grounded detail.', 'Use gentle tonal contrast and calm pacing across the sequence.', 0.96),
  ('editorial-cobalt-culture', 'Cobalt culture', 'Museum-like cobalt and paper white for cultural narratives.', 'editorial', array['blue','cobalt','white','art','cultural'], array['art','culture','education','story'], '{"background":"#f8fafc","accent":"#1d4ed8","textColor":"#172554","secondaryTextColor":"#334155"}', 'center', 'rise', 'Use precise language and an editorial narrative arc.', 'Treat cobalt as a curatorial marker rather than a decorative fill.', 0.94),
  ('metric-finance-green', 'Financial confidence', 'Deep green, cream, and gold for credible financial proof.', 'metric', array['green','gold','cream','credible','financial'], array['finance','growth','investment','results'], '{"background":"#052e16","accent":"#fbbf24","textColor":"#f0fdf4","secondaryTextColor":"#bbf7d0"}', 'left', 'scale', 'Lead with the verified number, then explain its practical meaning.', 'Keep metrics dominant and use gold sparingly for the proof signal.', 1),
  ('metric-tech-cyan', 'Technology proof', 'Deep navy and cyan for technical performance results.', 'metric', array['blue','navy','cyan','technology','modern'], array['saas','technology','performance','data'], '{"background":"#082f49","accent":"#22d3ee","textColor":"#f0f9ff","secondaryTextColor":"#bae6fd"}', 'left', 'scale', 'Put the measurable outcome first and remove vague superlatives.', 'Use cyan to trace the metric while navy carries authority.', 0.98),
  ('metric-monochrome', 'Monochrome evidence', 'Black, white, and cool gray for neutral, rigorous proof.', 'metric', array['black','white','gray','minimal','rigorous'], array['research','report','comparison','results'], '{"background":"#0a0a0a","accent":"#ffffff","textColor":"#ffffff","secondaryTextColor":"#a3a3a3"}', 'left', 'fade', 'State only the result, comparison, and evidence the user supplied.', 'Use scale and spacing rather than color variety to create hierarchy.', 0.96),
  ('metric-magenta-growth', 'Magenta momentum', 'Plum and bright magenta for expressive growth stories.', 'metric', array['pink','magenta','purple','plum','expressive'], array['growth','social','creator','campaign'], '{"background":"#3b0a2a","accent":"#f472b6","textColor":"#fdf2f8","secondaryTextColor":"#fbcfe8"}', 'left', 'scale', 'Pair one bold number with an energetic but factual payoff.', 'Keep the plum field stable and use magenta only for proof markers.', 0.94)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  template_id = excluded.template_id,
  style_tags = excluded.style_tags,
  use_case_tags = excluded.use_case_tags,
  palette = excluded.palette,
  alignment = excluded.alignment,
  animation = excluded.animation,
  copy_guidance = excluded.copy_guidance,
  composition_guidance = excluded.composition_guidance,
  quality_score = excluded.quality_score,
  active = true,
  version = public.creative_recipes.version + 1;
