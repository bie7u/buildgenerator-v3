import React from 'react'

export default function Balcony({ element }) {
  return (
    <div className="p-2 text-sm">
      <div className="text-green-400 font-medium">Balkon</div>
      <div className="text-slate-400 text-xs mt-1">Balustrada: {element?.properties?.railing || 'szklana'}</div>
    </div>
  )
}
