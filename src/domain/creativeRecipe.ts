import { z } from 'zod';
import { ANIMATIONS, hexColorSchema, type TemplateId } from './project';

export const creativeRecipeSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  templateId: z.enum(['signal', 'editorial', 'metric']),
  styleTags: z.array(z.string()).max(20),
  useCaseTags: z.array(z.string()).max(20),
  palette: z.object({
    background: hexColorSchema,
    accent: hexColorSchema,
    textColor: hexColorSchema,
    secondaryTextColor: hexColorSchema,
  }).strict(),
  alignment: z.enum(['left', 'center']),
  animation: z.enum(ANIMATIONS),
  copyGuidance: z.string().min(1).max(500),
  compositionGuidance: z.string().min(1).max(500),
  qualityScore: z.number().min(0).max(1),
}).strict();

export type CreativeRecipe = z.infer<typeof creativeRecipeSchema>;

const recipe = (value: CreativeRecipe) => creativeRecipeSchema.parse(value);

export const DEFAULT_CREATIVE_RECIPES: CreativeRecipe[] = [
  recipe({ id: 'signal-electric-launch', name: 'Electric launch', description: 'High-voltage product announcement with a sharp yellow signal.', templateId: 'signal', styleTags: ['bold', 'electric', 'yellow', 'black', 'high-energy'], useCaseTags: ['launch', 'announcement', 'product'], palette: { background: '#0a0a0a', accent: '#faff69', textColor: '#ffffff', secondaryTextColor: '#c7c7c7' }, alignment: 'left', animation: 'rise', copyGuidance: 'Use terse, decisive headlines and a direct final action.', compositionGuidance: 'Alternate high-contrast hooks with restrained supporting copy.', qualityScore: 1 }),
  recipe({ id: 'signal-neon-purple', name: 'Neon purple', description: 'Nightlife-inspired purple and lavender launch treatment.', templateId: 'signal', styleTags: ['purple', 'lavender', 'violet', 'neon', 'nightlife'], useCaseTags: ['event', 'music', 'fashion', 'launch'], palette: { background: '#1e0a3c', accent: '#c084fc', textColor: '#ffffff', secondaryTextColor: '#e9d5ff' }, alignment: 'left', animation: 'scale', copyGuidance: 'Keep the hook provocative and the supporting line atmospheric.', compositionGuidance: 'Use purple consistently, reserving lavender for the rotating signal and labels.', qualityScore: 0.98 }),
  recipe({ id: 'signal-fitness-red', name: 'Performance red', description: 'Urgent black, red, and white campaign treatment.', templateId: 'signal', styleTags: ['red', 'black', 'intense', 'sport', 'energetic'], useCaseTags: ['fitness', 'sports', 'sale', 'challenge'], palette: { background: '#090909', accent: '#ef4444', textColor: '#ffffff', secondaryTextColor: '#d4d4d4' }, alignment: 'left', animation: 'slide-left', copyGuidance: 'Use active verbs, short claims, and a concrete challenge.', compositionGuidance: 'Keep backgrounds dark and use red only for motion signals and emphasis.', qualityScore: 0.96 }),
  recipe({ id: 'signal-citrus-pop', name: 'Citrus pop', description: 'Playful orange and cream launch palette for consumer products.', templateId: 'signal', styleTags: ['orange', 'cream', 'playful', 'bright', 'friendly'], useCaseTags: ['food', 'drink', 'consumer', 'promotion'], palette: { background: '#fff7ed', accent: '#f97316', textColor: '#431407', secondaryTextColor: '#7c2d12' }, alignment: 'left', animation: 'rise', copyGuidance: 'Sound warm, specific, and immediately useful.', compositionGuidance: 'Use the cream field as breathing room and orange as the single energetic signal.', qualityScore: 0.94 }),
  recipe({ id: 'editorial-luxury-gold', name: 'Quiet luxury', description: 'Charcoal, ivory, and muted gold for premium storytelling.', templateId: 'editorial', styleTags: ['luxury', 'gold', 'ivory', 'charcoal', 'premium', 'elegant'], useCaseTags: ['fashion', 'jewelry', 'hospitality', 'brand'], palette: { background: '#171717', accent: '#d4af37', textColor: '#fffaf0', secondaryTextColor: '#d6d3d1' }, alignment: 'center', animation: 'fade', copyGuidance: 'Prefer confident understatement over promotional language.', compositionGuidance: 'Center measured copy and let the gold rule act as the only ornament.', qualityScore: 1 }),
  recipe({ id: 'editorial-beauty-blush', name: 'Beauty blush', description: 'Soft cream, blush, and burgundy editorial treatment.', templateId: 'editorial', styleTags: ['pink', 'blush', 'cream', 'burgundy', 'soft', 'beauty'], useCaseTags: ['beauty', 'skincare', 'wellness', 'editorial'], palette: { background: '#fff1f2', accent: '#9f1239', textColor: '#4c0519', secondaryTextColor: '#881337' }, alignment: 'center', animation: 'fade', copyGuidance: 'Use sensory language with calm, credible claims.', compositionGuidance: 'Maintain soft fields and let burgundy define hierarchy without visual noise.', qualityScore: 0.98 }),
  recipe({ id: 'editorial-sage-story', name: 'Sage story', description: 'Natural sage and forest tones for thoughtful sustainable stories.', templateId: 'editorial', styleTags: ['green', 'sage', 'natural', 'organic', 'calm'], useCaseTags: ['sustainability', 'wellness', 'food', 'story'], palette: { background: '#ecf4e8', accent: '#3f6212', textColor: '#1a2e05', secondaryTextColor: '#365314' }, alignment: 'center', animation: 'fade', copyGuidance: 'Lead with human meaning and support it with one grounded detail.', compositionGuidance: 'Use gentle tonal contrast and calm pacing across the sequence.', qualityScore: 0.96 }),
  recipe({ id: 'editorial-cobalt-culture', name: 'Cobalt culture', description: 'Museum-like cobalt and paper white for cultural narratives.', templateId: 'editorial', styleTags: ['blue', 'cobalt', 'white', 'art', 'cultural'], useCaseTags: ['art', 'culture', 'education', 'story'], palette: { background: '#f8fafc', accent: '#1d4ed8', textColor: '#172554', secondaryTextColor: '#334155' }, alignment: 'center', animation: 'rise', copyGuidance: 'Use precise language and an editorial narrative arc.', compositionGuidance: 'Treat cobalt as a curatorial marker rather than a decorative fill.', qualityScore: 0.94 }),
  recipe({ id: 'metric-finance-green', name: 'Financial confidence', description: 'Deep green, cream, and gold for credible financial proof.', templateId: 'metric', styleTags: ['green', 'gold', 'cream', 'credible', 'financial'], useCaseTags: ['finance', 'growth', 'investment', 'results'], palette: { background: '#052e16', accent: '#fbbf24', textColor: '#f0fdf4', secondaryTextColor: '#bbf7d0' }, alignment: 'left', animation: 'scale', copyGuidance: 'Lead with the verified number, then explain its practical meaning.', compositionGuidance: 'Keep metrics dominant and use gold sparingly for the proof signal.', qualityScore: 1 }),
  recipe({ id: 'metric-tech-cyan', name: 'Technology proof', description: 'Deep navy and cyan for technical performance results.', templateId: 'metric', styleTags: ['blue', 'navy', 'cyan', 'technology', 'modern'], useCaseTags: ['saas', 'technology', 'performance', 'data'], palette: { background: '#082f49', accent: '#22d3ee', textColor: '#f0f9ff', secondaryTextColor: '#bae6fd' }, alignment: 'left', animation: 'scale', copyGuidance: 'Put the measurable outcome first and remove vague superlatives.', compositionGuidance: 'Use cyan to trace the metric while navy carries authority.', qualityScore: 0.98 }),
  recipe({ id: 'metric-monochrome', name: 'Monochrome evidence', description: 'Black, white, and cool gray for neutral, rigorous proof.', templateId: 'metric', styleTags: ['black', 'white', 'gray', 'minimal', 'rigorous'], useCaseTags: ['research', 'report', 'comparison', 'results'], palette: { background: '#0a0a0a', accent: '#ffffff', textColor: '#ffffff', secondaryTextColor: '#a3a3a3' }, alignment: 'left', animation: 'fade', copyGuidance: 'State only the result, comparison, and evidence the user supplied.', compositionGuidance: 'Use scale and spacing rather than color variety to create hierarchy.', qualityScore: 0.96 }),
  recipe({ id: 'metric-magenta-growth', name: 'Magenta momentum', description: 'Plum and bright magenta for expressive growth stories.', templateId: 'metric', styleTags: ['pink', 'magenta', 'purple', 'plum', 'expressive'], useCaseTags: ['growth', 'social', 'creator', 'campaign'], palette: { background: '#3b0a2a', accent: '#f472b6', textColor: '#fdf2f8', secondaryTextColor: '#fbcfe8' }, alignment: 'left', animation: 'scale', copyGuidance: 'Pair one bold number with an energetic but factual payoff.', compositionGuidance: 'Keep the plum field stable and use magenta only for proof markers.', qualityScore: 0.94 }),
];

const tokens = (value: string) => new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);

export const rankCreativeRecipes = (prompt: string, templateId: TemplateId, recipes = DEFAULT_CREATIVE_RECIPES, limit = 3) => {
  const requested = tokens(prompt);
  const candidates = recipes.filter((item) => item.templateId === templateId).map((item) => {
    const searchable = tokens([item.name, item.description, ...item.styleTags, ...item.useCaseTags].join(' '));
    const matches = [...requested].filter((token) => searchable.has(token)).length;
    return { item, score: matches * 10 + item.qualityScore };
  });
  const hasMatch = candidates.some(({ score, item }) => score > item.qualityScore);
  return candidates
    .filter(({ score, item }) => !hasMatch || score > item.qualityScore)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map(({ item }) => item);
};
