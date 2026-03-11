import React from 'react'
import useBuildingStore from '../../store/buildingStore'
import { ELEMENT_NAMES } from '../../utils/buildingUtils'

export default function FloorPlan() {
  const { building, elements } = useBuildingStore()
  const floors = Array.from({ length: building.floors }, (_, i) => i)

  return (
    <div className="p-4">
      <h3 className="text-white font-semibold mb-3">Plan budynku</h3>
      {floors.reverse().map((floor) => {
        const floorElements = elements.filter((e) => e.floor === floor)
        return (
          <div key={floor} className="mb-2 bg-slate-800 rounded p-2">
            <div className="text-slate-400 text-xs mb-1">{floor === 0 ? 'Parter' : `Piętro ${floor}`}</div>
            <div className="flex flex-wrap gap-1">
              {floorElements.map((el) => (
                <span key={el.id} className="text-xs bg-slate-700 text-slate-300 px-1 py-0.5 rounded">
                  {ELEMENT_NAMES[el.type]}
                </span>
              ))}
              {floorElements.length === 0 && (
                <span className="text-xs text-slate-600">Brak elementów</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
