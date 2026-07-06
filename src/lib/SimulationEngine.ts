// Core simulation engine: tick loop, entity registry, speciation
import type {
  SimulationState, SimSpeed, Organism, Species, OrganismType,
  GeneticProfile, ExtinctionEvent, SpeciationEvent, ClimateState, WorldMap
} from '@/types/simulation';
import { SIM_SPEED_MULTIPLIERS, BIOME_COLORS, ORGANISM_COLORS, SPECIES_CATALOG } from '@/types/simulation';
import { WorldGenerator } from './WorldGenerator';
import { GeneticsEngine } from './GeneticsEngine';
import { ClimateSystemClass } from './ClimateSystem';
import { OrganismAI } from './OrganismAI';
import { DiseaseEngine } from './DiseaseEngine';
import { DataRecorder } from './DataRecorder';
import { EventBus } from './EventBus';

let idCounter = 0;
function genId(prefix: string): string {
  return `${prefix}_${++idCounter}_${(Math.random() * 0xffff | 0).toString(16)}`;
}

const TICKS_PER_REAL_SECOND_AT_1X = 10; // 10 sim ticks per real second at 1× — feels natural
const HOURS_PER_TICK = 1; // 1 simulated hour per tick at 1x
const HOURS_PER_YEAR = 8760;
const HOURS_PER_DAY  = 24;   // 1 day = 24 ticks (at 1x, 1 tick = 1 sim-hour)

const SPECIES_COLORS = [
  '#00E5C0', '#F0A500', '#7C6BFF', '#FF6B6B', '#4ECDC4',
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98',
  '#FFB347', '#87CEEB', '#F08080', '#90EE90', '#DEB887',
];

const MAX_ORGANISMS = 4000;

export class SimulationEngineClass {
  state: SimulationState;
  private climate: ClimateSystemClass;
  // cached values to avoid re-computing every tick
  private _forestCoverage: number = 0.3;
  private _animalBiomass:  number = 0;
  dayTime: number = 0.5; // 0–1  (read directly by canvas/minimap — NOT stored in Zustand hot path)
  private _tickAccumulator: number = 0; // fractional tick carry-over between frames

  /** Public method to update climate state from UI */
  setClimateState(updates: Partial<ClimateState>): void {
    this.climate.setState(updates);
    this.state.climate = { ...this.state.climate, ...updates };
  }
  private running = false;
  private rafId: number | null = null;
  private lastRealTime = 0;
  private tickAccumulator = 0;

  constructor() {
    this.state = this.createEmptyState();
    this.climate = new ClimateSystemClass(this.state.climate);
  }

  private createEmptyState(): SimulationState {
    return {
      tick: 0, simulatedYear: 0, simulatedEra: 'Primordial Age',
      running: false, speed: 'pause',
      organisms: new Map(), species: new Map(),
      diseases: new Map(), climate: {} as ClimateState,
      world: { width: 256, height: 256, cells: new Float32Array(0), biomes: new Uint8Array(0), rivers: new Uint8Array(0), seed: 0 },
      extinctions: [], speciations: [], totalBorn: 0, totalDied: 0,
    };
  }

  generateWorld(seed: number): void {
    const world = WorldGenerator.generate(seed, 256, 256);
    const climate = WorldGenerator.getInitialClimate(seed);
    this.climate = new ClimateSystemClass(climate);
    this.state = {
      ...this.createEmptyState(),
      world,
      climate,
      tick: 0,
    };
    this.populateInitialSpecies(seed);
    DataRecorder.history = [];
    DataRecorder.extinctions = [];
    DataRecorder.speciations = [];
    EventBus.emit('sim:world-generated', { seed });
  }

  private populateInitialSpecies(seed: number): void {
    const catalog = SPECIES_CATALOG;
    let colorIdx = 0;

    // Build biome → list of [x,y] cell positions once for all species
    const { world } = this.state;
    const BIOME_NAMES_IDX: string[] = [
      'ocean', 'coastal', 'wetland', 'tropical_rainforest', 'temperate_forest',
      'grassland', 'desert', 'tundra', 'alpine', 'river', 'lake',
    ];
    const biomeCells: Map<string, Array<{ x: number; y: number }>> = new Map();
    for (const b of BIOME_NAMES_IDX) biomeCells.set(b, []);
    for (let i = 0, len = world.width * world.height; i < len; i++) {
      const biome = BIOME_NAMES_IDX[world.biomes[i] ?? 0];
      if (biome) biomeCells.get(biome)!.push({ x: i % world.width, y: Math.floor(i / world.width) });
    }

    for (const template of catalog) {
      const speciesId = `${template.id}_${seed}`;
      const species: Species = {
        id: speciesId,
        name: template.name,
        ancestorId: null,
        type: template.type,
        color: SPECIES_COLORS[colorIdx++ % SPECIES_COLORS.length],
        avgGenes: GeneticsEngine.createBaseGenes(this.getGeneTemplateForType(template.type)),
        population: 0,
        extinct: false,
        extinctTick: null,
        extinctCause: null,
        speciationTick: 0,
        biomePreferences: template.biomes as any,
        taxonomicGroup: template.type,
        childSpeciesIds: [],
      };
      this.state.species.set(speciesId, species);

      // Collect all valid cells across preferred biomes
      const validCells: Array<{ x: number; y: number }> = [];
      for (const biome of template.biomes) {
        const cells = biomeCells.get(biome as string);
        if (cells && cells.length > 0) validCells.push(...cells);
      }

      // If no preferred biome cells found, fall back to whole map
      const pool = validCells.length > 0 ? validCells : [{ x: world.width / 2, y: world.height / 2 }];

      const count = template.type === 'plant' ? 2 : 1;

      // Deterministic shuffle of pool subset using xorshift
      let rng = (seed + colorIdx * 6364136223846793005) >>> 0;
      const xr = () => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; return (rng >>> 0) / 0xffffffff; };

      for (let i = 0; i < count; i++) {
        const cell = pool[Math.floor(xr() * pool.length)];
        // Scatter within ±8 pixels of cell center
        const jx = cell.x + (xr() - 0.5) * 16;
        const jy = cell.y + (xr() - 0.5) * 16;
        this.spawnOrganism(speciesId,
          Math.max(0, Math.min(world.width  - 1, jx)),
          Math.max(0, Math.min(world.height - 1, jy)),
        );
      }
    }
  }

  getGeneTemplateForType(type: OrganismType): Partial<GeneticProfile> {
    const templates: Record<OrganismType, Partial<GeneticProfile>> = {
      plant: { speed: 0, sensorRange: 0, bodyMass: 0.3, metabolicRate: 0.2, reproThreshold: 0.7 },
      herbivore: { speed: 0.5, aggression: 0.1, dietaryBreadth: 0.3, bodyMass: 0.4 },
      carnivore: { speed: 0.7, aggression: 0.8, sensorRange: 0.7, bodyMass: 0.6, metabolicRate: 0.7 },
      omnivore: { speed: 0.5, aggression: 0.4, dietaryBreadth: 0.8, bodyMass: 0.5 },
      insect: { speed: 0.6, bodyMass: 0.1, litterSize: 0.9, lifespanCeiling: 0.1, metabolicRate: 0.8 },
    };
    return templates[type] ?? {};
  }

  spawnOrganism(speciesId: string, x?: number, y?: number, seed?: number): Organism | null {
    if (this.state.organisms.size >= MAX_ORGANISMS) return null;
    const species = this.state.species.get(speciesId);
    if (!species) return null;

    // Find a valid spawn position
    let ox = x ?? Math.random() * this.state.world.width;
    let oy = y ?? Math.random() * this.state.world.height;

    if (seed !== undefined) {
      // Xorshift hash — produces two uncorrelated outputs from one seed
      let z = (seed + 0x9e3779b9) >>> 0;
      z ^= z << 13; z ^= z >>> 17; z ^= z << 5;
      ox = (z >>> 0) % this.state.world.width;
      z ^= z << 13; z ^= z >>> 17; z ^= z << 5;
      oy = (z >>> 0) % this.state.world.height;
    }

    const org: Organism = {
      id: genId(speciesId),
      speciesId,
      parentIds: [undefined, undefined],
      x: ox, y: oy,
      age: 0,
      energy: 0.7 + Math.random() * 0.3,
      health: 1,
      genes: GeneticsEngine.mutateOnly(species.avgGenes),
      state: 'idle',
      stateDetail: 'newly born',
      alive: true,
      birthTick: this.state.tick,
      reproductionCooldown: Math.random() * 100,
      targetId: null,
      diseaseStatus: {},
      migrationTarget: null,
    };

    this.state.organisms.set(org.id, org);
    species.population++;
    this.state.totalBorn++;
    return org;
  }

  private reproduce(parentA: Organism, parentB: Organism): void {
    const species = this.state.species.get(parentA.speciesId);
    if (!species) return;

    const litterSize = Math.max(1, Math.round(parentA.genes.litterSize * 4 + 0.5));
    for (let i = 0; i < litterSize; i++) {
      if (this.state.organisms.size >= MAX_ORGANISMS) break;
      const childGenes = GeneticsEngine.inherit(parentA.genes, parentB.genes);
      const child: Organism = {
        id: genId(species.id),
        speciesId: species.id,
        parentIds: [parentA.id, parentB.id],
        x: parentA.x + (Math.random() - 0.5) * 5,
        y: parentA.y + (Math.random() - 0.5) * 5,
        age: 0,
        energy: 0.6,
        health: 1,
        genes: childGenes,
        state: 'idle',
        stateDetail: 'newborn',
        alive: true,
        birthTick: this.state.tick,
        reproductionCooldown: 0,
        targetId: null,
        diseaseStatus: {},
        migrationTarget: null,
      };
      this.state.organisms.set(child.id, child);
      species.population++;
      this.state.totalBorn++;

      // Check speciation
      if (GeneticsEngine.shouldSpeciate(child, species.avgGenes) && Math.random() < 0.01) {
        this.speciateOrganism(child, species);
      }
    }

    parentA.energy -= 0.3;
    parentB.energy -= 0.2;
  }

  private speciateOrganism(org: Organism, parentSpecies: Species): void {
    const newSpeciesId = genId('species');
    const newSpecies: Species = {
      id: newSpeciesId,
      name: `${parentSpecies.name}-${newSpeciesId.slice(-3)}`,
      ancestorId: parentSpecies.id,
      type: parentSpecies.type,
      color: SPECIES_COLORS[Math.floor(Math.random() * SPECIES_COLORS.length)],
      avgGenes: { ...org.genes },
      population: 1,
      extinct: false,
      extinctTick: null,
      extinctCause: null,
      speciationTick: this.state.tick,
      biomePreferences: [...parentSpecies.biomePreferences],
      taxonomicGroup: parentSpecies.taxonomicGroup,
      childSpeciesIds: [],
    };
    this.state.species.set(newSpeciesId, newSpecies);
    parentSpecies.childSpeciesIds.push(newSpeciesId);
    org.speciesId = newSpeciesId;
    parentSpecies.population--;

    const event: SpeciationEvent = {
      tick: this.state.tick,
      parentSpeciesId: parentSpecies.id,
      newSpeciesId,
      cause: 'genetic divergence',
      location: { x: org.x, y: org.y },
    };
    DataRecorder.recordSpeciation(event);
    EventBus.emit('species:new', { speciesId: newSpeciesId, parentId: parentSpecies.id, tick: this.state.tick });
  }

  tick(dt: number): void {
    const s = this.state;

    // Throttle quadtree rebuild: every 3 ticks saves ~2/3 of rebuild cost
    if (s.tick % 3 === 0) {
      OrganismAI.rebuildQuadtree(s.organisms, s.world.width, s.world.height);
    }

    // Day/night cycle: advance time-of-day (0–1 per sim-day). Read directly from SimulationEngine.dayTime
    // by UI components — do NOT call Zustand set() inside the hot tick loop.
    this.dayTime = ((this.dayTime ?? 0.5) + (1 * HOURS_PER_TICK) / HOURS_PER_DAY) % 1;

    // Count forest/biomass every 5 ticks (cheap amortisation)
    if (s.tick % 5 === 0) {
      let forestCount = 0, animalBiomass = 0;
      for (const org of s.organisms.values()) {
        if (!org.alive) continue;
        const type = s.species.get(org.speciesId)?.type;
        if (type === 'plant') forestCount++;
        else animalBiomass += org.genes.bodyMass;
      }
      this._forestCoverage  = forestCount / Math.max(1, s.organisms.size);
      this._animalBiomass   = animalBiomass;
    }

    // Tick climate
    this.climate.tick(dt, this._forestCoverage ?? 0.3, this._animalBiomass ?? 0);
    s.climate = this.climate.getState();

    // Tick organisms
    const toReproduce: Array<[string, string]> = [];
    const plantsByCell: Map<string, Organism> = new Map();

    for (const org of s.organisms.values()) {
      if (!org.alive) continue;
      OrganismAI.tickOrganism(org, s, dt);

      if (org.state === 'reproducing') {
        const sp = s.species.get(org.speciesId);
        if (sp?.type === 'plant') {
          // Plants self-reproduce
          if (Math.random() < 0.002 * dt) {
            this.spawnOrganism(org.speciesId, org.x + (Math.random() - 0.5) * 15, org.y + (Math.random() - 0.5) * 15);
          }
        } else {
          // Animals need partner
          const nearby = OrganismAI.getQuadtree().queryRadius(org.x, org.y, 10);
          const partner = nearby.find(p => {
            const other = s.organisms.get(p.id);
            return other?.alive && other.speciesId === org.speciesId && other.id !== org.id && other.state === 'reproducing';
          });
          if (partner) toReproduce.push([org.id, partner.id]);
        }
      }
    }

    // Handle reproductions (deduplicate)
    const reproduced = new Set<string>();
    for (const [aId, bId] of toReproduce) {
      if (reproduced.has(aId) || reproduced.has(bId)) continue;
      const a = s.organisms.get(aId), b = s.organisms.get(bId);
      if (a?.alive && b?.alive) {
        this.reproduce(a, b);
        reproduced.add(aId);
        reproduced.add(bId);
      }
    }

    // Disease tick
    DiseaseEngine.tick(s.organisms, dt);

    // Cleanup dead organisms
    let died = 0;
    for (const [id, org] of s.organisms.entries()) {
      if (!org.alive) {
        const sp = s.species.get(org.speciesId);
        if (sp) sp.population = Math.max(0, sp.population - 1);
        s.organisms.delete(id);
        died++;
      }
    }
    s.totalDied += died;

    // Recount populations and check extinctions
    const liveCounts = new Map<string, number>();
    for (const org of s.organisms.values()) {
      if (org.alive) liveCounts.set(org.speciesId, (liveCounts.get(org.speciesId) ?? 0) + 1);
    }
    for (const [id, species] of s.species.entries()) {
      species.population = liveCounts.get(id) ?? 0;
      if (!species.extinct && species.population === 0 && this.state.tick > 100) {
        species.extinct = true;
        species.extinctTick = s.tick;
        species.extinctCause = this.inferExtinctionCause(species);
        const event: ExtinctionEvent = {
          tick: s.tick,
          speciesId: id,
          speciesName: species.name,
          cause: species.extinctCause,
          finalPopulation: 0,
        };
        DataRecorder.recordExtinction(event);
        s.extinctions.push(event);
        EventBus.emit('species:extinct', { speciesId: id, cause: species.extinctCause, tick: s.tick });
      }
    }

    // Update species avg genes — expensive O(n), skip at high tick rates
    if (s.tick % 10 === 0) {
      for (const [id, species] of s.species.entries()) {
        if (!species.extinct && species.population > 0) {
          const members: Organism[] = [];
          for (const org of s.organisms.values()) {
            if (org.speciesId === id) members.push(org);
          }
          if (members.length > 0) {
            species.avgGenes = GeneticsEngine.computeSpeciesAvgGenes(members);
          }
        }
      }
    }

    s.tick++;
    s.simulatedYear = Math.floor(s.tick * HOURS_PER_TICK / HOURS_PER_YEAR);
    s.simulatedEra = this.getEra(s.simulatedYear);

    // Record history every 5 ticks at normal speeds, less often at high speed
    const recordEvery = this.state.speed === '1x' ? 5 : this.state.speed === '5x' ? 10 : this.state.speed === '20x' ? 20 : 1;
    if (s.tick % recordEvery === 0) {
      DataRecorder.recordTick(s);
    }
    EventBus.emit('sim:tick', { tick: s.tick, year: s.simulatedYear });
  }

  private inferExtinctionCause(species: Species): string {
    const climate = this.state.climate;
    if (climate.temperature < -5 || climate.temperature > 40) return 'climate shift';
    if (climate.rainfall < 0.2) return 'drought';
    const hasDisease = DiseaseEngine.getAll().some(d => d.active && d.hostSpeciesIds.includes(species.id));
    if (hasDisease) return 'disease';
    const hasPredators = [...this.state.species.values()].some(s => !s.extinct && s.type === 'carnivore');
    if (hasPredators && species.type === 'herbivore') return 'predation';
    return 'habitat loss';
  }

  private getEra(year: number): string {
    if (year < 1000) return 'Primordial Age';
    if (year < 10000) return 'Dawn Era';
    if (year < 100000) return 'Early Age';
    if (year < 1000000) return 'Middle Age';
    if (year < 10000000) return 'Late Age';
    return 'Deep Time';
  }

  setSpeed(speed: SimSpeed): void {
    this.state.speed = speed;
    this.state.running = speed !== 'pause';
    EventBus.emit('sim:speed-changed', { speed });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastRealTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const realDelta = Math.min(now - this.lastRealTime, 100) / 1000; // seconds, capped at 100ms
    this.lastRealTime = now;

    if (this.state.speed !== 'pause') {
      const multiplier = SIM_SPEED_MULTIPLIERS[this.state.speed];

      // Accumulate fractional ticks — prevents 1x from running 2× fast at 60fps
      this._tickAccumulator += realDelta * TICKS_PER_REAL_SECOND_AT_1X * multiplier;

      // Cap to avoid spiral-of-death on tab-switch / slow frames
      const maxTicks = multiplier <= 1 ? 2 : multiplier <= 5 ? 4 : multiplier <= 20 ? 8 : multiplier <= 100 ? 20 : 60;
      const ticksThisFrame = Math.min(Math.floor(this._tickAccumulator), maxTicks);
      this._tickAccumulator -= ticksThisFrame; // carry remainder

      for (let i = 0; i < ticksThisFrame; i++) {
        this.tick(1);
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  triggerDisaster(type: string, x: number, y: number): void {
    const radius = type === 'meteor' ? 40 : type === 'volcano' ? 25 : type === 'wildfire' ? 30 : 20;
    const killRate = type === 'meteor' ? 0.95 : type === 'volcano' ? 0.7 : type === 'wildfire' ? 0.5 : 0.3;

    for (const org of this.state.organisms.values()) {
      if (!org.alive) continue;
      const dist = Math.hypot(org.x - x, org.y - y);
      if (dist < radius && Math.random() < killRate * (1 - dist / radius)) {
        org.alive = false;
      }
    }

    if (type === 'epidemic') {
      const speciesIds = [...this.state.species.keys()].filter(id => !this.state.species.get(id)?.extinct);
      DiseaseEngine.introduceEpidemic(this.state.organisms, speciesIds.slice(0, 3));
    }

    this.climate.applyDisaster(type);
    EventBus.emit('disaster:triggered', { type, x, y, tick: this.state.tick });
  }

  introduceSpecies(speciesId: string, x: number, y: number): void {
    // Find the base species in the catalog
    const catalogEntry = SPECIES_CATALOG.find(s => speciesId.startsWith(s.id));
    if (!catalogEntry) return;

    const existingSpeciesId = [...this.state.species.keys()].find(id => id.startsWith(catalogEntry.id));
    const targetSpeciesId = existingSpeciesId ?? speciesId;

    if (!this.state.species.has(targetSpeciesId)) {
      const species: Species = {
        id: targetSpeciesId,
        name: catalogEntry.name,
        ancestorId: null,
        type: catalogEntry.type,
        color: SPECIES_COLORS[this.state.species.size % SPECIES_COLORS.length],
        avgGenes: GeneticsEngine.createBaseGenes(this.getGeneTemplateForType(catalogEntry.type)),
        population: 0,
        extinct: false,
        extinctTick: null,
        extinctCause: null,
        speciationTick: this.state.tick,
        biomePreferences: catalogEntry.biomes as any,
        taxonomicGroup: catalogEntry.type,
        childSpeciesIds: [],
      };
      this.state.species.set(targetSpeciesId, species);
    } else {
      // Re-enable previously extinct species so organisms survive
      const existing = this.state.species.get(targetSpeciesId)!;
      if (existing.extinct) {
        existing.extinct = false;
        existing.extinctTick = null;
        existing.extinctCause = null;
      }
    }

    const count = catalogEntry.type === 'plant' ? 20 : 8;
    for (let i = 0; i < count; i++) {
      this.spawnOrganism(targetSpeciesId, x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
    }
    EventBus.emit('organism:introduced', { speciesId: targetSpeciesId, x, y });
  }

  serialize(): string {
    const s = this.state;
    return JSON.stringify({
      tick: s.tick,
      simulatedYear: s.simulatedYear,
      speed: s.speed,
      climate: s.climate,
      worldSeed: s.world.seed,
      species: [...s.species.entries()],
      organisms: [...s.organisms.entries()].slice(0, 3000),
      extinctions: s.extinctions,
      speciations: s.speciations,
      totalBorn: s.totalBorn,
      totalDied: s.totalDied,
      dataRecorder: DataRecorder.serialize(),
    });
  }

  deserialize(json: string): void {
    try {
      const data = JSON.parse(json);
      this.generateWorld(data.worldSeed ?? 42);
      this.state.tick = data.tick ?? 0;
      this.state.simulatedYear = data.simulatedYear ?? 0;
      this.state.climate = data.climate ?? this.state.climate;
      this.climate = new ClimateSystemClass(this.state.climate);
      if (data.species) this.state.species = new Map(data.species);
      if (data.organisms) this.state.organisms = new Map(data.organisms);
      this.state.extinctions = data.extinctions ?? [];
      this.state.speciations = data.speciations ?? [];
      this.state.totalBorn = data.totalBorn ?? 0;
      this.state.totalDied = data.totalDied ?? 0;
      if (data.dataRecorder) DataRecorder.deserialize(data.dataRecorder);
    } catch (e) {
      console.error('Failed to deserialize simulation:', e);
    }
  }
}

export const SimulationEngine = new SimulationEngineClass();
