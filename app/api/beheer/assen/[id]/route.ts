import { catalogusWijzigen } from '@/src/integration/catalogusRoutes';
import { AsWijzigingSchema } from '@/src/integration/catalogusSchemas';

/** Changes, removes (vervallen) or restores a as (beheerder only); see api/specs/gvprlg.yaml. */
export const PATCH = catalogusWijzigen('as', AsWijzigingSchema);
