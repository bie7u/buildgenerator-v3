import React from 'react'

const WINDOW_STYLES = {
  standard: 'Standardowe',
  panoramic: 'Panoramiczne',
  skylight: 'Świetlik',
  bay: 'Wykuszowe',
}

export default function Window({ element }) {
  return (
    <div className="p-2 text-sm">
      <div className="text-sky-400 font-medium">Okno</div>
      <div className="text-slate-400 text-xs mt-1">Typ: {WINDOW_STYLES[element?.properties?.style] || 'Standardowe'}</div>
    </div>
  )
}
