import { z } from 'zod';
import { migrateProjectDocument, projectSchema, reelSceneSchema, type ReelProject } from '../domain/project';

export interface ProjectRepository { load(): ReelProject | null; save(project: ReelProject): void; clear(): void; }

const STORAGE_KEY = 'reelmaker.project.v3';
const VERSION_TWO_STORAGE_KEY = 'reelmaker.project.v2';
const LEGACY_STORAGE_KEY = 'reelmaker.project.v1';
const legacyProjectSchema = z.object({ version: z.literal(1), templateId: z.enum(['signal', 'editorial', 'metric']), title: z.string(), subtitle: z.string(), accent: z.string(), alignment: z.enum(['left', 'center']), duration: z.number(), updatedAt: z.number() });

const migrateLegacyProject = (input: unknown): ReelProject | null => {
  const legacy = legacyProjectSchema.safeParse(input);
  if (!legacy.success) return null;
  const scene = reelSceneSchema.safeParse({
    id: `scene-${legacy.data.updatedAt.toString(36)}-1`, title: legacy.data.title, subtitle: legacy.data.subtitle,
    accent: legacy.data.accent, background: legacy.data.templateId === 'editorial' ? '#ededeb' : '#0a0a0a', alignment: legacy.data.alignment,
    duration: legacy.data.duration, animation: legacy.data.templateId === 'editorial' ? 'fade' : legacy.data.templateId === 'metric' ? 'scale' : 'rise',
  });
  return scene.success ? { version: 3, templateId: legacy.data.templateId, scenes: [scene.data], updatedAt: legacy.data.updatedAt } : null;
};

export class LocalProjectRepository implements ProjectRepository {
  load(): ReelProject | null {
    try {
      const currentRaw = window.localStorage.getItem(STORAGE_KEY);
      if (currentRaw) {
        const current = migrateProjectDocument(JSON.parse(currentRaw));
        if (current) return current;
        window.localStorage.removeItem(STORAGE_KEY);
      }
      const versionTwoRaw = window.localStorage.getItem(VERSION_TWO_STORAGE_KEY);
      if (versionTwoRaw) {
        const migrated = migrateProjectDocument(JSON.parse(versionTwoRaw));
        window.localStorage.removeItem(VERSION_TWO_STORAGE_KEY);
        if (migrated) { this.save(migrated); return migrated; }
      }
      const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacyRaw) return null;
      const migrated = migrateLegacyProject(JSON.parse(legacyRaw));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      if (!migrated) return null;
      this.save(migrated);
      return migrated;
    } catch { return null; }
  }

  save(project: ReelProject): void { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projectSchema.parse(project))); }
  clear(): void { window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(VERSION_TWO_STORAGE_KEY); window.localStorage.removeItem(LEGACY_STORAGE_KEY); }
}

export const projectRepository = new LocalProjectRepository();
