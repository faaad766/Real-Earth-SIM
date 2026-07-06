// Climate system: global state, seasons, feedback loops
import type { ClimateState, WorldMap } from '@/types/simulation';
import { EventBus } from './EventBus';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export class ClimateSystemClass {
  private state: ClimateState;
  private ticksPerYear = 365 * 24; // at 1x (1 tick = 1 hour)

  constructor(initial: ClimateState) {
    this.state = { ...initial };
  }

  getState(): ClimateState {
    return { ...this.state };
  }

  setState(updates: Partial<ClimateState>): void {
    this.state = { ...this.state, ...updates };
  }

  tick(dt: number, forestCoverage: number, animalBiomass: number): void {
    const s = this.state;

    // Seasonal cycle
    s.yearOfCycle += dt;
    if (s.yearOfCycle >= this.ticksPerYear) s.yearOfCycle -= this.ticksPerYear;
    s.seasonProgress = (s.yearOfCycle % (this.ticksPerYear / 4)) / (this.ticksPerYear / 4);
    const seasonIndex = Math.floor((s.yearOfCycle / this.ticksPerYear) * 4);
    s.season = SEASONS[seasonIndex % 4];

    // Biological CO2 feedback: forests absorb, animals emit
    const forestAbsorption = forestCoverage * 0.00002 * dt;
    const animalEmission = animalBiomass * 0.000001 * dt;
    s.co2 = Math.max(180, Math.min(2000, s.co2 - forestAbsorption + animalEmission));

    // Temperature driven by CO2 and solar
    const co2Forcing = Math.log(s.co2 / 280) * 3.7;
    const targetTemp = 14 + co2Forcing * 0.5 + (s.solarOutput - 1) * 50;
    s.temperature += (targetTemp - s.temperature) * 0.0001 * dt;

    // Ice-albedo feedback
    if (s.temperature < 4) {
      s.iceCoverage = Math.min(0.8, s.iceCoverage + 0.000005 * dt);
    } else if (s.temperature > 10) {
      s.iceCoverage = Math.max(0, s.iceCoverage - 0.000003 * dt);
    }

    // Rainfall driven by temperature and forest coverage
    const baseRainfall = 1.0 + (s.temperature - 14) * 0.01 + forestCoverage * 0.3;
    s.rainfall = Math.max(0.1, Math.min(3, baseRainfall));

    // Ocean heat lags temperature
    s.oceanHeat += (s.temperature / 40 - s.oceanHeat) * 0.00005 * dt;
    s.oceanHeat = Math.max(0, Math.min(1, s.oceanHeat));

    // Soil fertility: moisture dependent
    s.soilFertility = Math.max(0.1, Math.min(1, s.rainfall * 0.5 + forestCoverage * 0.4));

    this.state = s;
  }

  applyDisaster(type: string): void {
    const s = this.state;
    switch (type) {
      case 'volcano':
        s.solarOutput = Math.max(0.7, s.solarOutput - 0.15);
        s.co2 += 50;
        setTimeout(() => { s.solarOutput = Math.min(1.2, s.solarOutput + 0.1); }, 30000);
        break;
      case 'meteor':
        s.solarOutput = Math.max(0.5, s.solarOutput - 0.3);
        s.temperature -= 8;
        s.co2 += 200;
        break;
      case 'glaciation':
        s.temperature -= 5;
        s.iceCoverage = Math.min(0.9, s.iceCoverage + 0.3);
        s.rainfall = Math.max(0.2, s.rainfall - 0.4);
        break;
      case 'flood':
        s.rainfall = Math.min(3, s.rainfall + 1);
        setTimeout(() => { s.rainfall = Math.max(0.5, s.rainfall - 0.8); }, 20000);
        break;
    }
    this.state = s;
    EventBus.emit('climate:changed', { key: type, value: 0 });
  }

  getSeasonalTemperatureOffset(): number {
    const season = this.state.season;
    const progress = this.state.seasonProgress;
    const offsets = { spring: -2 + progress * 6, summer: 4 + Math.sin(progress * Math.PI) * 4, autumn: 4 - progress * 6, winter: -6 + progress * 2 };
    return offsets[season] ?? 0;
  }

  getSeasonalRainfallMultiplier(): number {
    const season = this.state.season;
    return { spring: 1.2, summer: 0.8, autumn: 1.1, winter: 0.9 }[season] ?? 1.0;
  }
}
