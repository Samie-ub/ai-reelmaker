import { createProject, projectSchema, templates, updateProject } from '../../src/domain/project';

describe('project domain', () => {
  it('creates a valid project from every template', () => {
    for (const template of templates) expect(projectSchema.safeParse(createProject(template, 10)).success).toBe(true);
  });

  it('rejects empty and oversized user copy', () => {
    const project = createProject(templates[0]);
    expect(projectSchema.safeParse({ ...project, title: '   ' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, subtitle: 'x'.repeat(121) }).success).toBe(false);
  });

  it('updates a project without mutating the source', () => {
    const source = createProject(templates[0], 1);
    const result = updateProject(source, { duration: 16 }, 2);
    expect(source.duration).toBe(10);
    expect(result).toMatchObject({ duration: 16, updatedAt: 2 });
  });

  it('constrains durations to the supported production range', () => {
    const project = createProject(templates[0]);
    expect(projectSchema.safeParse({ ...project, duration: 5 }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, duration: 31 }).success).toBe(false);
  });
});
