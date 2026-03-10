import React from 'react'

export default function Column({ element }) {
  return (
    <div className="p-2 text-sm">
      <div className="text-gray-400 font-medium">Kolumna</div>
      <div className="text-slate-400 text-xs mt-1">Materiał: {element?.properties?.material || 'beton'}</div>
    </div>
  )
}
