// Top control bar: speed, date, stats, day/night, audio, save, settings, new game
import { Volume2, VolumeX, RotateCcw, Save, Settings, Camera } from 'lucide-react';
import { useUIStore } from '@/store/UIStore';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { AudioSystem } from '@/lib/AudioSystem';
import { EventBus } from '@/lib/EventBus';
import type { SimSpeed } from '@/types/simulation';

const SPEEDS: Array<{ id: SimSpeed; label: string }> = [
  { id: 'pause', label: '⏸' },
  { id: '1x',   label: '1×' },
  { id: '5x',   label: '5×' },
  { id: '20x',  label: '20×' },
  { id: '100x', label: '100×' },
  { id: 'geo',  label: '🌍' },
];

const ERA_COLORS: Record<string, string> = {
  'Primordial Age': '#7C6BFF', 'Dawn Era': '#00E5C0', 'Early Age': '#4ECDC4',
  'Middle Age': '#F0A500', 'Late Age': '#FF6B6B', 'Deep Time': '#FF8C00',
};

const DAY_PHASE_META: Record<string, { icon: string; color: string }> = {
  night: { icon: '🌙', color: '#7C6BFF' },
  dawn:  { icon: '🌅', color: '#F0A500' },
  day:   { icon: '☀️', color: '#FFD700' },
  dusk:  { icon: '🌇', color: '#FF6B6B' },
};

function formatYear(year: number): string {
  if (year < 10000)      return `Yr ${year.toLocaleString()}`;
  if (year < 1_000_000)  return `${(year / 1000).toFixed(1)}k yr`;
  if (year < 1_000_000_000) return `${(year / 1_000_000).toFixed(2)}M yr`;
  return `${(year / 1_000_000_000).toFixed(2)}B yr`;
}

function formatYps(yps: number): string {
  if (yps <= 0) return '—';
  if (yps < 1000) return `${yps}/s`;
  if (yps < 1_000_000) return `${(yps / 1000).toFixed(1)}k/s`;
  return `${(yps / 1_000_000).toFixed(1)}M/s`;
}

export function TopBar() {
  const {
    simSpeed, setSimSpeed, simYear, simEra, totalPop, activeSpecies,
    audioEnabled, audioVolume, setAudioEnabled, setAudioVolume,
    setScreen, dayPhase, dayTime, yps,
    setSaveDialogOpen, setSettingsPanelOpen,
  } = useUIStore();

  const handleSpeed = (speed: SimSpeed) => {
    SimulationEngine.setSpeed(speed);
    setSimSpeed(speed);
    if (speed !== 'pause') SimulationEngine.start();
    else SimulationEngine.stop();
  };

  const handleAudioToggle = () => {
    if (audioEnabled) { AudioSystem.disable(); setAudioEnabled(false); }
    else              { AudioSystem.enable();  setAudioEnabled(true); }
  };

  const handleScreenshot = () => {
    // Find the Pixi canvas and export it
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) { console.error('Canvas not found'); return; }
    try {
      const link = document.createElement('a');
      link.download = `evosphere-yr${simYear}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      console.error('Screenshot failed (tainted canvas)');
    }
  };

  const eraColor   = ERA_COLORS[simEra] ?? '#00E5C0';
  const phaseMeta  = DAY_PHASE_META[dayPhase] ?? DAY_PHASE_META.day;
  const handAngle  = dayTime * 360;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-3"
      style={{
        height: 48,
        background: 'rgba(8,8,16,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Logo */}
      <button
        onClick={() => { SimulationEngine.stop(); setScreen('menu'); }}
        className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
      >
        <div className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00E5C0, #7C6BFF)' }}>
          <span style={{ fontSize: 11 }}>🌍</span>
        </div>
        <span className="text-sm font-bold hidden lg:block"
          style={{ fontFamily: 'Space Grotesk', color: '#00E5C0', letterSpacing: '0.05em' }}>
          Real Earth Simulation Setup
        </span>
      </button>

      <Divider />

      {/* Speed controls */}
      <div className="flex items-center gap-0.5 shrink-0">
        {SPEEDS.map(s => (
          <button key={s.id} onClick={() => handleSpeed(s.id)}
            className={`speed-btn ${simSpeed === s.id ? 'active' : ''}`}>
            {s.label}
          </button>
        ))}
      </div>

      <Divider />

      {/* Sim date + era */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="pulse-dot" style={{ color: eraColor, background: eraColor }} />
        <div>
          <div className="font-mono" style={{ color: eraColor, fontFamily: 'JetBrains Mono', fontSize: '0.78rem', letterSpacing: '0.04em' }}>
            {formatYear(simYear)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Grotesk', fontSize: '0.58rem', letterSpacing: '0.07em' }}>
            {simEra.toUpperCase()}
          </div>
        </div>
      </div>

      {/* YPS readout */}
      <div className="hidden md:flex items-center shrink-0">
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
          {formatYps(yps)}
        </span>
      </div>

      <Divider />

      {/* Day/night clock badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <svg width={18} height={18} viewBox="0 0 18 18">
          <circle cx={9} cy={9} r={8} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
          {[0,3,6,9].map(h => {
            const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
            return <circle key={h} cx={9 + 6.5 * Math.cos(a)} cy={9 + 6.5 * Math.sin(a)} r={0.8} fill="rgba(255,255,255,0.2)" />;
          })}
          <line
            x1={9} y1={9}
            x2={9 + 5.5 * Math.cos((handAngle - 90) * Math.PI / 180)}
            y2={9 + 5.5 * Math.sin((handAngle - 90) * Math.PI / 180)}
            stroke={phaseMeta.color} strokeWidth={1.5} strokeLinecap="round"
          />
          <circle cx={9} cy={9} r={1.2} fill={phaseMeta.color} />
        </svg>
        <span style={{ fontSize: '0.72rem', color: phaseMeta.color, fontFamily: 'Space Grotesk', letterSpacing: '0.04em' }}>
          {phaseMeta.icon}
        </span>
      </div>

      <Divider />

      {/* Stats */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <StatBadge label="organisms" value={totalPop.toLocaleString()} color="#00E5C0" />
        <StatBadge label="species"   value={activeSpecies.toString()} color="#7C6BFF" />
        <StatBadge label="season"    value={SimulationEngine.state.climate.season ?? '—'} color="#F0A500" />
      </div>

      <div className="flex-1" />

      {/* Action buttons row */}
      <div className="flex items-center gap-1 shrink-0">

        {/* Screenshot */}
        <TopBtn onClick={handleScreenshot} title="Screenshot" icon={<Camera size={13} />} color="rgba(255,255,255,0.45)" />

        {/* Save Universe */}
        <TopBtn
          onClick={() => setSaveDialogOpen(true)}
          title="Save Universe"
          icon={<Save size={13} />}
          color="#00E5C0"
          label="Save"
          highlight
        />

        <Divider />

        {/* New Game */}
        <TopBtn
          onClick={() => {
            if (window.confirm('Start a completely new world? Current progress will be lost.')) {
              EventBus.emit('game:new', undefined as unknown as void);
            }
          }}
          title="New Game"
          icon={<RotateCcw size={12} />}
          color="rgba(255,255,255,0.45)"
          label="New"
        />

        <Divider />

        {/* Settings */}
        <TopBtn onClick={() => setSettingsPanelOpen(true)} title="Settings" icon={<Settings size={13} />} color="#7C6BFF" />

        <Divider />

        {/* Audio */}
        <button onClick={handleAudioToggle}
          className="p-1.5 rounded transition-colors duration-150"
          style={{
            color: audioEnabled ? '#00E5C0' : 'rgba(255,255,255,0.3)',
            background: audioEnabled ? 'rgba(0,229,192,0.1)' : 'transparent',
          }}>
          {audioEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        </button>
        {audioEnabled && (
          <input type="range" min={0} max={1} step={0.05} value={audioVolume}
            onChange={e => { const v = parseFloat(e.target.value); setAudioVolume(v); AudioSystem.setVolume(v); }}
            className="evo-slider w-14"
            style={{ '--val': `${audioVolume * 100}%` } as React.CSSProperties}
          />
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }} />;
}

function TopBtn({ onClick, title, icon, color, label, highlight }: {
  onClick: () => void; title: string; icon: React.ReactNode;
  color?: string; label?: string; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1 px-2 py-1 rounded transition-all duration-150 shrink-0"
      style={{
        fontFamily: 'Space Grotesk', fontSize: '0.65rem', letterSpacing: '0.05em',
        color: color ?? 'rgba(255,255,255,0.5)',
        background: highlight ? 'rgba(0,229,192,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${highlight ? 'rgba(0,229,192,0.25)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      {icon}
      {label && <span className="hidden md:inline">{label}</span>}
    </button>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className="font-mono font-medium" style={{ color, fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }}>{value}</div>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter', fontSize: '0.6rem', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

