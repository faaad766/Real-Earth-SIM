// Settings panel — performance/quality, display, and simulation options
import { X, Settings, Cpu, Eye, Bell, Clock } from 'lucide-react';
import { useUIStore } from '@/store/UIStore';

function ToggleRow({ label, desc, value, onChange }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>{label}</div>
        {desc && <div style={{ fontFamily: 'Inter', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{desc}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative shrink-0 rounded-full transition-all duration-200"
        style={{
          width: 38, height: 22,
          background: value ? 'rgba(0,229,192,0.9)' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${value ? 'rgba(0,229,192,0.5)' : 'rgba(255,255,255,0.1)'}`,
        }}
      >
        <span
          className="absolute top-0.5 rounded-full transition-all duration-200"
          style={{
            width: 17, height: 17,
            background: value ? '#0a0d12' : 'rgba(255,255,255,0.5)',
            left: value ? 19 : 2,
          }}
        />
      </button>
    </div>
  );
}

function SliderRow({ label, desc, value, min, max, step, format, onChange }: {
  label: string; desc?: string; value: number; min: number; max: number; step: number;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <div>
          <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>{label}</span>
          {desc && <span style={{ fontFamily: 'Inter', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginLeft: 6 }}>{desc}</span>}
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#00E5C0' }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="evo-slider w-full"
        style={{ '--val': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

function QualityPicker({ value, onChange }: { value: string; onChange: (v: 'low' | 'medium' | 'high') => void }) {
  const opts: Array<{ id: 'low' | 'medium' | 'high'; label: string; desc: string }> = [
    { id: 'low',    label: 'Low',    desc: 'Best for slow devices' },
    { id: 'medium', label: 'Medium', desc: 'Balanced (default)' },
    { id: 'high',   label: 'High',   desc: 'Best visuals' },
  ];
  return (
    <div className="py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
        Render Quality
        <span style={{ fontFamily: 'Inter', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>Affects terrain detail and draw frequency</span>
      </div>
      <div className="flex gap-2">
        {opts.map(o => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="flex-1 py-1.5 rounded-lg text-center transition-all duration-150"
            style={{
              fontFamily: 'Space Grotesk', fontSize: '0.72rem',
              color:      value === o.id ? '#00E5C0' : 'rgba(255,255,255,0.4)',
              background: value === o.id ? 'rgba(0,229,192,0.12)' : 'rgba(255,255,255,0.04)',
              border:     `1px solid ${value === o.id ? 'rgba(0,229,192,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}
            title={o.desc}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: 'performance', label: 'Performance', icon: <Cpu size={13} /> },
  { id: 'display',     label: 'Display',     icon: <Eye size={13} /> },
  { id: 'simulation',  label: 'Simulation',  icon: <Bell size={13} /> },
  { id: 'autosave',    label: 'Autosave',    icon: <Clock size={13} /> },
];

export function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen, settings, setSettings } = useUIStore();

  if (!settingsPanelOpen) return null;

  const s = settings;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={() => setSettingsPanelOpen(false)}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12,12,24,0.98)',
          border: '1px solid rgba(124,107,255,0.2)',
          boxShadow: '0 0 60px rgba(124,107,255,0.06), 0 24px 64px rgba(0,0,0,0.85)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <Settings size={15} style={{ color: '#7C6BFF' }} />
            <span style={{ fontFamily: 'Space Grotesk', color: '#7C6BFF', fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.04em' }}>
              Settings
            </span>
          </div>
          <button onClick={() => setSettingsPanelOpen(false)} className="p-1 rounded hover:bg-white/5 transition-colors">
            <X size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Performance */}
          <Section label="Performance" icon={<Cpu size={12} />} color="#F0A500">
            <QualityPicker value={s.renderQuality} onChange={v => setSettings({ renderQuality: v })} />
            <SliderRow
              label="Organism Density"
              desc="Lower = faster on weak devices"
              value={s.particleDensity}
              min={0.1} max={1} step={0.05}
              format={v => `${Math.round(v * 100)}%`}
              onChange={v => setSettings({ particleDensity: v })}
            />
            <ToggleRow
              label="Performance Mode"
              desc="Skips expensive calculations — halves CPU usage"
              value={s.performanceMode}
              onChange={v => setSettings({ performanceMode: v })}
            />
          </Section>

          {/* Display */}
          <Section label="Display" icon={<Eye size={12} />} color="#00E5C0">
            <ToggleRow
              label="FPS Counter"
              desc="Shows frame rate in the canvas corner"
              value={s.showFpsCounter}
              onChange={v => setSettings({ showFpsCounter: v })}
            />
            <ToggleRow
              label="Show Minimap"
              desc="Toggle the minimap panel on the right sidebar"
              value={s.minimapVisible}
              onChange={v => setSettings({ minimapVisible: v })}
            />
            <ToggleRow
              label="Reduced Motion"
              desc="Disables animations and transitions"
              value={s.reducedMotion}
              onChange={v => setSettings({ reducedMotion: v })}
            />
            <ToggleRow
              label="Colorblind Mode"
              desc="Adjusts species dot palette for accessibility"
              value={s.colorblindMode}
              onChange={v => setSettings({ colorblindMode: v })}
            />
          </Section>

          {/* Simulation */}
          <Section label="Simulation" icon={<Bell size={12} />} color="#7C6BFF">
            <ToggleRow
              label="Pause on Extinction"
              desc="Auto-pauses when a species goes extinct"
              value={s.pauseOnExtinction}
              onChange={v => setSettings({ pauseOnExtinction: v })}
            />
          </Section>

          {/* Autosave */}
          <Section label="Autosave" icon={<Clock size={12} />} color="#FF6B6B">
            <SliderRow
              label="Autosave Interval"
              value={s.autosaveInterval}
              min={15} max={300} step={15}
              format={v => v >= 60 ? `${v / 60}m` : `${v}s`}
              onChange={v => setSettings({ autosaveInterval: v })}
            />
          </Section>

        </div>

        {/* Footer note */}
        <div className="px-5 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontFamily: 'Inter', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            Settings are saved automatically to your browser
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ label, icon, color, children }: {
  label: string; icon: React.ReactNode; color: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color }}>{icon}</span>
        <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.7rem', color, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div className="rounded-xl px-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {children}
      </div>
    </div>
  );
}
