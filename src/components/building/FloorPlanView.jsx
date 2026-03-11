import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Stage, Layer, Rect, Line, Circle, Text, Arc, Group, RegularPolygon,
} from 'react-konva'
import useBuildingStore from '../../store/buildingStore'
import { ELEMENT_COLORS, ELEMENT_DEFAULTS, ELEMENT_NAMES } from '../../utils/buildingUtils'

const SCALE = 30          // pixels per meter
const PADDING = 60
const SNAP_DISTANCE = 16
const ANGLE_SNAP_THRESHOLD_DEG = 10
const RIGHT_ANGLE_BOX_SIZE_PX  = 14

// Element types that live on the floor plan (placed by clicking in FloorPlanView)
const FLOOR_PLAN_ELEMENTS = new Set([
  'staircase', 'elevator', 'door', 'entrance', 'column', 'wall', 'arc-wall',
])

// ─── Pure geometry helpers ────────────────────────────────────────────────────

function interiorAngleDeg(prev, curr, next) {
  const d1x = curr.x - prev.x, d1y = curr.y - prev.y
  const d1l = Math.hypot(d1x, d1y)
  if (d1l < 0.001) return 0
  const d2x = next.x - curr.x, d2y = next.y - curr.y
  const d2l = Math.hypot(d2x, d2y)
  if (d2l < 0.001) return 0
  const rx = -d1x / d1l, ry = -d1y / d1l
  const ox = d2x / d2l, oy = d2y / d2l
  const dot = rx * ox + ry * oy
  const cross = rx * oy - ry * ox
  let angle = Math.acos(Math.max(-1, Math.min(1, dot)))
  if (cross < 0) angle = 2 * Math.PI - angle
  return angle * 180 / Math.PI
}

function smartAngleSnap(pts, rawX, rawY) {
  const THRESH = Math.cos(ANGLE_SNAP_THRESHOLD_DEG * Math.PI / 180)
  if (pts.length === 0) return { pos: { x: rawX, y: rawY }, snapped: false, is90: false }
  const last   = pts[pts.length - 1]
  const lastPx = PADDING + last.x * SCALE, lastPy = PADDING + last.y * SCALE
  const dx = rawX - lastPx, dy = rawY - lastPy
  const len = Math.hypot(dx, dy)
  if (len < 2) return { pos: { x: rawX, y: rawY }, snapped: false, is90: false }
  const toDir = { x: dx / len, y: dy / len }
  let snapDirs
  if (pts.length >= 2) {
    const prev = pts[pts.length - 2]
    const pdx  = last.x - prev.x, pdy = last.y - prev.y
    const pdl  = Math.hypot(pdx, pdy)
    if (pdl > 0.001) {
      const pd = { x: pdx / pdl, y: pdy / pdl }
      snapDirs = [
        { d: pd,                          is90: false },
        { d: { x: -pd.y, y: pd.x },      is90: true  },
        { d: { x:  pd.y, y: -pd.x },     is90: true  },
        { d: { x: -pd.x, y: -pd.y },     is90: false },
      ]
    }
  }
  if (!snapDirs) {
    const sq = Math.SQRT1_2
    snapDirs = [
      { d: { x:  1,  y:  0 }, is90: false },
      { d: { x: -1,  y:  0 }, is90: false },
      { d: { x:  0,  y:  1 }, is90: false },
      { d: { x:  0,  y: -1 }, is90: false },
      { d: { x:  sq, y:  sq }, is90: false },
      { d: { x: -sq, y:  sq }, is90: false },
      { d: { x:  sq, y: -sq }, is90: false },
      { d: { x: -sq, y: -sq }, is90: false },
    ]
  }
  for (const { d, is90 } of snapDirs) {
    if (toDir.x * d.x + toDir.y * d.y > THRESH)
      return { pos: { x: lastPx + d.x * len, y: lastPy + d.y * len }, snapped: true, is90 }
  }
  return { pos: { x: rawX, y: rawY }, snapped: false, is90: false }
}

function applyLengthEdit(pts, segIndex, newLen) {
  if (!pts || newLen <= 0) return pts
  const n = pts.length, p1 = pts[segIndex], ni = (segIndex + 1) % n, p2 = pts[ni]
  const dx = p2.x - p1.x, dy = p2.y - p1.y, l = Math.hypot(dx, dy)
  if (l < 0.001) return pts
  const newPts = [...pts]
  newPts[ni] = { x: p1.x + dx * (newLen / l), y: p1.y + dy * (newLen / l) }
  return newPts
}

function applyAngleEdit(pts, vi, newAngleDeg) {
  if (!pts || newAngleDeg <= 0 || newAngleDeg >= 360) return pts
  const n = pts.length, prev = pts[(vi - 1 + n) % n], curr = pts[vi], ni = (vi + 1) % n
  const next = pts[ni]
  const d1x = curr.x - prev.x, d1y = curr.y - prev.y, d1l = Math.hypot(d1x, d1y)
  if (d1l < 0.001) return pts
  const rx = -d1x / d1l, ry = -d1y / d1l
  const d2x = next.x - curr.x, d2y = next.y - curr.y, d2l = Math.hypot(d2x, d2y)
  if (d2l < 0.001) return pts
  const rad = newAngleDeg * Math.PI / 180
  const ox = rx * Math.cos(rad) - ry * Math.sin(rad)
  const oy = rx * Math.sin(rad) + ry * Math.cos(rad)
  const newPts = [...pts]
  newPts[ni] = { x: curr.x + ox * d2l, y: curr.y + oy * d2l }
  return newPts
}

function floorLabel(i) { return i === 0 ? 'Parter' : `Piętro ${i}` }

function resolveCurrentOutline(floorOutlines, floorIndex, globalOutline) {
  const own = floorOutlines[floorIndex]
  if (own && own.length >= 3) return own
  if (floorIndex === 0 && globalOutline && globalOutline.length >= 3) return globalOutline
  return []
}

// Convert mouse pixel position to meter coordinates clamped to ≥0
function toMeters(px, py) {
  return {
    x: Math.max(0, (px - PADDING) / SCALE),
    y: Math.max(0, (py - PADDING) / SCALE),
  }
}

// ─── Element shape renderers in floor-plan view ───────────────────────────────

function ElementShape({ el, scale, padding, isSelected, onSelect, onDragEnd }) {
  const color   = ELEMENT_COLORS[el.type] || '#94a3b8'
  const ex      = padding + el.x * scale
  const ey      = padding + (el.y ?? 0) * scale
  const ew      = Math.max((el.width || 1) * scale, 8)
  const ed      = Math.max((el.depth || 1) * scale, 8)

  const commonProps = {
    draggable: true,
    onDragEnd: (e) => onDragEnd(el.id, {
      x: Math.max(0, (e.target.x() - padding) / scale),
      y: Math.max(0, (e.target.y() - padding) / scale),
    }),
    onClick: (e) => { e.cancelBubble = true; onSelect(el.id) },
    onTap:   (e) => { e.cancelBubble = true; onSelect(el.id) },
  }

  const strokeColor  = isSelected ? '#fff' : 'rgba(255,255,255,0.3)'
  const strokeWidth  = isSelected ? 2 : 1

  if (el.type === 'column') {
    return (
      <Group {...commonProps} x={ex} y={ey}>
        <Circle radius={ew / 2} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
        {isSelected && (
          <Circle radius={ew / 2 + 4} stroke="#fff" strokeWidth={1} dash={[4, 3]} fill="transparent" />
        )}
      </Group>
    )
  }

  if (el.type === 'staircase') {
    const steps = el.properties?.steps || 12
    const stepH = ed / steps
    const lines = []
    for (let s = 1; s < steps; s++) {
      lines.push(
        <Line key={s} points={[0, s * stepH, ew, s * stepH]}
          stroke="rgba(255,255,255,0.25)" strokeWidth={0.5} listening={false} />
      )
    }
    return (
      <Group {...commonProps} x={ex} y={ey}>
        <Rect width={ew} height={ed} fill={color} opacity={0.85}
          stroke={strokeColor} strokeWidth={strokeWidth} />
        {lines}
        {/* Arrow indicating stair direction */}
        <Line points={[ew / 2, ed * 0.15, ew / 2, ed * 0.85]}
          stroke="#fff" strokeWidth={2} listening={false} />
        <Line points={[ew / 2 - 5, ed * 0.7, ew / 2, ed * 0.85, ew / 2 + 5, ed * 0.7]}
          stroke="#fff" strokeWidth={2} listening={false} />
        <Text text="SC" x={2} y={2} fontSize={9} fill="rgba(0,0,0,0.6)" listening={false} />
      </Group>
    )
  }

  if (el.type === 'elevator') {
    return (
      <Group {...commonProps} x={ex} y={ey}>
        <Rect width={ew} height={ed} fill={color} opacity={0.8}
          stroke={strokeColor} strokeWidth={strokeWidth} />
        {/* Elevator doors line */}
        <Line points={[ew / 2, 0, ew / 2, ed]}
          stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} listening={false} />
        <Circle x={ew / 2} y={ed / 2} radius={3} fill="#93c5fd" listening={false} />
        <Text text="EL" x={2} y={2} fontSize={9} fill="rgba(0,0,0,0.6)" listening={false} />
      </Group>
    )
  }

  if (el.type === 'door' || el.type === 'entrance') {
    const dw    = ew   // door width in px
    const rot   = el.properties?.rotation ?? 0
    const swing = el.properties?.swing ?? 90  // swing angle in degrees
    return (
      <Group {...commonProps} x={ex} y={ey} rotation={rot}>
        {/* Door frame (wall line) */}
        <Line points={[0, 0, dw, 0]}
          stroke={color} strokeWidth={3} lineCap="round" listening={false} />
        {/* Door leaf */}
        <Line points={[0, 0, 0, -dw]}
          stroke={color} strokeWidth={1.5} listening={false} />
        {/* Swing arc */}
        <Arc
          x={0} y={0}
          innerRadius={dw - 2} outerRadius={dw}
          angle={swing}
          rotation={-swing}
          fill={`${color}30`}
          stroke={color} strokeWidth={1}
          listening={false}
        />
        {isSelected && (
          <Rect x={-4} y={-dw - 4} width={dw + 8} height={dw + 8}
            stroke="#fff" strokeWidth={1} dash={[4, 3]} fill="transparent" />
        )}
      </Group>
    )
  }

  if (el.type === 'arc-wall') {
    const radius    = (el.properties?.radius ?? 2) * scale
    const startDeg  = el.properties?.startAngle ?? 0
    const sweepDeg  = (el.properties?.endAngle ?? 90) - startDeg
    return (
      <Group {...commonProps} x={ex} y={ey}>
        <Arc
          innerRadius={radius - 4} outerRadius={radius + 4}
          angle={Math.abs(sweepDeg)}
          rotation={startDeg}
          fill={`${color}40`}
          stroke={color} strokeWidth={isSelected ? 3 : 2}
        />
        {isSelected && (
          <Arc
            innerRadius={radius - 8} outerRadius={radius + 8}
            angle={Math.abs(sweepDeg)}
            rotation={startDeg}
            fill="transparent"
            stroke="#fff" strokeWidth={1} dash={[4, 3]}
          />
        )}
      </Group>
    )
  }

  if (el.type === 'wall') {
    return (
      <Group {...commonProps} x={ex} y={ey} rotation={el.properties?.rotation ?? 0}>
        <Rect width={ew} height={Math.max((el.depth || 0.15) * scale, 4)}
          fill={color} opacity={0.9}
          stroke={strokeColor} strokeWidth={strokeWidth} />
      </Group>
    )
  }

  // Generic fallback
  return (
    <Group {...commonProps} x={ex} y={ey}>
      <Rect width={ew} height={ed} fill={color} opacity={0.85}
        stroke={strokeColor} strokeWidth={strokeWidth} />
    </Group>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FloorPlanView() {
  const containerRef  = useRef(null)
  const dimInputRef   = useRef(null)

  const [size, setSize]             = useState({ width: 800, height: 600 })
  const [drawingPoints, setDrawingPoints] = useState([])
  const [snapResult, setSnapResult] = useState({ pos: null, snapped: false, is90: false })
  const [dimEdit, setDimEdit]       = useState(null)

  const {
    building, elements, activeTool, setActiveTool,
    selectedFloor, setSelectedFloor,
    selectedElementId, setSelectedElementId,
    setFloorOutline, clearFloorOutline,
    setOutline, clearOutline,
    addElement, updateElement,
  } = useBuildingStore()

  const floorOutlines   = building.floorOutlines || {}
  const currentOutline  = resolveCurrentOutline(floorOutlines, selectedFloor, building.outline)
  // Floor-plan elements: elements belonging to this floor that can be placed on the plan
  const floorElements   = elements.filter(
    (e) => e.floor === selectedFloor && FLOOR_PLAN_ELEMENTS.has(e.type)
  )

  const isDrawing       = activeTool === 'draw-outline'
  const placingType     = activeTool?.startsWith('add-') ? activeTool.replace('add-', '') : null

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    setDrawingPoints([])
    setSnapResult({ pos: null, snapped: false, is90: false })
  }, [selectedFloor])

  useEffect(() => {
    if (selectedFloor >= building.floors) {
      setSelectedFloor(Math.max(0, building.floors - 1))
    }
  }, [building.floors, selectedFloor, setSelectedFloor])

  useEffect(() => {
    if (dimEdit && dimInputRef.current) {
      dimInputRef.current.focus()
      dimInputRef.current.select()
    }
  }, [dimEdit])

  // ── Outline helpers ──────────────────────────────────────────────────────────
  const isNearStart = (mx, my) => {
    if (drawingPoints.length < 3) return false
    const sx = PADDING + drawingPoints[0].x * SCALE
    const sy = PADDING + drawingPoints[0].y * SCALE
    return Math.hypot(mx - sx, my - sy) < SNAP_DISTANCE
  }

  const commitDrawing = (pts) => {
    setFloorOutline(selectedFloor, pts)
    if (selectedFloor === 0) setOutline(pts)
    setDrawingPoints([])
    setActiveTool('select')
  }

  const cancelDrawing = () => { setDrawingPoints([]); setActiveTool('select') }

  const handleClearFloor = () => {
    clearFloorOutline(selectedFloor)
    if (selectedFloor === 0) clearOutline()
  }

  // ── Dim-edit ─────────────────────────────────────────────────────────────────
  const applyDimEdit = (rawVal) => {
    const v = parseFloat(rawVal)
    if (!dimEdit || isNaN(v)) { setDimEdit(null); return }
    const newPts = dimEdit.type === 'length'
      ? applyLengthEdit(currentOutline, dimEdit.index, v)
      : applyAngleEdit(currentOutline, dimEdit.index, v)
    setFloorOutline(selectedFloor, newPts)
    if (selectedFloor === 0) setOutline(newPts)
    setDimEdit(null)
  }

  // ── Element drag ──────────────────────────────────────────────────────────────
  const handleElementDragEnd = useCallback((id, { x, y }) => {
    updateElement(id, { x, y })
  }, [updateElement])

  // ── Stage events ─────────────────────────────────────────────────────────────
  const handleStageClick = (e) => {
    // Deselect if clicking background
    if (e.target === e.target.getStage() && !isDrawing && !placingType) {
      setSelectedElementId(null)
      return
    }

    // ── Outline drawing ──
    if (isDrawing) {
      const raw  = e.target.getStage().getPointerPosition()
      const snap = smartAngleSnap(drawingPoints, raw.x, raw.y)
      const pos  = drawingPoints.length > 0 ? snap.pos : raw
      if (isNearStart(pos.x, pos.y)) { commitDrawing(drawingPoints); return }
      setDrawingPoints([...drawingPoints, toMeters(pos.x, pos.y)])
      return
    }

    // ── Element placement ──
    if (placingType && ELEMENT_DEFAULTS[placingType]) {
      const stage = e.target.getStage()
      const pos   = stage.getPointerPosition()
      const m     = toMeters(pos.x, pos.y)
      const def   = ELEMENT_DEFAULTS[placingType]
      addElement({
        type:    placingType,
        floor:   selectedFloor,
        x:       Math.max(0, m.x),
        y:       Math.max(0, m.y),
        width:   def.width,
        height:  def.height,
        depth:   def.depth,
        properties: { ...def.properties },
      })
      setActiveTool('select')
    }
  }

  const handleDblClick = (e) => {
    if (!isDrawing || drawingPoints.length < 3) return
    e.evt?.preventDefault?.()
    commitDrawing(drawingPoints)
  }

  const handleMouseMove = (e) => {
    const pos  = e.target.getStage().getPointerPosition()
    if (!pos) return
    if (isDrawing) {
      const snap = smartAngleSnap(drawingPoints, pos.x, pos.y)
      setSnapResult(snap.snapped ? snap : { pos, snapped: false, is90: false })
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isDrawing) cancelDrawing()
      else { setActiveTool('select'); setSelectedElementId(null) }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedElementId) {
        const { removeElement } = useBuildingStore.getState()
        removeElement(selectedElementId)
        setSelectedElementId(null)
      }
    }
  }

  // ── Canvas cursor ─────────────────────────────────────────────────────────────
  const cursor = isDrawing || placingType ? 'crosshair' : 'default'

  // ── Rendering ─────────────────────────────────────────────────────────────────
  const renderGrid = () => {
    const lines = [], maxW = building.width + 5, maxH = building.depth + 5
    for (let x = 0; x <= maxW; x++) {
      lines.push(<Line key={`v${x}`}
        points={[PADDING + x * SCALE, 0, PADDING + x * SCALE, size.height]}
        stroke={x % 5 === 0 ? '#334155' : '#1e2533'}
        strokeWidth={x % 5 === 0 ? 1 : 0.5} listening={false} />)
    }
    for (let y = 0; y <= maxH; y++) {
      lines.push(<Line key={`h${y}`}
        points={[0, PADDING + y * SCALE, size.width, PADDING + y * SCALE]}
        stroke={y % 5 === 0 ? '#334155' : '#1e2533'}
        strokeWidth={y % 5 === 0 ? 1 : 0.5} listening={false} />)
    }
    for (let x = 0; x <= building.width; x += 5) {
      lines.push(<Text key={`xl${x}`}
        x={PADDING + x * SCALE - 10} y={PADDING - 22}
        text={`${x}m`} fontSize={11} fill="#475569" listening={false} />)
    }
    for (let y = 0; y <= building.depth; y += 5) {
      lines.push(<Text key={`yl${y}`}
        x={4} y={PADDING + y * SCALE - 7}
        text={`${y}m`} fontSize={11} fill="#475569" listening={false} />)
    }
    return lines
  }

  const renderDefaultRect = () => (
    <Rect x={PADDING} y={PADDING}
      width={building.width * SCALE} height={building.depth * SCALE}
      stroke="#334155" strokeWidth={1.5} dash={[6, 4]}
      fill="transparent" listening={false} />
  )

  const renderGhostOutlines = () => {
    const items = []
    for (let fi = 0; fi < building.floors; fi++) {
      if (fi === selectedFloor) continue
      const ol = floorOutlines[fi]
      if (!ol || ol.length < 3) continue
      const flat = ol.flatMap((p) => [PADDING + p.x * SCALE, PADDING + p.y * SCALE])
      items.push(<Line key={`ghost${fi}`} points={flat}
        stroke="#374151" strokeWidth={1} closed
        fill="rgba(55,65,81,0.08)" dash={[4, 3]} listening={false} />)
    }
    return items
  }

  const renderCurrentOutline = () => {
    if (currentOutline.length < 2) return null
    const pts = currentOutline, n = pts.length
    const flat = pts.flatMap((p) => [PADDING + p.x * SCALE, PADDING + p.y * SCALE])
    const items = [
      <Line key="outline" points={flat}
        stroke="#3b82f6" strokeWidth={2.5} closed
        fill="rgba(59,130,246,0.12)" listening={false} />,
      ...pts.map((p, i) => (
        <Circle key={`vt${i}`}
          x={PADDING + p.x * SCALE} y={PADDING + p.y * SCALE}
          radius={4} fill="#3b82f6" stroke="#fff" strokeWidth={1} listening={false} />
      )),
    ]

    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n]
      const ax = PADDING + a.x * SCALE, ay = PADDING + a.y * SCALE
      const bx = PADDING + b.x * SCALE, by = PADDING + b.y * SCALE
      const ddx = bx - ax, ddy = by - ay
      const segLen = Math.hypot(b.x - a.x, b.y - a.y)
      const ll = Math.hypot(ddx, ddy)
      const offX = ll > 0 ? (-ddy / ll) * 13 : 0
      const offY = ll > 0 ? ( ddx / ll) * 13 : 0
      const mx = (ax + bx) / 2 + offX, my = (ay + by) / 2 + offY
      const si = i
      items.push(
        <Text key={`dl${i}`} x={mx - 18} y={my - 8}
          text={`${segLen.toFixed(2)}m`} fontSize={11} fill="#60a5fa"
          onMouseEnter={(e) => { e.target.fill('#93c5fd'); e.target.getLayer().batchDraw(); e.target.getStage().container().style.cursor = 'pointer' }}
          onMouseLeave={(e) => { e.target.fill('#60a5fa'); e.target.getLayer().batchDraw(); e.target.getStage().container().style.cursor = cursor }}
          onClick={(e) => {
            e.cancelBubble = true
            const sp = e.target.getStage().getPointerPosition()
            setDimEdit({ type: 'length', index: si, currentVal: parseFloat(segLen.toFixed(2)), x: sp.x, y: sp.y })
          }}
          listening={true} />
      )
    }

    if (n >= 3) {
      for (let i = 0; i < n; i++) {
        const prev = pts[(i - 1 + n) % n], curr = pts[i], next = pts[(i + 1) % n]
        const angle = interiorAngleDeg(prev, curr, next)
        const d1x = -(curr.x - prev.x), d1y = -(curr.y - prev.y)
        const d2x =   next.x - curr.x,  d2y =   next.y - curr.y
        const d1l = Math.hypot(d1x, d1y) || 1, d2l = Math.hypot(d2x, d2y) || 1
        const bx  = d1x / d1l + d2x / d2l, by = d1y / d1l + d2y / d2l
        const bl  = Math.hypot(bx, by) || 1
        const OFF = 22
        const lx  = PADDING + curr.x * SCALE + (bx / bl) * OFF
        const ly  = PADDING + curr.y * SCALE + (by / bl) * OFF
        const vi  = i
        const is90 = Math.abs(angle - 90) < 1.5
        const fillColor = is90 ? '#06b6d4' : '#94a3b8'
        items.push(
          <Text key={`al${i}`} x={lx - 14} y={ly - 8}
            text={is90 ? '⊾ 90°' : `${angle.toFixed(1)}°`}
            fontSize={10} fill={fillColor}
            onMouseEnter={(e) => { e.target.fill('#e2e8f0'); e.target.getLayer().batchDraw(); e.target.getStage().container().style.cursor = 'pointer' }}
            onMouseLeave={(e) => { e.target.fill(fillColor); e.target.getLayer().batchDraw(); e.target.getStage().container().style.cursor = cursor }}
            onClick={(e) => {
              e.cancelBubble = true
              const sp = e.target.getStage().getPointerPosition()
              setDimEdit({ type: 'angle', index: vi, currentVal: parseFloat(angle.toFixed(1)), x: sp.x, y: sp.y })
            }}
            listening={true} />
        )
      }
    }
    return items
  }

  const renderElements = () => {
    return floorElements.map((el) => (
      <ElementShape
        key={el.id}
        el={el}
        scale={SCALE}
        padding={PADDING}
        isSelected={el.id === selectedElementId}
        onSelect={setSelectedElementId}
        onDragEnd={handleElementDragEnd}
      />
    ))
  }

  const renderDrawing = () => {
    const mp = snapResult.pos
    if (drawingPoints.length === 0) return null
    const nearStart = mp ? isNearStart(mp.x, mp.y) : false
    const { is90, snapped } = snapResult
    const lineColor = nearStart ? '#22c55e' : is90 ? '#06b6d4' : '#f59e0b'
    const flatFixed = drawingPoints.flatMap((p) => [PADDING + p.x * SCALE, PADDING + p.y * SCALE])
    const previewLine = mp ? [...flatFixed, mp.x, mp.y] : flatFixed
    const items = []

    if (previewLine.length >= 4) {
      items.push(<Line key="dl" points={previewLine} stroke={lineColor}
        strokeWidth={2} dash={[6, 3]} listening={false} />)
    }
    drawingPoints.forEach((p, i) => {
      items.push(<Circle key={`dv${i}`}
        x={PADDING + p.x * SCALE} y={PADDING + p.y * SCALE}
        radius={i === 0 ? 8 : 5}
        fill={i === 0 ? (nearStart ? '#22c55e' : '#f59e0b') : '#f59e0b'}
        stroke="#fff" strokeWidth={1.5} listening={false} />)
    })
    if (drawingPoints.length >= 3) {
      items.push(<Text key="closehint"
        x={PADDING + drawingPoints[0].x * SCALE + 12}
        y={PADDING + drawingPoints[0].y * SCALE - 18}
        text={nearStart ? '✓ Zamknij kontur' : 'Kliknij punkt startowy, aby zamknąć'}
        fontSize={11} fill={nearStart ? '#22c55e' : '#94a3b8'} listening={false} />)
    }
    if (mp && drawingPoints.length > 0) {
      const last   = drawingPoints[drawingPoints.length - 1]
      const lastPx = PADDING + last.x * SCALE, lastPy = PADDING + last.y * SCALE
      const curM   = toMeters(mp.x, mp.y)
      const dist   = Math.hypot(curM.x - last.x, curM.y - last.y)
      const ddx    = mp.x - lastPx, ddy = mp.y - lastPy
      const dl     = Math.hypot(ddx, ddy)
      if (dist > 0.05) {
        const offX = dl > 0 ? (-ddy / dl) * 14 : 0
        const offY = dl > 0 ? ( ddx / dl) * 14 : 0
        items.push(<Text key="livelen"
          x={(lastPx + mp.x) / 2 + offX - 24}
          y={(lastPy + mp.y) / 2 + offY - 8}
          text={`${dist.toFixed(2)}m`}
          fontSize={11} fontStyle="bold"
          fill={is90 ? '#06b6d4' : '#f59e0b'} listening={false} />)
      }
      if (drawingPoints.length >= 2) {
        const prev  = drawingPoints[drawingPoints.length - 2]
        const angle = interiorAngleDeg(prev, last, curM)
        if (angle > 0.1) {
          items.push(<Text key="liveang"
            x={lastPx + 8} y={lastPy - 20}
            text={(is90 ? '⊾ ' : '') + angle.toFixed(1) + '°'}
            fontSize={11} fontStyle={is90 ? 'bold' : 'normal'}
            fill={is90 ? '#06b6d4' : '#f0abfc'} listening={false} />)
        }
      }
      if (is90 && drawingPoints.length >= 2) {
        const prev = drawingPoints[drawingPoints.length - 2]
        const prevPx = PADDING + prev.x * SCALE, prevPy = PADDING + prev.y * SCALE
        const d1x = lastPx - prevPx, d1y = lastPy - prevPy, d1l = Math.hypot(d1x, d1y)
        if (d1l > 1 && dl > 1) {
          const B  = RIGHT_ANGLE_BOX_SIZE_PX
          const n1 = { x: d1x / d1l * B, y: d1y / d1l * B }
          const n2 = { x: ddx / dl  * B, y: ddy / dl  * B }
          items.push(<Line key="rabox"
            points={[lastPx + n1.x, lastPy + n1.y, lastPx + n1.x + n2.x, lastPy + n1.y + n2.y, lastPx + n2.x, lastPy + n2.y]}
            stroke="#06b6d4" strokeWidth={1.5} closed={false} listening={false} />)
        }
      }
    }
    if (snapped && mp) {
      items.push(<Circle key="snapdot" x={mp.x} y={mp.y} radius={4}
        fill={is90 ? '#06b6d4' : '#f59e0b'} stroke="#fff" strokeWidth={1} listening={false} />)
    }
    return items
  }

  // ── Placement ghost: show a translucent shape under cursor before placing ────
  const renderPlacementGhost = () => {
    if (!placingType || !snapResult.pos) return null
    const mp  = snapResult.pos
    const def = ELEMENT_DEFAULTS[placingType]
    if (!def) return null
    const ew = (def.width || 1) * SCALE, ed = (def.depth || 1) * SCALE
    const color = ELEMENT_COLORS[placingType] || '#94a3b8'
    return (
      <Rect x={mp.x - ew / 2} y={mp.y - ed / 2}
        width={ew} height={ed}
        fill={`${color}40`} stroke={color} strokeWidth={1.5}
        dash={[4, 3]} listening={false} />
    )
  }

  const totalFloors = building.floors

  return (
    <div ref={containerRef}
      className="flex-1 bg-slate-950 relative flex flex-col overflow-hidden"
      tabIndex={0} onKeyDown={handleKeyDown}>

      {/* ── Floor tab bar ── */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 bg-slate-900 border-b border-slate-700 overflow-x-auto">
        <span className="text-xs text-slate-500 font-medium mr-2 flex-shrink-0">Kondygnacja:</span>
        {Array.from({ length: totalFloors }, (_, i) => {
          const hasOwn = !!(floorOutlines[i]?.length >= 3)
          const hasEls = elements.some((e) => e.floor === i && FLOOR_PLAN_ELEMENTS.has(e.type))
          return (
            <button key={i}
              onClick={() => { setSelectedFloor(i); setDrawingPoints([]); setSelectedElementId(null) }}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors flex-shrink-0 flex items-center gap-1 ${
                selectedFloor === i ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}>
              {floorLabel(i)}
              {hasOwn && <span className={selectedFloor === i ? 'text-blue-200' : 'text-blue-400'} title="Ma własny obrys">●</span>}
              {hasEls && <span className={selectedFloor === i ? 'text-yellow-200' : 'text-yellow-400'} title="Ma elementy">◆</span>}
            </button>
          )
        })}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {currentOutline.length >= 3 && !isDrawing && (
            <button
              className="bg-red-900/70 hover:bg-red-700 text-red-300 text-xs px-2 py-1 rounded border border-red-800 transition-colors"
              onClick={handleClearFloor}>
              Usuń obrys
            </button>
          )}
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 relative overflow-auto" style={{ cursor }}>
        <Stage
          width={size.width}
          height={Math.max(size.height - 48, (building.depth + 5) * SCALE + PADDING * 2)}
          onClick={handleStageClick}
          onDblClick={handleDblClick}
          onMouseMove={handleMouseMove}>
          <Layer>
            {renderGrid()}
            {renderDefaultRect()}
            {renderGhostOutlines()}
            {renderCurrentOutline()}
            {renderElements()}
            {renderDrawing()}
            {renderPlacementGhost()}
          </Layer>
        </Stage>

        {/* ── Dim-edit overlay ── */}
        {dimEdit && (
          <div className="absolute z-20 bg-slate-800 border border-blue-500 rounded-lg shadow-xl p-2.5 flex flex-col gap-1.5"
            style={{ left: dimEdit.x + 10, top: dimEdit.y - 52, minWidth: 148 }}>
            <div className="text-xs text-slate-400 font-medium">
              {dimEdit.type === 'length' ? '📏 Długość (m):' : '📐 Kąt (°):'}
            </div>
            <input ref={dimInputRef} type="number"
              step={dimEdit.type === 'length' ? '0.01' : '1'}
              min={dimEdit.type === 'length' ? '0.01' : '0.1'}
              max={dimEdit.type === 'angle' ? '359.9' : undefined}
              defaultValue={dimEdit.currentVal}
              className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter')  applyDimEdit(e.target.value)
                if (e.key === 'Escape') setDimEdit(null)
                e.stopPropagation()
              }}
              onBlur={() => setTimeout(() => setDimEdit(null), 150)} />
            <div className="text-xs text-slate-500">Enter = zastosuj · Esc = anuluj</div>
          </div>
        )}

        {/* Top-left floor label */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="bg-slate-800/80 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-slate-700">
            Rzut — {floorLabel(selectedFloor)}
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-3 right-3 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 space-y-1 pointer-events-none">
          <div className="flex items-center gap-2"><span className="w-8 border border-dashed border-slate-500 inline-block" /><span>Obrys domyślny</span></div>
          <div className="flex items-center gap-2"><span className="w-8 border-2 border-blue-500 inline-block" /><span>Obrys kondygnacji</span></div>
          <div className="flex items-center gap-2"><span className="w-8 border border-dashed border-slate-600 inline-block" /><span>Inne kondygnacje</span></div>
          <div className="flex items-center gap-2"><span className="text-cyan-400">⊾</span><span>Auto-snap 90°</span></div>
          {!isDrawing && currentOutline.length >= 3 && (
            <div className="text-blue-400 mt-1">Kliknij wymiar/kąt, aby edytować</div>
          )}
          {floorElements.length > 0 && (
            <div className="text-yellow-400 mt-1">{floorElements.length} elementów — przeciągnij aby przenieść</div>
          )}
        </div>

        {/* Bottom instruction bar */}
        {isDrawing ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/95 text-white text-sm px-5 py-2.5 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
            <span>
              {drawingPoints.length === 0
                ? `Kliknij, aby rozpocząć — ${floorLabel(selectedFloor)}`
                : `${drawingPoints.length} pkt • kliknij start lub dblclick, aby zamknąć • Esc = anuluj`}
            </span>
            {drawingPoints.length > 0 && (
              <button onClick={cancelDrawing} className="text-red-400 hover:text-red-300 font-medium">Anuluj</button>
            )}
          </div>
        ) : placingType ? (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/95 text-white text-sm px-5 py-2.5 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
            <span>
              {`Kliknij, aby umieścić: ${ELEMENT_NAMES[placingType] || placingType} — ${floorLabel(selectedFloor)}`}
            </span>
            <button onClick={() => setActiveTool('select')} className="text-red-400 hover:text-red-300 font-medium">Anuluj</button>
          </div>
        ) : (
          <button onClick={() => setActiveTool('draw-outline')}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-full shadow-xl transition-colors">
            ✏️ Rysuj obrys — {floorLabel(selectedFloor)}
          </button>
        )}
      </div>
    </div>
  )
}
