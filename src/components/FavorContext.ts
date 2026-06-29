import { createContext, useContext } from 'react'
import type { FavorInfo } from '../lib/odds'
import { canonicalTeamName } from '../data/teams'

/** Lookup of live favoredness by (any spelling of) team name. */
export type FavorLookup = (team: string) => FavorInfo | undefined

const FavorContext = createContext<FavorLookup>(() => undefined)

export const FavorProvider = FavorContext.Provider

/** Returns a resolver that canonicalises the name before looking up. */
export function useFavor(): FavorLookup {
  const lookup = useContext(FavorContext)
  return (team: string) => lookup(canonicalTeamName(team))
}
