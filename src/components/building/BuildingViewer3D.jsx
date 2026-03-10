import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import useBuildingStore from '../../store/buildingStore'

function BuildingMesh({ building }) {
  const floors = []
  for (let i = 0; i < building.floors; i++) {
    const y = i * building.floorHeight + building.floorHeight / 2
    floors.push(
      <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[building.width, building.floorHeight - 0.1, building.depth]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#d4c5a9' : '#cbb99a'} />
      </mesh>
    )
    floors.push(
      <mesh key={`slab-${i}`} position={[0, i * building.floorHeight, 0]}>
        <boxGeometry args={[building.width + 0.2, 0.2, building.depth + 0.2]} />
        <meshStandardMaterial color="#a89880" />
      </mesh>
    )
  }
  return <>{floors}</>
}

function ElementMeshes({ elements, building }) {
  return (
    <>
      {elements.map((el) => {
        const xOffset = el.x - building.width / 2 + (el.width || 1) / 2
        const baseY = el.floor * building.floorHeight
        let color = '#94a3b8'
        let yPos = baseY + (el.height || 1) / 2
        let geom = [el.width || 1, el.height || 1, el.depth || 1]

        switch (el.type) {
          case 'staircase':
            color = '#f97316'
            geom = [el.width || 3, building.floorHeight - 0.1, el.depth || 3]
            yPos = baseY + (building.floorHeight - 0.1) / 2
            break
          case 'elevator':
            color = '#1d4ed8'
            geom = [el.width || 1.5, building.floorHeight * 0.9, el.depth || 1.5]
            yPos = baseY + (building.floorHeight * 0.9) / 2
            break
          case 'window':
            color = '#bae6fd'
            geom = [el.width || 1.2, el.height || 1.2, 0.05]
            yPos = baseY + building.floorHeight * 0.6
            return (
              <mesh key={el.id} position={[xOffset, yPos, building.depth / 2 + 0.05]}>
                <boxGeometry args={geom} />
                <meshStandardMaterial color={color} transparent opacity={0.7} />
              </mesh>
            )
          case 'balcony':
            color = '#f1f5f9'
            geom = [el.width || 3, 0.15, el.depth || 1.2]
            yPos = baseY + 0.15 / 2
            return (
              <mesh key={el.id} position={[xOffset, yPos, building.depth / 2 + (el.depth || 1.2) / 2]}>
                <boxGeometry args={geom} />
                <meshStandardMaterial color={color} />
              </mesh>
            )
          case 'column':
            color = '#374151'
            return (
              <mesh key={el.id} position={[xOffset, baseY + building.floorHeight / 2, 0]}>
                <cylinderGeometry args={[0.2, 0.2, building.floorHeight, 8]} />
                <meshStandardMaterial color={color} />
              </mesh>
            )
          case 'wall':
            color = '#9ca3af'
            geom = [el.width || 3, el.height || 2.4, 0.15]
            yPos = baseY + (el.height || 2.4) / 2
            break
          default:
            break
        }

        return (
          <mesh key={el.id} position={[xOffset, yPos, 0]}>
            <boxGeometry args={geom} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
    </>
  )
}

export default function BuildingViewer3D() {
  const { building, elements } = useBuildingStore()
  const totalHeight = building.floors * building.floorHeight

  return (
    <div className="flex-1 bg-slate-950">
      <Canvas
        shadows
        camera={{ position: [building.width * 1.5, totalHeight * 1.2, building.depth * 2.5], fov: 50 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
          <directionalLight position={[-10, 10, -10]} intensity={0.3} />
          <BuildingMesh building={building} />
          <ElementMeshes elements={elements} building={building} />
          <Grid
            position={[0, -0.01, 0]}
            cellColor="#334155"
            sectionColor="#475569"
            cellSize={1}
            sectionSize={5}
          />
          <OrbitControls makeDefault target={[0, totalHeight / 2, 0]} />
        </Suspense>
      </Canvas>
    </div>
  )
}
