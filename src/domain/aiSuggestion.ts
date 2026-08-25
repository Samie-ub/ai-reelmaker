import { z } from 'zod';
import { ACCENTS, ANIMATIONS, BACKGROUNDS, sceneCreativeSchema } from './project';

export const aiReelSuggestionSchema = z.object({ scenes: z.array(sceneCreativeSchema).min(1).max(6) }).strict();
export type AiReelSuggestion = z.infer<typeof aiReelSuggestionSchema>;

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
  properties: { scenes: { type: 'array', minItems: 1, maxItems: 6, items: sceneJsonSchema, description: 'An ordered sequence that develops one coherent short-form story.' } },
  required: ['scenes'],
} as const;
