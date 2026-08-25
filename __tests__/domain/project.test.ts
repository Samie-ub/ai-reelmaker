import { createProject, getProjectDuration, projectSchema, templates, updateProject } from '../../src/domain/project';

describe('project domain', () => {
  it('creates a valid project from every template', () => {
    for (const template of templates) expect(projectSchema.safeParse(createProject(template, 10)).success).toBe(true);
  });

  it('rejects empty and oversized user copy', () => {
    const project = createProject(templates[0]);
    expect(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], title: '   ' }] }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], subtitle: 'x'.repeat(121) }] }).success).toBe(false);
  });

  it('updates a project without mutating the source', () => {
    const source = createProject(templates[0], 1);
    const scenes = [{ ...source.scenes[0], duration: 12 }];
    const result = updateProject(source, { scenes }, 2);
    expect(source.scenes[0].duration).toBe(10);
    expect(result.scenes[0].duration).toBe(12);
    expect(result.updatedAt).toBe(2);
  });

  it('constrains scene durations and calculates total duration', () => {
    const project = createProject(templates[0]);
    expect(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], duration: 1 }] }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], duration: 16 }] }).success).toBe(false);
    expect(getProjectDuration({ ...project, scenes: [project.scenes[0], { ...project.scenes[0], id: 'scene-2', duration: 4 }] })).toBe(14);
  });
});
