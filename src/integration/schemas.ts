import { z } from 'zod';

export const CreateMetingSchema = z.object({
  jaar: z.number().int().min(2020).max(2100),
});

export const VraagScoreInputSchema = z.object({
  vraagId: z.string().min(1).max(100),
  score: z.number().int().min(1).max(5).nullable(),
  toelichting: z.string().max(2000).default(''),
});

export const SavePlatformScoreSchema = z.object({
  status: z.enum(['concept', 'definitief']),
  algemeneToelichting: z.string().max(5000).default(''),
  vraagScores: z.array(VraagScoreInputSchema),
});
