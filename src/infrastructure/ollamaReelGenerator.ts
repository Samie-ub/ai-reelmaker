import { z } from 'zod';
import {
  aiReelSuggestionJsonSchema,
  aiReelSuggestionSchema,
  type AiReelSuggestion,
} from '../domain/aiSuggestion';
import type { TemplateId } from '../domain/project';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const MODEL = 'llama3.2:latest';
const REQUEST_TIMEOUT_MS = 60_000;

const ollamaResponseSchema = z.object({
  message: z.object({ content: z.string() }),
});

const templateGuidance: Record<TemplateId, string> = {
  signal: 'Signal is a sharp, high-energy announcement with a rotating accent block.',
  editorial: 'Editorial is calm, centered, restrained, and story-led.',
  metric: 'Metric is bold, number-led, and designed for a measurable result or proof point.',
};

export class ReelGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReelGenerationError';
  }
}

const createPrompt = (brief: string, templateId: TemplateId) => `
You are the creative director for a vertical 9:16 motion graphic.
${templateGuidance[templateId]}

Turn the user's brief into polished on-screen copy and art direction for this exact template.
Keep the headline punchy and readable. Use at most one newline in the headline.
Do not use markdown, hashtags, quotation marks around fields, or instructions to the user.
Return only data matching the supplied JSON schema.

User brief:
${brief.trim()}
`.trim();

export async function generateReelSuggestion(
  brief: string,
  templateId: TemplateId,
  fetcher: typeof fetch = fetch,
  baseUrl = DEFAULT_OLLAMA_URL,
): Promise<AiReelSuggestion> {
  if (!brief.trim()) throw new ReelGenerationError('Describe the reel you want to create.');

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetcher(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        format: aiReelSuggestionJsonSchema,
        messages: [{ role: 'user', content: createPrompt(brief, templateId) }],
        options: { temperature: 0.2, num_predict: 256 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new ReelGenerationError(`Ollama could not find ${MODEL}. Run: ollama pull llama3.2`);
      }
      throw new ReelGenerationError(`Ollama returned an error (${response.status}). Try again.`);
    }

    const envelope = ollamaResponseSchema.safeParse(await response.json());
    if (!envelope.success) throw new ReelGenerationError('Ollama returned an unexpected response.');

    let content: unknown;
    try {
      content = JSON.parse(envelope.data.message.content);
    } catch {
      throw new ReelGenerationError('Llama returned invalid JSON. Try generating again.');
    }

    const suggestion = aiReelSuggestionSchema.safeParse(content);
    if (!suggestion.success) {
      throw new ReelGenerationError('Llama returned an invalid reel plan. Try a shorter, clearer brief.');
    }
    return suggestion.data;
  } catch (error) {
    if (error instanceof ReelGenerationError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ReelGenerationError('Llama took too long to respond. Try again.');
    }
    throw new ReelGenerationError('Cannot reach Ollama. Make sure Ollama is running locally.');
  } finally {
    window.clearTimeout(timeout);
  }
}
