import { z } from 'zod';

export const AI_ACCENTS = ['#faff69', '#ffffff', '#22c55e', '#3b82f6'] as const;

export const aiReelSuggestionSchema = z.object({
  title: z.string().trim().min(1).max(72),
  subtitle: z.string().trim().max(120),
  accent: z.enum(AI_ACCENTS),
  alignment: z.enum(['left', 'center']),
  duration: z.number().int().min(6).max(30),
}).strict();

export type AiReelSuggestion = z.infer<typeof aiReelSuggestionSchema>;

export const aiReelSuggestionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 72,
      description: 'A concise reel headline. Use at most one newline to control line wrapping.',
    },
    subtitle: {
      type: 'string',
      maxLength: 120,
      description: 'Supporting copy that adds useful context without repeating the headline.',
    },
    accent: {
      type: 'string',
      enum: AI_ACCENTS,
      description: 'The accent color that best supports the requested mood.',
    },
    alignment: {
      type: 'string',
      enum: ['left', 'center'],
    },
    duration: {
      type: 'integer',
      minimum: 6,
      maximum: 30,
      description: 'Video duration in seconds.',
    },
  },
  required: ['title', 'subtitle', 'accent', 'alignment', 'duration'],
} as const;
