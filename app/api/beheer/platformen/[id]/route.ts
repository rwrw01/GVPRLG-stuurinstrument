import { catalogusWijzigen } from '@/src/integration/catalogusRoutes';
import { PlatformWijzigingSchema } from '@/src/integration/catalogusSchemas';

/** Changes, removes (vervallen) or restores a platform (beheerder only); see api/specs/gvprlg.yaml. */
export const PATCH = catalogusWijzigen('platform', PlatformWijzigingSchema);
