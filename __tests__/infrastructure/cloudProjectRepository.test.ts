import { vi } from 'vitest';
import { createProject, templates } from '../../src/domain/project';

const supabaseMocks = vi.hoisted(() => ({
  ensureDatabaseUser: vi.fn(),
  getSupabaseClient: vi.fn(),
}));

vi.mock('../../src/infrastructure/supabaseClient', () => ({
  ensureDatabaseUser: supabaseMocks.ensureDatabaseUser,
  getSupabaseClient: supabaseMocks.getSupabaseClient,
  isDatabaseConfigured: true,
}));

import { cloudProjectRepository } from '../../src/infrastructure/cloudProjectRepository';

describe('cloud project repository', () => {
  beforeEach(() => {
    window.localStorage.clear();
    supabaseMocks.ensureDatabaseUser.mockReset().mockResolvedValue({ id: 'owner-1' });
    supabaseMocks.getSupabaseClient.mockReset();
  });

  it('restores and validates the project associated with the local cloud id', async () => {
    const project = createProject(templates[0], 123);
    const query: Record<string, ReturnType<typeof vi.fn>> = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'project-1', document: project }, error: null });
    const from = vi.fn(() => query);
    supabaseMocks.getSupabaseClient.mockReturnValue({ from });
    window.localStorage.setItem('reelmaker.cloud.project-id.v1', 'project-1');

    await expect(cloudProjectRepository.loadProject('signal')).resolves.toEqual(project);
    expect(from).toHaveBeenCalledWith('projects');
    expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner-1');
  });

  it('stores an owner-scoped exported outcome for an AI generation', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'feedback-1' }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabaseMocks.getSupabaseClient.mockReturnValue({ from: vi.fn(() => ({ insert })) });

    await expect(cloudProjectRepository.recordGenerationFeedback('generation-1', 'exported')).resolves.toBe('feedback-1');
    expect(insert).toHaveBeenCalledWith({
      generation_id: 'generation-1', owner_id: 'owner-1', outcome: 'exported', edited_fields: [], rating: null,
    });
  });
});
