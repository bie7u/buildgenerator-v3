import React, { useState, useEffect } from 'react'
import useBuildingStore from '../../store/buildingStore'
import { ELEMENT_NAMES } from '../../utils/buildingUtils'

export default function PropertiesPanel() {
  const { elements, selectedElementId, updateElement, removeElement, setSelectedElementId, building, updateBuilding } = useBuildingStore()
  const element = elements.find((e) => e.id === selectedElementId)

  const [form, setForm] = useState({})

  useEffect(() => {
    if (element) {
      setForm({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        depth: element.depth,
        floor: element.floor,
        ...element.properties,
      })
    }
  }, [element])

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    const { x, y, width, height, depth, floor, ...props } = form
    updateElement(selectedElementId, {
      x: parseFloat(x),
      y: parseFloat(y),
      width: parseFloat(width),
      height: parseFloat(height),
      depth: parseFloat(depth),
      floor: parseInt(floor),
      properties: props,
    })
  }

  const handleDelete = () => {
    removeElement(selectedElementId)
    setSelectedElementId(null)
  }

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-slate-700">
        <h2 className="font-semibold text-slate-200">Właściwości budynku</h2>
      </div>
      <div className="p-4 space-y-3 border-b border-slate-700">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Nazwa budynku</label>
          <input
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={building.name}
            onChange={(e) => updateBuilding({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Szerokość (m)</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.width}
              onChange={(e) => updateBuilding({ width: parseFloat(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Głębokość (m)</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.depth}
              onChange={(e) => updateBuilding({ depth: parseFloat(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Piętra</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.floors}
              min="1"
              onChange={(e) => updateBuilding({ floors: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Wys. piętra (m)</label>
            <input
              type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.floorHeight}
              onChange={(e) => updateBuilding({ floorHeight: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>
      </div>

      {element ? (
        <div className="p-4 space-y-3 flex-1">
          <h3 className="font-semibold text-blue-400">
            {ELEMENT_NAMES[element.type] || element.type}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {['x', 'y', 'width', 'height', 'depth', 'floor'].map((key) => (
              <div key={key}>
                <label className="text-xs text-slate-400 block mb-1 capitalize">{key}</label>
                <input
                  type="number"
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={form[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          {element.type === 'staircase' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Liczba stopni</label>
              <input
                type="number"
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={form.steps ?? 18}
                onChange={(e) => handleChange('steps', e.target.value)}
              />
            </div>
          )}
          {element.type === 'window' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Typ okna</label>
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={form.style ?? 'standard'}
                onChange={(e) => handleChange('style', e.target.value)}
              >
                <option value="standard">Standardowe</option>
                <option value="panoramic">Panoramiczne</option>
                <option value="skylight">Świetlik</option>
                <option value="bay">Wykuszowe</option>
              </select>
            </div>
          )}
          {element.type === 'balcony' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Balustrada</label>
              <select
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={form.railing ?? 'glass'}
                onChange={(e) => handleChange('railing', e.target.value)}
              >
                <option value="glass">Szklana</option>
                <option value="steel">Stalowa</option>
                <option value="concrete">Betonowa</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded transition-colors"
            >
              Zapisz
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm py-1.5 rounded transition-colors"
            >
              Usuń
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-slate-500 text-sm">
          Kliknij element na planie, aby edytować jego właściwości.
        </div>
      )}
    </div>
  )
}
