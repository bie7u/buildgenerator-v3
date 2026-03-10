import React from 'react'
import useBuildingStore from '../../store/buildingStore'

export default function Header() {
  const { building, viewMode, setViewMode, setWizardOpen, setActiveTool } = useBuildingStore()

  const switchView = (mode) => {
    setViewMode(mode)
    // leave draw-outline only in plan mode; otherwise switch to select
    if (mode !== 'plan') {
      setActiveTool('select')
    }
  }

  return (
    <header className="bg-slate-800 text-white h-14 flex items-center justify-between px-6 shadow-lg z-10">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-sm">BG</div>
        <h1 className="text-lg font-semibold">Generator Budynku</h1>
        <span className="text-slate-400 text-sm ml-2">{building.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setWizardOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1.5 rounded transition-colors"
        >
          Kreator
        </button>
        <div className="flex rounded overflow-hidden border border-slate-600">
          <button
            onClick={() => switchView('2d')}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === '2d' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            2D
          </button>
          <button
            onClick={() => switchView('plan')}
            title="Rzut poziomy – rysuj obrys budynku"
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'plan' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Rzut
          </button>
          <button
            onClick={() => switchView('3d')}
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === '3d' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            3D
          </button>
        </div>
      </div>
    </header>
  )
}
