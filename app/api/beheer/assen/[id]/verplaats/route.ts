import { catalogusVerplaatsen } from '@/src/integration/catalogusRoutes';

/** Moves a as one place up or down (beheerder only); see api/specs/gvprlg.yaml. */
export const POST = catalogusVerplaatsen('as');
