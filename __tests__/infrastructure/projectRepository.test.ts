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
    window.localStorage.setItem('reelmaker.project.v2', JSON.stringify({ version: 99, title: '<script>' }));
    const repository = new LocalProjectRepository();
    expect(repository.load()).toBeNull();
    expect(window.localStorage.getItem('reelmaker.project.v2')).toBeNull();
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
    expect(project).toMatchObject({ version: 2, templateId: 'signal', scenes: [{ title: 'Legacy launch', animation: 'rise' }] });
    expect(window.localStorage.getItem('reelmaker.project.v1')).toBeNull();
    expect(window.localStorage.getItem('reelmaker.project.v2')).not.toBeNull();
  });
});
