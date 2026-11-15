import { catalogusToevoegen } from '@/src/integration/catalogusRoutes';
import { NieuwPlatformSchema } from '@/src/integration/catalogusSchemas';

/** Adds a platform to the catalogue (beheerder only); see api/specs/gvprlg.yaml. */
export const POST = catalogusToevoegen('platform', NieuwPlatformSchema);
