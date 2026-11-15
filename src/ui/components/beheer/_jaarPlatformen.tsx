'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { UiVragenlijst } from '../_vragenlijstTypen';

/** A platform that takes part in the chosen year, with the names of its business units. */
export interface JaarPlatform {
  id: string;
  naam: string;
  businessUnits: string[];
}

const JaarPlatformenContext = createContext<JaarPlatform[]>([]);

/**
 * The platforms of a year's list with their business unit names.
 * @param lijst - Questionnaire of the year, or null while loading
 * @returns the platforms in order (empty while loading)
 */
export function jaarPlatformen(lijst: UiVragenlijst | null): JaarPlatform[] {
  if (!lijst) return [];
  return lijst.platformen.map((p) => ({
    id: p.id,
    naam: p.naam,
    businessUnits: p.businessUnitIds.map((id) => lijst.businessUnits.find((b) => b.id === id)?.naam ?? id),
  }));
}

/**
 * Provides the platforms of the chosen year to the user table, the link editor and the add form.
 * @param props.platformen - Platforms of the chosen year
 * @param props.children - The user administration
 * @returns the provider
 */
export function JaarPlatformenProvider({ platformen, children }: { platformen: JaarPlatform[]; children: ReactNode }) {
  return <JaarPlatformenContext.Provider value={platformen}>{children}</JaarPlatformenContext.Provider>;
}

/**
 * The platforms of the chosen year.
 * @returns the platforms in order
 */
export function useJaarPlatformen(): JaarPlatform[] {
  return useContext(JaarPlatformenContext);
}
