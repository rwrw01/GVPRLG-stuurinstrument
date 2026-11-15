import { catalogusWijzigen } from '@/src/integration/catalogusRoutes';
import { BusinessUnitWijzigingSchema } from '@/src/integration/catalogusSchemas';

/** Changes, removes (vervallen) or restores a businessunit (beheerder only); see api/specs/gvprlg.yaml. */
export const PATCH = catalogusWijzigen('businessunit', BusinessUnitWijzigingSchema);
