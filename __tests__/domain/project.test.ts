import { contrastRatio, createProject, createScene, getProjectDuration, projectSchema, templates, updateProject } from '../../src/domain/project';

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

  it('accepts custom hex themes and normalizes unreadable text colors', () => {
    const scene = createScene({
      title: 'Purple launch', subtitle: 'A custom theme', accent: '#c084fc', background: '#2e1065',
      textColor: '#2e1065', secondaryTextColor: '#3b0764', alignment: 'left', duration: 6, animation: 'rise',
    });
    expect(scene.accent).toBe('#c084fc');
    expect(contrastRatio(scene.textColor, scene.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(scene.secondaryTextColor, scene.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('rejects unsafe color formats', () => {
    const project = createProject(templates[0]);
    expect(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], accent: 'purple' }] }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, scenes: [{ ...project.scenes[0], background: 'url(javascript:alert(1))' }] }).success).toBe(false);
  });
});
