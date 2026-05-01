import { create } from 'zustand';

/**
 * Canvas Store - State management for the orchestration canvas
 * 
 * Manages viewport, selection, tools, and graph data
 */
const useCanvasStore = create((set, get) => ({
  // Viewport state
  viewport: {
    panX: 0,
    panY: 0,
    zoom: 1.0,
  },
  
  // Selection state
  selectedNodes: [],
  
  // Active tool
  activeTool: 'select', // 'select' | 'pan' | 'add-node' | 'add-annotation'
  
  // Minimap visibility
  minimapVisible: true,
  
  // History for undo/redo
  history: [],
  historyIndex: -1,
  
  // Actions
  updateViewport: (updates) => {
    set((state) => ({
      viewport: { ...state.viewport, ...updates },
    }));
  },
  
  selectNode: (nodeId) => {
    set({ selectedNodes: [nodeId] });
  },
  
  addToSelection: (nodeId) => {
    set((state) => ({
      selectedNodes: [...state.selectedNodes, nodeId],
    }));
  },
  
  removeFromSelection: (nodeId) => {
    set((state) => ({
      selectedNodes: state.selectedNodes.filter(id => id !== nodeId),
    }));
  },
  
  deselectAll: () => {
    set({ selectedNodes: [] });
  },
  
  setActiveTool: (tool) => {
    set({ activeTool: tool });
  },
  
  toggleMinimap: () => {
    set((state) => ({ minimapVisible: !state.minimapVisible }));
  },
  
  // Fit to view
  fitToView: (nodes) => {
    if (nodes.length === 0) return;
    
    const padding = 100;
    const minX = Math.min(...nodes.map(n => n.x)) - padding;
    const maxX = Math.max(...nodes.map(n => n.x + (n.width || 160))) + padding;
    const minY = Math.min(...nodes.map(n => n.y)) - padding;
    const maxY = Math.max(...nodes.map(n => n.y + (n.height || 72))) + padding;
    
    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    // Assuming canvas dimensions (will be calculated from actual canvas)
    const canvasWidth = window.innerWidth - 576; // Minus left and right panels
    const canvasHeight = window.innerHeight - 64; // Minus top bar
    
    const zoomX = canvasWidth / graphWidth;
    const zoomY = canvasHeight / graphHeight;
    const newZoom = Math.min(zoomX, zoomY, 1.0);
    
    const newPanX = (canvasWidth - graphWidth * newZoom) / 2 - minX * newZoom;
    const newPanY = (canvasHeight - graphHeight * newZoom) / 2 - minY * newZoom;
    
    set({
      viewport: {
        panX: newPanX,
        panY: newPanY,
        zoom: newZoom,
      },
    });
  },
  
  // History management
  addToHistory: (action) => {
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action);
      
      // Limit history to 50 actions
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },
  
  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const action = state.history[newIndex];
      
      // Apply undo action
      // (Implementation depends on action type)
      
      set({ historyIndex: newIndex });
    }
  },
  
  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const action = state.history[newIndex];
      
      // Apply redo action
      // (Implementation depends on action type)
      
      set({ historyIndex: newIndex });
    }
  },
}));

export default useCanvasStore;
