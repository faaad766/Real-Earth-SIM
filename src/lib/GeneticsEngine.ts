// Genetics: inheritance, mutation, speciation
import type { GeneticProfile, Organism, Species } from '@/types/simulation';

const TRAIT_KEYS: (keyof GeneticProfile)[] = [
  'speed', 'sensorRange', 'bodyMass', 'reproThreshold', 'gestationPeriod',
  'litterSize', 'lifespanCeiling', 'metabolicRate', 'thermalMin', 'thermalMax',
  'diseaseResistance', 'aggression', 'socialAffinity', 'intelligence',
  'camouflage', 'dietaryBreadth',
];

const DEFAULT_MUTATION_RATE = 0.05;
const DEFAULT_MUTATION_MAGNITUDE = 0.08;

// Box-Muller normal distribution
function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

export class GeneticsEngineClass {
  mutationRate: number = DEFAULT_MUTATION_RATE;
  mutationMagnitude: number = DEFAULT_MUTATION_MAGNITUDE;

  createBaseGenes(template?: Partial<GeneticProfile>): GeneticProfile {
    const defaults: GeneticProfile = {
      speed: 0.5, sensorRange: 0.5, bodyMass: 0.5, reproThreshold: 0.5,
      gestationPeriod: 0.5, litterSize: 0.4, lifespanCeiling: 0.5,
      metabolicRate: 0.5, thermalMin: 0.2, thermalMax: 0.8,
      diseaseResistance: 0.4, aggression: 0.3, socialAffinity: 0.5,
      intelligence: 0.3, camouflage: 0.3, dietaryBreadth: 0.5,
    };
    return Object.assign({}, defaults, template);
  }

  inherit(parentA: GeneticProfile, parentB: GeneticProfile): GeneticProfile {
    const child: Partial<GeneticProfile> = {};
    for (const key of TRAIT_KEYS) {
      // Uniform crossover
      const val = Math.random() < 0.5 ? parentA[key] : parentB[key];
      // Apply mutation
      if (Math.random() < this.mutationRate) {
        const mutated = val + gaussianRandom(0, this.mutationMagnitude);
        // Clamp to [0,1] for most traits, or appropriate range
        if (key === 'thermalMin') child[key] = Math.max(-0.5, Math.min(1, mutated));
        else if (key === 'thermalMax') child[key] = Math.max(0, Math.min(1.5, mutated));
        else child[key] = Math.max(0, Math.min(1, mutated));
      } else {
        child[key] = val;
      }
    }
    // Ensure thermalMin < thermalMax
    if ((child.thermalMin ?? 0) > (child.thermalMax ?? 1)) {
      const tmp = child.thermalMin;
      child.thermalMin = child.thermalMax;
      child.thermalMax = tmp;
    }
    return child as GeneticProfile;
  }

  mutateOnly(genes: GeneticProfile): GeneticProfile {
    return this.inherit(genes, genes);
  }

  computeGeneticDistance(a: GeneticProfile, b: GeneticProfile): number {
    let sum = 0;
    for (const key of TRAIT_KEYS) {
      const diff = a[key] - b[key];
      sum += diff * diff;
    }
    return Math.sqrt(sum / TRAIT_KEYS.length);
  }

  shouldSpeciate(organism: Organism, speciesAvgGenes: GeneticProfile): boolean {
    const dist = this.computeGeneticDistance(organism.genes, speciesAvgGenes);
    return dist > 0.28;
  }

  computeSpeciesAvgGenes(organisms: Organism[]): GeneticProfile {
    if (organisms.length === 0) return this.createBaseGenes();
    const sums: Partial<GeneticProfile> = {};
    for (const key of TRAIT_KEYS) sums[key] = 0;
    for (const org of organisms) {
      for (const key of TRAIT_KEYS) {
        (sums[key] as number) += org.genes[key];
      }
    }
    const avg: Partial<GeneticProfile> = {};
    for (const key of TRAIT_KEYS) {
      avg[key] = (sums[key] as number) / organisms.length;
    }
    return avg as GeneticProfile;
  }

  computeFitness(genes: GeneticProfile, envTemperature: number, envMoisture: number, predatorPressure: number): number {
    // Normalize env temp to 0-1 (env temp is 0-1 already from world cell)
    const thermalFit = 1 - Math.max(0, Math.abs(envTemperature - (genes.thermalMin + genes.thermalMax) / 2) - 0.2);
    const moistureFit = genes.dietaryBreadth * 0.5 + envMoisture * 0.3 + 0.2;
    const defenceFit = predatorPressure > 0.3
      ? genes.speed * 0.4 + genes.camouflage * 0.4 + genes.intelligence * 0.2
      : 0.7;
    return Math.max(0, Math.min(1, (thermalFit + moistureFit + defenceFit) / 3));
  }

  getDivergentTraits(childGenes: GeneticProfile, parentGenes: GeneticProfile): Array<{ trait: string; delta: number }> {
    return TRAIT_KEYS
      .map(key => ({ trait: key, delta: childGenes[key] - parentGenes[key] }))
      .filter(t => Math.abs(t.delta) > 0.02)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  generateNameFromGenes(genes: GeneticProfile, speciesName: string): string {
    const hash = TRAIT_KEYS.reduce((acc, key, i) => acc + Math.floor(genes[key] * 100) * (i + 1), 0);
    const prefixes = ['Aria', 'Bex', 'Ceth', 'Dova', 'Eryn', 'Fael', 'Grix', 'Havi', 'Ilum', 'Jove'];
    const suffixes = ['ael', 'ion', 'eth', 'ora', 'ix', 'en', 'ar', 'um', 'is', 'ax'];
    const pre = prefixes[hash % prefixes.length];
    const suf = suffixes[Math.floor(hash / 10) % suffixes.length];
    return `${pre}${suf} (${speciesName})`;
  }

  getAverageSpeciesGenes(species: Species, allOrganisms: Map<string, import('@/types/simulation').Organism>): GeneticProfile {
    const members: Organism[] = [];
    for (const org of allOrganisms.values()) {
      if (org.speciesId === species.id && org.alive) members.push(org);
    }
    return this.computeSpeciesAvgGenes(members);
  }
}

export const GeneticsEngine = new GeneticsEngineClass();
