// Organism Inspector Panel
import { useMemo } from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { DraggablePanel } from './DraggablePanel';
import { useUIStore } from '@/store/UIStore';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { GeneticsEngine } from '@/lib/GeneticsEngine';
import type { GeneticProfile } from '@/types/simulation';

const TRAIT_LABELS: Record<keyof GeneticProfile, string> = {
  speed: 'Speed', sensorRange: 'Sensor', bodyMass: 'Mass',
  reproThreshold: 'Repro', gestationPeriod: 'Gestation', litterSize: 'Litter',
  lifespanCeiling: 'Lifespan', metabolicRate: 'Metabolism', thermalMin: 'Temp Min',
  thermalMax: 'Temp Max', diseaseResistance: 'Disease Res', aggression: 'Aggression',
  socialAffinity: 'Social', intelligence: 'Intelligence', camouflage: 'Camouflage',
  dietaryBreadth: 'Diet Breadth',
};

const RADAR_TRAITS: (keyof GeneticProfile)[] = [
  'speed', 'sensorRange', 'bodyMass', 'metabolicRate',
  'diseaseResistance', 'aggression', 'intelligence', 'camouflage',
];

const tooltipStyle = {
  background: 'rgba(10,10,20,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10,
};

function StateBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter', fontSize: '0.68rem' }}>{label}</span>
        <span className="font-mono text-xs" style={{ color, fontFamily: 'JetBrains Mono', fontSize: '0.68rem' }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export function OrganismInspectorPanel() {
  const { inspectorPanelState: ps, setInspectorPanel, selectedOrganismId, simTick } = useUIStore();

  const organism = selectedOrganismId
    ? SimulationEngine.state.organisms.get(selectedOrganismId)
    : null;
  const species = organism
    ? SimulationEngine.state.species.get(organism.speciesId)
    : null;

  const radarData = useMemo(() => {
    if (!organism || !species) return [];
    return RADAR_TRAITS.map(key => ({
      trait: TRAIT_LABELS[key],
      individual: Math.round(organism.genes[key] * 100),
      speciesAvg: Math.round(species.avgGenes[key] * 100),
    }));
  }, [organism, species, simTick]);

  const divergentTraits = useMemo(() => {
    if (!organism || !species) return [];
    return GeneticsEngine.getDivergentTraits(organism.genes, species.avgGenes).slice(0, 6);
  }, [organism, species]);

  const agePct = organism
    ? organism.age / (200 + organism.genes.lifespanCeiling * 800)
    : 0;

  const parentA = organism?.parentIds[0]
    ? SimulationEngine.state.organisms.get(organism.parentIds[0])
    : null;
  const parentB = organism?.parentIds[1]
    ? SimulationEngine.state.organisms.get(organism.parentIds[1])
    : null;

  const name = organism && species
    ? GeneticsEngine.generateNameFromGenes(organism.genes, species.name)
    : 'No selection';

  const stateColors: Record<string, string> = {
    hunting: '#F0A500', feeding: '#00E5C0', fleeing: '#FF6B6B',
    reproducing: '#7C6BFF', idle: 'rgba(255,255,255,0.4)',
    sleeping: '#4ECDC4', dying: '#FF6B6B', drinking: '#00E5C0', migrating: '#96CEB4',
  };

  return (
    <DraggablePanel
      title="Organism Inspector"
      icon={<span style={{ fontSize: 11 }}>🔬</span>}
      x={ps.x} y={ps.y} width={ps.width} height={ps.height}
      collapsed={ps.collapsed} open={ps.open}
      onMove={(x, y) => setInspectorPanel({ x, y })}
      onResize={(w, h) => setInspectorPanel({ width: w, height: h })}
      onCollapse={(c) => setInspectorPanel({ collapsed: c })}
      onClose={() => setInspectorPanel({ open: false })}
      minWidth={280} minHeight={360}
    >
      {!organism ? (
        <div className="flex flex-col items-center justify-center h-40 gap-2 opacity-40">
          <span className="text-2xl">🔬</span>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter' }}>Click any organism to inspect</p>
        </div>
      ) : (
        <div className="p-3 space-y-4">
          {/* Identity */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: species?.color ?? '#fff' }} />
              <p className="text-sm font-medium text-foreground truncate" style={{ fontFamily: 'Space Grotesk' }}>{name}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="biome-badge" style={{ color: '#7C6BFF' }}>{species?.name}</span>
              <span className="biome-badge capitalize" style={{ color: '#00E5C0' }}>{species?.type}</span>
              <span
                className="biome-badge"
                style={{ color: stateColors[organism.state] ?? 'rgba(255,255,255,0.5)' }}
              >
                {organism.state}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: 'Inter', fontSize: '0.72rem' }}>
              {organism.stateDetail}
            </p>
          </div>

          {/* Vital stats */}
          <div className="space-y-2">
            <SectionLabel>Vitals</SectionLabel>
            <StateBar label="Energy" value={organism.energy} color="#00E5C0" />
            <StateBar label="Health" value={organism.health} color="#4ECDC4" />
            <StateBar label="Age" value={Math.min(1, agePct)} color="#F0A500" />
            <div className="flex gap-4 mt-1">
              <div className="text-xs">
                <span className="text-muted-foreground" style={{ fontFamily: 'Inter', fontSize: '0.68rem' }}>Age </span>
                <span className="font-mono" style={{ color: '#F0A500', fontFamily: 'JetBrains Mono', fontSize: '0.68rem' }}>
                  {organism.age.toFixed(0)}t
                </span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground" style={{ fontFamily: 'Inter', fontSize: '0.68rem' }}>Max </span>
                <span className="font-mono" style={{ color: '#F0A500', fontFamily: 'JetBrains Mono', fontSize: '0.68rem' }}>
                  {(200 + organism.genes.lifespanCeiling * 800).toFixed(0)}t
                </span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground" style={{ fontFamily: 'Inter', fontSize: '0.68rem' }}>Pos </span>
                <span className="font-mono" style={{ color: '#7C6BFF', fontFamily: 'JetBrains Mono', fontSize: '0.68rem' }}>
                  {organism.x.toFixed(0)},{organism.y.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Radar chart */}
          <div>
            <SectionLabel>Genetic Profile</SectionLabel>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={radarData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="trait"
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8, fontFamily: 'Inter' }}
                />
                <Radar
                  name="Individual"
                  dataKey="individual"
                  stroke="#00E5C0"
                  fill="#00E5C0"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                />
                <Radar
                  name="Species Avg"
                  dataKey="speciesAvg"
                  stroke="#7C6BFF"
                  fill="#7C6BFF"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              <LegendItem color="#00E5C0" label="Individual" />
              <LegendItem color="#7C6BFF" label="Species avg" />
            </div>
          </div>

          {/* Mutation log */}
          {divergentTraits.length > 0 && (
            <div>
              <SectionLabel>Mutations vs Species Average</SectionLabel>
              <div className="space-y-1">
                {divergentTraits.map(t => (
                  <div key={t.trait} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground flex-1 truncate" style={{ fontFamily: 'Inter', fontSize: '0.68rem' }}>
                      {TRAIT_LABELS[t.trait as keyof GeneticProfile]}
                    </span>
                    <span
                      className="font-mono shrink-0"
                      style={{
                        color: t.delta > 0 ? '#00E5C0' : '#FF6B6B',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '0.68rem',
                      }}
                    >
                      {t.delta > 0 ? '+' : ''}{(t.delta * 100).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Family */}
          <div>
            <SectionLabel>Lineage</SectionLabel>
            <div className="space-y-1">
              {parentA && (
                <FamilyMember label="Parent A" organism={parentA} species={SimulationEngine.state.species.get(parentA.speciesId)} />
              )}
              {parentB && (
                <FamilyMember label="Parent B" organism={parentB} species={SimulationEngine.state.species.get(parentB.speciesId)} />
              )}
              {!parentA && !parentB && (
                <p className="text-xs text-muted-foreground opacity-50" style={{ fontFamily: 'Inter', fontSize: '0.68rem' }}>
                  Founding generation — no recorded parents
                </p>
              )}
            </div>
          </div>

          {/* All traits */}
          <div>
            <SectionLabel>All Traits</SectionLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {(Object.keys(TRAIT_LABELS) as (keyof GeneticProfile)[]).map(key => (
                <div key={key} className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground truncate flex-1" style={{ fontFamily: 'Inter', fontSize: '0.62rem' }}>
                    {TRAIT_LABELS[key]}
                  </span>
                  <span className="font-mono shrink-0" style={{ color: '#00E5C0', fontFamily: 'JetBrains Mono', fontSize: '0.62rem' }}>
                    {organism.genes[key].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DraggablePanel>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium mb-1.5" style={{
      color: 'rgba(255,255,255,0.35)',
      fontFamily: 'Space Grotesk',
      letterSpacing: '0.07em',
      textTransform: 'uppercase',
      fontSize: '0.6rem',
    }}>
      {children}
    </p>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-3 h-0.5" style={{ background: color }} />
      <span className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter', fontSize: '0.65rem' }}>{label}</span>
    </div>
  );
}

function FamilyMember({ label, organism, species }: any) {
  return (
    <div className="flex items-center gap-2 p-1.5 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: species?.color ?? '#888', opacity: organism.alive ? 1 : 0.3 }} />
      <div className="min-w-0">
        <span className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter', fontSize: '0.65rem' }}>{label}: </span>
        <span className="text-xs" style={{ color: organism.alive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)', fontFamily: 'Inter', fontSize: '0.65rem', textDecoration: organism.alive ? 'none' : 'line-through' }}>
          {species?.name ?? 'Unknown'}
        </span>
      </div>
      <span className="ml-auto font-mono text-xs shrink-0" style={{ color: '#F0A500', fontFamily: 'JetBrains Mono', fontSize: '0.65rem' }}>
        {organism.alive ? `e:${(organism.energy * 100).toFixed(0)}%` : '†'}
      </span>
    </div>
  );
}
