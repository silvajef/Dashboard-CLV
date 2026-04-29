/**
 * Dashboard CLV — Responsive Design System
 * Breakpoints e helpers para mobile/tablet/desktop
 */

export const BP = {
  sm:  480,   // smartphone portrait
  md:  768,   // smartphone landscape / tablet portrait
  lg:  1024,  // tablet landscape / small desktop
  xl:  1280,  // desktop
}

// Hook para largura da janela (sem deps externas)
import { useState, useEffect } from 'react'
export function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

export function useBreakpoint() {
  const w = useWindowWidth()
  return {
    isMobile:  w < BP.md,
    isTablet:  w >= BP.md && w < BP.lg,
    isDesktop: w >= BP.lg,
    width: w,
    // grid helpers
    cols: (mobile, tablet, desktop) => w < BP.md ? mobile : w < BP.lg ? tablet : desktop,
    val:  (mobile, tablet, desktop) => w < BP.md ? mobile : w < BP.lg ? tablet : desktop,
  }
}
