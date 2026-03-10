import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Line, Circle, Text } from 'react-konva'
import useBuildingStore from '../../store/buildingStore'

const SCALE = 30 // pixels per meter
const PADDING = 60
const SNAP_DISTANCE = 16 // pixels within which the polygon closes

export default function FloorPlanView() {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  // Ephemeral drawing state — not stored in Zustand until polygon is finalized
  const [drawingPoints, setDrawingPoints] = useState([])
  const [mousePos, setMousePos] = useState(null)

  const { building, activeTool, setActiveTool, setOutline, clearOutline } = useBuildingStore()
  const outline = building.outline || []

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const isDrawing = activeTool === 'draw-outline'

  const isNearStart = (mx, my) => {
    if (drawingPoints.length < 3) return false
    const sx = PADDING + drawingPoints[0].x * SCALE
    const sy = PADDING + drawingPoints[0].y * SCALE
    return Math.hypot(mx - sx, my - sy) < SNAP_DISTANCE
  }

  const handleStageClick = (e) => {
    if (!isDrawing) return
    const pos = e.target.getStage().getPointerPosition()
    const x = (pos.x - PADDING) / SCALE
    const y = (pos.y - PADDING) / SCALE

    if (isNearStart(pos.x, pos.y)) {
      // Close the polygon
      setOutline(drawingPoints)
      setDrawingPoints([])
      setActiveTool('select')
      return
    }

    setDrawingPoints([...drawingPoints, { x: Math.max(0, x), y: Math.max(0, y) }])
  }

  const handleDblClick = () => {
    if (!isDrawing || drawingPoints.length < 3) return
    setOutline(drawingPoints)
    setDrawingPoints([])
    setActiveTool('select')
  }

  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition()
    if (pos) setMousePos(pos)
  }

  const cancelDrawing = () => {
    setDrawingPoints([])
    setActiveTool('select')
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
    // Meter labels on axes
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

  // ─── Default rectangle (dashed) ──────────────────────────────────────────
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

  // ─── Finalized outline ────────────────────────────────────────────────────
  const renderOutline = () => {
    if (outline.length < 2) return null
    const flatPoints = outline.flatMap((p) => [PADDING + p.x * SCALE, PADDING + p.y * SCALE])

    return (
      <>
        <Line
          points={flatPoints}
          stroke="#3b82f6"
          strokeWidth={2.5}
          closed
          fill="rgba(59,130,246,0.12)"
          listening={false}
        />
        {outline.map((p, i) => (
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

    // Line with mouse preview
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
      </>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-slate-950 relative overflow-auto"
      style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
    >
      <Stage
        width={size.width}
        height={Math.max(size.height, (building.depth + 5) * SCALE + PADDING * 2)}
        onClick={handleStageClick}
        onDblClick={handleDblClick}
        onMouseMove={handleMouseMove}
      >
        <Layer>
          {renderGrid()}
          {renderDefaultRect()}
          {renderOutline()}
          {renderDrawing()}
        </Layer>
      </Stage>

      {/* Top-left overlay: view label + outline controls */}
      <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="bg-slate-800/80 text-slate-300 text-xs font-semibold px-3 py-1 rounded-full border border-slate-700">
          Rzut poziomy (z góry)
        </span>
        {outline.length > 0 && !isDrawing && (
          <button
            className="pointer-events-auto bg-red-900/70 hover:bg-red-700 text-red-300 text-xs px-2 py-1 rounded border border-red-800 transition-colors"
            onClick={clearOutline}
          >
            Usuń obrys
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 space-y-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-8 border border-dashed border-slate-500 inline-block" />
          <span>Prostokąt domyślny</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 border-2 border-blue-500 inline-block" />
          <span>Narysowany obrys</span>
        </div>
      </div>

      {/* Drawing instructions */}
      {isDrawing && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800/95 text-white text-sm px-5 py-2.5 rounded-full border border-slate-600 shadow-xl flex items-center gap-3">
          <span>
            {drawingPoints.length === 0
              ? 'Kliknij na planszy, aby rozpocząć rysowanie obrysu'
              : `${drawingPoints.length} pkt • Kliknij na punkt startowy lub dwukliknij, aby zamknąć`}
          </span>
          {drawingPoints.length > 0 && (
            <button
              onClick={cancelDrawing}
              className="text-red-400 hover:text-red-300 font-medium ml-1"
            >
              Anuluj
            </button>
          )}
        </div>
      )}

      {/* "Start drawing" button when not currently drawing */}
      {!isDrawing && (
        <button
          onClick={() => setActiveTool('draw-outline')}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2 rounded-full shadow-xl transition-colors"
        >
          ✏️ Rysuj obrys budynku
        </button>
      )}
    </div>
  )
}
