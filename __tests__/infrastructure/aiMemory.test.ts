import { createProject, templates } from '../../src/domain/project';
import { addMemoriesToBrief, aiMemory, projectMemoryText } from '../../src/infrastructure/aiMemory';
import { cloudProjectRepository } from '../../src/infrastructure/cloudProjectRepository';

describe('AI memory formatting', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('turns an exported project into searchable scene context', () => {
    const project = createProject(templates[0], 123);
    const memory = projectMemoryText(project);
    expect(memory).toContain('Template: signal');
    expect(memory).toContain('Turn the idea into momentum.');
    expect(memory).toContain('10s | rise');
  });

  it('adds retrieved examples without replacing the user brief', () => {
    const result = addMemoriesToBrief('Launch a new coffee', [{ content: 'Scene 1: Start after dark', similarity: 0.86 }]);
    expect(result).toContain('Launch a new coffee');
    expect(result).toContain('Do not copy wording verbatim');
    expect(result).toContain('similarity 0.86');
  });

  it('leaves a brief unchanged when no memory is available', () => {
    expect(addMemoriesToBrief('Keep this exact brief', [])).toBe('Keep this exact brief');
  });

  it('marks the latest AI generation as exported after storing its memory', async () => {
    const project = createProject(templates[0], 123);
    const suggestion = { scenes: project.scenes.map((scene) => ({
      title: scene.title, subtitle: scene.subtitle, accent: scene.accent, background: scene.background,
      alignment: scene.alignment, duration: scene.duration, animation: scene.animation,
    })) };
    vi.spyOn(cloudProjectRepository, 'isConfigured').mockReturnValue(true);
    vi.spyOn(cloudProjectRepository, 'recordGeneration').mockResolvedValue('generation-1');
    vi.spyOn(cloudProjectRepository, 'recordExportMemory').mockResolvedValue('memory-1');
    const feedback = vi.spyOn(cloudProjectRepository, 'recordGenerationFeedback').mockResolvedValue('feedback-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ embeddings: [[0.1, 0.2]] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })));

    await aiMemory.recordGeneration(project, 'project', 'Create a launch reel', suggestion);
    await expect(aiMemory.rememberExport(project)).resolves.toBe('memory-1');
    expect(feedback).toHaveBeenCalledWith('generation-1', 'exported');
  });
});
