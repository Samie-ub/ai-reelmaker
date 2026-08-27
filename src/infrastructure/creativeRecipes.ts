import { creativeRecipeSchema, DEFAULT_CREATIVE_RECIPES, rankCreativeRecipes, type CreativeRecipe } from '../domain/creativeRecipe';
import type { TemplateId } from '../domain/project';
import { ensureDatabaseUser, getSupabaseClient, isDatabaseConfigured } from './supabaseClient';

type CreativeRecipeRow = {
  id: string;
  name: string;
  description: string;
  template_id: TemplateId;
  style_tags: string[];
  use_case_tags: string[];
  palette: CreativeRecipe['palette'];
  alignment: CreativeRecipe['alignment'];
  animation: CreativeRecipe['animation'];
  copy_guidance: string;
  composition_guidance: string;
  quality_score: number;
};

const fromRow = (row: CreativeRecipeRow) => creativeRecipeSchema.safeParse({
  id: row.id,
  name: row.name,
  description: row.description,
  templateId: row.template_id,
  styleTags: row.style_tags,
  useCaseTags: row.use_case_tags,
  palette: row.palette,
  alignment: row.alignment,
  animation: row.animation,
  copyGuidance: row.copy_guidance,
  compositionGuidance: row.composition_guidance,
  qualityScore: row.quality_score,
});

export async function findRelevantCreativeRecipes(prompt: string, templateId: TemplateId, limit = 3) {
  let recipes = DEFAULT_CREATIVE_RECIPES;
  if (isDatabaseConfigured) {
    try {
      const client = getSupabaseClient();
      if (client) {
        await ensureDatabaseUser();
        const { data, error } = await client.from('creative_recipes')
          .select('id, name, description, template_id, style_tags, use_case_tags, palette, alignment, animation, copy_guidance, composition_guidance, quality_score')
          .eq('active', true)
          .eq('template_id', templateId)
          .order('quality_score', { ascending: false })
          .limit(30);
        if (error) throw error;
        const rows = (data ?? []) as CreativeRecipeRow[];
        const parsed = rows.map(fromRow).filter((result) => result.success).map((result) => result.data);
        if (parsed.length) recipes = parsed;
      }
    } catch {
      recipes = DEFAULT_CREATIVE_RECIPES;
    }
  }
  return rankCreativeRecipes(prompt, templateId, recipes, limit);
}
