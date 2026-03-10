import React, { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import useBuildingStore from '../../store/buildingStore'

// ─── Building floors using rectangle (default) ───────────────────────────────
function BuildingMeshRect({ building, wallOpacity }) {
  const transparent = wallOpacity < 0.99
  const floors = []
  for (let i = 0; i < building.floors; i++) {
    const y = i * building.floorHeight + (building.floorHeight - 0.1) / 2
    floors.push(
      <mesh key={`f${i}`} position={[0, y, 0]} castShadow receiveShadow renderOrder={0}>
        <boxGeometry args={[building.width, building.floorHeight - 0.1, building.depth]} />
        <meshStandardMaterial
          color={i % 2 === 0 ? '#d4c5a9' : '#cbb99a'}
          transparent={transparent}
          opacity={wallOpacity}
          side={THREE.DoubleSide}
          depthWrite={!transparent}
          renderOrder={0}
        />
      </mesh>
    )
    floors.push(
      <mesh key={`slab${i}`} position={[0, i * building.floorHeight, 0]} renderOrder={0}>
        <boxGeometry args={[building.width + 0.2, 0.2, building.depth + 0.2]} />
        <meshStandardMaterial
          color="#a89880"
          transparent={transparent}
          opacity={Math.min(wallOpacity + 0.1, 1)}
          depthWrite={!transparent}
          renderOrder={0}
        />
      </mesh>
    )
  }
  return <>{floors}</>
}

// ─── Building floors using polygon outline (custom shape) ────────────────────
function BuildingMeshOutline({ building, wallOpacity }) {
  const outline = building.outline
  const transparent = wallOpacity < 0.99

  const shape = useMemo(() => {
    if (!outline || outline.length < 3) return null
    const s = new THREE.Shape()
    outline.forEach(({ x, y }, i) => {
      const cx = x - building.width / 2
      const cy = y - building.depth / 2
      if (i === 0) s.moveTo(cx, cy)
      else s.lineTo(cx, cy)
    })
    s.closePath()
    return s
  }, [outline, building.width, building.depth])

  if (!shape) return null

  const floors = []
  for (let i = 0; i < building.floors; i++) {
    const floorY = i * building.floorHeight
    const extrudeSettings = { depth: building.floorHeight - 0.1, bevelEnabled: false }

    floors.push(
      // Rotate -PI/2 around x so the shape (x-y plane) extrudes upward (world y-axis).
      // Position is [0, floorY, 0] — the extrusion itself provides the vertical extent
      // from floorY to floorY+(floorHeight-0.1), unlike BoxGeometry which needs center offset.
      <group key={`f${i}`} position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh castShadow receiveShadow renderOrder={0}>
          <extrudeGeometry args={[shape, extrudeSettings]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#d4c5a9' : '#cbb99a'}
            transparent={transparent}
            opacity={wallOpacity}
            side={THREE.DoubleSide}
            depthWrite={!transparent}
            renderOrder={0}
          />
        </mesh>
      </group>
    )
    // Flat slab (keep as box for simplicity)
    floors.push(
      <mesh key={`slab${i}`} position={[0, floorY, 0]} renderOrder={0}>
        <boxGeometry args={[building.width + 0.2, 0.2, building.depth + 0.2]} />
        <meshStandardMaterial
          color="#a89880"
          transparent={transparent}
          opacity={Math.min(wallOpacity + 0.1, 1)}
          depthWrite={!transparent}
          renderOrder={0}
        />
      </mesh>
    )
  }
  return <>{floors}</>
}

// ─── Interior elements (stairs, elevator, etc.) ──────────────────────────────
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
          case 'staircase': {
            // Draw stair steps instead of a plain box
            const sw = el.width || 3
            const sd = el.depth || 3
            const steps = el.properties?.steps || 12
            const stepH = (building.floorHeight - 0.1) / steps
            const stepD = sd / steps
            return (
              <group key={el.id} renderOrder={1}>
                {Array.from({ length: steps }).map((_, s) => (
                  <mesh
                    key={s}
                    position={[xOffset, baseY + stepH * s + stepH / 2, -sd / 2 + stepD * s + stepD / 2]}
                    renderOrder={1}
                  >
                    <boxGeometry args={[sw, stepH, stepD]} />
                    <meshStandardMaterial color="#f97316" />
                  </mesh>
                ))}
                {/* Landing platform at top */}
                <mesh
                  position={[xOffset, baseY + building.floorHeight - 0.05, 0]}
                  renderOrder={1}
                >
                  <boxGeometry args={[sw, 0.1, sd]} />
                  <meshStandardMaterial color="#ea580c" />
                </mesh>
              </group>
            )
          }
          case 'elevator': {
            const ew = el.width || 1.5
            const eh = building.floorHeight * 0.9
            const ed = el.depth || 1.5
            return (
              <group key={el.id} renderOrder={1}>
                {/* Elevator shaft (transparent walls) */}
                <mesh position={[xOffset, baseY + eh / 2, 0]} renderOrder={1}>
                  <boxGeometry args={[ew, eh, ed]} />
                  <meshStandardMaterial color="#1d4ed8" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                {/* Elevator cabin */}
                <mesh position={[xOffset, baseY + eh * 0.3, 0]} renderOrder={2}>
                  <boxGeometry args={[ew * 0.8, eh * 0.4, ed * 0.8]} />
                  <meshStandardMaterial color="#3b82f6" />
                </mesh>
                {/* Doors */}
                <mesh position={[xOffset, baseY + eh * 0.3, ed / 2 + 0.01]} renderOrder={2}>
                  <boxGeometry args={[ew * 0.6, eh * 0.35, 0.04]} />
                  <meshStandardMaterial color="#93c5fd" />
                </mesh>
              </group>
            )
          }
          case 'window':
            color = '#bae6fd'
            geom = [el.width || 1.2, el.height || 1.2, 0.05]
            yPos = baseY + building.floorHeight * 0.6
            return (
              <mesh key={el.id} position={[xOffset, yPos, building.depth / 2 + 0.05]} renderOrder={1}>
                <boxGeometry args={geom} />
                <meshStandardMaterial color={color} transparent opacity={0.7} />
              </mesh>
            )
          case 'balcony':
            color = '#f1f5f9'
            geom = [el.width || 3, 0.15, el.depth || 1.2]
            yPos = baseY + 0.15 / 2
            return (
              <mesh key={el.id} position={[xOffset, yPos, building.depth / 2 + (el.depth || 1.2) / 2]} renderOrder={1}>
                <boxGeometry args={geom} />
                <meshStandardMaterial color={color} />
              </mesh>
            )
          case 'column':
            color = '#374151'
            return (
              <mesh key={el.id} position={[xOffset, baseY + building.floorHeight / 2, 0]} renderOrder={1}>
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
          <mesh key={el.id} position={[xOffset, yPos, 0]} renderOrder={1}>
            <boxGeometry args={geom} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BuildingViewer3D() {
  const { building, elements, wallOpacity, setWallOpacity } = useBuildingStore()
  const totalHeight = building.floors * building.floorHeight
  const hasOutline = building.outline && building.outline.length >= 3

  return (
    <div className="flex-1 bg-slate-950 relative">
      {/* ── Transparency control overlay ── */}
      <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-slate-700 min-w-[180px]">
        <div className="text-xs text-slate-400 mb-2 font-medium">Przezroczystość ścian</div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={wallOpacity}
            onChange={(e) => setWallOpacity(parseFloat(e.target.value))}
            className="w-28 accent-blue-500"
          />
          <span className="text-xs text-slate-200 w-10 text-right font-mono">
            {Math.round(wallOpacity * 100)}%
          </span>
        </div>
        {wallOpacity < 0.6 && (
          <div className="text-xs text-blue-400 mt-1.5 flex items-center gap-1">
            <span>👁</span>
            <span>Widok wnętrza aktywny</span>
          </div>
        )}
        {hasOutline && (
          <div className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
            <span>✓</span>
            <span>Obrys niestandardowy</span>
          </div>
        )}
      </div>

      <Canvas
        shadows
        camera={{ position: [building.width * 1.5, totalHeight * 1.2, building.depth * 2.5], fov: 50 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
          <directionalLight position={[-10, 10, -10]} intensity={0.35} />
          <directionalLight position={[0, -5, 5]} intensity={0.15} />

          {hasOutline ? (
            <BuildingMeshOutline building={building} wallOpacity={wallOpacity} />
          ) : (
            <BuildingMeshRect building={building} wallOpacity={wallOpacity} />
          )}

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
