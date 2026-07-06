// Disease engine: SIR-like compartmental model per species per disease
import type { Disease, Organism, Species } from '@/types/simulation';
import { EventBus } from './EventBus';

export class DiseaseEngineClass {
  private diseases: Map<string, Disease> = new Map();

  register(disease: Disease): void {
    this.diseases.set(disease.id, disease);
  }

  getAll(): Disease[] {
    return Array.from(this.diseases.values());
  }

  tick(organisms: Map<string, Organism>, dt: number): void {
    const orgArray = Array.from(organisms.values()).filter(o => o.alive);

    for (const disease of this.diseases.values()) {
      if (!disease.active) continue;

      // Find infected organisms to spread from
      const infected = orgArray.filter(o => {
        const status = o.diseaseStatus[disease.id];
        return status?.stage === 'infected' && disease.hostSpeciesIds.includes(o.speciesId);
      });

      if (infected.length === 0) continue;

      // Spread to susceptible nearby organisms
      for (const source of infected) {
        for (const target of orgArray) {
          if (!disease.hostSpeciesIds.includes(target.speciesId)) continue;
          const existing = target.diseaseStatus[disease.id];
          if (existing && (existing.stage === 'infected' || existing.stage === 'recovered')) continue;

          const dist = Math.hypot(source.x - target.x, source.y - target.y);
          if (dist > 20) continue;

          const resistance = target.genes.diseaseResistance;
          const effectiveRate = disease.transmissionRate * (1 - resistance * 0.8) * dt * 0.01;

          if (Math.random() < effectiveRate) {
            target.diseaseStatus[disease.id] = { diseaseId: disease.id, stage: 'exposed', timer: 0 };
          }
        }

        // Progress infection timer for source
        const status = source.diseaseStatus[disease.id];
        if (status) {
          status.timer += dt;
          // Apply mortality
          const deathChance = disease.mortalityRate * (1 - source.genes.diseaseResistance * 0.6) * dt * 0.001;
          if (Math.random() < deathChance) {
            source.health -= 0.1 * dt;
            if (source.health <= 0) source.alive = false;
          }
        }
      }

      // Progress exposed -> infected -> recovered
      for (const org of orgArray) {
        const status = org.diseaseStatus[disease.id];
        if (!status) continue;
        status.timer += dt;
        if (status.stage === 'exposed' && status.timer > disease.incubationPeriod) {
          status.stage = 'infected';
          status.timer = 0;
        } else if (status.stage === 'infected' && status.timer > disease.incubationPeriod * 3) {
          if (Math.random() < (1 - disease.mortalityRate)) {
            status.stage = 'recovered';
          }
        }
      }

      // Disease mutation: randomly changes virulence
      if (Math.random() < disease.mutationRate * dt * 0.0001) {
        disease.mortalityRate = Math.max(0.01, Math.min(0.99, disease.mortalityRate + (Math.random() - 0.5) * 0.05));
        disease.transmissionRate = Math.max(0.01, Math.min(1, disease.transmissionRate + (Math.random() - 0.5) * 0.03));
      }
    }
  }

  introduceEpidemic(organisms: Map<string, Organism>, speciesIds: string[]): void {
    const id = `disease_${Date.now()}`;
    const disease: Disease = {
      id,
      name: `Pathogen-${id.slice(-4)}`,
      transmissionRate: 0.4 + Math.random() * 0.3,
      incubationPeriod: 50 + Math.floor(Math.random() * 100),
      mortalityRate: 0.2 + Math.random() * 0.4,
      mutationRate: 0.3 + Math.random() * 0.4,
      hostSpeciesIds: speciesIds,
      active: true,
    };
    this.diseases.set(id, disease);

    // Infect a handful of organisms immediately
    let count = 0;
    for (const org of organisms.values()) {
      if (!org.alive || !speciesIds.includes(org.speciesId)) continue;
      if (count++ > 5) break;
      org.diseaseStatus[id] = { diseaseId: id, stage: 'infected', timer: 0 };
    }
  }

  getDiseaseLevel(organisms: Map<string, Organism>, cx: number, cy: number, radius: number): number {
    let infected = 0, total = 0;
    for (const org of organisms.values()) {
      if (!org.alive) continue;
      if (Math.hypot(org.x - cx, org.y - cy) > radius) continue;
      total++;
      for (const status of Object.values(org.diseaseStatus)) {
        if (status.stage === 'infected') { infected++; break; }
      }
    }
    return total > 0 ? infected / total : 0;
  }
}

export const DiseaseEngine = new DiseaseEngineClass();
