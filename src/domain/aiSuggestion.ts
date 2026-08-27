import { z } from 'zod';
import { ACCENTS, ANIMATIONS, BACKGROUNDS, sceneCreativeSchema, type ReelProject } from './project';

export const AI_PROMPT_VERSION = 'reelmaker-v2';
export const AI_GENERATION_MODEL = 'llama3.2:latest';

export type AiGenerationMode = 'project' | 'scene';
export type AiMemoryReference = { content: string; similarity: number };

type AiGenerationRequestBase = {
  userPrompt: string;
  project: ReelProject;
  memories?: AiMemoryReference[];
};

export type AiGenerationRequest =
  | (AiGenerationRequestBase & { mode: 'project'; selectedSceneId?: never })
  | (AiGenerationRequestBase & { mode: 'scene'; selectedSceneId: string });

export const aiReelSuggestionSchema = z.object({
  scenes: z.array(sceneCreativeSchema).min(1).max(5),
  warnings: z.array(z.string().trim().min(1).max(160)).max(3),
}).strict();
export type AiReelSuggestion = z.infer<typeof aiReelSuggestionSchema>;

export type AiGenerationResult = {
  suggestion: AiReelSuggestion;
  model: typeof AI_GENERATION_MODEL;
  promptVersion: typeof AI_PROMPT_VERSION;
};

const sceneJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 72, description: 'Punchy on-screen headline with at most one newline.' },
    subtitle: { type: 'string', maxLength: 120, description: 'Useful supporting copy that does not repeat the headline.' },
    accent: { type: 'string', enum: ACCENTS }, background: { type: 'string', enum: BACKGROUNDS },
    alignment: { type: 'string', enum: ['left', 'center'] }, duration: { type: 'integer', minimum: 2, maximum: 15 },
    animation: { type: 'string', enum: ANIMATIONS },
  },
  required: ['title', 'subtitle', 'accent', 'background', 'alignment', 'duration', 'animation'],
} as const;

export const aiReelSuggestionJsonSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    scenes: { type: 'array', minItems: 1, maxItems: 5, items: sceneJsonSchema, description: 'An ordered sequence that develops one coherent short-form story.' },
    warnings: { type: 'array', maxItems: 3, items: { type: 'string', minLength: 1, maxLength: 160 }, description: 'Unsupported requested capabilities that were omitted. Return an empty array when none were requested.' },
  },
  required: ['scenes', 'warnings'],
} as const;

export const aiSceneSuggestionJsonSchema = {
  ...aiReelSuggestionJsonSchema,
  properties: {
    ...aiReelSuggestionJsonSchema.properties,
    scenes: { ...aiReelSuggestionJsonSchema.properties.scenes, minItems: 1, maxItems: 1, description: 'Exactly one replacement for the selected scene.' },
  },
} as const;
