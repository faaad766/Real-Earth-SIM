// Environmental Control Panel — searchable species grid, climate, evolution, disasters
import { useState, useCallback, useMemo } from 'react';
import { Thermometer, Droplets, Wind, Leaf, Sun, AlertTriangle, Search, X, ChevronDown, ChevronRight, Dna, Zap, Globe } from 'lucide-react';
import { DraggablePanel } from './DraggablePanel';
import { useUIStore } from '@/store/UIStore';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { DISASTERS, SPECIES_CATALOG } from '@/types/simulation';

const TYPE_COLORS: Record<string, string> = {
  plant: '#4CAF50', herbivore: '#00E5C0', carnivore: '#FF6B6B',
  omnivore: '#F0A500', insect: '#7C6BFF',
};
const TYPE_LABELS: Record<string, string> = {
  plant: 'Plants', herbivore: 'Herbivores', carnivore: 'Carnivores',
  omnivore: 'Omnivores', insect: 'Insects',
};
const BIOME_ABBR: Record<string, string> = {
  grassland: 'Grass', temperate_forest: 'TForest', tropical_rainforest: 'TRain',
  desert: 'Desert', tundra: 'Tundra', alpine: 'Alpine', wetland: 'Wetland',
  ocean: 'Ocean', coastal: 'Coast', river: 'River', lake: 'Lake',
};

interface SliderRowProps {
  label: string; value: number; min: number; max: number;
  step: number; unit: string; feedback: string;
  icon: React.ReactNode; color: string; onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, unit, feedback, icon, color, onChange }: SliderRowProps) {
  const safeVal = value ?? min;
  const pct = ((safeVal - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span style={{ color }}>{icon}</span>
          <span style={{ fontFamily: 'Inter, sans-serif' }}>{label}</span>
        </div>
        <span className="font-mono text-xs" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>
          {safeVal.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={safeVal}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="evo-slider w-full"
        style={{ '--val': `${pct}%` } as React.CSSProperties}
      />
      <p className="text-xs text-muted-foreground opacity-60 truncate" style={{ fontSize: '0.68rem' }}>{feedback}</p>
    </div>
  );
}

function SectionHeader({ title, icon, expanded, onToggle }: {
  title: string; icon: React.ReactNode; expanded: boolean; onToggle: () => void;
}) {
  return (
    <button className="w-full flex items-center gap-2 text-left py-0.5" onClick={onToggle}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-xs font-medium text-muted-foreground flex-1"
        style={{ fontFamily: 'Space Grotesk', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
        {title}
      </span>
      {expanded ? <ChevronDown size={11} className="text-muted-foreground" /> : <ChevronRight size={11} className="text-muted-foreground" />}
    </button>
  );
}

export function EnvironmentPanel({ docked }: { docked?: boolean }) {
  const {
    envPanelState: ps, setEnvPanel, simTick,
    disasterCooldowns, setDisasterCooldown, addNotification,
    placingSpeciesId, setPlacingSpeciesId,
  } = useUIStore();

  const [expandedSection, setExpandedSection] = useState<string>('species');
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<string>('all');
  const climate = SimulationEngine.state.climate;

  const [temp, setTemp]         = useState(climate.temperature ?? 15);
  const [rainfall, setRainfall] = useState(climate.rainfall ?? 1);
  const [co2, setCo2]           = useState(climate.co2 ?? 415);
  const [fertility, setFertility] = useState(climate.soilFertility ?? 0.6);
  const [solar, setSolar]       = useState(climate.solarOutput ?? 1);
  const [salinity, setSalinity] = useState(climate.oceanSalinity ?? 1.0);
  const [wind, setWind]         = useState(climate.windPatterns ?? 0.5);
  const [humidity, setHumidity] = useState(climate.humidity ?? 0.5);
  const [seasonal, setSeasonal] = useState(climate.seasonalVariation ?? 0.5);
  const [tectonic, setTectonic] = useState(climate.tectonicActivity ?? 0.2);
  // Evolution controls
  const [mutationRate, setMutationRate] = useState((climate as any).mutationRate ?? 0.3);
  const [foodDensity, setFoodDensity]   = useState((climate as any).foodDensity ?? 1.0);
  const [predation, setPredation]       = useState((climate as any).predationPressure ?? 0.5);
  const [disease, setDisease]           = useState((climate as any).diseaseSpreadRate ?? 0.2);
  const [evoSpeed, setEvoSpeed]         = useState((climate as any).evolutionSpeed ?? 1.0);
  const [biomeDrift, setBiomeDrift]     = useState((climate as any).biomeDriftRate ?? 0.1);

  const applyClimate = useCallback((key: string, value: number) => {
    SimulationEngine.setClimateState({ [key]: value } as any);
  }, []);

  const triggerDisaster = useCallback((disasterId: string) => {
    const cooldownTick = disasterCooldowns[disasterId] ?? 0;
    const d = DISASTERS.find(d => d.id === disasterId)!;
    if (simTick - cooldownTick < d.cooldown) return;
    const cx = SimulationEngine.state.world.width / 2;
    const cy = SimulationEngine.state.world.height / 2;
    SimulationEngine.triggerDisaster(disasterId, cx, cy);
    setDisasterCooldown(disasterId, simTick);
    addNotification(`${d.name} triggered!`, 'warning');
  }, [simTick, disasterCooldowns, setDisasterCooldown, addNotification]);

  const toggle = (s: string) => setExpandedSection(prev => prev === s ? '' : s);

  // Live population counts
  const popBySpecies = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sp of SimulationEngine.state.species.values()) {
      if (!sp.extinct) map[sp.id] = sp.population;
    }
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simTick]);

  const filtered = useMemo(() => SPECIES_CATALOG.filter(sp => {
    const matchType = activeType === 'all' || sp.type === activeType;
    const matchSearch = !search || sp.name.toLowerCase().includes(search.toLowerCase()) ||
      sp.biomes.some(b => b.includes(search.toLowerCase()));
    return matchType && matchSearch;
  }), [search, activeType]);

  const isPlacing = !!placingSpeciesId;

  return (
    <DraggablePanel
      title="Environment" icon={<Leaf size={13} />}
      x={ps.x} y={ps.y} width={ps.width} height={ps.height}
      collapsed={docked ? false : ps.collapsed}
      open={docked ? true : ps.open}
      onMove={(x, y) => setEnvPanel({ x, y })}
      onResize={(w, h) => setEnvPanel({ width: w, height: h })}
      onCollapse={(c) => setEnvPanel({ collapsed: c })}
      onClose={() => !docked && setEnvPanel({ open: false })}
      minWidth={280} minHeight={420}
      docked={docked}
    >
      <div className="flex flex-col h-full">

        {/* ── Click-to-place banner ── */}
        {isPlacing && (
          <div
            className="flex items-center justify-between gap-2 px-3 py-2 mx-3 mt-2 rounded-lg"
            style={{ background: 'rgba(0,229,192,0.12)', border: '1px solid rgba(0,229,192,0.35)' }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{SPECIES_CATALOG.find(s => s.id === placingSpeciesId)?.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: '#00E5C0', fontFamily: 'Space Grotesk' }}>
                  Click on map to place
                </p>
                <p className="truncate" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', fontFamily: 'Inter' }}>
                  {SPECIES_CATALOG.find(s => s.id === placingSpeciesId)?.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPlacingSpeciesId(null)}
              className="shrink-0 p-1 rounded transition-colors"
              style={{ color: '#00E5C0' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <div className="p-3 space-y-4 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

          {/* ── Species Section ── */}
          <div>
            <SectionHeader title="Introduce Species" icon={<span style={{ fontSize: 11 }}>🧬</span>}
              expanded={expandedSection === 'species'} onToggle={() => toggle('species')} />
            {expandedSection === 'species' && (
              <div className="mt-2 space-y-2">
                {/* Search */}
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search species or biome…"
                    className="w-full pl-6 pr-7 py-1.5 rounded text-xs bg-transparent border outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter', fontSize: '0.72rem',
                    }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Type filter pills */}
                <div className="flex flex-wrap gap-1">
                  {['all', 'plant', 'herbivore', 'carnivore', 'omnivore', 'insect'].map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveType(t)}
                      className="px-2 py-0.5 rounded-full text-xs transition-all duration-150"
                      style={{
                        fontFamily: 'Space Grotesk', fontSize: '0.62rem', letterSpacing: '0.04em',
                        background: activeType === t
                          ? (t === 'all' ? 'rgba(255,255,255,0.15)' : `${TYPE_COLORS[t]}25`)
                          : 'rgba(255,255,255,0.04)',
                        color: activeType === t
                          ? (t === 'all' ? 'rgba(255,255,255,0.9)' : TYPE_COLORS[t])
                          : 'rgba(255,255,255,0.35)',
                        border: `1px solid ${activeType === t
                          ? (t === 'all' ? 'rgba(255,255,255,0.2)' : `${TYPE_COLORS[t]}60`)
                          : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      {t === 'all' ? 'All' : TYPE_LABELS[t].replace(/s$/, '')}
                    </button>
                  ))}
                </div>

                {/* Species grid */}
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.62rem', fontFamily: 'Inter' }}>
                  Click a card to select, then click on the map to place
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {filtered.map(sp => {
                    const pop = Object.entries(popBySpecies)
                      .filter(([id]) => id.startsWith(sp.id))
                      .reduce((s, [, n]) => s + n, 0);
                    const selecting = placingSpeciesId === sp.id;
                    const typeColor = TYPE_COLORS[sp.type];
                    return (
                      <button
                        key={sp.id}
                        onClick={() => setPlacingSpeciesId(selecting ? null : sp.id)}
                        draggable
                        onDragStart={e => e.dataTransfer.setData('speciesId', sp.id)}
                        className="flex flex-col gap-1 p-2 rounded-lg text-left transition-all duration-150 border"
                        style={{
                          background: selecting ? `${typeColor}18` : 'rgba(255,255,255,0.03)',
                          borderColor: selecting ? `${typeColor}70` : 'rgba(255,255,255,0.07)',
                          boxShadow: selecting ? `0 0 10px ${typeColor}25` : 'none',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                          if (!selecting) {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = `${typeColor}40`;
                            (e.currentTarget as HTMLButtonElement).style.background = `${typeColor}10`;
                          }
                        }}
                        onMouseLeave={e => {
                          if (!selecting) {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                          }
                        }}
                      >
                        {/* Icon + name row */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span style={{ fontSize: 14 }}>{sp.icon}</span>
                          <span className="truncate text-foreground font-medium" style={{ fontSize: '0.72rem', fontFamily: 'Inter' }}>
                            {sp.name}
                          </span>
                        </div>

                        {/* Population badge */}
                        <div className="flex items-center justify-between">
                          <span
                            className="px-1 py-0.5 rounded"
                            style={{
                              fontSize: '0.58rem', fontFamily: 'Space Grotesk', letterSpacing: '0.05em',
                              background: `${typeColor}20`, color: typeColor,
                            }}
                          >
                            {sp.type.slice(0, 4).toUpperCase()}
                          </span>
                          {pop > 0 && (
                            <span className="font-mono" style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono' }}>
                              {pop.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Biome tags */}
                        <div className="flex flex-wrap gap-0.5">
                          {sp.biomes.slice(0, 2).map(b => (
                            <span key={b} style={{
                              fontSize: '0.55rem', fontFamily: 'Inter',
                              color: 'rgba(255,255,255,0.3)',
                              background: 'rgba(255,255,255,0.06)',
                              borderRadius: 3, padding: '1px 4px',
                            }}>
                              {BIOME_ABBR[b] ?? b}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filtered.length === 0 && (
                  <p className="text-center py-4" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.72rem', fontFamily: 'Inter' }}>
                    No species match "{search}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Evolution Controls ── */}
          <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <SectionHeader title="Evolution Controls" icon={<span style={{ fontSize: 11 }}>⚗️</span>}
              expanded={expandedSection === 'evolution'} onToggle={() => toggle('evolution')} />
            {expandedSection === 'evolution' && (
              <div className="space-y-4 mt-2">
                <SliderRow label="Mutation Rate" value={mutationRate} min={0} max={1} step={0.01} unit=""
                  icon={<Dna size={11} />} color="#7C6BFF"
                  feedback={mutationRate > 0.7 ? 'High mutation — rapid evolution, instability' : mutationRate < 0.2 ? 'Near-static genome' : 'Healthy variation rate'}
                  onChange={v => { setMutationRate(v); applyClimate('mutationRate', v); }} />
                <SliderRow label="Food Density" value={foodDensity} min={0.1} max={3} step={0.05} unit="×"
                  icon={<Leaf size={11} />} color="#4CAF50"
                  feedback={foodDensity > 2 ? 'Feast — rapid population growth' : foodDensity < 0.3 ? 'Scarcity — starvation events likely' : 'Balanced food web'}
                  onChange={v => { setFoodDensity(v); applyClimate('foodDensity', v); }} />
                <SliderRow label="Predation Pressure" value={predation} min={0} max={1} step={0.01} unit=""
                  icon={<span style={{ fontSize: 10 }}>🦁</span>} color="#FF6B6B"
                  feedback={predation > 0.7 ? 'High predation — prey endangered' : predation < 0.2 ? 'Prey explosions likely' : 'Stable predator-prey balance'}
                  onChange={v => { setPredation(v); applyClimate('predationPressure', v); }} />
                <SliderRow label="Disease Spread" value={disease} min={0} max={1} step={0.01} unit=""
                  icon={<span style={{ fontSize: 10 }}>🦠</span>} color="#F0A500"
                  feedback={disease > 0.7 ? 'Pandemic risk — mass die-offs' : disease < 0.1 ? 'Near disease-free' : 'Endemic baseline'}
                  onChange={v => { setDisease(v); applyClimate('diseaseSpreadRate', v); }} />
                <SliderRow label="Evolution Speed" value={evoSpeed} min={0.1} max={5} step={0.1} unit="×"
                  icon={<Zap size={11} />} color="#00E5C0"
                  feedback={evoSpeed > 3 ? 'Hyper-evolution — rapid speciation' : evoSpeed < 0.5 ? 'Slow drift only' : 'Standard natural selection'}
                  onChange={v => { setEvoSpeed(v); applyClimate('evolutionSpeed', v); }} />
                <SliderRow label="Biome Drift" value={biomeDrift} min={0} max={1} step={0.01} unit=""
                  icon={<Globe size={11} />} color="#96CEB4"
                  feedback={biomeDrift > 0.6 ? 'Biomes shifting rapidly' : biomeDrift < 0.1 ? 'Static world' : 'Slow continental drift'}
                  onChange={v => { setBiomeDrift(v); applyClimate('biomeDriftRate', v); }} />
              </div>
            )}
          </div>

          {/* ── Climate Controls ── */}
          <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <SectionHeader title="Climate" icon={<Thermometer size={11} />}
              expanded={expandedSection === 'climate'} onToggle={() => toggle('climate')} />
            {expandedSection === 'climate' && (
              <div className="space-y-4 mt-2">
                <SliderRow label="Temperature" value={temp} min={-30} max={50} step={0.5} unit="°C"
                  icon={<Thermometer size={11} />} color="#F0A500"
                  feedback={temp > 35 ? 'Desert expansion — tropical stress' : temp < 0 ? 'Glaciation risk' : 'Temperate zones stable'}
                  onChange={v => { setTemp(v); applyClimate('temperature', v); }} />
                <SliderRow label="Rainfall" value={rainfall} min={0.1} max={3} step={0.05} unit="×"
                  icon={<Droplets size={11} />} color="#00E5C0"
                  feedback={rainfall > 1.8 ? 'Flood risk — wetland expansion' : rainfall < 0.4 ? 'Drought — desertification' : 'Normal range'}
                  onChange={v => { setRainfall(v); applyClimate('rainfall', v); }} />
                <SliderRow label="CO₂" value={co2} min={180} max={2000} step={5} unit="ppm"
                  icon={<Wind size={11} />} color="#7C6BFF"
                  feedback={co2 > 800 ? 'Greenhouse crisis' : co2 > 415 ? 'Above pre-industrial' : 'Historical baseline'}
                  onChange={v => { setCo2(v); applyClimate('co2', v); }} />
                <SliderRow label="Soil Fertility" value={fertility} min={0.1} max={1} step={0.02} unit=""
                  icon={<Leaf size={11} />} color="#4CAF50"
                  feedback={fertility > 0.7 ? 'Dense vegetation' : fertility < 0.3 ? 'Depleted soil' : 'Moderate fertility'}
                  onChange={v => { setFertility(v); applyClimate('soilFertility', v); }} />
                <SliderRow label="Solar Output" value={solar} min={0.6} max={1.4} step={0.01} unit="×"
                  icon={<Sun size={11} />} color="#FFD700"
                  feedback={solar < 0.8 ? 'Solar minimum' : solar > 1.2 ? 'Solar maximum — heat stress' : 'Normal solar cycle'}
                  onChange={v => { setSolar(v); applyClimate('solarOutput', v); }} />
                <SliderRow label="Ocean Salinity" value={salinity} min={0.5} max={1.5} step={0.01} unit="×"
                  icon={<Droplets size={11} />} color="#1a8cff"
                  feedback={salinity > 1.2 ? 'High salinity — marine stress' : salinity < 0.7 ? 'Freshwater influx' : 'Stable salinity'}
                  onChange={v => { setSalinity(v); applyClimate('oceanSalinity', v); }} />
                <SliderRow label="Wind Patterns" value={wind} min={0} max={1} step={0.01} unit=""
                  icon={<Wind size={11} />} color="#96CEB4"
                  feedback={wind > 0.8 ? 'Severe storms likely' : wind < 0.2 ? 'Stagnant air — heat buildup' : 'Normal circulation'}
                  onChange={v => { setWind(v); applyClimate('windPatterns', v); }} />
                <SliderRow label="Humidity" value={humidity} min={0} max={1} step={0.01} unit=""
                  icon={<Droplets size={11} />} color="#00bcd4"
                  feedback={humidity > 0.8 ? 'Mold & rot risk' : humidity < 0.2 ? 'Arid — wildfire risk' : 'Comfortable range'}
                  onChange={v => { setHumidity(v); applyClimate('humidity', v); }} />
                <SliderRow label="Seasonal Swing" value={seasonal} min={0} max={1} step={0.01} unit=""
                  icon={<Sun size={11} />} color="#FF8C00"
                  feedback={seasonal > 0.8 ? 'Extreme seasons' : seasonal < 0.2 ? 'Stable year-round' : 'Moderate seasons'}
                  onChange={v => { setSeasonal(v); applyClimate('seasonalVariation', v); }} />
                <SliderRow label="Tectonic Activity" value={tectonic} min={0} max={1} step={0.01} unit=""
                  icon={<AlertTriangle size={11} />} color="#FF6B6B"
                  feedback={tectonic > 0.7 ? 'Frequent quakes & volcanism' : tectonic < 0.1 ? 'Geologically dead' : 'Normal plate motion'}
                  onChange={v => { setTectonic(v); applyClimate('tectonicActivity', v); }} />
              </div>
            )}
          </div>

          {/* ── Disasters ── */}
          <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <SectionHeader title="Catastrophic Events" icon={<AlertTriangle size={11} />}
              expanded={expandedSection === 'disasters'} onToggle={() => toggle('disasters')} />
            {expandedSection === 'disasters' && (
              <div className="mt-2 space-y-1.5">
                {DISASTERS.map(d => {
                  const lastTick = disasterCooldowns[d.id] ?? -9999;
                  const remaining = Math.max(0, d.cooldown - (simTick - lastTick));
                  const ready = remaining === 0;
                  return (
                    <button key={d.id} className="disaster-btn" disabled={!ready}
                      onClick={() => triggerDisaster(d.id)} title={d.description}>
                      <span className="text-sm">{d.icon}</span>
                      <span className="flex-1 text-left" style={{ fontFamily: 'Inter', fontSize: '0.72rem' }}>{d.name}</span>
                      {!ready && (
                        <span className="font-mono text-xs opacity-60" style={{ fontFamily: 'JetBrains Mono', color: '#F0A500' }}>
                          {remaining}t
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DraggablePanel>
  );
}
