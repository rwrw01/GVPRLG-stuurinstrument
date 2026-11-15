import { catalogusWijzigen } from '@/src/integration/catalogusRoutes';
import { VraagWijzigingSchema } from '@/src/integration/catalogusSchemas';

/** Changes, removes (vervallen) or restores a vraag (beheerder only); see api/specs/gvprlg.yaml. */
export const PATCH = catalogusWijzigen('vraag', VraagWijzigingSchema);
