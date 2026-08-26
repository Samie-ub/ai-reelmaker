import type { AiReelSuggestion } from '../domain/aiSuggestion';
import type { ReelProject } from '../domain/project';
import { cloudProjectRepository, type RetrievedMemory } from './cloudProjectRepository';
import { createEmbedding, EMBEDDING_MODEL } from './ollamaEmbedding';

export const projectMemoryText = (project: ReelProject) => [
  `Template: ${project.templateId}`,
  ...project.scenes.map((scene, index) => `Scene ${index + 1}: ${scene.title.replace('\n', ' ')} | ${scene.subtitle} | ${scene.duration}s | ${scene.animation} | ${scene.alignment} | accent ${scene.accent} | background ${scene.background}`),
].join('\n');

export const addMemoriesToBrief = (brief: string, memories: RetrievedMemory[]) => {
  if (!memories.length) return brief;
  const examples = memories.map((memory, index) => `Example ${index + 1} (similarity ${memory.similarity.toFixed(2)}):\n${memory.content}`).join('\n\n');
  return `${brief}\n\nUse these previously exported reels as style and structure references. Do not copy wording verbatim.\n${examples}`;
};

class AiMemoryService {
  private latestGenerationId: string | null = null;

  async enrichBrief(brief: string) {
    if (!cloudProjectRepository.isConfigured()) return brief;
    try {
      const embedding = await createEmbedding(brief);
      return addMemoriesToBrief(brief, await cloudProjectRepository.findMemories(embedding, EMBEDDING_MODEL));
    } catch { return brief; }
  }

  async recordGeneration(project: ReelProject, mode: 'project' | 'scene', prompt: string, response: AiReelSuggestion) {
    if (!cloudProjectRepository.isConfigured()) return null;
    try {
      const generationId = await cloudProjectRepository.recordGeneration(project, mode, prompt, response);
      this.latestGenerationId = generationId;
      return generationId;
    }
    catch { return null; }
  }

  async rememberExport(project: ReelProject) {
    if (!cloudProjectRepository.isConfigured()) return null;
    try {
      const content = projectMemoryText(project);
      const embedding = await createEmbedding(content);
      const memoryId = await cloudProjectRepository.recordExportMemory(project, content, embedding, EMBEDDING_MODEL);
      if (this.latestGenerationId) {
        await cloudProjectRepository.recordGenerationFeedback(this.latestGenerationId, 'exported');
        this.latestGenerationId = null;
      }
      return memoryId;
    } catch { return null; }
  }
}

export const aiMemory = new AiMemoryService();
