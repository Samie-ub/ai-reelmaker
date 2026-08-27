import { createProject, templates } from '../../src/domain/project';
import { aiMemory, projectMemoryText } from '../../src/infrastructure/aiMemory';
import { cloudProjectRepository } from '../../src/infrastructure/cloudProjectRepository';

describe('AI memory', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('turns an exported project into searchable scene context', () => {
    const project = createProject(templates[0], 123);
    const memory = projectMemoryText(project);
    expect(memory).toContain('Template: signal');
    expect(memory).toContain('Turn the idea into momentum.');
    expect(memory).toContain('10s | rise');
  });

  it('retrieves only memories matching the template and generation mode', async () => {
    vi.spyOn(cloudProjectRepository, 'isConfigured').mockReturnValue(true);
    const find = vi.spyOn(cloudProjectRepository, 'findMemories').mockResolvedValue([{ content: 'A relevant reel', similarity: 0.84 }]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ embeddings: [[0.1, 0.2]] }), { status: 200 })));

    await expect(aiMemory.findRelevantMemories('Launch coffee', 'signal', 'project')).resolves.toHaveLength(1);
    expect(find).toHaveBeenCalledWith([0.1, 0.2], 'embeddinggemma:latest', 'signal', 'project');
  });

  it('durably attributes an exported, manually edited project to its applied generation', async () => {
    const generatedProject = createProject(templates[0], 123);
    const exportedProject = { ...generatedProject, scenes: [{ ...generatedProject.scenes[0], title: 'Edited after AI' }] };
    vi.spyOn(cloudProjectRepository, 'isConfigured').mockReturnValue(true);
    vi.spyOn(cloudProjectRepository, 'recordExportMemory').mockResolvedValue('memory-1');
    const feedback = vi.spyOn(cloudProjectRepository, 'recordGenerationFeedback').mockResolvedValue('feedback-1');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ embeddings: [[0.1, 0.2]] }), { status: 200 })));

    aiMemory.trackAppliedGeneration(generatedProject, 'generation-1', 'project');
    await expect(aiMemory.rememberExport(exportedProject)).resolves.toBe('memory-1');
    expect(feedback).toHaveBeenCalledWith('generation-1', 'exported', ['title']);
    expect(window.localStorage.getItem('reelmaker.ai.applied-generation.v1')).toBeNull();
  });
});
