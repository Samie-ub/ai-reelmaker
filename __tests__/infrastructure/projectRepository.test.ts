import { createProject, templates } from '../../src/domain/project';
import { LocalProjectRepository } from '../../src/infrastructure/projectRepository';

describe('LocalProjectRepository', () => {
  beforeEach(() => window.localStorage.clear());

  it('round trips a valid project', () => {
    const repository = new LocalProjectRepository();
    const project = createProject(templates[1], 123);
    repository.save(project);
    expect(repository.load()).toEqual(project);
  });

  it('removes corrupt or stale persisted state instead of throwing', () => {
    window.localStorage.setItem('reelmaker.project.v3', JSON.stringify({ version: 99, title: '<script>' }));
    const repository = new LocalProjectRepository();
    expect(repository.load()).toBeNull();
    expect(window.localStorage.getItem('reelmaker.project.v3')).toBeNull();
  });

  it('recovers from invalid JSON', () => {
    window.localStorage.setItem('reelmaker.project.v1', '{invalid');
    expect(new LocalProjectRepository().load()).toBeNull();
  });

  it('migrates a valid single-scene v1 draft', () => {
    window.localStorage.setItem('reelmaker.project.v1', JSON.stringify({
      version: 1, templateId: 'signal', title: 'Legacy launch', subtitle: 'Still editable',
      accent: '#faff69', alignment: 'left', duration: 10, updatedAt: 123,
    }));

    const project = new LocalProjectRepository().load();
    expect(project).toMatchObject({ version: 3, templateId: 'signal', scenes: [{ title: 'Legacy launch', animation: 'rise', textColor: '#ffffff' }] });
    expect(window.localStorage.getItem('reelmaker.project.v1')).toBeNull();
    expect(window.localStorage.getItem('reelmaker.project.v3')).not.toBeNull();
  });

  it('migrates an existing v2 project to contrast-safe custom themes', () => {
    window.localStorage.setItem('reelmaker.project.v2', JSON.stringify({
      version: 2, templateId: 'editorial', updatedAt: 123,
      scenes: [{ id: 'old-scene', title: 'Existing draft', subtitle: 'Keep my work', accent: '#ffffff', background: '#ededeb', alignment: 'center', duration: 8, animation: 'fade' }],
    }));

    const project = new LocalProjectRepository().load();
    expect(project).toMatchObject({ version: 3, scenes: [{ id: 'old-scene', textColor: '#0a0a0a' }] });
    expect(window.localStorage.getItem('reelmaker.project.v2')).toBeNull();
    expect(window.localStorage.getItem('reelmaker.project.v3')).not.toBeNull();
  });
});
