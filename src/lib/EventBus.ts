// Typed event bus for cross-module communication

export type EventMap = {
  'sim:tick': { tick: number; year: number };
  'sim:speed-changed': { speed: string };
  'sim:started': void;
  'sim:paused': void;
  'sim:world-generated': { seed: number };
  'sim:organism-selected': { id: string };
  'sim:organism-deselected': void;
  'species:extinct': { speciesId: string; cause: string; tick: number };
  'species:new': { speciesId: string; parentId: string; tick: number };
  'climate:changed': { key: string; value: number };
  'disaster:triggered': { type: string; x: number; y: number; tick: number };
  'organism:introduced': { speciesId: string; x: number; y: number };
  'data:record': { tick: number };
  'ui:panel-toggle': { panel: string; open: boolean };
  'audio:biome-changed': { biome: string };
  'save:autosave': void;
  'save:load': { slot: number };
  'game:new': void;
};

type EventHandler<T> = (data: T) => void;
type AnyHandler = (data: unknown) => void;

class EventBusClass {
  private listeners: Map<string, Set<AnyHandler>> = new Map();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as AnyHandler);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as AnyHandler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (e) {
        console.error(`EventBus error in ${event}:`, e);
      }
    });
  }

  once<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    const wrapper = (data: EventMap[K]) => {
      handler(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}

export const EventBus = new EventBusClass();
