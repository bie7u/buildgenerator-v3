export function createBuildingGeometry(building) {
  return {
    width: building.width,
    height: building.floors * building.floorHeight,
    depth: building.depth,
  }
}

export function elementTo3DPosition(element, building) {
  const x = element.x - building.width / 2 + (element.width || 1) / 2
  const y = element.floor * building.floorHeight + (element.height || 1) / 2
  const z = building.depth / 2
  return [x, y, z]
}
