import type { AiReelSuggestion } from '../domain/aiSuggestion';
import type { ReelProject } from '../domain/project';
import { ensureDatabaseUser, getSupabaseClient, isDatabaseConfigured } from './supabaseClient';

const CLOUD_PROJECT_KEY = 'reelmaker.cloud.project-id.v1';
export const GENERATION_MODEL = 'llama3.2:latest';

export type RetrievedMemory = { content: string; similarity: number };

class CloudProjectRepository {
  isConfigured() { return isDatabaseConfigured; }

  async saveProject(project: ReelProject): Promise<string | null> {
    const client = getSupabaseClient();
    if (!client) return null;
    const user = await ensureDatabaseUser();
    const document = structuredClone(project);
    const title = project.scenes[0]?.title.replace('\n', ' ') || 'Untitled reel';
    const update = { title, template_id: project.templateId, schema_version: project.version, document };
    const storedId = window.localStorage.getItem(CLOUD_PROJECT_KEY);

    if (storedId) {
      const { data, error } = await client.from('projects').update(update).eq('id', storedId).eq('owner_id', user.id).select('id').maybeSingle();
      if (error) throw error;
      if (data?.id) return data.id as string;
    }

    const { data, error } = await client.from('projects').insert({ ...update, owner_id: user.id }).select('id').single();
    if (error) throw error;
    const id = data.id as string;
    window.localStorage.setItem(CLOUD_PROJECT_KEY, id);
    return id;
  }

  async recordGeneration(project: ReelProject, mode: 'project' | 'scene', prompt: string, response: AiReelSuggestion) {
    const client = getSupabaseClient();
    if (!client) return null;
    const user = await ensureDatabaseUser();
    const projectId = await this.saveProject(project);
    if (!projectId) return null;
    const { data, error } = await client.from('ai_generations').insert({ project_id: projectId, owner_id: user.id, mode, model: GENERATION_MODEL, prompt, response }).select('id').single();
    if (error) throw error;
    return data.id as string;
  }

  async findMemories(embedding: number[], embeddingModel: string, limit = 4): Promise<RetrievedMemory[]> {
    const client = getSupabaseClient();
    if (!client) return [];
    await ensureDatabaseUser();
    const { data, error } = await client.rpc('match_reel_memories', { query_embedding: embedding, query_model: embeddingModel, match_count: limit });
    if (error) throw error;
    return (data ?? []).map((item: { content: string; similarity: number }) => ({ content: item.content, similarity: item.similarity }));
  }

  async recordExportMemory(project: ReelProject, content: string, embedding: number[], embeddingModel: string) {
    const client = getSupabaseClient();
    if (!client) return null;
    const user = await ensureDatabaseUser();
    const projectId = await this.saveProject(project);
    if (!projectId) return null;
    const { data: version, error: versionError } = await client.from('project_versions').insert({ project_id: projectId, owner_id: user.id, schema_version: project.version, document: structuredClone(project), source: 'export' }).select('id').single();
    if (versionError) throw versionError;
    const { data, error } = await client.from('reel_memories').insert({ project_id: projectId, project_version_id: version.id, owner_id: user.id, content, embedding, embedding_model: embeddingModel, quality_score: 1 }).select('id').single();
    if (error) throw error;
    return data.id as string;
  }
}

export const cloudProjectRepository = new CloudProjectRepository();
