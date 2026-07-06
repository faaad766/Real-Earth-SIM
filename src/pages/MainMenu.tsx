// Main Menu: full-screen entry with live background simulation
import { useState, useEffect, useRef } from 'react';
import { Play, Settings, FolderOpen, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useUIStore } from '@/store/UIStore';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { PersistenceManager } from '@/lib/PersistenceManager';
import type { AppSettings } from '@/lib/PersistenceManager';

const PRESET_SEEDS = [42, 7331, 19840, 314159, 999999, 2718281];

function randomSeed() {
  return Math.floor(Math.random() * 9999999) + 1;
}

export default function MainMenu() {
  const { setScreen, setSeed, currentSeed, settings, setSettings } = useUIStore();
  const [view, setView] = useState<'main' | 'new' | 'load' | 'settings'>('main');
  const [seedInput, setSeedInput] = useState(String(currentSeed));
  const [seedError, setSeedError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | undefined>(undefined);
  const bgParticles = useRef<Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number }>>([]);
  const slots = PersistenceManager.getAllSlots();

  // Animated background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Init particles
    const colors = ['#00E5C0', '#7C6BFF', '#F0A500', '#4ECDC4', '#FF6B6B'];
    bgParticles.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep space gradient
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.7
      );
      grad.addColorStop(0, 'rgba(12,12,28,1)');
      grad.addColorStop(1, 'rgba(8,8,16,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0,229,192,0.03)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw and animate particles
      for (const p of bgParticles.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '08';
        ctx.fill();
      }

      // Draw connecting lines between nearby particles
      for (let i = 0; i < bgParticles.current.length; i++) {
        for (let j = i + 1; j < bgParticles.current.length; j++) {
          const a = bgParticles.current[i];
          const b = bgParticles.current[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,229,192,${0.06 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleNewWorld = () => {
    const parsed = parseInt(seedInput);
    if (isNaN(parsed) || parsed <= 0) {
      setSeedError('Please enter a valid positive number');
      return;
    }
    setSeedError('');
    setSeed(parsed);
    setScreen('simulation');
  };

  const handleLoadSlot = (slot: number) => {
    const ok = PersistenceManager.loadFromSlot(slot);
    if (ok) {
      setScreen('simulation');
    } else {
      alert('Failed to load save');
    }
  };

  const handleDeleteSlot = (slot: number) => {
    PersistenceManager.deleteSlot(slot);
  };

  const handleRandomSeed = () => {
    const s = randomSeed();
    setSeedInput(String(s));
    setSeed(s);
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center" style={{ background: '#080810' }}>
      {/* Background canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8" style={{ maxWidth: 480, width: '100%', padding: '0 24px' }}>
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center evolve-pulse"
              style={{ background: 'linear-gradient(135deg, rgba(0,229,192,0.2), rgba(124,107,255,0.2))', border: '2px solid rgba(0,229,192,0.3)' }}
            >
              <span style={{ fontSize: 42 }}>🌍</span>
            </div>
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1 }}>
            Real Earth Simulation Setup
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
            A living universe simulator. Observe millions of years of evolution in motion.
          </p>
        </div>

        {/* Main Menu */}
        {view === 'main' && (
          <div className="w-full space-y-2">
            <MenuCard
              icon={<Play size={16} />}
              title="New Universe"
              desc="Generate a fresh world from a seed"
              color="#00E5C0"
              onClick={() => setView('new')}
            />
            <MenuCard
              icon={<FolderOpen size={16} />}
              title="Load World"
              desc="Resume a saved simulation"
              color="#7C6BFF"
              onClick={() => setView('load')}
            />
            <MenuCard
              icon={<Settings size={16} />}
              title="Settings"
              desc="Configure simulation parameters"
              color="#F0A500"
              onClick={() => setView('settings')}
            />
          </div>
        )}

        {/* New World */}
        {view === 'new' && (
          <div className="w-full glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BackButton onClick={() => setView('main')} />
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1rem', fontWeight: 600, color: '#00E5C0' }}>
                New Universe
              </h2>
            </div>

            <div className="space-y-2">
              <label style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                World Seed
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seedInput}
                  onChange={e => { setSeedInput(e.target.value); setSeedError(''); }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-mono outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${seedError ? '#FF6B6B' : 'rgba(255,255,255,0.1)'}`,
                    color: '#00E5C0',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '0.85rem',
                  }}
                  placeholder="Enter seed number..."
                />
                <button
                  onClick={handleRandomSeed}
                  className="p-2 rounded-lg transition-all duration-150"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  title="Random seed"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              {seedError && <p style={{ color: '#FF6B6B', fontFamily: 'Inter', fontSize: '0.72rem' }}>{seedError}</p>}
            </div>

            <div className="space-y-1.5">
              <p style={{ fontFamily: 'Inter', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Preset seeds</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_SEEDS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setSeedInput(String(s)); setSeed(s); }}
                    className="py-1.5 rounded text-xs transition-all duration-150"
                    style={{
                      fontFamily: 'JetBrains Mono',
                      fontSize: '0.72rem',
                      background: parseInt(seedInput) === s ? 'rgba(0,229,192,0.15)' : 'rgba(255,255,255,0.04)',
                      color: parseInt(seedInput) === s ? '#00E5C0' : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${parseInt(seedInput) === s ? 'rgba(0,229,192,0.4)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    {s.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleNewWorld}
              className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(0,229,192,0.2), rgba(0,229,192,0.1))',
                border: '1px solid rgba(0,229,192,0.4)',
                color: '#00E5C0',
                fontFamily: 'Space Grotesk',
                letterSpacing: '0.04em',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,229,192,0.3), rgba(0,229,192,0.15))'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(0,229,192,0.2), rgba(0,229,192,0.1))'; }}
            >
              <Play size={14} />
              Begin Evolution
            </button>
          </div>
        )}

        {/* Load World */}
        {view === 'load' && (
          <div className="w-full glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BackButton onClick={() => setView('main')} />
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1rem', fontWeight: 600, color: '#7C6BFF' }}>
                Load World
              </h2>
            </div>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(slot => {
                const meta = slots[slot];
                return (
                  <div
                    key={slot}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex-1 min-w-0">
                      {meta ? (
                        <>
                          <p className="text-sm font-medium truncate" style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.82rem' }}>{meta.name}</p>
                          <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: '#7C6BFF' }}>
                            Yr {meta.year.toLocaleString()} · {meta.species} species · {meta.population.toLocaleString()} organisms
                          </p>
                        </>
                      ) : (
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'Inter', fontSize: '0.78rem' }}>
                          Slot {slot + 1} — Empty
                        </p>
                      )}
                    </div>
                    {meta && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleLoadSlot(slot)}
                          className="p-1.5 rounded transition-all duration-150"
                          style={{ background: 'rgba(124,107,255,0.15)', color: '#7C6BFF', border: '1px solid rgba(124,107,255,0.3)' }}
                          title="Load"
                        >
                          <Play size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot)}
                          className="p-1.5 rounded transition-all duration-150"
                          style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.2)' }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Settings */}
        {view === 'settings' && (
          <div className="w-full glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <BackButton onClick={() => setView('main')} />
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1rem', fontWeight: 600, color: '#F0A500' }}>
                Settings
              </h2>
            </div>
            <div className="space-y-4">
              <SettingSlider
                label="Master Volume"
                value={settings.audioVolume}
                min={0} max={1} step={0.05}
                displayValue={`${Math.round(settings.audioVolume * 100)}%`}
                onChange={v => setSettings({ audioVolume: v })}
              />
              <SettingSlider
                label="Autosave Interval"
                value={settings.autosaveInterval}
                min={30} max={300} step={30}
                displayValue={`${settings.autosaveInterval}s`}
                onChange={v => setSettings({ autosaveInterval: v })}
              />
              <SettingToggle
                label="Performance Mode"
                desc="Reduces organism count for better FPS"
                value={settings.performanceMode}
                onChange={v => setSettings({ performanceMode: v })}
              />
              <SettingToggle
                label="Reduced Motion"
                desc="Disables ambient animations"
                value={settings.reducedMotion}
                onChange={v => setSettings({ reducedMotion: v })}
              />
              <SettingToggle
                label="Colorblind Palette"
                desc="Adjusts species colors for accessibility"
                value={settings.colorblindMode}
                onChange={v => setSettings({ colorblindMode: v })}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', textAlign: 'center' }}>
          Real Earth Simulation Setup — All life emerges from simple rules
        </p>
      </div>
    </div>
  );
}

function MenuCard({ icon, title, desc, color, onClick }: {
  icon: React.ReactNode; title: string; desc: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(10px)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = `rgba(${color === '#00E5C0' ? '0,229,192' : color === '#7C6BFF' ? '124,107,255' : '240,165,0'},0.08)`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}44`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm" style={{ fontFamily: 'Space Grotesk', color: '#fff' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ fontFamily: 'Inter', color: 'rgba(255,255,255,0.4)' }}>{desc}</p>
      </div>
      <div className="ml-auto text-lg group-hover:translate-x-1 transition-transform duration-150" style={{ color }}>›</div>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded transition-all duration-150"
      style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' }}
    >
      ‹
    </button>
  );
}

function SettingSlider({ label, value, min, max, step, displayValue, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  displayValue: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span style={{ fontFamily: 'Inter', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#F0A500' }}>{displayValue}</span>
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

function SettingToggle({ label, desc, value, onChange }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p style={{ fontFamily: 'Inter', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{label}</p>
        <p style={{ fontFamily: 'Inter', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="w-10 h-5 rounded-full relative transition-all duration-200 shrink-0"
        style={{ background: value ? 'rgba(0,229,192,0.4)' : 'rgba(255,255,255,0.1)', border: `1px solid ${value ? '#00E5C0' : 'rgba(255,255,255,0.15)'}` }}
      >
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
          style={{
            left: value ? 'calc(100% - 18px)' : 2,
            background: value ? '#00E5C0' : 'rgba(255,255,255,0.4)',
            boxShadow: value ? '0 0 6px rgba(0,229,192,0.5)' : 'none',
          }}
        />
      </button>
    </div>
  );
}
