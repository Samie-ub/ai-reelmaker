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
    window.localStorage.setItem('reelmaker.project.v1', JSON.stringify({ version: 99, title: '<script>' }));
    const repository = new LocalProjectRepository();
    expect(repository.load()).toBeNull();
    expect(window.localStorage.getItem('reelmaker.project.v1')).toBeNull();
  });

  it('recovers from invalid JSON', () => {
    window.localStorage.setItem('reelmaker.project.v1', '{invalid');
    expect(new LocalProjectRepository().load()).toBeNull();
  });
});
