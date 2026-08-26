import { createProject, templates } from '../../src/domain/project';
import { addMemoriesToBrief, projectMemoryText } from '../../src/infrastructure/aiMemory';

describe('AI memory formatting', () => {
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
});
