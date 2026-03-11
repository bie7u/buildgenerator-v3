import React from 'react'

export default function Elevator({ element }) {
  return (
    <div className="p-2 text-sm">
      <div className="text-blue-400 font-medium">Winda</div>
      <div className="text-slate-400 text-xs mt-1">Pojemność: {element?.properties?.capacity || 4} os.</div>
    </div>
  )
}
