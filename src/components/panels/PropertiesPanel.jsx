import React, { useState, useEffect } from 'react'
import useBuildingStore from '../../store/buildingStore'
import { ELEMENT_NAMES } from '../../utils/buildingUtils'

// ── Staircase Properties Sub-panel ───────────────────────────────────────────

function StaircasePanel({ sc, updateStaircase, removeStaircase, setSelectedStaircaseId }) {
  const [form, setForm] = useState({})

  useEffect(() => {
    if (sc) {
      setForm({ name: sc.name || '', ...sc.properties })
    }
  }, [sc])

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    const { name, ...props } = form
    updateStaircase(sc.id, {
      name,
      properties: {
        type: props.type || 'straight',
        stepsPerFlight: parseInt(props.stepsPerFlight) || 9,
        flights: parseInt(props.flights) || 2,
        stepWidth: parseFloat(props.stepWidth) || 1.2,
        stepDepth: parseFloat(props.stepDepth) || 0.28,
        stepHeight: parseFloat(props.stepHeight) || 0.175,
        hasElevator: !!props.hasElevator,
        hasBanister: !!props.hasBanister,
        landingDepth: parseFloat(props.landingDepth) || 1.2,
      },
    })
  }

  const handleDelete = () => {
    removeStaircase(sc.id)
    setSelectedStaircaseId(null)
  }

  if (!sc) return null

  const stairTypes = [
    { value: 'straight', label: '▲ Proste (jednotrampowe)' },
    { value: 'l-shaped', label: '⌐ L-kształtne (dwa biegi, kąt 90°)' },
    { value: 'u-shaped', label: '⊓ U-kształtne (dwa biegi równoległe)' },
    { value: 'spiral',   label: '🌀 Kręcone (spiralne)' },
  ]

  return (
    <div className="p-4 space-y-3 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-lg">🪜</span>
        <h3 className="font-semibold text-orange-400">Klatka schodowa</h3>
      </div>

      <div className="text-xs text-blue-300 bg-blue-950/40 border border-blue-800 rounded px-2 py-1.5">
        Przez wszystkie kondygnacje ({useBuildingStore.getState().building.floors} pięter)
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Nazwa klatki</label>
        <input
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
          value={form.name ?? ''}
          onChange={e => handleChange('name', e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Typ schodów</label>
        <select
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
          value={form.type ?? 'straight'}
          onChange={e => handleChange('type', e.target.value)}
        >
          {stairTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Stopni / bieg</label>
          <input type="number" min="3" max="20"
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={form.stepsPerFlight ?? 9}
            onChange={e => handleChange('stepsPerFlight', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Biegi / piętro</label>
          <input type="number" min="1" max="4"
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={form.flights ?? 2}
            onChange={e => handleChange('flights', e.target.value)} />
        </div>
      </div>

      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">Wymiary stopnia</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-slate-400 block mb-1">Szer. (m)</label>
          <input type="number" min="0.5" step="0.05"
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={form.stepWidth ?? 1.2}
            onChange={e => handleChange('stepWidth', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Gł. (m)</label>
          <input type="number" min="0.2" step="0.01"
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={form.stepDepth ?? 0.28}
            onChange={e => handleChange('stepDepth', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1">Wys. (m)</label>
          <input type="number" min="0.1" step="0.005"
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
            value={form.stepHeight ?? 0.175}
            onChange={e => handleChange('stepHeight', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs text-slate-400 block mb-1">Głębokość spocznika (m)</label>
        <input type="number" min="0.8" step="0.05"
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
          value={form.landingDepth ?? 1.2}
          onChange={e => handleChange('landingDepth', e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-slate-400 flex items-center gap-2 cursor-pointer">
          <input type="checkbox"
            className="accent-orange-500"
            checked={!!form.hasBanister}
            onChange={e => handleChange('hasBanister', e.target.checked)} />
          Poręcz / balustrada
        </label>
        <label className="text-xs text-slate-400 flex items-center gap-2 cursor-pointer">
          <input type="checkbox"
            className="accent-blue-500"
            checked={!!form.hasElevator}
            onChange={e => handleChange('hasElevator', e.target.checked)} />
          Szyb windowy w klatce
        </label>
      </div>

      {/* Calculated info */}
      <div className="bg-slate-800 rounded p-2 text-xs text-slate-400 space-y-0.5">
        <div>Całkowita liczba stopni (1 piętro): <span className="text-white">{(form.stepsPerFlight || 9) * (form.flights || 2)}</span></div>
        <div>Wysokość stopnia: <span className="text-white">{((useBuildingStore.getState().building.floorHeight / ((form.stepsPerFlight || 9) * (form.flights || 2))) * 100).toFixed(1)} cm</span></div>
        <div>Min. długość biegu: <span className="text-white">{((form.stepsPerFlight || 9) * (form.stepDepth || 0.28)).toFixed(2)} m</span></div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={handleSave}
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm py-1.5 rounded transition-colors">
          Zapisz
        </button>
        <button onClick={handleDelete}
          className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm py-1.5 rounded transition-colors">
          Usuń klatkę
        </button>
      </div>
    </div>
  )
}

// ── Main Properties Panel ─────────────────────────────────────────────────────

export default function PropertiesPanel() {
  const {
    elements, selectedElementId, updateElement, removeElement, setSelectedElementId,
    staircases, selectedStaircaseId, updateStaircase, removeStaircase, setSelectedStaircaseId,
    building, updateBuilding,
  } = useBuildingStore()

  const element   = elements.find(e => e.id === selectedElementId)
  const staircase = staircases.find(s => s.id === selectedStaircaseId)

  const [form, setForm] = useState({})

  useEffect(() => {
    if (element) {
      setForm({
        x: element.x,
        y: element.y ?? 0,
        width: element.width,
        height: element.height,
        depth: element.depth,
        floor: element.floor,
        ...element.properties,
      })
    }
  }, [element])

  const handleChange = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = () => {
    const { x, y, width, height, depth, floor, ...props } = form
    updateElement(selectedElementId, {
      x: parseFloat(x), y: parseFloat(y),
      width: parseFloat(width), height: parseFloat(height), depth: parseFloat(depth),
      floor: parseInt(floor), properties: props,
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
            onChange={e => updateBuilding({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Szerokość (m)</label>
            <input type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.width}
              onChange={e => updateBuilding({ width: parseFloat(e.target.value) || 1 })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Głębokość (m)</label>
            <input type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.depth}
              onChange={e => updateBuilding({ depth: parseFloat(e.target.value) || 1 })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Piętra</label>
            <input type="number" min="1"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.floors}
              onChange={e => updateBuilding({ floors: parseInt(e.target.value) || 1 })} />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Wys. piętra (m)</label>
            <input type="number"
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
              value={building.floorHeight}
              onChange={e => updateBuilding({ floorHeight: parseFloat(e.target.value) || 1 })} />
          </div>
        </div>
      </div>

      {/* Staircase selected */}
      {staircase && !element && (
        <StaircasePanel
          sc={staircase}
          updateStaircase={updateStaircase}
          removeStaircase={removeStaircase}
          setSelectedStaircaseId={setSelectedStaircaseId}
        />
      )}

      {/* Regular element selected */}
      {element && (
        <div className="p-4 space-y-3 flex-1">
          <h3 className="font-semibold text-blue-400">
            {ELEMENT_NAMES[element.type] || element.type}
          </h3>

          <div>
            <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Pozycja i rozmiar</div>
            <div className="grid grid-cols-2 gap-2">
              {['x', 'y', 'width', 'height', 'depth', 'floor'].map(key => (
                <div key={key}>
                  <label className="text-xs text-slate-400 block mb-1 capitalize">{key}</label>
                  <input type="number"
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    value={form[key] ?? ''}
                    onChange={e => handleChange(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {element.type === 'door' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Właściwości drzwi</div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Typ drzwi</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={form.style ?? 'single'} onChange={e => handleChange('style', e.target.value)}>
                  <option value="single">Jednoskrzydłowe</option>
                  <option value="double">Dwuskrzydłowe</option>
                  <option value="sliding">Przesuwne</option>
                  <option value="revolving">Obrotowe</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Kąt otwarcia (°)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={form.swing ?? 90} min="0" max="180" onChange={e => handleChange('swing', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Obrót na planie (°)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={form.rotation ?? 0} min="0" max="359" onChange={e => handleChange('rotation', e.target.value)} />
              </div>
            </div>
          )}

          {element.type === 'entrance' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Właściwości wejścia</div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Typ wejścia</label>
                <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={form.style ?? 'double'} onChange={e => handleChange('style', e.target.value)}>
                  <option value="double">Dwuskrzydłowe</option>
                  <option value="automatic">Automatyczne</option>
                  <option value="revolving">Obrotowe</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Obrót na planie (°)</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                  value={form.rotation ?? 0} min="0" max="359" onChange={e => handleChange('rotation', e.target.value)} />
              </div>
            </div>
          )}

          {element.type === 'arc-wall' && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Ściana łukowa</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Promień (m)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    value={form.radius ?? 2} min="0.5" step="0.1" onChange={e => handleChange('radius', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Grubość (m)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    value={form.thickness ?? 0.15} min="0.05" step="0.05" onChange={e => handleChange('thickness', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kąt start (°)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    value={form.startAngle ?? 0} min="0" max="359" onChange={e => handleChange('startAngle', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kąt koniec (°)</label>
                  <input type="number" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                    value={form.endAngle ?? 90} min="1" max="360" onChange={e => handleChange('endAngle', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {element.type === 'window' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Typ okna</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={form.style ?? 'standard'} onChange={e => handleChange('style', e.target.value)}>
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
              <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={form.railing ?? 'glass'} onChange={e => handleChange('railing', e.target.value)}>
                <option value="glass">Szklana</option>
                <option value="steel">Stalowa</option>
                <option value="concrete">Betonowa</option>
              </select>
            </div>
          )}

          {element.type === 'column' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Materiał</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={form.material ?? 'concrete'} onChange={e => handleChange('material', e.target.value)}>
                <option value="concrete">Beton</option>
                <option value="steel">Stal</option>
                <option value="wood">Drewno</option>
              </select>
            </div>
          )}

          {element.type === 'wall' && (
            <div>
              <label className="text-xs text-slate-400 block mb-1">Materiał</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                value={form.material ?? 'gypsum'} onChange={e => handleChange('material', e.target.value)}>
                <option value="gypsum">Płyta G-K</option>
                <option value="brick">Cegła</option>
                <option value="concrete">Beton</option>
                <option value="glass">Szkło</option>
              </select>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={handleSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded transition-colors">
              Zapisz
            </button>
            <button onClick={handleDelete}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm py-1.5 rounded transition-colors">
              Usuń
            </button>
          </div>
        </div>
      )}

      {!element && !staircase && (
        <div className="p-4 text-slate-500 text-sm">
          Kliknij element lub klatkę schodową na planie, aby edytować właściwości.
        </div>
      )}
    </div>
  )
}
