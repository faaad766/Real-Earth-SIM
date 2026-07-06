// Live Event Logs Panel — auto-scroll, rich details, all events, no toasts
import { useEffect, useState, useRef } from 'react';
import { ScrollText, Trash2 } from 'lucide-react';
import { EventBus } from '@/lib/EventBus';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { useUIStore } from '@/store/UIStore';

type LogLevel = 'extinction' | 'speciation' | 'disaster' | 'climate' | 'save' | 'info' | 'warning';

interface LogEntry {
  id: number;
  level: LogLevel;
  icon: string;
  message: string;
  detail?: string;
  year: number;
  ts: number;
}

const LEVEL_STYLE: Record<LogLevel, { color: string; bg: string; border: string }> = {
  extinction: { color: '#FF6B6B', bg: 'rgba(255,107,107,0.10)', border: 'rgba(255,107,107,0.28)' },
  speciation: { color: '#7C6BFF', bg: 'rgba(124,107,255,0.10)', border: 'rgba(124,107,255,0.28)' },
  disaster:   { color: '#F0A500', bg: 'rgba(240,165,0,0.10)',   border: 'rgba(240,165,0,0.28)' },
  climate:    { color: '#00E5C0', bg: 'rgba(0,229,192,0.08)',   border: 'rgba(0,229,192,0.22)' },
  save:       { color: '#4CAF50', bg: 'rgba(76,175,80,0.08)',   border: 'rgba(76,175,80,0.22)' },
  info:       { color: '#87CEEB', bg: 'rgba(135,206,235,0.07)', border: 'rgba(135,206,235,0.20)' },
  warning:    { color: '#F0A500', bg: 'rgba(240,165,0,0.08)',   border: 'rgba(240,165,0,0.22)' },
};

let _logId = 0;
function makeLog(level: LogLevel, icon: string, message: string, detail?: string): LogEntry {
  return {
    id: ++_logId, level, icon, message, detail,
    year: SimulationEngine.state.simulatedYear,
    ts: Date.now(),
  };
}

function formatYear(y: number): string {
  if (y >= 1_000_000) return `${(y / 1_000_000).toFixed(2)}M yr`;
  if (y >= 1_000)     return `${(y / 1_000).toFixed(1)}k yr`;
  return `Yr ${y.toLocaleString()}`;
}

const MAX_LOGS = 300;

export function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const { simTick } = useUIStore();

  const push = (entry: LogEntry) => {
    setLogs(prev => {
      const next = [entry, ...prev];
      return next.length > MAX_LOGS ? next.slice(0, MAX_LOGS) : next;
    });
  };

  // Auto-scroll to newest (top, since list is newest-first)
  useEffect(() => {
    if (!userScrolledUp.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  // Track manual scroll
  const handleScroll = () => {
    const el = scrollRef.current;
    if (el) userScrolledUp.current = el.scrollTop > 40;
  };

  useEffect(() => {
    const unsubExtinct = EventBus.on('species:extinct', ({ speciesId, cause }) => {
      const sp = SimulationEngine.state.species.get(speciesId);
      const name = sp?.name ?? speciesId;
      const causeLabel = cause ?? 'unknown cause';
      const pop = sp?.population ?? 0;
      push(makeLog('extinction', '🪦',
        `${name} went extinct`,
        `Cause: ${causeLabel}${pop > 0 ? ` — last ${pop} individual${pop !== 1 ? 's' : ''} lost` : ''}`
      ));
    });

    const unsubNew = EventBus.on('species:new', ({ speciesId, parentId }) => {
      const sp     = SimulationEngine.state.species.get(speciesId);
      const parent = SimulationEngine.state.species.get(parentId);
      push(makeLog('speciation', '🧬',
        `New species: ${sp?.name ?? speciesId}`,
        parent ? `Evolved from ${parent.name} via genetic drift` : 'Spontaneous speciation'
      ));
    });

    const unsubDisaster = EventBus.on('disaster:triggered', ({ type, x, y }) => {
      const icons: Record<string, string> = {
        volcano: '🌋', meteor: '☄️', wildfire: '🔥', flood: '🌊',
        epidemic: '🦠', glaciation: '❄️', earthquake: '🏔', tsunami: '🌊',
        drought: '🏜', solarflare: '☀️',
      };
      const cx = Math.round(x), cy = Math.round(y);
      // Count nearby organism deaths (within 40px radius of event center)
      let killed = 0;
      for (const org of SimulationEngine.state.organisms.values()) {
        if (!org.alive && Math.hypot(org.x - x, org.y - y) < 40) killed++;
      }
      push(makeLog('disaster', icons[type] ?? '⚡',
        `${type.charAt(0).toUpperCase() + type.slice(1)} triggered`,
        `At (${cx}, ${cy})${killed > 0 ? ` — ~${killed} organisms killed` : ' — impact zone active'}`
      ));
    });

    const unsubClimate = EventBus.on('climate:changed', ({ key, value }) => {
      const labels: Record<string, string> = {
        temperature: '🌡 Temperature', rainfall: '🌧 Rainfall', co2: '💨 CO₂',
        solarOutput: '☀️ Solar Output', soilFertility: '🌱 Soil Fertility',
        windPatterns: '🌬 Wind Patterns', oceanSalinity: '🧂 Ocean Salinity',
        mutationRate: '🧪 Mutation Rate', foodDensity: '🍃 Food Density',
        predationPressure: '🎯 Predation', diseaseSpreadRate: '🦠 Disease Rate',
        evolutionSpeed: '⚡ Evo Speed', biomeDriftRate: '🌍 Biome Drift',
      };
      const label = labels[key] ?? key;
      const val = typeof value === 'number' ? value.toFixed(2) : String(value);
      push(makeLog('climate', '⚙️', `${label} changed → ${val}`));
    });

    const unsubSave = EventBus.on('save:autosave', () => {
      push(makeLog('save', '💾', 'World autosaved'));
    });

    const unsubLoad = EventBus.on('save:load', ({ slot }) => {
      push(makeLog('save', '📂', `Loaded save — Slot ${slot + 1}`));
    });

    const unsubNewGame = EventBus.on('game:new', () => {
      push(makeLog('info', '🌱', 'New world generated — life begins'));
    });

    const unsubIntro = EventBus.on('organism:introduced', ({ speciesId }) => {
      const sp = SimulationEngine.state.species.get(speciesId);
      const name = sp?.name ?? speciesId.split('_')[0];
      push(makeLog('info', '✦', `${name} introduced to the world`));
    });

    return () => {
      unsubExtinct(); unsubNew(); unsubDisaster();
      unsubClimate(); unsubSave(); unsubLoad();
      unsubNewGame(); unsubIntro();
    };
  }, []);

  // Tick-based critically endangered warnings
  useEffect(() => {
    if (simTick % 50 !== 0) return;
    for (const sp of SimulationEngine.state.species.values()) {
      if (!sp.extinct && sp.population > 0 && sp.population < 5) {
        push(makeLog('warning', '⚠️',
          `${sp.name} critically endangered`,
          `Only ${sp.population} individual${sp.population !== 1 ? 's' : ''} remain`
        ));
      }
    }
  }, [simTick]);

  const visibleLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const FILTERS: { id: LogLevel | 'all'; label: string }[] = [
    { id: 'all',        label: 'All' },
    { id: 'extinction', label: 'Extinct' },
    { id: 'speciation', label: 'Species' },
    { id: 'disaster',   label: 'Disaster' },
    { id: 'climate',    label: 'Climate' },
    { id: 'warning',    label: 'Alerts' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'rgba(6,8,18,0.98)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <ScrollText size={11} style={{ color: '#7C6BFF' }} />
        <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.65rem', color: '#7C6BFF', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          Event Log
        </span>
        <div className="flex-1" />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)' }}>
          {logs.length} events
        </span>
        <button
          onClick={() => { setLogs([]); userScrolledUp.current = false; }}
          title="Clear logs"
          style={{ padding: '2px 4px', borderRadius: 3, color: 'rgba(255,255,255,0.2)', cursor: 'pointer', background: 'transparent', border: 'none' }}
          className="hover:text-white/50 transition-colors"
        >
          <Trash2 size={9} />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1 px-2 py-1.5 shrink-0 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              fontFamily: 'Space Grotesk', fontSize: '0.55rem', letterSpacing: '0.05em',
              padding: '1px 6px', borderRadius: 10, border: '1px solid',
              cursor: 'pointer', transition: 'all 0.15s',
              borderColor: filter === f.id
                ? (f.id === 'all' ? '#7C6BFF' : LEVEL_STYLE[f.id as LogLevel]?.color ?? '#7C6BFF')
                : 'rgba(255,255,255,0.08)',
              background: filter === f.id
                ? (f.id === 'all' ? 'rgba(124,107,255,0.15)' : LEVEL_STYLE[f.id as LogLevel]?.bg ?? 'rgba(124,107,255,0.15)')
                : 'transparent',
              color: filter === f.id
                ? (f.id === 'all' ? '#7C6BFF' : LEVEL_STYLE[f.id as LogLevel]?.color ?? '#7C6BFF')
                : 'rgba(255,255,255,0.3)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Log list — newest on top, auto-scrolls */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
      >
        {visibleLogs.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontFamily: 'Space Grotesk', fontSize: '0.65rem' }}>
            No events yet — run the simulation
          </div>
        ) : (
          <div className="p-1.5 space-y-1">
            {visibleLogs.map(log => {
              const style = LEVEL_STYLE[log.level];
              return (
                <div
                  key={log.id}
                  style={{
                    background: style.bg,
                    border: `1px solid ${style.border}`,
                    borderRadius: 4,
                    padding: '4px 6px',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 11, lineHeight: 1.4, flexShrink: 0, marginTop: 1 }}>{log.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Space Grotesk', fontSize: '0.63rem', color: style.color, lineHeight: 1.35, fontWeight: 500 }}>
                      {log.message}
                    </div>
                    {log.detail && (
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.54rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, marginTop: 2 }}>
                        {log.detail}
                      </div>
                    )}
                    <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.52rem', color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                      {formatYear(log.year)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

