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

  it('stores prompt provenance with a generation', async () => {
    const project = createProject(templates[0], 123);
    vi.spyOn(cloudProjectRepository, 'saveProject').mockResolvedValue('project-1');
    const single = vi.fn().mockResolvedValue({ data: { id: 'generation-1' }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabaseMocks.getSupabaseClient.mockReturnValue({ from: vi.fn(() => ({ insert })) });
    const result = {
      model: 'llama3.2:latest' as const,
      promptVersion: 'reelmaker-v3' as const,
      suggestion: { scenes: project.scenes.map((scene) => ({
        title: scene.title, subtitle: scene.subtitle, accent: scene.accent, background: scene.background,
        textColor: scene.textColor, secondaryTextColor: scene.secondaryTextColor,
        alignment: scene.alignment, duration: scene.duration, animation: scene.animation,
      })), warnings: [] },
    };

    await expect(cloudProjectRepository.recordGeneration(project, 'project', 'Create a launch', result)).resolves.toBe('generation-1');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      model: 'llama3.2:latest', prompt_version: 'reelmaker-v3', response: result.suggestion,
    }));
  });

  it('passes relevance filters to owner-scoped memory retrieval', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ content: 'Relevant', similarity: 0.82 }], error: null });
    supabaseMocks.getSupabaseClient.mockReturnValue({ rpc });

    await expect(cloudProjectRepository.findMemories([0.1], 'embeddinggemma:latest', 'signal', 'scene')).resolves.toEqual([{ content: 'Relevant', similarity: 0.82 }]);
    expect(rpc).toHaveBeenCalledWith('match_reel_memories', expect.objectContaining({
      query_template: 'signal', query_mode: 'scene', minimum_similarity: 0.72, match_count: 4,
    }));
  });
});
