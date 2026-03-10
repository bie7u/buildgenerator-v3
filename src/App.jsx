import React from 'react'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import BuildingCanvas from './components/building/BuildingCanvas'
import BuildingViewer3D from './components/building/BuildingViewer3D'
import PropertiesPanel from './components/panels/PropertiesPanel'
import Wizard from './components/wizard/Wizard'
import useBuildingStore from './store/buildingStore'

export default function App() {
  const { viewMode, wizardOpen } = useBuildingStore()

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          {viewMode === '2d' ? <BuildingCanvas /> : <BuildingViewer3D />}
        </main>
        <PropertiesPanel />
      </div>
      {wizardOpen && <Wizard />}
    </div>
  )
}
