import { z } from 'zod';
import type { AiGenerationMode, AiGenerationResult } from '../domain/aiSuggestion';
import { reelSceneSchema, type ReelProject, type TemplateId } from '../domain/project';
import { cloudProjectRepository } from './cloudProjectRepository';
import { createEmbedding, EMBEDDING_MODEL } from './ollamaEmbedding';

const APPLIED_GENERATION_KEY = 'reelmaker.ai.applied-generation.v1';
const appliedGenerationSchema = z.object({
  generationId: z.string().min(1),
  mode: z.enum(['project', 'scene']),
  templateId: z.enum(['signal', 'editorial', 'metric']),
  generatedScenes: z.array(reelSceneSchema).min(1).max(8),
  recordedAt: z.number().int().nonnegative(),
}).strict();

export const projectMemoryText = (project: ReelProject) => [
  `Template: ${project.templateId}`,
  ...project.scenes.map((scene, index) => `Scene ${index + 1}: ${scene.title.replace('\n', ' ')} | ${scene.subtitle} | ${scene.duration}s | ${scene.animation} | ${scene.alignment} | accent ${scene.accent} | background ${scene.background} | text ${scene.textColor} | supporting text ${scene.secondaryTextColor}`),
].join('\n');

const editedFields = (generatedScenes: ReelProject['scenes'], currentScenes: ReelProject['scenes']) => {
  const fields = new Set<string>();
  const currentById = new Map(currentScenes.map((scene) => [scene.id, scene]));
  if (generatedScenes.length !== currentScenes.length) fields.add('scenes');
  if (generatedScenes.some((scene, index) => scene.id !== currentScenes[index]?.id)) fields.add('scenes');
  for (const generated of generatedScenes) {
    const current = currentById.get(generated.id);
    if (!current) { fields.add('scenes'); continue; }
    for (const field of ['title', 'subtitle', 'accent', 'background', 'textColor', 'secondaryTextColor', 'alignment', 'duration', 'animation'] as const) {
      if (generated[field] !== current[field]) fields.add(field);
    }
  }
  return [...fields];
};

const readAppliedGeneration = () => {
  try {
    return appliedGenerationSchema.safeParse(JSON.parse(window.localStorage.getItem(APPLIED_GENERATION_KEY) ?? 'null'));
  } catch {
    return appliedGenerationSchema.safeParse(null);
  }
};

class AiMemoryService {
  async findRelevantMemories(brief: string, templateId: TemplateId, mode: AiGenerationMode) {
    if (!cloudProjectRepository.isConfigured()) return [];
    try {
      const embedding = await createEmbedding(brief);
      return await cloudProjectRepository.findMemories(embedding, EMBEDDING_MODEL, templateId, mode);
    } catch { return []; }
  }

  async recordGeneration(project: ReelProject, mode: AiGenerationMode, prompt: string, result: AiGenerationResult) {
    if (!cloudProjectRepository.isConfigured()) return null;
    try {
      return await cloudProjectRepository.recordGeneration(project, mode, prompt, result);
    }
    catch { return null; }
  }

  trackAppliedGeneration(project: ReelProject, generationId: string | null, mode: AiGenerationMode) {
    if (!generationId) return;
    window.localStorage.setItem(APPLIED_GENERATION_KEY, JSON.stringify({
      generationId, mode, templateId: project.templateId,
      generatedScenes: project.scenes, recordedAt: Date.now(),
    }));
  }

  async rememberExport(project: ReelProject) {
    if (!cloudProjectRepository.isConfigured()) return null;
    try {
      const content = projectMemoryText(project);
      const embedding = await createEmbedding(content);
      const lineage = readAppliedGeneration();
      const applied = lineage.success && lineage.data.templateId === project.templateId ? lineage.data : null;
      const memoryId = await cloudProjectRepository.recordExportMemory(
        project, content, embedding, EMBEDDING_MODEL,
        applied?.generationId ?? null, applied?.mode ?? null,
      );
      if (applied) {
        await cloudProjectRepository.recordGenerationFeedback(applied.generationId, 'exported', editedFields(applied.generatedScenes, project.scenes));
        window.localStorage.removeItem(APPLIED_GENERATION_KEY);
      }
      return memoryId;
    } catch { return null; }
  }
}

export const aiMemory = new AiMemoryService();
