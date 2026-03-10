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
]

export default function ElementToolbar() {
  const { activeTool, setActiveTool, setViewMode } = useBuildingStore()

  const handleToolClick = (toolId) => {
    setActiveTool(toolId)
    if (toolId === 'draw-outline') {
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
