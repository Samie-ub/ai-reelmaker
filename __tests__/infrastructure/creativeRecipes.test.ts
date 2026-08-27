import { vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  ensureDatabaseUser: vi.fn(),
  getSupabaseClient: vi.fn(),
}));

vi.mock('../../src/infrastructure/supabaseClient', () => ({
  ensureDatabaseUser: supabaseMocks.ensureDatabaseUser,
  getSupabaseClient: supabaseMocks.getSupabaseClient,
  isDatabaseConfigured: true,
}));

import { findRelevantCreativeRecipes } from '../../src/infrastructure/creativeRecipes';

describe('creative recipe retrieval', () => {
  it('loads active template recipes from Supabase and ranks them against the request', async () => {
    const rows = [
      { id: 'purple', name: 'Purple night', description: 'Purple launch', template_id: 'signal', style_tags: ['purple'], use_case_tags: ['fashion'], palette: { background: '#2e1065', accent: '#c084fc', textColor: '#ffffff', secondaryTextColor: '#e9d5ff' }, alignment: 'left', animation: 'scale', copy_guidance: 'Be direct.', composition_guidance: 'Use purple.', quality_score: 0.9 },
      { id: 'orange', name: 'Orange pop', description: 'Orange launch', template_id: 'signal', style_tags: ['orange'], use_case_tags: ['food'], palette: { background: '#fff7ed', accent: '#f97316', textColor: '#431407', secondaryTextColor: '#7c2d12' }, alignment: 'left', animation: 'rise', copy_guidance: 'Be warm.', composition_guidance: 'Use orange.', quality_score: 1 },
    ];
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => query);
    query.limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    supabaseMocks.ensureDatabaseUser.mockResolvedValue({ id: 'owner-1' });
    supabaseMocks.getSupabaseClient.mockReturnValue({ from: vi.fn(() => query) });

    const result = await findRelevantCreativeRecipes('purple fashion launch', 'signal');
    expect(result[0].id).toBe('purple');
    expect(query.eq).toHaveBeenCalledWith('template_id', 'signal');
  });
});
