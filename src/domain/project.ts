import { z } from 'zod';

export const ACCENTS = ['#faff69', '#ffffff', '#22c55e', '#3b82f6', '#a855f7', '#f43f5e'] as const;
export const BACKGROUNDS = ['#0a0a0a', '#ededeb', '#172554', '#3f0d12', '#2e1065', '#fff7ed'] as const;
export const ANIMATIONS = ['rise', 'fade', 'scale', 'slide-left'] as const;
export const HEX_COLOR_PATTERN = '^#[0-9a-fA-F]{6}$';

export const hexColorSchema = z.string().regex(new RegExp(HEX_COLOR_PATTERN), 'Use a six-digit hex color').transform((color) => color.toLowerCase());

const rgb = (color: string) => {
  const value = color.slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
};

const luminance = (color: string) => {
  const channels = rgb(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

export const contrastRatio = (first: string, second: string) => {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

export const getReadableTextColor = (background: string) =>
  contrastRatio(background, '#ffffff') >= contrastRatio(background, '#0a0a0a') ? '#ffffff' : '#0a0a0a';

const mixColors = (foreground: string, background: string, foregroundWeight: number) => {
  const front = rgb(foreground); const back = rgb(background);
  const mixed = front.map((channel, index) => Math.round(channel * foregroundWeight + back[index] * (1 - foregroundWeight)));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

export const getSecondaryTextColor = (background: string, primary = getReadableTextColor(background)) => {
  const candidate = mixColors(primary, background, 0.78);
  return contrastRatio(candidate, background) >= 4.5 ? candidate : primary;
};

export const ensureReadableTextColor = (color: string, background: string, minimumContrast = 4.5) =>
  contrastRatio(color, background) >= minimumContrast ? color : getReadableTextColor(background);

const sceneCreativeInputSchema = z.object({
  title: z.string().trim().min(1, 'Add a headline').max(72, 'Keep the headline under 72 characters'),
  subtitle: z.string().trim().max(120, 'Keep supporting text under 120 characters'),
  accent: hexColorSchema,
  background: hexColorSchema,
  textColor: hexColorSchema.optional(),
  secondaryTextColor: hexColorSchema.optional(),
  alignment: z.enum(['left', 'center']),
  duration: z.number().int().min(2).max(15),
  animation: z.enum(ANIMATIONS),
}).strict();

const normalizeSceneTheme = <T extends z.output<typeof sceneCreativeInputSchema>>(scene: T) => {
  const preferredText = scene.textColor ?? getReadableTextColor(scene.background);
  const textColor = ensureReadableTextColor(preferredText, scene.background);
  const preferredSecondary = scene.secondaryTextColor ?? getSecondaryTextColor(scene.background, textColor);
  return { ...scene, textColor, secondaryTextColor: ensureReadableTextColor(preferredSecondary, scene.background) };
};

export const sceneCreativeSchema = sceneCreativeInputSchema.transform(normalizeSceneTheme);
export const reelSceneSchema = sceneCreativeInputSchema.extend({ id: z.string().min(1).max(80) }).transform(normalizeSceneTheme);

export const projectSchema = z.object({
  version: z.literal(3),
  templateId: z.enum(['signal', 'editorial', 'metric']),
  scenes: z.array(reelSceneSchema).min(1).max(8),
  updatedAt: z.number().int().nonnegative(),
}).strict();

export type ReelProject = z.infer<typeof projectSchema>;
export type ReelScene = z.infer<typeof reelSceneSchema>;
export type SceneCreative = z.infer<typeof sceneCreativeSchema>;
export type SceneCreativeInput = z.input<typeof sceneCreativeSchema>;
export type TemplateId = ReelProject['templateId'];

export type ReelTemplate = {
  id: TemplateId;
  name: string;
  category: 'Launch' | 'Editorial' | 'Insights';
  description: string;
  duration: number;
  title: string;
  subtitle: string;
  accent: string;
  background: string;
  textColor: string;
  secondaryTextColor: string;
  alignment: ReelScene['alignment'];
  animation: ReelScene['animation'];
};

export const templates: ReelTemplate[] = [
  { id: 'signal', name: 'Signal Launch', category: 'Launch', description: 'A sharp reveal for launches, announcements, and high-energy hooks.', duration: 10, title: 'Turn the idea\ninto momentum.', subtitle: 'A clean launch sequence built to stop the scroll.', accent: '#faff69', background: '#0a0a0a', textColor: '#ffffff', secondaryTextColor: '#c7c7c7', alignment: 'left', animation: 'rise' },
  { id: 'editorial', name: 'Quiet Editorial', category: 'Editorial', description: 'Measured type and calm pacing for stories that deserve attention.', duration: 12, title: 'Make space for\nthe real story.', subtitle: 'A restrained editorial frame for thoughtful narratives.', accent: '#7c3aed', background: '#ededeb', textColor: '#0a0a0a', secondaryTextColor: '#444444', alignment: 'center', animation: 'fade' },
  { id: 'metric', name: 'Metric Proof', category: 'Insights', description: 'A number-led format for results, insights, and before-after proof.', duration: 8, title: '3.4× faster', subtitle: 'From first cut to a publish-ready vertical video.', accent: '#faff69', background: '#0a0a0a', textColor: '#ffffff', secondaryTextColor: '#c7c7c7', alignment: 'left', animation: 'scale' },
];

export const getTemplate = (id: string | undefined) => templates.find((template) => template.id === id);

let sceneSequence = 0;
export const createSceneId = () => `scene-${Date.now().toString(36)}-${(sceneSequence += 1).toString(36)}`;
export const createScene = (creative: SceneCreativeInput, id = createSceneId()): ReelScene => reelSceneSchema.parse({ id, ...creative });

export const createProject = (template: ReelTemplate, now = Date.now()): ReelProject => ({
  version: 3,
  templateId: template.id,
  scenes: [createScene({ title: template.title, subtitle: template.subtitle, accent: template.accent, background: template.background, textColor: template.textColor, secondaryTextColor: template.secondaryTextColor, alignment: template.alignment, duration: template.duration, animation: template.animation }, `scene-${now.toString(36)}-1`)],
  updatedAt: now,
});

const versionTwoSceneSchema = z.object({
  id: z.string().min(1).max(80), title: z.string(), subtitle: z.string(), accent: z.string(), background: z.string(),
  alignment: z.enum(['left', 'center']), duration: z.number(), animation: z.enum(ANIMATIONS),
}).strict();
const versionTwoProjectSchema = z.object({
  version: z.literal(2), templateId: z.enum(['signal', 'editorial', 'metric']),
  scenes: z.array(versionTwoSceneSchema).min(1).max(8), updatedAt: z.number().int().nonnegative(),
}).strict();

export const migrateProjectDocument = (input: unknown): ReelProject | null => {
  const current = projectSchema.safeParse(input);
  if (current.success) return current.data;
  const previous = versionTwoProjectSchema.safeParse(input);
  if (!previous.success) return null;
  const migrated = projectSchema.safeParse({
    ...previous.data,
    version: 3,
    scenes: previous.data.scenes.map((scene) => ({
      ...scene,
      textColor: getReadableTextColor(scene.background),
      secondaryTextColor: getSecondaryTextColor(scene.background),
    })),
  });
  return migrated.success ? migrated.data : null;
};

export const getProjectDuration = (project: ReelProject) => project.scenes.reduce((total, scene) => total + scene.duration, 0);

export const updateProject = (project: ReelProject, update: Partial<Pick<ReelProject, 'scenes'>>, now = Date.now()): ReelProject =>
  projectSchema.parse({ ...project, ...update, updatedAt: now });

export const safeProject = (input: unknown) => projectSchema.safeParse(input);
