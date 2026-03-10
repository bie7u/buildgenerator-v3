import React, { useState } from 'react'
import useBuildingStore from '../../store/buildingStore'
import WizardStep from './WizardStep'

const TEMPLATES = [
  {
    id: 'house',
    name: 'Dom jednorodzinny',
    icon: '🏡',
    desc: 'Mały budynek 1-2 piętrowy',
    defaults: { floors: 2, floorHeight: 2.8, width: 12, depth: 8 },
  },
  {
    id: 'apartment',
    name: 'Blok mieszkalny',
    icon: '🏢',
    desc: 'Wielopiętrowy budynek mieszkalny',
    defaults: { floors: 8, floorHeight: 3, width: 25, depth: 12 },
  },
  {
    id: 'office',
    name: 'Biurowiec',
    icon: '🏙️',
    desc: 'Nowoczesny budynek biurowy',
    defaults: { floors: 10, floorHeight: 3.5, width: 30, depth: 20 },
  },
]

const TOTAL_STEPS = 5

export default function Wizard() {
  const { wizardStep, setWizardStep, setWizardOpen, updateBuilding, addElement, building } = useBuildingStore()
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [addStaircase, setAddStaircase] = useState(true)
  const [addElevator, setAddElevator] = useState(true)
  const [addWindows, setAddWindows] = useState(true)
  const [addBalconies, setAddBalconies] = useState(false)

  const step = wizardStep + 1

  const handleNext = () => setWizardStep(wizardStep + 1)
  const handleBack = () => setWizardStep(Math.max(0, wizardStep - 1))

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
    updateBuilding({ ...template.defaults, name: template.name })
  }

  const handleFinish = () => {
    if (addStaircase) {
      addElement({ type: 'staircase', floor: 0, x: 1, y: 0, width: 3, height: 4, depth: 3, properties: { steps: 18, hasLanding: true } })
    }
    if (addElevator) {
      addElement({ type: 'elevator', floor: 0, x: 5, y: 0, width: 1.5, height: 2.8, depth: 1.5, properties: { capacity: 8 } })
    }
    if (addWindows) {
      for (let f = 0; f < building.floors; f++) {
        addElement({ type: 'window', floor: f, x: 2, y: 0, width: 1.2, height: 1.4, depth: 0.1, properties: { style: 'standard', glazing: 'double' } })
        addElement({ type: 'window', floor: f, x: 6, y: 0, width: 1.2, height: 1.4, depth: 0.1, properties: { style: 'standard', glazing: 'double' } })
      }
    }
    if (addBalconies) {
      for (let f = 1; f < building.floors; f++) {
        addElement({ type: 'balcony', floor: f, x: 3, y: 0, width: 3, height: 0.2, depth: 1.2, properties: { railing: 'glass' } })
      }
    }
    setWizardOpen(false)
    setWizardStep(0)
  }

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTemplate?.id === t.id
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-sm text-slate-400">{t.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'width', label: 'Szerokość (m)', min: 1 },
                { key: 'depth', label: 'Głębokość (m)', min: 1 },
                { key: 'floors', label: 'Liczba pięter', min: 1 },
                { key: 'floorHeight', label: 'Wys. kondygnacji (m)', min: 2 },
              ].map(({ key, label, min }) => (
                <div key={key}>
                  <label className="text-sm text-slate-400 block mb-1">{label}</label>
                  <input
                    type="number"
                    min={min}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white"
                    value={building[key]}
                    onChange={(e) => updateBuilding({ [key]: parseFloat(e.target.value) || min })}
                  />
                </div>
              ))}
            </div>
            <div className="bg-slate-800 rounded p-3 text-sm text-slate-400">
              💡 Wskazówka: Typowy blok mieszkalny ma 3m wysokości kondygnacji i 8-10 pięter.
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 bg-slate-800 rounded cursor-pointer">
              <input type="checkbox" checked={addStaircase} onChange={(e) => setAddStaircase(e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="text-white font-medium">🪜 Klatka schodowa</div>
                <div className="text-slate-400 text-sm">Automatyczne schody przez wszystkie piętra</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-800 rounded cursor-pointer">
              <input type="checkbox" checked={addElevator} onChange={(e) => setAddElevator(e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="text-white font-medium">🛗 Winda</div>
                <div className="text-slate-400 text-sm">Winda osobowa w klatce schodowej</div>
              </div>
            </label>
            <div className="bg-slate-800 rounded p-3 text-sm text-slate-400">
              💡 Wskazówka: Budynki powyżej 4 pięter wymagają windy wg polskich przepisów.
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 bg-slate-800 rounded cursor-pointer">
              <input type="checkbox" checked={addWindows} onChange={(e) => setAddWindows(e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="text-white font-medium">🪟 Okna standardowe</div>
                <div className="text-slate-400 text-sm">Dwa okna na każdym piętrze</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-slate-800 rounded cursor-pointer">
              <input type="checkbox" checked={addBalconies} onChange={(e) => setAddBalconies(e.target.checked)} className="w-4 h-4" />
              <div>
                <div className="text-white font-medium">🏠 Balkony</div>
                <div className="text-slate-400 text-sm">Balkon na każdym piętrze (oprócz parteru)</div>
              </div>
            </label>
          </div>
        )
      case 5:
        return (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded p-4">
              <h4 className="text-white font-medium mb-3">Podsumowanie budynku</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Nazwa:</span><span className="text-white font-medium">{building.name}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Wymiary:</span><span className="text-white">{building.width}m × {building.depth}m</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Liczba pięter:</span><span className="text-white">{building.floors}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Całkowita wys.:</span><span className="text-white">{(building.floors * building.floorHeight).toFixed(1)}m</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Pow. zabudowy:</span><span className="text-white">{(building.width * building.depth).toFixed(0)} m²</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded p-4">
              <h4 className="text-white font-medium mb-2">Elementy do dodania</h4>
              <ul className="text-sm text-slate-400 space-y-1">
                {addStaircase && <li>✅ Klatka schodowa</li>}
                {addElevator && <li>✅ Winda</li>}
                {addWindows && <li>✅ Okna (2 na piętro)</li>}
                {addBalconies && <li>✅ Balkony</li>}
              </ul>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const stepTitles = [
    'Wybierz szablon',
    'Podstawowe wymiary',
    'Klatki schodowe i windy',
    'Okna i balkony',
    'Wykończenie',
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-md p-6 shadow-2xl border border-slate-700" style={{ maxHeight: '90vh' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Kreator budynku</h2>
          <button
            onClick={() => setWizardOpen(false)}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
        <WizardStep
          stepNumber={step}
          totalSteps={TOTAL_STEPS}
          title={stepTitles[step - 1]}
          onNext={handleNext}
          onBack={handleBack}
          onFinish={handleFinish}
        >
          {renderStepContent()}
        </WizardStep>
      </div>
    </div>
  )
}
