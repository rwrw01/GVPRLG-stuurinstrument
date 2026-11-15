import { z } from 'zod';

/** Upper bound on the questions one save may carry; the year's list is checked in the transaction. */
const MAX_VRAGEN = 200;

export const CreateMetingSchema = z.object({
  jaar: z.number().int().min(2020).max(2100),
});

export const VraagScoreInputSchema = z.object({
  // Format only: whether the question belongs to the year's list is checked at save time.
  vraagId: z.string().min(1).max(64),
  score: z.number().int().min(1).max(5).nullable(),
  toelichting: z.string().max(2000).default(''),
});

export const SaveBusinessUnitScoreSchema = z.object({
  status: z.enum(['concept', 'definitief']),
  algemeneToelichting: z.string().max(5000).default(''),
  aanwezigen: z.string().max(2000).default(''),
  vraagScores: z
    .array(VraagScoreInputSchema)
    .max(MAX_VRAGEN)
    .refine((lijst) => new Set(lijst.map((v) => v.vraagId)).size === lijst.length, { message: 'Elke vraag mag maar één keer voorkomen.' }),
});

const JaarParamSchema = z
  .string()
  .regex(/^\d{4}$/, 'jaar moet een viercijferig getal zijn')
  .transform(Number)
  .pipe(z.number().int().min(2020).max(2100));

export const RouteParamsSchema = z.object({
  jaar: JaarParamSchema,
  businessUnitId: z.string().min(1).max(64),
});

export const JaarParamsSchema = z.object({ jaar: JaarParamSchema });
