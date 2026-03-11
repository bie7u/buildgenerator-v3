import React from 'react'

export default function Staircase({ element }) {
  return (
    <div className="p-2 text-sm">
      <div className="text-orange-400 font-medium">Klatka schodowa</div>
      <div className="text-slate-400 text-xs mt-1">Stopni: {element?.properties?.steps || 18}</div>
      <div className="text-slate-400 text-xs">Podest: {element?.properties?.hasLanding ? 'Tak' : 'Nie'}</div>
    </div>
  )
}
