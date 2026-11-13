import { z } from 'zod';

import { AUDIT_ACTIES } from '../data/auditRepository';
import { CONFIG } from '../service/config';

const PLATFORM_IDS = CONFIG.platformen.map((p) => p.id);

const JaarSchema = z.number().int().min(2020).max(2100);
const RolSchema = z.enum(['invuller', 'beheerder']);

const PlatformIdsSchema = z
  .array(z.string())
  .max(PLATFORM_IDS.length)
  .refine((ids) => ids.every((id) => PLATFORM_IDS.includes(id)), { message: 'Onbekend platform' });

export const VoorzitterToevoegenSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  naam: z.string().trim().min(1).max(200),
  rol: RolSchema,
  jaar: JaarSchema,
  platformIds: PlatformIdsSchema,
});

export const GebruikerWijzigenSchema = z.discriminatedUnion('actie', [
  z.object({ actie: z.literal('rol'), rol: RolSchema }),
  z.object({ actie: z.literal('intrekken') }),
  z.object({ actie: z.literal('herstellen') }),
  z.object({ actie: z.literal('ontkoppelAccount') }),
]);

export const KoppelingenSchema = z.object({
  jaar: JaarSchema,
  platformIds: PlatformIdsSchema,
});

/** Query string of `GET /api/beheer/gebruikers`. */
export const GebruikersQuerySchema = z.object({
  jaar: z.coerce.number().pipe(JaarSchema),
});

/** Query string of `GET /api/audit`; numbers arrive as strings. */
export const AuditFilterSchema = z.object({
  jaar: z.coerce.number().pipe(JaarSchema).optional(),
  platformId: z.enum(PLATFORM_IDS as [string, ...string[]]).optional(),
  actor: z.string().min(1).max(64).optional(),
  actie: z.enum(AUDIT_ACTIES).optional(),
  limiet: z.coerce.number().int().min(1).max(500).default(200),
});

/** Route params of `/api/beheer/gebruikers/[id]` and its sub-routes. */
export const GebruikerIdParamsSchema = z.object({
  id: z.string().min(1).max(64),
});
