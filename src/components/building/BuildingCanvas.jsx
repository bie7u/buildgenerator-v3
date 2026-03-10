import React, { useRef, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva'
import useBuildingStore from '../../store/buildingStore'
import { SCALE, ELEMENT_COLORS, ELEMENT_DEFAULTS, floorLabel, metersToPx } from '../../utils/buildingUtils'

const PADDING_LEFT = 80
const PADDING_TOP = 20
const FLOOR_GAP = 2

export default function BuildingCanvas() {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const { building, elements, activeTool, selectedElementId, addElement, setSelectedElementId } = useBuildingStore()

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const floorHeightPx = metersToPx(building.floorHeight)
  const buildingWidthPx = metersToPx(building.width)
  const totalHeightPx = building.floors * floorHeightPx

  const getFloorFromY = (y) => {
    const relY = y - PADDING_TOP
    const floorIndex = Math.floor(relY / (floorHeightPx + FLOOR_GAP))
    return building.floors - 1 - floorIndex
  }

  const handleStageClick = (e) => {
    if (activeTool === 'select') {
      if (e.target === e.target.getStage()) {
        setSelectedElementId(null)
      }
      return
    }

    const type = activeTool.replace('add-', '')
    if (!ELEMENT_DEFAULTS[type]) return

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    const floor = getFloorFromY(pos.y)
    if (floor < 0 || floor >= building.floors) return

    const xMeters = (pos.x - PADDING_LEFT) / SCALE
    const defaults = ELEMENT_DEFAULTS[type]

    addElement({
      type,
      floor,
      x: Math.max(0, Math.min(xMeters, building.width - defaults.width)),
      y: 0,
      width: defaults.width,
      height: defaults.height,
      depth: defaults.depth,
      properties: { ...defaults.properties },
    })
  }

  const renderGridLines = () => {
    const lines = []
    for (let i = 0; i <= building.width; i += 5) {
      const x = PADDING_LEFT + metersToPx(i)
      lines.push(
        <Line key={`v${i}`} points={[x, PADDING_TOP, x, PADDING_TOP + totalHeightPx + building.floors * FLOOR_GAP]} stroke="#334155" strokeWidth={0.5} />
      )
    }
    return lines
  }

  const renderFloors = () => {
    const floors = []
    for (let f = building.floors - 1; f >= 0; f--) {
      const displayIndex = building.floors - 1 - f
      const y = PADDING_TOP + displayIndex * (floorHeightPx + FLOOR_GAP)
      floors.push(
        <Group key={f}>
          <Rect
            x={PADDING_LEFT}
            y={y}
            width={buildingWidthPx}
            height={floorHeightPx}
            fill="#1e293b"
            stroke="#475569"
            strokeWidth={1}
          />
          <Text
            x={4}
            y={y + floorHeightPx / 2 - 7}
            text={floorLabel(f, building.floors)}
            fontSize={12}
            fill="#94a3b8"
            width={PADDING_LEFT - 8}
            align="right"
          />
        </Group>
      )
    }
    return floors
  }

  const renderElements = () => {
    return elements.map((el) => {
      const displayIndex = building.floors - 1 - el.floor
      const y = PADDING_TOP + displayIndex * (floorHeightPx + FLOOR_GAP)
      const x = PADDING_LEFT + metersToPx(el.x)
      const w = metersToPx(el.width)
      const h = el.type === 'window' ? 8 : el.type === 'column' ? metersToPx(0.4) : Math.min(metersToPx(el.height || 2.4), floorHeightPx - 4)
      const elY = el.type === 'window' ? y + 4 : y + (floorHeightPx - h) / 2
      const color = ELEMENT_COLORS[el.type] || '#94a3b8'
      const isSelected = el.id === selectedElementId

      return (
        <Group key={el.id}>
          <Rect
            x={x}
            y={elY}
            width={Math.max(w, 4)}
            height={Math.max(h, 4)}
            fill={color}
            opacity={0.85}
            stroke={isSelected ? '#ffffff' : color}
            strokeWidth={isSelected ? 2 : 0}
            cornerRadius={el.type === 'column' ? 2 : 0}
            onClick={() => setSelectedElementId(el.id)}
            onTap={() => setSelectedElementId(el.id)}
          />
          {w > 20 && (
            <Text
              x={x + 2}
              y={elY + 2}
              text={el.type.substring(0, 3).toUpperCase()}
              fontSize={9}
              fill="rgba(0,0,0,0.6)"
              listening={false}
            />
          )}
        </Group>
      )
    })
  }

  const cursor = activeTool === 'select' ? 'default' : 'crosshair'

  return (
    <div ref={containerRef} className="flex-1 bg-slate-950 overflow-auto" style={{ cursor }}>
      <Stage width={size.width} height={Math.max(size.height, totalHeightPx + PADDING_TOP * 2 + building.floors * FLOOR_GAP)} onClick={handleStageClick}>
        <Layer>
          {renderGridLines()}
          {renderFloors()}
          {renderElements()}
        </Layer>
      </Stage>
    </div>
  )
}
