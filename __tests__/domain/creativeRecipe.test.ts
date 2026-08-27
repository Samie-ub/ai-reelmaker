import { DEFAULT_CREATIVE_RECIPES, creativeRecipeSchema, rankCreativeRecipes } from '../../src/domain/creativeRecipe';
import { contrastRatio } from '../../src/domain/project';

describe('creative recipes', () => {
  it('ships twelve valid recipes across every supported template', () => {
    expect(DEFAULT_CREATIVE_RECIPES).toHaveLength(12);
    expect(DEFAULT_CREATIVE_RECIPES.every((recipe) => creativeRecipeSchema.safeParse(recipe).success)).toBe(true);
    expect(new Set(DEFAULT_CREATIVE_RECIPES.map((recipe) => recipe.templateId))).toEqual(new Set(['signal', 'editorial', 'metric']));
    for (const recipe of DEFAULT_CREATIVE_RECIPES) {
      expect(contrastRatio(recipe.palette.textColor, recipe.palette.background), `${recipe.id} primary contrast`).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(recipe.palette.secondaryTextColor, recipe.palette.background), `${recipe.id} secondary contrast`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('ranks explicit color and style requests ahead of generic defaults', () => {
    expect(rankCreativeRecipes('Build a neon purple and lavender fashion launch', 'signal')[0].id).toBe('signal-neon-purple');
    expect(rankCreativeRecipes('Create an elegant gold luxury hotel story', 'editorial')[0].id).toBe('editorial-luxury-gold');
    expect(rankCreativeRecipes('Show technology performance with navy and cyan', 'metric')[0].id).toBe('metric-tech-cyan');
  });
});
