import { create } from 'zustand'

const useBuildingStore = create((set) => ({
  building: {
    name: 'Mój Budynek',
    floors: 3,
    floorHeight: 3,
    width: 20,
    depth: 10,
  },
  elements: [],
  selectedElementId: null,
  activeTool: 'select',
  viewMode: '2d',
  wizardOpen: false,
  wizardStep: 0,

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
}))

export default useBuildingStore
