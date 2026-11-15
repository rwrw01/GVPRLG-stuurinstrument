import { catalogusVerplaatsen } from '@/src/integration/catalogusRoutes';

/** Moves a businessunit one place up or down (beheerder only); see api/specs/gvprlg.yaml. */
export const POST = catalogusVerplaatsen('businessunit');
