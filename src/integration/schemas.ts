import { z } from 'zod';
import { CONFIG } from '../service/config';

const ALLE_VRAAG_IDS = CONFIG.assen.flatMap((a) => a.vragen.map((v) => v.id));

export const CreateMetingSchema = z.object({
  jaar: z.number().int().min(2020).max(2100),
});

export const VraagScoreInputSchema = z.object({
  vraagId: z.enum(ALLE_VRAAG_IDS as [string, ...string[]]),
  score: z.number().int().min(1).max(5).nullable(),
  toelichting: z.string().max(2000).default(''),
});

export const SavePlatformScoreSchema = z.object({
  status: z.enum(['concept', 'definitief']),
  algemeneToelichting: z.string().max(5000).default(''),
  vraagScores: z.array(VraagScoreInputSchema).max(ALLE_VRAAG_IDS.length),
});

export const RouteParamsSchema = z.object({
  jaar: z.string().regex(/^\d{4}$/, 'jaar moet een viercijferig getal zijn').transform(Number).pipe(z.number().int().min(2020).max(2100)),
  platformId: z.string().min(1).max(64),
});
