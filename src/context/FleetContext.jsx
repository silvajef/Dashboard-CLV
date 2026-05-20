import { createContext, useContext } from 'react'
import { useFleetData } from '../hooks/useFleetData'

const FleetCtx = createContext(null)

/**
 * FleetProvider — envolve a aplicação autenticada e expõe useFleetData()
 * via contexto, eliminando a necessidade de prop drilling para dados de frota.
 * Uso: const fleet = useFleet()
 */
export function FleetProvider({ children }) {
  const fleet = useFleetData()
  return <FleetCtx.Provider value={fleet}>{children}</FleetCtx.Provider>
}

export const useFleet = () => useContext(FleetCtx)
