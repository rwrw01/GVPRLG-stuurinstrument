import { catalogusToevoegen } from '@/src/integration/catalogusRoutes';
import { NieuweAsSchema } from '@/src/integration/catalogusSchemas';

/** Adds a as to the catalogue (beheerder only); see api/specs/gvprlg.yaml. */
export const POST = catalogusToevoegen('as', NieuweAsSchema);
