// src/components/Skeleton.jsx — loading placeholders animados
// Uso:
//   <Skeleton width={120} height={14} />            // primitivo
//   <SkeletonCard />                                 // preset KPI card
//   <SkeletonTable rows={5} />                       // preset linha de tabela
//
// Adicione esta keyframe no index.css (ou em ResetCSS global):
//   @keyframes clvShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

import { C } from '../lib/constants'

export function Skeleton({ width = '100%', height = 14, radius = 6, style }) {
  return (
    <span style={{
      display: 'inline-block', width, height,
      borderRadius: radius,
      background: `linear-gradient(90deg, ${C.cardHi} 0%, ${C.card} 50%, ${C.cardHi} 100%)`,
      backgroundSize: '200% 100%',
      animation: 'clvShimmer 1.4s ease-in-out infinite',
      ...style,
    }}/>
  )
}

export function SkeletonCard() {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
      <Skeleton width={80}  height={11}/>
      <div style={{ marginTop: 14 }}><Skeleton width={120} height={28}/></div>
      <div style={{ marginTop: 10 }}><Skeleton width={60}  height={12}/></div>
      <div style={{ marginTop: 18 }}><Skeleton width="100%" height={36} radius={4}/></div>
    </div>
  )
}

export function SkeletonTable({ rows = 4 }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 12 }}>
        <Skeleton width={120} height={11}/>
        <div style={{ flex: 1 }}/>
        <Skeleton width={60} height={11}/>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: '14px 18px', borderBottom: i < rows - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Skeleton width={28} height={28} radius={6}/>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton width="55%" height={11}/>
            <Skeleton width="30%" height={9}/>
          </div>
          <Skeleton width={50} height={20} radius={999}/>
        </div>
      ))}
    </div>
  )
}
