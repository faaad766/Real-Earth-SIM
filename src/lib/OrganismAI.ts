// OrganismAI: behavioral decision trees and movement
import type { Organism, SimulationState, BehaviorState, OrganismType } from '@/types/simulation';
import { Quadtree } from './Quadtree';

const ENERGY_LOW = 0.3;
const ENERGY_CRITICAL = 0.15;
const ENERGY_FULL = 0.85;
const REPRO_ENERGY = 0.7;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class OrganismAIClass {
  private qt: Quadtree = new Quadtree({ x: 0, y: 0, w: 256, h: 256 });

  rebuildQuadtree(organisms: Map<string, Organism>, worldW: number, worldH: number): void {
    this.qt = new Quadtree({ x: 0, y: 0, w: worldW, h: worldH });
    for (const org of organisms.values()) {
      if (org.alive) this.qt.insert({ x: org.x, y: org.y, id: org.id });
    }
  }

  getQuadtree(): Quadtree { return this.qt; }

  tickOrganism(org: Organism, state: SimulationState, dt: number): void {
    if (!org.alive) return;

    const cell = this.getCell(state, org.x, org.y);
    const speed = org.genes.speed * 0.8 + 0.2;
    const metabolism = org.genes.metabolicRate * 0.5 + 0.3;

    // Age
    org.age += dt;
    const maxAge = 200 + org.genes.lifespanCeiling * 800;
    if (org.age > maxAge) { org.alive = false; return; }

    // Energy drain from metabolism
    org.energy -= metabolism * 0.0003 * dt;

    // Thermal stress
    const cellTemp = cell.temperature;
    const thermalMid = (org.genes.thermalMin + org.genes.thermalMax) / 2;
    const thermalRange = Math.max(0.1, org.genes.thermalMax - org.genes.thermalMin);
    const thermalStress = Math.max(0, Math.abs(cellTemp - thermalMid) - thermalRange / 2) / thermalRange;
    org.energy -= thermalStress * 0.0005 * dt;
    org.health -= thermalStress * 0.0002 * dt;

    // Die from starvation or health
    if (org.energy <= 0 || org.health <= 0) { org.alive = false; return; }

    // Water depletion
    if (cell.isWater && org.genes.speed < 0.3) {
      org.health -= 0.001 * dt;
      return;
    }

    org.reproductionCooldown = Math.max(0, org.reproductionCooldown - dt);

    const type = this.getSpeciesType(org.speciesId, state);

    if (type === 'plant') {
      this.tickPlant(org, state, dt, cell);
    } else {
      this.tickAnimal(org, state, dt, speed, type);
    }
  }

  private tickPlant(org: Organism, state: SimulationState, dt: number, cell: { fertility: number; moisture: number; temperature: number; isWater: boolean }): void {
    if (cell.isWater) { org.health -= 0.005 * dt; return; }

    const growthRate = cell.fertility * state.climate.rainfall * 0.0008;
    org.energy = Math.min(1, org.energy + growthRate * dt);
    org.state = 'idle';
    org.stateDetail = `growing — fertility ${(cell.fertility * 100).toFixed(0)}%`;

    // Spread seeds
    if (org.energy > REPRO_ENERGY && org.reproductionCooldown <= 0) {
      org.state = 'reproducing';
      org.reproductionCooldown = 200 + org.genes.gestationPeriod * 300;
    }
  }

  private tickAnimal(org: Organism, state: SimulationState, dt: number, speed: number, type: OrganismType): void {
    const sensorR = org.genes.sensorRange * 30 + 10;
    const nearby = this.qt.queryRadius(org.x, org.y, sensorR);

    // Check for predators
    const predators = nearby.filter(p => {
      const other = state.organisms.get(p.id);
      if (!other || !other.alive || other.id === org.id) return false;
      const otherType = this.getSpeciesType(other.speciesId, state);
      return (type === 'herbivore' || type === 'plant') && otherType === 'carnivore';
    });

    if (predators.length > 0 && org.energy > ENERGY_CRITICAL) {
      // Flee
      const predator = state.organisms.get(predators[0].id)!;
      const angle = Math.atan2(org.y - predator.y, org.x - predator.x);
      const fleeSpeed = speed * 1.5;
      org.x = clamp(org.x + Math.cos(angle) * fleeSpeed * dt * 0.1, 0, state.world.width - 1);
      org.y = clamp(org.y + Math.sin(angle) * fleeSpeed * dt * 0.1, 0, state.world.height - 1);
      org.state = 'fleeing';
      org.stateDetail = `fleeing predator — ${Math.hypot(org.x - predator.x, org.y - predator.y).toFixed(0)}m away`;
      org.energy -= speed * 0.001 * dt;
      return;
    }

    // Hunt (carnivores/omnivores)
    if ((type === 'carnivore' || type === 'omnivore') && org.energy < ENERGY_FULL) {
      const prey = nearby.find(p => {
        const other = state.organisms.get(p.id);
        if (!other || !other.alive || other.id === org.id) return false;
        const otherType = this.getSpeciesType(other.speciesId, state);
        return otherType === 'herbivore' || otherType === 'insect' || (type === 'omnivore' && otherType === 'plant');
      });

      if (prey) {
        const target = state.organisms.get(prey.id)!;
        const dist = Math.hypot(org.x - target.x, org.y - target.y);
        if (dist < 3) {
          // Kill and eat
          target.alive = false;
          org.energy = Math.min(1, org.energy + 0.4);
          org.state = 'feeding';
          org.stateDetail = `feeding on ${target.speciesId.replace('_', ' ')}`;
        } else {
          // Chase
          const angle = Math.atan2(target.y - org.y, target.x - org.x);
          org.x = clamp(org.x + Math.cos(angle) * speed * dt * 0.08, 0, state.world.width - 1);
          org.y = clamp(org.y + Math.sin(angle) * speed * dt * 0.08, 0, state.world.height - 1);
          org.state = 'hunting';
          org.stateDetail = `hunting ${target.speciesId.replace('_', ' ')} — ${dist.toFixed(0)}m`;
          org.energy -= speed * 0.0008 * dt;
          org.targetId = target.id;
        }
        return;
      }
    }

    // Graze (herbivores/omnivores)
    if ((type === 'herbivore' || type === 'omnivore' || type === 'insect') && org.energy < ENERGY_FULL) {
      const plant = nearby.find(p => {
        const other = state.organisms.get(p.id);
        return other?.alive && this.getSpeciesType(other.speciesId, state) === 'plant';
      });
      if (plant) {
        const target = state.organisms.get(plant.id)!;
        const dist = Math.hypot(org.x - target.x, org.y - target.y);
        if (dist < 5) {
          target.energy -= 0.1 * dt;
          if (target.energy < 0) target.alive = false;
          org.energy = Math.min(1, org.energy + 0.002 * dt);
          org.state = 'feeding';
          org.stateDetail = `grazing`;
        } else {
          const angle = Math.atan2(target.y - org.y, target.x - org.x);
          org.x = clamp(org.x + Math.cos(angle) * speed * dt * 0.06, 0, state.world.width - 1);
          org.y = clamp(org.y + Math.sin(angle) * speed * dt * 0.06, 0, state.world.height - 1);
          org.state = 'feeding';
          org.stateDetail = `moving to food — ${dist.toFixed(0)}m`;
        }
        return;
      }
    }

    // Reproduce
    if (org.energy > REPRO_ENERGY && org.reproductionCooldown <= 0 && org.age > 50) {
      const partner = nearby.find(p => {
        const other = state.organisms.get(p.id);
        return other?.alive && other.speciesId === org.speciesId && other.id !== org.id && other.energy > REPRO_ENERGY;
      });
      if (partner) {
        org.state = 'reproducing';
        org.stateDetail = `reproducing`;
        org.reproductionCooldown = 150 + org.genes.gestationPeriod * 400;
        return;
      }
    }

    // Idle wander
    org.state = 'idle';
    const angle = Math.random() * Math.PI * 2;
    org.x = clamp(org.x + Math.cos(angle) * speed * dt * 0.03, 0, state.world.width - 1);
    org.y = clamp(org.y + Math.sin(angle) * speed * dt * 0.03, 0, state.world.height - 1);
    org.stateDetail = `wandering`;
  }

  private getCell(state: SimulationState, x: number, y: number): { fertility: number; moisture: number; temperature: number; isWater: boolean } {
    const wx = Math.floor(clamp(x, 0, state.world.width - 1));
    const wy = Math.floor(clamp(y, 0, state.world.height - 1));
    const i = wy * state.world.width + wx;
    const base = i * 4;
    const biomeNames = ['ocean', 'coastal', 'wetland', 'tropical_rainforest', 'temperate_forest', 'grassland', 'desert', 'tundra', 'alpine', 'river', 'lake'];
    const biome = biomeNames[state.world.biomes[i]];
    return {
      fertility: state.world.cells[base + 3],
      moisture: state.world.cells[base + 1],
      temperature: state.world.cells[base + 2],
      isWater: biome === 'ocean' || biome === 'lake',
    };
  }

  private getSpeciesType(speciesId: string, state: SimulationState): OrganismType {
    return state.species.get(speciesId)?.type ?? 'herbivore';
  }
}

export const OrganismAI = new OrganismAIClass();
