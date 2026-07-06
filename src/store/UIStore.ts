// Zustand UIStore: all panel states and player interaction
import { create } from 'zustand';
import type { SimSpeed, DataLayerType, Organism } from '@/types/simulation';
import { PersistenceManager, type AppSettings } from '@/lib/PersistenceManager';

export interface PanelState {
  open: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
}

interface UIState {
  // Navigation
  screen: 'menu' | 'simulation';
  setScreen: (s: 'menu' | 'simulation') => void;

  // Simulation controls
  simSpeed: SimSpeed;
  setSimSpeed: (speed: SimSpeed) => void;
  simTick: number;
  simYear: number;
  simEra: string;
  setSimTime: (tick: number, year: number, era: string) => void;
  totalPop: number;
  activeSpecies: number;
  setSimStats: (pop: number, species: number) => void;

  // Selected organism
  selectedOrganismId: string | null;
  setSelectedOrganism: (id: string | null) => void;

  // Panels
  envPanelState: PanelState;
  dataPanelState: PanelState;
  inspectorPanelState: PanelState;
  setEnvPanel: (s: Partial<PanelState>) => void;
  setDataPanel: (s: Partial<PanelState>) => void;
  setInspectorPanel: (s: Partial<PanelState>) => void;

  // Minimap
  minimapLayer: DataLayerType['id'];
  setMinimapLayer: (layer: DataLayerType['id']) => void;

  // Viewport
  viewportX: number;
  viewportY: number;
  viewportZoom: number;
  setViewport: (x: number, y: number, zoom: number) => void;

  // Audio
  audioEnabled: boolean;
  audioVolume: number;
  setAudioEnabled: (v: boolean) => void;
  setAudioVolume: (v: number) => void;

  // Settings
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;

  // Disaster cooldowns
  disasterCooldowns: Record<string, number>;
  setDisasterCooldown: (type: string, tick: number) => void;

  // Notifications
  notifications: Array<{ id: string; message: string; type: 'info' | 'warning' | 'error' | 'success'; tick: number }>;
  addNotification: (msg: string, type: 'info' | 'warning' | 'error' | 'success') => void;
  clearNotification: (id: string) => void;

  // World generation
  currentSeed: number;
  setSeed: (seed: number) => void;

  // Drop target for species introduction
  dropTarget: { x: number; y: number; speciesId: string } | null;
  setDropTarget: (t: { x: number; y: number; speciesId: string } | null) => void;

  // Click-to-place species mode
  placingSpeciesId: string | null;
  setPlacingSpeciesId: (id: string | null) => void;

  // Day/night cycle (driven by SimulationEngine, read by UI)
  dayTime: number;   // 0–1 (0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk)
  dayPhase: 'night' | 'dawn' | 'day' | 'dusk';
  setDayTime: (t: number) => void;

  // Minimap collapsed state
  minimapCollapsed: boolean;
  setMinimapCollapsed: (v: boolean) => void;

  // Save dialog
  saveDialogOpen: boolean;
  setSaveDialogOpen: (v: boolean) => void;

  // Settings panel
  settingsPanelOpen: boolean;
  setSettingsPanelOpen: (v: boolean) => void;

  // YPS (years per second) — computed in render loop
  yps: number;
  setYps: (v: number) => void;
}

const savedPanel = (key: string, defaults: PanelState): PanelState =>
  PersistenceManager.loadPanelState(key, defaults);

export const useUIStore = create<UIState>((set) => ({
  screen: 'menu',
  setScreen: (screen) => set({ screen }),

  simSpeed: 'pause',
  setSimSpeed: (simSpeed) => set({ simSpeed }),
  simTick: 0,
  simYear: 0,
  simEra: 'Primordial Age',
  setSimTime: (simTick, simYear, simEra) => set({ simTick, simYear, simEra }),
  totalPop: 0,
  activeSpecies: 0,
  setSimStats: (totalPop, activeSpecies) => set({ totalPop, activeSpecies }),

  selectedOrganismId: null,
  setSelectedOrganism: (selectedOrganismId) => set({ selectedOrganismId }),

  envPanelState: savedPanel('env', { open: true, x: 16, y: 56, width: 280, height: 600, collapsed: false }),
  dataPanelState: savedPanel('data', { open: true, x: -1, y: 56, width: 340, height: 600, collapsed: false }),
  inspectorPanelState: savedPanel('inspector', { open: false, x: 320, y: 56, width: 320, height: 500, collapsed: false }),
  setEnvPanel: (s) => set(state => {
    const next = { ...state.envPanelState, ...s };
    PersistenceManager.savePanelState('env', next);
    return { envPanelState: next };
  }),
  setDataPanel: (s) => set(state => {
    const next = { ...state.dataPanelState, ...s };
    PersistenceManager.savePanelState('data', next);
    return { dataPanelState: next };
  }),
  setInspectorPanel: (s) => set(state => {
    const next = { ...state.inspectorPanelState, ...s };
    PersistenceManager.savePanelState('inspector', next);
    return { inspectorPanelState: next };
  }),

  minimapLayer: 'biome',
  setMinimapLayer: (minimapLayer) => set({ minimapLayer }),

  viewportX: 128,
  viewportY: 128,
  viewportZoom: 2,
  setViewport: (viewportX, viewportY, viewportZoom) => set({ viewportX, viewportY, viewportZoom }),

  audioEnabled: false,
  audioVolume: 0.5,
  setAudioEnabled: (audioEnabled) => set({ audioEnabled }),
  setAudioVolume: (audioVolume) => set({ audioVolume }),

  settings: PersistenceManager.loadSettings(),
  setSettings: (s) => set(state => {
    const next = { ...state.settings, ...s };
    PersistenceManager.saveSettings(next);
    return { settings: next };
  }),

  disasterCooldowns: {},
  setDisasterCooldown: (type, tick) => set(state => ({
    disasterCooldowns: { ...state.disasterCooldowns, [type]: tick }
  })),

  notifications: [],
  addNotification: (message, type) => set(state => {
    const id = `notif_${Date.now()}`;
    const notif = { id, message, type, tick: Date.now() };
    // Auto-expire after 5s
    setTimeout(() => {
      useUIStore.getState().clearNotification(id);
    }, 5000);
    return { notifications: [...state.notifications.slice(-4), notif] };
  }),
  clearNotification: (id) => set(state => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  currentSeed: 42,
  setSeed: (currentSeed) => set({ currentSeed }),

  dropTarget: null,
  setDropTarget: (dropTarget) => set({ dropTarget }),

  placingSpeciesId: null,
  setPlacingSpeciesId: (placingSpeciesId) => set({ placingSpeciesId }),

  dayTime: 0.5,
  dayPhase: 'day',
  setDayTime: (dayTime) => {
    const phase =
      dayTime < 0.21 || dayTime >= 0.85 ? 'night' :
      dayTime < 0.30 ? 'dawn' :
      dayTime < 0.72 ? 'day' : 'dusk';
    set({ dayTime, dayPhase: phase as 'night' | 'dawn' | 'day' | 'dusk' });
  },

  minimapCollapsed: false,
  setMinimapCollapsed: (minimapCollapsed) => set({ minimapCollapsed }),

  saveDialogOpen: false,
  setSaveDialogOpen: (saveDialogOpen) => set({ saveDialogOpen }),

  settingsPanelOpen: false,
  setSettingsPanelOpen: (settingsPanelOpen) => set({ settingsPanelOpen }),

  yps: 0,
  setYps: (yps) => set({ yps }),
}));
