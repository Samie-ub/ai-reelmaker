import { projectSchema, type ReelProject } from '../domain/project';

export interface ProjectRepository {
  load(): ReelProject | null;
  save(project: ReelProject): void;
  clear(): void;
}

const STORAGE_KEY = 'reelmaker.project.v1';

export class LocalProjectRepository implements ProjectRepository {
  load(): ReelProject | null {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = projectSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  save(project: ReelProject): void {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projectSchema.parse(project)));
  }

  clear(): void {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export const projectRepository = new LocalProjectRepository();
