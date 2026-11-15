import { catalogusToevoegen } from '@/src/integration/catalogusRoutes';
import { NieuweBusinessUnitSchema } from '@/src/integration/catalogusSchemas';

/** Adds a businessunit to the catalogue (beheerder only); see api/specs/gvprlg.yaml. */
export const POST = catalogusToevoegen('businessunit', NieuweBusinessUnitSchema);
