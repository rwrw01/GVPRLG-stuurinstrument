/** Route context of `/api/beheer/gebruikers/[id]` and its sub-routes. */
export interface GebruikerRouteParams {
  params: Promise<{ id: string }>;
}
