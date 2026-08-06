import { z } from 'zod';

export const projectSchema = z.object({
  version: z.literal(1),
  templateId: z.enum(['signal', 'editorial', 'metric']),
  title: z.string().trim().min(1, 'Add a headline').max(72, 'Keep the headline under 72 characters'),
  subtitle: z.string().trim().max(120, 'Keep supporting text under 120 characters'),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  alignment: z.enum(['left', 'center']),
  duration: z.number().int().min(6).max(30),
  updatedAt: z.number().int().nonnegative(),
});

export type ReelProject = z.infer<typeof projectSchema>;
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
  alignment: ReelProject['alignment'];
};

export const templates: ReelTemplate[] = [
  {
    id: 'signal',
    name: 'Signal Launch',
    category: 'Launch',
    description: 'A sharp reveal for launches, announcements, and high-energy hooks.',
    duration: 10,
    title: 'Turn the idea\ninto momentum.',
    subtitle: 'A clean launch sequence built to stop the scroll.',
    accent: '#faff69',
    alignment: 'left',
  },
  {
    id: 'editorial',
    name: 'Quiet Editorial',
    category: 'Editorial',
    description: 'Measured type and calm pacing for stories that deserve attention.',
    duration: 12,
    title: 'Make space for\nthe real story.',
    subtitle: 'A restrained editorial frame for thoughtful narratives.',
    accent: '#ffffff',
    alignment: 'center',
  },
  {
    id: 'metric',
    name: 'Metric Proof',
    category: 'Insights',
    description: 'A number-led format for results, insights, and before-after proof.',
    duration: 8,
    title: '3.4× faster',
    subtitle: 'From first cut to a publish-ready vertical video.',
    accent: '#faff69',
    alignment: 'left',
  },
];

export const getTemplate = (id: string | undefined) => templates.find((template) => template.id === id);

export const createProject = (template: ReelTemplate, now = Date.now()): ReelProject => ({
  version: 1,
  templateId: template.id,
  title: template.title,
  subtitle: template.subtitle,
  accent: template.accent,
  alignment: template.alignment,
  duration: template.duration,
  updatedAt: now,
});

export const updateProject = (
  project: ReelProject,
  update: Partial<Omit<ReelProject, 'version' | 'templateId' | 'updatedAt'>>,
  now = Date.now(),
): ReelProject => projectSchema.parse({ ...project, ...update, updatedAt: now });

export const safeProject = (input: unknown) => projectSchema.safeParse(input);
