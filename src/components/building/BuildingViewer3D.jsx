import React, { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import useBuildingStore from '../../store/buildingStore'

/** Slab extrude settings — constant depth 0.2 m */
const SLAB_EXTRUDE = { depth: 0.2, bevelEnabled: false }

/**
 * Build a THREE.Shape from an array of {x, y} points.
 * The points are in floor-plan meter coords; we center them on the building.
 */
function buildShape(outline, buildingWidth, buildingDepth) {
  if (!outline || outline.length < 3) return null
  const s = new THREE.Shape()
  outline.forEach(({ x, y }, i) => {
    const cx = x - buildingWidth / 2
    const cy = y - buildingDepth / 2
    if (i === 0) s.moveTo(cx, cy)
    else s.lineTo(cx, cy)
  })
  s.closePath()
  return s
}

/**
 * Resolve which outline applies to a given floor index.
 * Priority: per-floor → global base → null (= use rectangle)
 */
function resolveOutline(floorIndex, building) {
  const fo = building.floorOutlines?.[floorIndex]
  if (fo && fo.length >= 3) return fo
  if (building.outline && building.outline.length >= 3) return building.outline
  return null
}

// ─── Staircase 3D mesh — extrudes the polygon through all floors ─────────────
function StaircaseMesh({ sc, building, wallOpacity }) {
  const outline = sc.outline
  if (!outline || outline.length < 3) return null

  const totalHeight = building.floors * building.floorHeight
  const type   = sc.properties?.type || 'straight'
  const spf    = sc.properties?.stepsPerFlight || 9
  const fph    = sc.properties?.floorHeight || building.floorHeight
  const transparent = wallOpacity < 0.99

  const outlineKey = outline.map(p => `${p.x},${p.y}`).join('|')

  // Outer shell shape
  const shellShape = useMemo(
    () => buildShape(outline, building.width, building.depth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outlineKey, building.width, building.depth]
  )

  const shellExtrude = useMemo(
    () => ({ depth: totalHeight, bevelEnabled: false }),
    [totalHeight]
  )

  if (!shellShape) return null

  // Bounding box for stair placement inside the shaft
  const xs = outline.map(p => p.x), ys = outline.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const cxWorld = (minX + maxX) / 2 - building.width / 2
  const czWorld = (minY + maxY) / 2 - building.depth / 2
  const bw = maxX - minX, bd = maxY - minY

  // Build step meshes per floor
  const stepMeshes = []
  for (let f = 0; f < building.floors; f++) {
    const baseY = f * building.floorHeight
    const steps = spf
    const stepH = (building.floorHeight - 0.05) / steps

    if (type === 'straight') {
      const stepD = (bd * 0.85) / steps
      for (let s = 0; s < steps; s++) {
        stepMeshes.push(
          <mesh key={`${f}-s${s}`}
            position={[cxWorld, baseY + stepH * s + stepH / 2, czWorld - bd * 0.4 + stepD * s + stepD / 2]}>
            <boxGeometry args={[bw * 0.8, stepH, stepD]} />
            <meshStandardMaterial color="#c2410c" />
          </mesh>
        )
      }
    } else if (type === 'l-shaped') {
      const half = Math.ceil(steps / 2)
      const stepD1 = (bd * 0.45) / half
      const stepD2 = (bw * 0.45) / (steps - half)
      for (let s = 0; s < half; s++) {
        stepMeshes.push(
          <mesh key={`${f}-s${s}`}
            position={[cxWorld - bw * 0.2, baseY + stepH * s + stepH / 2, czWorld - bd * 0.4 + stepD1 * s + stepD1 / 2]}>
            <boxGeometry args={[bw * 0.4, stepH, stepD1]} />
            <meshStandardMaterial color="#c2410c" />
          </mesh>
        )
      }
      for (let s = 0; s < steps - half; s++) {
        stepMeshes.push(
          <mesh key={`${f}-s2${s}`}
            position={[cxWorld - bw * 0.4 + stepD2 * s + stepD2 / 2, baseY + stepH * (half + s) + stepH / 2, czWorld + bd * 0.1]}>
            <boxGeometry args={[stepD2, stepH, bd * 0.4]} />
            <meshStandardMaterial color="#c2410c" />
          </mesh>
        )
      }
    } else if (type === 'u-shaped') {
      const half = Math.ceil(steps / 2)
      const stepD1 = (bd * 0.85) / half
      for (let s = 0; s < half; s++) {
        // Left flight going up
        stepMeshes.push(
          <mesh key={`${f}-sL${s}`}
            position={[cxWorld - bw * 0.25, baseY + stepH * s + stepH / 2, czWorld - bd * 0.4 + stepD1 * s + stepD1 / 2]}>
            <boxGeometry args={[bw * 0.35, stepH, stepD1]} />
            <meshStandardMaterial color="#c2410c" />
          </mesh>
        )
        // Right flight going down (reversed direction, starting from top)
        stepMeshes.push(
          <mesh key={`${f}-sR${s}`}
            position={[cxWorld + bw * 0.25, baseY + stepH * (half - 1 - s) + stepH / 2, czWorld - bd * 0.4 + stepD1 * s + stepD1 / 2]}>
            <boxGeometry args={[bw * 0.35, stepH, stepD1]} />
            <meshStandardMaterial color="#e74c0c" />
          </mesh>
        )
      }
    } else if (type === 'spiral') {
      const r = Math.min(bw, bd) * 0.35
      const totalAngle = Math.PI * 2 * 1.1 // slightly more than full circle per floor
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * totalAngle - Math.PI / 2
        const r1 = r * 0.2, r2 = r
        const mx = cxWorld + Math.cos(a) * (r1 + r2) / 2
        const mz = czWorld + Math.sin(a) * (r1 + r2) / 2
        stepMeshes.push(
          <mesh key={`${f}-sp${s}`} position={[mx, baseY + stepH * s + stepH / 2, mz]}
            rotation={[0, -a, 0]}>
            <boxGeometry args={[r2 - r1, stepH, 0.22]} />
            <meshStandardMaterial color="#c2410c" />
          </mesh>
        )
      }
      // Central post
      stepMeshes.push(
        <mesh key={`${f}-post`} position={[cxWorld, baseY + building.floorHeight / 2, czWorld]}>
          <cylinderGeometry args={[0.12, 0.12, building.floorHeight, 8]} />
          <meshStandardMaterial color="#7c2d12" />
        </mesh>
      )
    }

    // Landing slab on top of each flight
    if (shellShape) {
      stepMeshes.push(
        <group key={`${f}-landing`} position={[0, baseY + building.floorHeight - 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <extrudeGeometry args={[shellShape, { depth: 0.07, bevelEnabled: false }]} />
            <meshStandardMaterial color="#fed7aa" transparent={transparent} opacity={Math.min(wallOpacity + 0.1, 1)} />
          </mesh>
        </group>
      )
    }
  }

  return (
    <group renderOrder={2}>
      {/* Shell walls — translucent */}
      <group position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh renderOrder={2}>
          <extrudeGeometry args={[shellShape, shellExtrude]} />
          <meshStandardMaterial color="#fb923c"
            transparent opacity={Math.max(0.12, wallOpacity - 0.35)}
            side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
      {/* Steps */}
      {stepMeshes}
      {/* Outline wire on each floor */}
      <group position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh renderOrder={3}>
          <extrudeGeometry args={[shellShape, { depth: 0.04, bevelEnabled: false }]} />
          <meshStandardMaterial color="#fb923c" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

// ─── Single floor mesh — uses extruded shape or box ──────────────────────────
function FloorMesh({ floorIndex, building, wallOpacity }) {
  const transparent = wallOpacity < 0.99
  const color = floorIndex % 2 === 0 ? '#d4c5a9' : '#cbb99a'
  const floorY = floorIndex * building.floorHeight
  const outline = resolveOutline(floorIndex, building)

  // Build a stable string key for memoizing the shape — more efficient than full stringify
  const outlineKey = outline
    ? outline.map((p) => `${p.x},${p.y}`).join('|')
    : ''

  const shape = useMemo(
    () => buildShape(outline, building.width, building.depth),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outlineKey, building.width, building.depth]
  )

  const extrudeSettings = useMemo(
    () => ({ depth: building.floorHeight - 0.1, bevelEnabled: false }),
    [building.floorHeight]
  )

  const matProps = {
    color,
    transparent,
    opacity: wallOpacity,
    side: THREE.DoubleSide,
    depthWrite: !transparent,
  }

  if (shape) {
    return (
      <group renderOrder={0}>
        {/* Extruded floor walls */}
        <group
          position={[0, floorY, 0]}
          // Rotate -PI/2 around X: shape XY plane → world XZ, extrusion goes up (world Y)
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <mesh castShadow receiveShadow renderOrder={0}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            <meshStandardMaterial {...matProps} />
          </mesh>
        </group>
        {/* Floor slab — flat extrusion of the same outline shape, centered at floorY */}
        <group position={[0, floorY - 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh renderOrder={0}>
            <extrudeGeometry args={[shape, SLAB_EXTRUDE]} />
            <meshStandardMaterial
              color="#a89880"
              transparent={transparent}
              opacity={Math.min(wallOpacity + 0.1, 1)}
              depthWrite={!transparent}
            />
          </mesh>
        </group>
      </group>
    )
  }

  // Fallback: default rectangle
  return (
    <group renderOrder={0}>
      <mesh
        position={[0, floorY + (building.floorHeight - 0.1) / 2, 0]}
        castShadow
        receiveShadow
        renderOrder={0}
      >
        <boxGeometry args={[building.width, building.floorHeight - 0.1, building.depth]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, floorY, 0]} renderOrder={0}>
        <boxGeometry args={[building.width + 0.2, 0.2, building.depth + 0.2]} />
        <meshStandardMaterial
          color="#a89880"
          transparent={transparent}
          opacity={Math.min(wallOpacity + 0.1, 1)}
          depthWrite={!transparent}
        />
      </mesh>
    </group>
  )
}

// ─── Interior elements (stairs, elevator, etc.) ──────────────────────────────
function ElementMeshes({ elements, building }) {
  return (
    <>
      {elements.map((el) => {
        // x: width direction (centered), z: depth direction (centered), y: height up
        const xOffset = el.x - building.width / 2 + (el.width || 1) / 2
        const zOffset = (el.y ?? 0) - building.depth / 2 + (el.depth || 1) / 2
        const baseY = el.floor * building.floorHeight
        let color = '#94a3b8'
        let yPos = baseY + (el.height || 1) / 2
        let geom = [el.width || 1, el.height || 1, el.depth || 1]

        switch (el.type) {
          case 'staircase': {
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
                    position={[xOffset, baseY + stepH * s + stepH / 2, zOffset - sd / 2 + stepD * s + stepD / 2]}
                    renderOrder={1}
                  >
                    <boxGeometry args={[sw, stepH, stepD]} />
                    <meshStandardMaterial color="#f97316" />
                  </mesh>
                ))}
                <mesh position={[xOffset, baseY + building.floorHeight - 0.05, zOffset]} renderOrder={1}>
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
                <mesh position={[xOffset, baseY + eh / 2, zOffset]} renderOrder={1}>
                  <boxGeometry args={[ew, eh, ed]} />
                  <meshStandardMaterial color="#1d4ed8" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh position={[xOffset, baseY + eh * 0.3, zOffset]} renderOrder={2}>
                  <boxGeometry args={[ew * 0.8, eh * 0.4, ed * 0.8]} />
                  <meshStandardMaterial color="#3b82f6" />
                </mesh>
                <mesh position={[xOffset, baseY + eh * 0.3, zOffset + ed / 2 + 0.01]} renderOrder={2}>
                  <boxGeometry args={[ew * 0.6, eh * 0.35, 0.04]} />
                  <meshStandardMaterial color="#93c5fd" />
                </mesh>
              </group>
            )
          }
          case 'door': {
            const dw  = el.width  || 0.9
            const dh  = el.height || 2.1
            const dt  = el.depth  || 0.1
            const rot = ((el.properties?.rotation ?? 0) * Math.PI) / 180
            return (
              <group key={el.id} renderOrder={1} position={[xOffset, baseY, zOffset]} rotation={[0, rot, 0]}>
                {/* Frame top */}
                <mesh position={[0, dh + 0.05, 0]} renderOrder={1}>
                  <boxGeometry args={[dw + 0.1, 0.1, dt + 0.05]} />
                  <meshStandardMaterial color="#a78bfa" />
                </mesh>
                {/* Frame left */}
                <mesh position={[-(dw / 2 + 0.05), dh / 2, 0]} renderOrder={1}>
                  <boxGeometry args={[0.1, dh, dt + 0.05]} />
                  <meshStandardMaterial color="#a78bfa" />
                </mesh>
                {/* Frame right */}
                <mesh position={[dw / 2 + 0.05, dh / 2, 0]} renderOrder={1}>
                  <boxGeometry args={[0.1, dh, dt + 0.05]} />
                  <meshStandardMaterial color="#a78bfa" />
                </mesh>
                {/* Door leaf */}
                <mesh position={[-dw / 2 + dw / 4, dh / 2, dt / 2]} renderOrder={2}>
                  <boxGeometry args={[dw / 2, dh - 0.05, 0.04]} />
                  <meshStandardMaterial color="#c4b5fd" transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
              </group>
            )
          }
          case 'entrance': {
            const ew  = el.width  || 1.8
            const eh  = el.height || 2.2
            const et  = el.depth  || 0.15
            const rot = ((el.properties?.rotation ?? 0) * Math.PI) / 180
            return (
              <group key={el.id} renderOrder={1} position={[xOffset, baseY, zOffset]} rotation={[0, rot, 0]}>
                {/* Top beam */}
                <mesh position={[0, eh + 0.08, 0]} renderOrder={1}>
                  <boxGeometry args={[ew + 0.15, 0.15, et + 0.05]} />
                  <meshStandardMaterial color="#34d399" />
                </mesh>
                {/* Left pillar */}
                <mesh position={[-(ew / 2 + 0.075), eh / 2, 0]} renderOrder={1}>
                  <boxGeometry args={[0.15, eh, et + 0.05]} />
                  <meshStandardMaterial color="#34d399" />
                </mesh>
                {/* Right pillar */}
                <mesh position={[ew / 2 + 0.075, eh / 2, 0]} renderOrder={1}>
                  <boxGeometry args={[0.15, eh, et + 0.05]} />
                  <meshStandardMaterial color="#34d399" />
                </mesh>
                {/* Double door leaves */}
                <mesh position={[-ew / 4, eh / 2, et / 2]} renderOrder={2}>
                  <boxGeometry args={[ew / 2 - 0.04, eh - 0.05, 0.04]} />
                  <meshStandardMaterial color="#6ee7b7" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
                <mesh position={[ew / 4, eh / 2, et / 2]} renderOrder={2}>
                  <boxGeometry args={[ew / 2 - 0.04, eh - 0.05, 0.04]} />
                  <meshStandardMaterial color="#6ee7b7" transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
              </group>
            )
          }
          case 'arc-wall': {
            const radius    = el.properties?.radius    ?? 2
            const startAngle = el.properties?.startAngle ?? 0
            const endAngle   = el.properties?.endAngle   ?? 90
            const thickness  = el.properties?.thickness  ?? 0.15
            const arcAngle   = Math.abs((endAngle - startAngle) * Math.PI / 180)
            const wallH      = el.height || 2.4
            return (
              <group key={el.id} renderOrder={1}
                position={[xOffset, baseY + wallH / 2, zOffset]}
                rotation={[0, -(startAngle * Math.PI / 180), 0]}>
                <mesh renderOrder={1}>
                  <torusGeometry args={[radius, thickness / 2, 4, 24, arcAngle]} />
                  <meshStandardMaterial color="#fb923c" side={THREE.DoubleSide} />
                </mesh>
              </group>
            )
          }
          case 'window':
            color = '#bae6fd'
            geom = [el.width || 1.2, el.height || 1.2, 0.05]
            yPos = baseY + building.floorHeight * 0.6
            return (
              <mesh key={el.id} position={[xOffset, yPos, zOffset + building.depth / 2 + 0.05]} renderOrder={1}>
                <boxGeometry args={geom} />
                <meshStandardMaterial color={color} transparent opacity={0.7} />
              </mesh>
            )
          case 'balcony':
            color = '#f1f5f9'
            geom = [el.width || 3, 0.15, el.depth || 1.2]
            yPos = baseY + 0.15 / 2
            return (
              <mesh key={el.id} position={[xOffset, yPos, zOffset + building.depth / 2 + (el.depth || 1.2) / 2]} renderOrder={1}>
                <boxGeometry args={geom} />
                <meshStandardMaterial color={color} />
              </mesh>
            )
          case 'column':
            color = '#374151'
            return (
              <mesh key={el.id} position={[xOffset, baseY + building.floorHeight / 2, zOffset]} renderOrder={1}>
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
          <mesh key={el.id} position={[xOffset, yPos, zOffset]} renderOrder={1}>
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
  const { building, elements, staircases, wallOpacity, setWallOpacity } = useBuildingStore()
  const totalHeight = building.floors * building.floorHeight

  const floorOutlines = building.floorOutlines || {}
  const customFloorCount = Object.values(floorOutlines).filter((o) => o?.length >= 3).length
  const hasGlobalOutline = building.outline?.length >= 3

  return (
    <div className="flex-1 bg-slate-950 relative">
      {/* ── Transparency + info overlay ── */}
      <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur-sm rounded-xl p-3 shadow-xl border border-slate-700 min-w-[190px]">
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
        {customFloorCount > 0 && (
          <div className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
            <span>✓</span>
            <span>{customFloorCount} kondygnacji z własnym obrysem</span>
          </div>
        )}
        {hasGlobalOutline && customFloorCount === 0 && (
          <div className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
            <span>✓</span>
            <span>Obrys globalny aktywny</span>
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

          {/* Render each floor with its own resolved outline */}
          {Array.from({ length: building.floors }, (_, i) => (
            <FloorMesh
              key={i}
              floorIndex={i}
              building={building}
              wallOpacity={wallOpacity}
            />
          ))}

          {/* Render staircases through all floors */}
          {(staircases || []).map(sc => (
            <StaircaseMesh key={sc.id} sc={sc} building={building} wallOpacity={wallOpacity} />
          ))}

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
