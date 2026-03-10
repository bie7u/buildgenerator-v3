import React from 'react'
import useBuildingStore from '../../store/buildingStore'

const tools = [
  { id: 'select', label: 'Kursor', icon: '↖' },
  { id: 'add-staircase', label: 'Klatka schodowa', icon: '🪜' },
  { id: 'add-elevator', label: 'Winda', icon: '🛗' },
  { id: 'add-window', label: 'Okno', icon: '🪟' },
  { id: 'add-balcony', label: 'Balkon', icon: '🏠' },
  { id: 'add-column', label: 'Kolumna', icon: '⬜' },
  { id: 'add-wall', label: 'Ścianka', icon: '▬' },
]

export default function ElementToolbar() {
  const { activeTool, setActiveTool } = useBuildingStore()

  return (
    <>
      {tools.map((tool) => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => setActiveTool(tool.id)}
          className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-xs transition-colors ${
            activeTool === tool.id
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <span className="text-lg leading-none">{tool.icon}</span>
        </button>
      ))}
    </>
  )
}
