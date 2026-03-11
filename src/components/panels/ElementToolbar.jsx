import React from 'react'
import useBuildingStore from '../../store/buildingStore'

const tools = [
  {
    id: 'select',
    label: 'Wybierz',
    icon: '↖',
    description: 'Zaznacz i edytuj element',
  },
  {
    id: 'draw-outline',
    label: 'Kontur',
    icon: '✏️',
    description: 'Rysuj obrys budynku (rzut z góry)',
  },
  { divider: true },
  {
    id: 'add-staircase',
    label: 'Klatka',
    icon: '🪜',
    description: 'Klatka schodowa – schody przez wszystkie piętra',
  },
  {
    id: 'add-elevator',
    label: 'Winda',
    icon: '🛗',
    description: 'Winda osobowa w obrębie klatki',
  },
  {
    id: 'add-door',
    label: 'Drzwi',
    icon: '🚪',
    description: 'Drzwi wewnętrzne lub wejściowe',
  },
  {
    id: 'add-entrance',
    label: 'Wejście',
    icon: '🏛️',
    description: 'Główne wejście do budynku',
  },
  { divider: true },
  {
    id: 'add-window',
    label: 'Okno',
    icon: '🪟',
    description: 'Okno na wybranej wysokości i szerokości',
  },
  {
    id: 'add-balcony',
    label: 'Balkon',
    icon: '🏠',
    description: 'Balkon przy danym piętrze',
  },
  { divider: true },
  {
    id: 'add-column',
    label: 'Kolumna',
    icon: '⬜',
    description: 'Kolumna konstrukcyjna lub słup',
  },
  {
    id: 'add-wall',
    label: 'Ścianka',
    icon: '▬',
    description: 'Ścianka działowa lub przegroda',
  },
  {
    id: 'add-arc-wall',
    label: 'Łuk',
    icon: '◜',
    description: 'Ściana łukowa / zaokrąglona',
  },
]

export default function ElementToolbar() {
  const { activeTool, setActiveTool, setViewMode } = useBuildingStore()

  const handleToolClick = (toolId) => {
    setActiveTool(toolId)
    if (toolId === 'draw-outline') {
      setViewMode('plan')
    }
    // Placement tools: switch to floor plan view for interior elements
    if (
      ['add-staircase', 'add-elevator', 'add-door', 'add-entrance',
       'add-column', 'add-wall', 'add-arc-wall'].includes(toolId)
    ) {
      setViewMode('plan')
    }
  }

  return (
    <div className="w-full flex flex-col gap-0.5 px-1">
      {tools.map((tool, idx) => {
        if (tool.divider) {
          return <div key={`div-${idx}`} className="w-full h-px bg-slate-700 my-1" />
        }
        const isActive = activeTool === tool.id
        return (
          <button
            key={tool.id}
            title={tool.description}
            onClick={() => handleToolClick(tool.id)}
            className={`w-full py-2 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <span className="text-lg leading-none">{tool.icon}</span>
            <span className="text-[10px] leading-tight font-medium">{tool.label}</span>
          </button>
        )
      })}
    </div>
  )
}
