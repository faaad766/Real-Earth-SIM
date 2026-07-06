// Main simulation workspace — CSS grid 280px|1fr|320px, zero dead zones
import { useEffect, useRef, useState } from 'react';
import { SimCanvas } from '@/components/canvas/SimCanvas';
import { TopBar } from '@/components/ui/TopBar';
import { SaveDialog } from '@/components/ui/SaveDialog';
import { SettingsPanel } from '@/components/ui/SettingsPanel';
import { EnvironmentPanel } from '@/components/panels/EnvironmentPanel';
import { DataVizPanel } from '@/components/panels/DataVizPanel';
import { LogsPanel } from '@/components/panels/LogsPanel';
import { OrganismInspectorPanel } from '@/components/panels/OrganismInspector';
import { useUIStore } from '@/store/UIStore';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { PersistenceManager } from '@/lib/PersistenceManager';
import { EventBus } from '@/lib/EventBus';
import { AudioSystem } from '@/lib/AudioSystem';

export default function SimulationWorkspace() {
  const { settings, audioVolume, currentSeed, setSimSpeed } = useUIStore();
  const bootedRef = useRef(false);
  const [worldReady, setWorldReady] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Initializing world…');

  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const unsubGenerated = EventBus.on('sim:world-generated', () => {
      setLoadingMsg('Seeding life…');
      setTimeout(() => setWorldReady(true), 400);
    });

    const unsubNewGame = EventBus.on('game:new', () => {
      setWorldReady(false);
      setLoadingMsg('Generating new world…');
      SimulationEngine.stop();
      PersistenceManager.clearAutosave();
      const newSeed = Math.floor(Math.random() * 1_000_000_000);
      SimulationEngine.generateWorld(newSeed);
    });

    const unsubExtinct = EventBus.on('species:extinct', ({ speciesId }) => {
      if (useUIStore.getState().settings.pauseOnExtinction) {
        SimulationEngine.stop();
        SimulationEngine.setSpeed('pause');
        setSimSpeed('pause');
      }
    });

    const autosaveMeta = PersistenceManager.getSlotMeta(-1);
    if (autosaveMeta) {
      setLoadingMsg('Resuming last session…');
      const ok = PersistenceManager.loadFromSlot(-1);
      if (!ok) {
        setLoadingMsg('Generating terrain…');
        SimulationEngine.generateWorld(currentSeed);
      }
    } else {
      setLoadingMsg('Generating terrain…');
      SimulationEngine.generateWorld(currentSeed);
    }

    PersistenceManager.startAutosave(settings.autosaveInterval);

    // All events silently routed to LogsPanel via EventBus — no toasts
    const unsubNew      = EventBus.on('species:new', () => {});
    const unsubDisaster = EventBus.on('disaster:triggered', () => {});
    const unsubAutosave = EventBus.on('save:autosave', () => {});

    return () => {
      unsubGenerated(); unsubNewGame(); unsubExtinct();
      unsubNew(); unsubDisaster(); unsubAutosave();
      PersistenceManager.stopAutosave();
      SimulationEngine.stop();
    };
  }, []);

  useEffect(() => { AudioSystem.setVolume(audioVolume); }, [audioVolume]);

  return (
    <div
      className="w-screen h-screen overflow-hidden"
      style={{ background: '#080a12', display: 'grid', gridTemplateRows: '48px 1fr', gridTemplateColumns: '1fr' }}
    >
      <TopBar />

      {/* Loading overlay */}
      {!worldReady && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6"
          style={{ background: 'rgba(8,10,18,0.97)', backdropFilter: 'blur(8px)', gridRow: '2' }}>
          <div className="relative flex items-center justify-center">
            <div className="absolute rounded-full border-2 animate-ping"
              style={{ width: 88, height: 88, borderColor: 'rgba(0,229,192,0.3)' }} />
            <div className="absolute rounded-full border"
              style={{ width: 72, height: 72, borderColor: 'rgba(0,229,192,0.5)',
                boxShadow: '0 0 24px rgba(0,229,192,0.25)', animation: 'evolve-spin 2s linear infinite' }} />
            <span style={{ fontSize: 30 }}>🌍</span>
          </div>
          <div className="text-center space-y-2">
            <h2 style={{ fontFamily: "'Orbitron', monospace", color: '#00E5C0', fontSize: '1rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 }}>
              Real Earth Simulation Setup
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{loadingMsg}</p>
          </div>
          <div className="rounded-full overflow-hidden" style={{ width: 200, height: 2, background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00E5C0, #7B5CF0)', animation: 'loading-bar 2.4s ease-in-out infinite' }} />
          </div>
        </div>
      )}

      {/* Main layout: CSS grid — 280px | 1fr | 320px. No flex, no gaps, zero dead zones. */}
      {worldReady && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr 320px',
            gridTemplateRows: '1fr',
            gridRow: '2',
            width: '100%',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            background: '#080a12',
          }}
        >
          {/* LEFT — Environment Panel */}
          <div
            style={{
              gridColumn: '1',
              height: '100%',
              overflow: 'hidden',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(6,8,16,0.99)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <EnvironmentPanel docked />
          </div>

          {/* CENTER — SimCanvas fills column exactly */}
          <div
            style={{
              gridColumn: '2',
              height: '100%',
              overflow: 'hidden',
              position: 'relative',
              background: '#080a12',
            }}
          >
            <SimCanvas />
            <OrganismInspectorPanel />
          </div>

          {/* RIGHT — DataViz (60%) + Logs (40%) */}
          <div
            style={{
              gridColumn: '3',
              height: '100%',
              overflow: 'hidden',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(6,8,16,0.99)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: '0 0 60%', minHeight: 0, overflow: 'hidden' }}>
              <DataVizPanel docked />
            </div>
            <div style={{ flex: '0 0 40%', minHeight: 0, overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <LogsPanel />
            </div>
          </div>
        </div>
      )}

      <SaveDialog />
      <SettingsPanel />
    </div>
  );
}
