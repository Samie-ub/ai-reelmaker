import { z } from 'zod';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const EMBEDDING_MODEL = 'embeddinggemma:latest';
const embeddingResponseSchema = z.object({ embeddings: z.array(z.array(z.number())).min(1) });

export async function createEmbedding(input: string, fetcher: typeof fetch = fetch, baseUrl = DEFAULT_OLLAMA_URL): Promise<number[]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetcher(`${baseUrl}/api/embed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input, truncate: true }), signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Ollama embedding request failed (${response.status}).`);
    const parsed = embeddingResponseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.embeddings[0].length === 0) throw new Error('Ollama returned an invalid embedding.');
    return parsed.data.embeddings[0];
  } finally { window.clearTimeout(timeout); }
}
