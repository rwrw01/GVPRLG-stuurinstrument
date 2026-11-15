import { catalogusToevoegen } from '@/src/integration/catalogusRoutes';
import { NieuweVraagSchema } from '@/src/integration/catalogusSchemas';

/** Adds a vraag to the catalogue (beheerder only); see api/specs/gvprlg.yaml. */
export const POST = catalogusToevoegen('vraag', NieuweVraagSchema);
