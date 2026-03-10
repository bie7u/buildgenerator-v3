import React from 'react'

export default function Wall({ element }) {
  return (
    <div className="p-2 text-sm">
      <div className="text-gray-300 font-medium">Ścianka działowa</div>
      <div className="text-slate-400 text-xs mt-1">Materiał: {element?.properties?.material || 'gips'}</div>
    </div>
  )
}
