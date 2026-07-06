// Data recorder: accumulates simulation history for charts
import type { HistoryRecord, SimulationState, ExtinctionEvent, SpeciationEvent } from '@/types/simulation';

const MAX_HISTORY = 2000;

export class DataRecorderClass {
  history: HistoryRecord[] = [];
  extinctions: ExtinctionEvent[] = [];
  speciations: SpeciationEvent[] = [];
  private lastRecordTick = -1;
  private recordInterval = 100; // record every N ticks

  recordTick(state: SimulationState): void {
    if (state.tick - this.lastRecordTick < this.recordInterval) return;
    this.lastRecordTick = state.tick;

    const populationBySpecies: Record<string, number> = {};
    let totalPop = 0;
    for (const [id, species] of state.species.entries()) {
      if (!species.extinct && species.population > 0) {
        populationBySpecies[id] = species.population;
        totalPop += species.population;
      }
    }

    const speciesCount = Object.keys(populationBySpecies).length;
    // Shannon biodiversity index
    let biodiversity = 0;
    if (totalPop > 0) {
      for (const count of Object.values(populationBySpecies)) {
        const p = count / totalPop;
        if (p > 0) biodiversity -= p * Math.log(p);
      }
    }

    const record: HistoryRecord = {
      tick: state.tick,
      year: state.simulatedYear,
      populationBySpecies,
      totalPop,
      speciesCount,
      temperature: state.climate.temperature,
      rainfall: state.climate.rainfall,
      co2: state.climate.co2,
      biodiversityIndex: biodiversity,
    };

    this.history.push(record);
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  recordExtinction(event: ExtinctionEvent): void {
    this.extinctions.push(event);
  }

  recordSpeciation(event: SpeciationEvent): void {
    this.speciations.push(event);
  }

  getRecentHistory(count: number): HistoryRecord[] {
    return this.history.slice(-count);
  }

  getFoodWebEdges(state: SimulationState): Array<{ source: string; target: string; weight: number }> {
    const edges: Array<{ source: string; target: string; weight: number }> = [];
    for (const species of state.species.values()) {
      if (species.extinct) continue;
      if (species.type === 'carnivore' || species.type === 'omnivore') {
        for (const prey of state.species.values()) {
          if (prey.extinct || prey.id === species.id) continue;
          if (prey.type === 'herbivore' || prey.type === 'insect' || (species.type === 'omnivore' && prey.type === 'plant')) {
            edges.push({ source: species.id, target: prey.id, weight: species.avgGenes.aggression });
          }
        }
      }
      if (species.type === 'herbivore' || species.type === 'insect' || species.type === 'omnivore') {
        for (const plant of state.species.values()) {
          if (plant.extinct || plant.type !== 'plant') continue;
          edges.push({ source: species.id, target: plant.id, weight: 0.5 });
        }
      }
    }
    return edges;
  }

  serialize(): object {
    return {
      history: this.history,
      extinctions: this.extinctions,
      speciations: this.speciations,
    };
  }

  deserialize(data: { history?: HistoryRecord[]; extinctions?: ExtinctionEvent[]; speciations?: SpeciationEvent[] }): void {
    this.history = data.history ?? [];
    this.extinctions = data.extinctions ?? [];
    this.speciations = data.speciations ?? [];
  }
}

export const DataRecorder = new DataRecorderClass();
