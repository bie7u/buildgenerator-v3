import { create } from 'zustand'

const useBuildingStore = create((set) => ({
  building: {
    name: 'Mój Budynek',
    floors: 3,
    floorHeight: 3,
    width: 20,
    depth: 10,
    outline: [], // global base outline [{x, y}], empty = use rectangle
    floorOutlines: {}, // per-floor overrides: { [floorIndex]: [{x, y}] }
  },
  elements: [],
  selectedElementId: null,
  activeTool: 'select',
  viewMode: '2d',
  wizardOpen: false,
  wizardStep: 0,
  wallOpacity: 0.85,
  selectedFloor: 0,

  updateBuilding: (updates) => set((state) => ({ building: { ...state.building, ...updates } })),
  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, { ...element, id: crypto.randomUUID() }],
    })),
  removeElement: (id) =>
    set((state) => ({ elements: state.elements.filter((e) => e.id !== id) })),
  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  setSelectedElementId: (id) => set({ selectedElementId: id }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setWizardOpen: (open) => set({ wizardOpen: open }),
  setWizardStep: (step) => set({ wizardStep: step }),
  setWallOpacity: (opacity) => set({ wallOpacity: opacity }),
  setSelectedFloor: (floor) => set({ selectedFloor: floor }),

  // Global base outline (fallback for floors without a per-floor outline)
  setOutline: (points) => set((state) => ({ building: { ...state.building, outline: points } })),
  clearOutline: () => set((state) => ({ building: { ...state.building, outline: [] } })),

  // Per-floor outlines
  setFloorOutline: (floorIndex, points) =>
    set((state) => ({
      building: {
        ...state.building,
        floorOutlines: { ...(state.building.floorOutlines || {}), [floorIndex]: points },
      },
    })),
  clearFloorOutline: (floorIndex) =>
    set((state) => {
      const { [floorIndex]: _removed, ...rest } = state.building.floorOutlines || {}
      return { building: { ...state.building, floorOutlines: rest } }
    }),
}))

export default useBuildingStore
