// Persistence: pako compression, save slots, autosave
import pako from 'pako';
import { SimulationEngine } from './SimulationEngine';
import { EventBus } from './EventBus';

const SLOT_PREFIX = 'evosphere_save_';
const AUTOSAVE_SLOT = 'evosphere_autosave';
const SETTINGS_KEY = 'evosphere_settings';

export interface SaveSlot {
  slot: number;
  name: string;
  timestamp: number;
  year: number;
  species: number;
  population: number;
}

export interface AppSettings {
  audioVolume: number;
  autosaveInterval: number;
  performanceMode: boolean;
  reducedMotion: boolean;
  colorblindMode: boolean;
  lastSeed: number;
  // v6 additions
  renderQuality: 'low' | 'medium' | 'high';
  showFpsCounter: boolean;
  pauseOnExtinction: boolean;
  minimapVisible: boolean;
  particleDensity: number;  // 0–1
}

const DEFAULT_SETTINGS: AppSettings = {
  audioVolume: 0.5,
  autosaveInterval: 60,
  performanceMode: false,
  reducedMotion: false,
  colorblindMode: false,
  lastSeed: 42,
  renderQuality: 'medium',
  showFpsCounter: false,
  pauseOnExtinction: false,
  minimapVisible: true,
  particleDensity: 0.8,
};

export class PersistenceManagerClass {
  private autosaveTimer: ReturnType<typeof setInterval> | null = null;

  startAutosave(intervalSeconds: number): void {
    this.stopAutosave();
    this.autosaveTimer = setInterval(() => {
      this.autosave();
      EventBus.emit('save:autosave', undefined as unknown as void);
    }, intervalSeconds * 1000);
  }

  stopAutosave(): void {
    if (this.autosaveTimer) clearInterval(this.autosaveTimer);
  }

  autosave(): void {
    this.saveToSlot(-1, 'Autosave');
  }

  saveToSlot(slot: number, name: string): boolean {
    try {
      const json = SimulationEngine.serialize();
      const compressed = pako.deflate(json);
      const b64 = btoa(String.fromCharCode(...compressed));
      const meta: SaveSlot = {
        slot,
        name,
        timestamp: Date.now(),
        year: SimulationEngine.state.simulatedYear,
        species: [...SimulationEngine.state.species.values()].filter(s => !s.extinct).length,
        population: SimulationEngine.state.organisms.size,
      };
      const key = slot === -1 ? AUTOSAVE_SLOT : `${SLOT_PREFIX}${slot}`;
      localStorage.setItem(key, b64);
      localStorage.setItem(`${key}_meta`, JSON.stringify(meta));
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  loadFromSlot(slot: number): boolean {
    try {
      const key = slot === -1 ? AUTOSAVE_SLOT : `${SLOT_PREFIX}${slot}`;
      const b64 = localStorage.getItem(key);
      if (!b64) return false;
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const json = pako.inflate(bytes, { to: 'string' });
      SimulationEngine.deserialize(json);
      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  }

  getSlotMeta(slot: number): SaveSlot | null {
    try {
      const key = slot === -1 ? AUTOSAVE_SLOT : `${SLOT_PREFIX}${slot}`;
      const meta = localStorage.getItem(`${key}_meta`);
      return meta ? JSON.parse(meta) : null;
    } catch { return null; }
  }

  getAllSlots(): Array<SaveSlot | null> {
    return [0, 1, 2, 3, 4].map(i => this.getSlotMeta(i));
  }

  deleteSlot(slot: number): void {
    const key = slot === -1 ? AUTOSAVE_SLOT : `${SLOT_PREFIX}${slot}`;
    localStorage.removeItem(key);
    localStorage.removeItem(`${key}_meta`);
  }

  clearAutosave(): void {
    this.deleteSlot(-1);
  }

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  loadSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  savePanelState(key: string, state: unknown): void {
    localStorage.setItem(`evosphere_panel_${key}`, JSON.stringify(state));
  }

  loadPanelState<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(`evosphere_panel_${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
}

export const PersistenceManager = new PersistenceManagerClass();
