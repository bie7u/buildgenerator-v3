import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Line, Circle, Text } from 'react-konva'
import useBuildingStore from '../../store/buildingStore'

const SCALE = 30 // pixels per meter
const PADDING = 60
const SNAP_DISTANCE = 16 // pixels within which the polygon closes
const ANGLE_SNAP_DEG = 45 // snap angles in degrees while drawing

/** Snap a candidate point to the nearest 45° angle from the last drawn point */
function snapToAngle(pts, cx, cy) {
  if (pts.length === 0) return { x: cx, y: cy }
  const prev = pts[pts.length - 1]
  const dx = cx - (PADDING + prev.x * SCALE)
  const dy = cy - (PADDING + prev.y * SCALE)
  const len = Math.hypot(dx, dy)
  if (len < 2) return { x: cx, y: cy }
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  const snapped = Math.round(angleDeg / ANGLE_SNAP_DEG) * ANGLE_SNAP_DEG
  const rad = (snapped * Math.PI) / 180
  return {
    x: PADDING + prev.x * SCALE + len * Math.cos(rad),
    y: PADDING + prev.y * SCALE + len * Math.sin(rad),
  }
}

/** Labels for floor tabs */
function floorLabel(i) {
  return i === 0 ? 'Parter' : `Piętro ${i}`
}

/**
 * Resolve the outline to display for the given floor index.
 * Priority: per-floor override → global base outline (floor 0 only) → empty array
 */
function resolveCurrentOutline(floorOutlines, floorIndex, globalOutline) {
  const own = floorOutlines[floorIndex]
  if (own && own.length >= 3) return own
  if (floorIndex === 0 && globalOutline && globalOutline.length >= 3) return globalOutline
  return []
}

export default function FloorPlanView() {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  // Ephemeral drawing state — not stored in Zustand until polygon is finalized
  const [drawingPoints, setDrawingPoints] = useState([])
  const [mousePos, setMousePos] = useState(null)
  const [angleSnap, setAngleSnap] = useState(false) // Shift = enable angle snap

  const {
    building,
    activeTool,
    setActiveTool,
    selectedFloor,
    setSelectedFloor,
    setFloorOutline,
    clearFloorOutline,
    // keep legacy support
    setOutline,
    clearOutline,
  } = useBuildingStore()

  const floorOutlines = building.floorOutlines || {}
  // Resolve current floor's outline using the same priority as BuildingViewer3D:
  // per-floor override → global base outline (only for floor 0) → empty
  const currentOutline = resolveCurrentOutline(floorOutlines, selectedFloor, building.outline)

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Reset drawing when floor changes
  useEffect(() => {
    setDrawingPoints([])
    setMousePos(null)
  }, [selectedFloor])

  const isDrawing = activeTool === 'draw-outline'

  const isNearStart = (mx, my) => {
    if (drawingPoints.length < 3) return false
    const sx = PADDING + drawingPoints[0].x * SCALE
    const sy = PADDING + drawingPoints[0].y * SCALE
    return Math.hypot(mx - sx, my - sy) < SNAP_DISTANCE
  }

  // Convert canvas pixel coords to meter coords (clamped to >=0)
  const toMeters = (px, py) => ({
    x: Math.max(0, (px - PADDING) / SCALE),
    y: Math.max(0, (py - PADDING) / SCALE),
  })

  const handleStageClick = (e) => {
    if (!isDrawing) return
    const stage = e.target.getStage()
    const raw = stage.getPointerPosition()

    // Apply angle snapping if enabled or Shift held
    let pos = raw
    if (angleSnap && drawingPoints.length > 0) {
      const snapped = snapToAngle(drawingPoints, raw.x, raw.y)
      pos = snapped
    }

    if (isNearStart(pos.x, pos.y)) {
      // Close the polygon
      const pts = drawingPoints
      setFloorOutline(selectedFloor, pts)
      // Also keep global outline in sync for floor 0 (backward compat)
      if (selectedFloor === 0) setOutline(pts)
      setDrawingPoints([])
      setActiveTool('select')
      return
    }

    const m = toMeters(pos.x, pos.y)
    setDrawingPoints([...drawingPoints, m])
  }

  const handleDblClick = (e) => {
    if (!isDrawing || drawingPoints.length < 3) return
    e.evt?.preventDefault?.()
    const pts = drawingPoints
    setFloorOutline(selectedFloor, pts)
    if (selectedFloor === 0) setOutline(pts)
    setDrawingPoints([])
    setActiveTool('select')
  }

  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition()
    if (!pos) return
    if (angleSnap && drawingPoints.length > 0) {
      setMousePos(snapToAngle(drawingPoints, pos.x, pos.y))
    } else {
      setMousePos(pos)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Shift') setAngleSnap(true)
    if (e.key === 'Escape') cancelDrawing()
  }
  const handleKeyUp = (e) => {
    if (e.key === 'Shift') setAngleSnap(false)
  }

  const cancelDrawing = () => {
    setDrawingPoints([])
    setActiveTool('select')
  }

  const handleClearFloor = () => {
    clearFloorOutline(selectedFloor)
    if (selectedFloor === 0) clearOutline()
  }

  // ─── Grid ────────────────────────────────────────────────────────────────
  const renderGrid = () => {
    const lines = []
    const maxW = building.width + 5
    const maxH = building.depth + 5

    for (let x = 0; x <= maxW; x++) {
      lines.push(
        <Line
          key={`v${x}`}
          points={[PADDING + x * SCALE, 0, PADDING + x * SCALE, size.height]}
          stroke={x % 5 === 0 ? '#334155' : '#1e2533'}
          strokeWidth={x % 5 === 0 ? 1 : 0.5}
          listening={false}
        />
      )
    }
    for (let y = 0; y <= maxH; y++) {
      lines.push(
        <Line
          key={`h${y}`}
          points={[0, PADDING + y * SCALE, size.width, PADDING + y * SCALE]}
          stroke={y % 5 === 0 ? '#334155' : '#1e2533'}
          strokeWidth={y % 5 === 0 ? 1 : 0.5}
          listening={false}
        />
      )
    }
    for (let x = 0; x <= building.width; x += 5) {
      lines.push(
        <Text
          key={`xl${x}`}
          x={PADDING + x * SCALE - 10}
          y={PADDING - 22}
          text={`${x}m`}
          fontSize={11}
          fill="#475569"
          listening={false}
        />
      )
    }
    for (let y = 0; y <= building.depth; y += 5) {
      lines.push(
        <Text
          key={`yl${y}`}
          x={4}
          y={PADDING + y * SCALE - 7}
          text={`${y}m`}
          fontSize={11}
          fill="#475569"
          listening={false}
        />
      )
    }
    return lines
  }

  // ─── Default rectangle (dashed) for reference ────────────────────────────
  const renderDefaultRect = () => (
    <Rect
      x={PADDING}
      y={PADDING}
      width={building.width * SCALE}
      height={building.depth * SCALE}
      stroke="#334155"
      strokeWidth={1.5}
      dash={[6, 4]}
      fill="transparent"
      listening={false}
    />
  )

  // ─── Ghost outlines of OTHER floors ──────────────────────────────────────
  const renderGhostOutlines = () => {
    const shapes = []
    for (let fi = 0; fi < building.floors; fi++) {
      if (fi === selectedFloor) continue
      const outline = floorOutlines[fi]
      if (!outline || outline.length < 3) continue
      const flat = outline.flatMap((p) => [PADDING + p.x * SCALE, PADDING + p.y * SCALE])
      shapes.push(
        <Line
          key={`ghost${fi}`}
          points={flat}
          stroke="#374151"
          strokeWidth={1}
          closed
          fill="rgba(55,65,81,0.08)"
          dash={[4, 3]}
          listening={false}
        />
      )
    }
    return shapes
  }

  // ─── Current floor's finalized outline ───────────────────────────────────
  const renderCurrentOutline = () => {
    if (currentOutline.length < 2) return null
    const flat = currentOutline.flatMap((p) => [PADDING + p.x * SCALE, PADDING + p.y * SCALE])
    return (
      <>
        <Line
          points={flat}
          stroke="#3b82f6"
          strokeWidth={2.5}
          closed
          fill="rgba(59,130,246,0.12)"
          listening={false}
        />
        {currentOutline.map((p, i) => (
          <Circle
            key={i}
            x={PADDING + p.x * SCALE}
            y={PADDING + p.y * SCALE}
            radius={4}
            fill="#3b82f6"
            stroke="#fff"
            strokeWidth={1}
            listening={false}
          />
        ))}
      </>
    )
  }

  // ─── In-progress drawing ──────────────────────────────────────────────────
  const renderDrawing = () => {
    if (drawingPoints.length === 0) return null
    const nearStart = mousePos ? isNearStart(mousePos.x, mousePos.y) : false
    const flatFixed = drawingPoints.flatMap((p) => [PADDING + p.x * SCALE, PADDING + p.y * SCALE])
    const previewLine =
      mousePos && drawingPoints.length > 0
        ? [...flatFixed, mousePos.x, mousePos.y]
        : flatFixed

    return (
      <>
        {previewLine.length >= 4 && (
          <Line
            points={previewLine}
            stroke={nearStart ? '#22c55e' : '#f59e0b'}
            strokeWidth={2}
            dash={[6, 3]}
            listening={false}
          />
        )}
        {drawingPoints.map((p, i) => (
          <Circle
            key={i}
            x={PADDING + p.x * SCALE}
            y={PADDING + p.y * SCALE}
            radius={i === 0 ? 8 : 5}
            fill={i === 0 ? (nearStart ? '#22c55e' : '#f59e0b') : '#f59e0b'}
            stroke="#fff"
            strokeWidth={1.5}
            listening={false}
          />
        ))}
        {drawingPoints.length >= 3 && (
          <Text
            x={PADDING + drawingPoints[0].x * SCALE + 12}
            y={PADDING + drawingPoints[0].y * SCALE - 18}
            text={nearStart ? '✓ Zamknij kontur' : 'Kliknij punkt startowy, aby zamknąć'}
            fontSize={11}
            fill={nearStart ? '#22c55e' : '#94a3b8'}
            listening={false}
          />
        )}
        {/* Angle snap indicator */}
        {angleSnap && drawingPoints.length > 0 && mousePos && (
          <Text
            x={mousePos.x + 10}
            y={mousePos.y - 18}
            text="⊾ snap 45°"
            fontSize={10}
            fill="#06b6d4"
            listening={false}
          />
        )}
      </>
    )
  }

  // ─── Wall segments with dimension labels ─────────────────────────────────
  const renderDimensions = () => {
    if (currentOutline.length < 2) return null
    const items = []
    const pts = currentOutline
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      const ax = PADDING + a.x * SCALE
      const ay = PADDING + a.y * SCALE
      const bx = PADDING + b.x * SCALE
      const by = PADDING + b.y * SCALE
      const mx = (ax + bx) / 2
      const my = (ay + by) / 2
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      items.push(
        <Text
          key={`dim${i}`}
          x={mx - 15}
          y={my - 14}
          text={`${len.toFixed(1)}m`}
          fontSize={10}
          fill="#64748b"
          listening={false}
        />
      )
    }
    return items
  }

  const totalFloors = building.floors

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-slate-950 relative flex flex-col overflow-hidden"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {/* ── Floor tab selector ── */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-slate-900 border-b border-slate-700 overflow-x-auto">
        <span className="text-xs text-slate-500 font-medium mr-2 flex-shrink-0">Kondygnacja:</span>
        {Array.from({ length: totalFloors }, (_, i) => {
          const hasOwn = !!(floorOutlines[i]?.length >= 3)
          return (
            <button
              key={i}
              onClick={() => {
                setSelectedFloor(i)
                setDrawingPoints([])
              }}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors flex-shrink-0 flex items-center gap-1 ${
                selectedFloor === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {floorLabel(i)}
              {hasOwn && (
                <span className={selectedFloor === i ? 'text-blue-200' : 'text-blue-400'} title="Ma własny obrys">
                  ●
                </span>
              )}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {currentOutline.length >= 3 && !isDrawing && (
            <button
              className="bg-red-900/70 hover:bg-red-700 text-red-300 text-xs px-2 py-1 rounded border border-red-800 transition-colors"
              onClick={handleClearFloor}
            >
              Usuń obrys
            </button>
          )}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 relative overflow-auto" style={{ cursor: isDrawing ? 'crosshair' : 'default' }}>
        <Stage
          width={size.width}
          height={Math.max(size.height - 48, (building.depth + 5) * SCALE + PADDING * 2)}
          onClick={handleStageClick}
          onDblClick={handleDblClick}
          onMouseMove={handleMouseMove}
        >
          <Layer>
            {renderGrid()}
            {renderDefaultRect()}
            {renderGhostOutlines()}
            {renderCurrentOutline()}
            {renderDimensions()}
            {renderDrawing()}
          </Layer>
        </Stage>

        {/* Top-left label */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="bg-slate-800/80 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-slate-700">
            Rzut — {floorLabel(selectedFloor)}
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-3 right-3 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 space-y-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-8 border border-dashed border-slate-500 inline-block" />
            <span>Obrys domyślny</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 border-2 border-blue-500 inline-block" />
            <span>Obrys kondygnacji</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-8 border border-dashed border-slate-600 inline-block" />
            <span>Inne kondygnacje</span>
          </div>
          {isDrawing && (
            <div className="text-cyan-400 mt-1">⇧ Shift = snap 45°</div>
          )}
        </div>

        {/* Drawing instructions */}
        {isDrawing ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/95 text-white text-sm px-5 py-2.5 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
            <span>
              {drawingPoints.length === 0
                ? `Kliknij na planszy, aby rozpocząć rysowanie obrysu — ${floorLabel(selectedFloor)}`
                : `${drawingPoints.length} pkt • Kliknij punkt startowy lub dblclick, aby zamknąć • Esc = anuluj`}
            </span>
            {drawingPoints.length > 0 && (
              <button onClick={cancelDrawing} className="text-red-400 hover:text-red-300 font-medium ml-1">
                Anuluj
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setActiveTool('draw-outline')}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-full shadow-xl transition-colors"
          >
            ✏️ Rysuj obrys — {floorLabel(selectedFloor)}
          </button>
        )}
      </div>
    </div>
  )
}
