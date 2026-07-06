// Data Visualization Panel: 6 chart tabs
import { useState, useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { DraggablePanel } from './DraggablePanel';
import { useUIStore } from '@/store/UIStore';
import { DataRecorder } from '@/lib/DataRecorder';
import { SimulationEngine } from '@/lib/SimulationEngine';
import type { Species } from '@/types/simulation';

const TABS = [
  { id: 'population', label: 'Pop' },
  { id: 'biodiversity', label: 'Bio' },
  { id: 'climate', label: 'Climate' },
  { id: 'extinction', label: 'Extinct' },
  { id: 'foodweb', label: 'Food Web' },
  { id: 'evo', label: 'Evo Tree' },
] as const;
type TabId = typeof TABS[number]['id'];

const CHART_COLORS = ['#00E5C0','#7C6BFF','#F0A500','#FF6B6B','#4ECDC4','#96CEB4','#FFEAA7','#DDA0DD'];

// Tooltip styles
const tooltipStyle = {
  background: 'rgba(10,10,20,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
};

export function DataVizPanel({ docked }: { docked?: boolean }) {
  const { dataPanelState: ps, setDataPanel, simTick } = useUIStore();
  const [activeTab, setActiveTab] = useState<TabId>('population');

  const history = DataRecorder.getRecentHistory(300);
  const extinctions = DataRecorder.extinctions.slice(-20).reverse();
  const speciations = DataRecorder.speciations.slice(-20).reverse();
  const state = SimulationEngine.state;
  const foodEdges = useMemo(() => DataRecorder.getFoodWebEdges(state), [simTick]);
  const activeSpecies = useMemo(() => [...state.species.values()].filter(s => !s.extinct), [simTick]);

  return (
    <DraggablePanel
      title="Data Observatory"
      icon={<span style={{ fontSize: 11 }}>📊</span>}
      x={ps.x} y={ps.y} width={ps.width} height={ps.height}
      collapsed={docked ? false : ps.collapsed}
      open={docked ? true : ps.open}
      rightAligned={ps.x < 0}
      onMove={(x, y) => setDataPanel({ x, y })}
      onResize={(w, h) => setDataPanel({ width: w, height: h })}
      onCollapse={(c) => setDataPanel({ collapsed: c })}
      onClose={() => !docked && setDataPanel({ open: false })}
      minWidth={300} minHeight={400}
      docked={docked}
    >
      {/* Tab bar */}
      <div className="flex border-b px-2 pt-1 gap-0.5 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-2.5 py-1.5 text-xs rounded-t transition-colors duration-150"
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              color: activeTab === tab.id ? '#00E5C0' : 'rgba(255,255,255,0.4)',
              background: activeTab === tab.id ? 'rgba(0,229,192,0.1)' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #00E5C0' : '2px solid transparent',
              letterSpacing: '0.04em',
              fontSize: '0.68rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3 h-full">
        {activeTab === 'population' && <PopulationChart history={history} activeSpecies={activeSpecies} />}
        {activeTab === 'biodiversity' && <BiodiversityChart history={history} />}
        {activeTab === 'climate' && <ClimateChart history={history} />}
        {activeTab === 'extinction' && <ExtinctionLog extinctions={extinctions} />}
        {activeTab === 'foodweb' && <FoodWebDiagram edges={foodEdges} species={activeSpecies} />}
        {activeTab === 'evo' && <EvoTree state={state} />}
      </div>
    </DraggablePanel>
  );
}

function PopulationChart({ history, activeSpecies }: any) {
  if (history.length < 2) return <EmptyState msg="Collecting population data..." />;
  const speciesIds = activeSpecies.slice(0, 8).map((s: any) => s.id);
  return (
    <div className="space-y-2">
      <ChartTitle>Population by Species</ChartTitle>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#00E5C0' }} />
          {speciesIds.map((id: string, i: number) => (
            <Area
              key={id}
              type="monotone"
              dataKey={`populationBySpecies.${id}`}
              name={activeSpecies.find((s: any) => s.id === id)?.name ?? id}
              stackId="1"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.3}
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-1 mt-2">
        {activeSpecies.slice(0, 8).map((sp: any, i: number) => (
          <div key={sp.id} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="truncate text-muted-foreground" style={{ fontSize: '0.68rem', fontFamily: 'Inter' }}>{sp.name}</span>
            <span className="ml-auto font-mono shrink-0" style={{ color: CHART_COLORS[i % CHART_COLORS.length], fontFamily: 'JetBrains Mono', fontSize: '0.68rem' }}>{sp.population}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BiodiversityChart({ history }: any) {
  if (history.length < 2) return <EmptyState msg="Collecting biodiversity data..." />;
  return (
    <div className="space-y-2">
      <ChartTitle>Biodiversity Index</ChartTitle>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#00E5C0' }} />
          <Line type="monotone" dataKey="biodiversityIndex" name="Shannon Index" stroke="#00E5C0" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="speciesCount" name="Species Count" stroke="#7C6BFF" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClimateChart({ history }: any) {
  if (history.length < 2) return <EmptyState msg="Collecting climate data..." />;
  return (
    <div className="space-y-2">
      <ChartTitle>Climate History</ChartTitle>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={history} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#F0A500' }} />
          <Line type="monotone" dataKey="temperature" name="Temp °C" stroke="#F0A500" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="rainfall" name="Rainfall ×" stroke="#00E5C0" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="co2" name="CO₂ ppm" stroke="#7C6BFF" strokeWidth={1} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExtinctionLog({ extinctions }: any) {
  if (extinctions.length === 0) return <EmptyState msg="No extinctions recorded yet" />;
  const causeColors: Record<string, string> = {
    'disease': '#FF6B6B',
    'predation': '#F0A500',
    'climate shift': '#7C6BFF',
    'drought': '#FFD700',
    'habitat loss': '#96CEB4',
  };
  return (
    <div className="space-y-2">
      <ChartTitle>Extinction Record</ChartTitle>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {extinctions.map((e: any, i: number) => (
          <div key={i} className="flex items-start gap-2 p-2 rounded text-xs" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="w-1 self-stretch rounded shrink-0 mt-0.5" style={{ background: causeColors[e.cause] ?? '#666', minWidth: 3 }} />
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate" style={{ fontFamily: 'Inter', fontSize: '0.72rem' }}>{e.speciesName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-muted-foreground" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem' }}>Yr {e.tick}</span>
                <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: `${causeColors[e.cause] ?? '#666'}22`, color: causeColors[e.cause] ?? '#666', fontSize: '0.65rem' }}>
                  {e.cause}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FoodWebDiagram({ edges, species }: any) {
  if (species.length === 0) return <EmptyState msg="No active species" />;
  const nodes = species.slice(0, 12);
  const w = 260, h = 200;
  const nodePositions = nodes.map((sp: any, i: number) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    return { x: w/2 + Math.cos(angle) * 90, y: h/2 + Math.sin(angle) * 75, sp };
  });
  const posMap = new Map<string, { x: number; y: number; sp: Species }>(
    nodePositions.map((n: { x: number; y: number; sp: Species }) => [n.sp.id, n])
  );

  return (
    <div className="space-y-2">
      <ChartTitle>Food Web</ChartTitle>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
        {edges.slice(0, 20).map((e: any, i: number) => {
          const s = posMap.get(e.source), t = posMap.get(e.target);
          if (!s || !t) return null;
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="rgba(255,255,255,0.1)" strokeWidth={0.8} markerEnd="url(#arrow)" />;
        })}
        <defs>
          <marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 Z" fill="rgba(255,255,255,0.3)" />
          </marker>
        </defs>
        {nodePositions.map(({ x, y, sp }: { x: number; y: number; sp: Species }) => (
          <g key={sp.id}>
            <circle cx={x} cy={y} r={8} fill={sp.color} fillOpacity={0.8} />
            <text x={x} y={y + 18} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={7} fontFamily="Inter">
              {sp.name.slice(0, 10)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function EvoTree({ state }: any) {
  const roots = [...state.species.values()].filter((s: any) => !s.ancestorId);
  if (roots.length === 0) return <EmptyState msg="No evolutionary tree yet" />;

  function renderNode(species: any, depth = 0): React.ReactNode {
    const children = [...state.species.values()].filter((s: any) => s.ancestorId === species.id);
    return (
      <div key={species.id} className="ml-3" style={{ borderLeft: depth > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
        <div className="flex items-center gap-1.5 py-0.5 pl-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: species.extinct ? 'rgba(150,150,150,0.4)' : species.color }} />
          <span
            className="text-xs"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.68rem',
              color: species.extinct ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.75)',
              textDecoration: species.extinct ? 'line-through' : 'none',
            }}
          >
            {species.name}
          </span>
          <span className="ml-auto font-mono text-xs shrink-0" style={{ color: '#7C6BFF', fontFamily: 'JetBrains Mono', fontSize: '0.65rem' }}>
            {species.extinct ? '†' : species.population}
          </span>
        </div>
        {children.map((c: any) => renderNode(c, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ChartTitle>Evolutionary Tree</ChartTitle>
      <div className="overflow-y-auto max-h-64 space-y-1">
        {roots.map((r: any) => renderNode(r))}
      </div>
    </div>
  );
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Space Grotesk', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
      {children}
    </p>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center h-32">
      <p className="text-xs text-muted-foreground opacity-50" style={{ fontFamily: 'Inter' }}>{msg}</p>
    </div>
  );
}
