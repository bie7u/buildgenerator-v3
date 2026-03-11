/** Number of pixels per meter used to convert between real-world meters and canvas pixel coordinates in the 2D floor plan editor. */
export const SCALE = 20 // pixels per meter

export const metersToPx = (m) => m * SCALE
export const pxToMeters = (px) => px / SCALE

export const ELEMENT_COLORS = {
  staircase: '#f97316',
  elevator: '#3b82f6',
  window: '#bae6fd',
  balcony: '#22c55e',
  column: '#374151',
  wall: '#6b7280',
  door: '#a78bfa',
  entrance: '#34d399',
  'arc-wall': '#fb923c',
}

export const ELEMENT_NAMES = {
  staircase: 'Klatka schodowa',
  elevator: 'Winda',
  window: 'Okno',
  balcony: 'Balkon',
  column: 'Kolumna',
  wall: 'Ścianka działowa',
  door: 'Drzwi',
  entrance: 'Wejście',
  'arc-wall': 'Ściana łukowa',
}

export const ELEMENT_DEFAULTS = {
  staircase: { width: 3, height: 4, depth: 3, properties: { steps: 18, hasLanding: true } },
  elevator: { width: 1.5, height: 2, depth: 1.5, properties: { capacity: 4 } },
  window: { width: 1.2, height: 0.3, depth: 0.1, properties: { style: 'standard', glazing: 'double' } },
  balcony: { width: 3, height: 0.2, depth: 1.2, properties: { railing: 'glass' } },
  column: { width: 0.4, height: 3, depth: 0.4, properties: { material: 'concrete' } },
  wall: { width: 3, height: 2.4, depth: 0.15, properties: { material: 'gypsum' } },
  door: { width: 0.9, height: 2.1, depth: 0.1, properties: { style: 'single', swing: 90, rotation: 0 } },
  entrance: { width: 1.8, height: 2.2, depth: 0.15, properties: { style: 'double', swing: 90, rotation: 0 } },
  'arc-wall': { width: 0.2, height: 2.4, depth: 0.2, properties: { radius: 2, startAngle: 0, endAngle: 90, thickness: 0.15 } },
}

export const floorLabel = (floor, totalFloors) => {
  if (floor === 0) return 'Parter'
  return `Piętro ${floor}`
}

export const getFloorY = (floor, totalFloors, floorHeight) => {
  return (totalFloors - 1 - floor) * metersToPx(floorHeight)
}
