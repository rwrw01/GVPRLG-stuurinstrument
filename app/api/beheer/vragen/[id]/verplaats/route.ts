import { catalogusVerplaatsen } from '@/src/integration/catalogusRoutes';

/** Moves a vraag one place up or down (beheerder only); see api/specs/gvprlg.yaml. */
export const POST = catalogusVerplaatsen('vraag');
