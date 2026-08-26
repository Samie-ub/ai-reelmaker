import { z } from 'zod';

export const ACCENTS = ['#faff69', '#ffffff', '#22c55e', '#3b82f6'] as const;
export const BACKGROUNDS = ['#0a0a0a', '#ededeb', '#172554', '#3f0d12'] as const;
export const ANIMATIONS = ['rise', 'fade', 'scale', 'slide-left'] as const;

export const sceneCreativeSchema = z.object({
  title: z.string().trim().min(1, 'Add a headline').max(72, 'Keep the headline under 72 characters'),
  subtitle: z.string().trim().max(120, 'Keep supporting text under 120 characters'),
  accent: z.enum(ACCENTS),
  background: z.enum(BACKGROUNDS),
  alignment: z.enum(['left', 'center']),
  duration: z.number().int().min(2).max(15),
  animation: z.enum(ANIMATIONS),
}).strict();

export const reelSceneSchema = sceneCreativeSchema.extend({ id: z.string().min(1).max(80) }).strict();

export const projectSchema = z.object({
  version: z.literal(2),
  templateId: z.enum(['signal', 'editorial', 'metric']),
  scenes: z.array(reelSceneSchema).min(1).max(8),
  updatedAt: z.number().int().nonnegative(),
}).strict();

export type ReelProject = z.infer<typeof projectSchema>;
export type ReelScene = z.infer<typeof reelSceneSchema>;
export type SceneCreative = z.infer<typeof sceneCreativeSchema>;
export type TemplateId = ReelProject['templateId'];

export type ReelTemplate = {
  id: TemplateId;
  name: string;
  category: 'Launch' | 'Editorial' | 'Insights';
  description: string;
  duration: number;
  title: string;
  subtitle: string;
  accent: (typeof ACCENTS)[number];
  background: (typeof BACKGROUNDS)[number];
  alignment: ReelScene['alignment'];
  animation: ReelScene['animation'];
};

export const templates: ReelTemplate[] = [
  { id: 'signal', name: 'Signal Launch', category: 'Launch', description: 'A sharp reveal for launches, announcements, and high-energy hooks.', duration: 10, title: 'Turn the idea\ninto momentum.', subtitle: 'A clean launch sequence built to stop the scroll.', accent: '#faff69', background: '#0a0a0a', alignment: 'left', animation: 'rise' },
  { id: 'editorial', name: 'Quiet Editorial', category: 'Editorial', description: 'Measured type and calm pacing for stories that deserve attention.', duration: 12, title: 'Make space for\nthe real story.', subtitle: 'A restrained editorial frame for thoughtful narratives.', accent: '#ffffff', background: '#ededeb', alignment: 'center', animation: 'fade' },
  { id: 'metric', name: 'Metric Proof', category: 'Insights', description: 'A number-led format for results, insights, and before-after proof.', duration: 8, title: '3.4× faster', subtitle: 'From first cut to a publish-ready vertical video.', accent: '#faff69', background: '#0a0a0a', alignment: 'left', animation: 'scale' },
];

export const getTemplate = (id: string | undefined) => templates.find((template) => template.id === id);

let sceneSequence = 0;
export const createSceneId = () => `scene-${Date.now().toString(36)}-${(sceneSequence += 1).toString(36)}`;
export const createScene = (creative: SceneCreative, id = createSceneId()): ReelScene => reelSceneSchema.parse({ id, ...creative });

export const createProject = (template: ReelTemplate, now = Date.now()): ReelProject => ({
  version: 2,
  templateId: template.id,
  scenes: [createScene({ title: template.title, subtitle: template.subtitle, accent: template.accent, background: template.background, alignment: template.alignment, duration: template.duration, animation: template.animation }, `scene-${now.toString(36)}-1`)],
  updatedAt: now,
});

export const getProjectDuration = (project: ReelProject) => project.scenes.reduce((total, scene) => total + scene.duration, 0);

export const updateProject = (project: ReelProject, update: Partial<Pick<ReelProject, 'scenes'>>, now = Date.now()): ReelProject =>
  projectSchema.parse({ ...project, ...update, updatedAt: now });

export const safeProject = (input: unknown) => projectSchema.safeParse(input);
