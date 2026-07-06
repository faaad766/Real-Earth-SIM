// Procedural world generation using simplex noise
import { createNoise2D } from 'simplex-noise';
import type { WorldMap, BiomeType, WorldCell, ClimateState } from '@/types/simulation';

// Seeded pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededNoise2D(seed: number) {
  const rng = mulberry32(seed);
  return createNoise2D(rng);
}

function biomeLookup(elevation: number, moisture: number, temperature: number): BiomeType {
  if (elevation < 0.25) {
    if (elevation < 0.12) return 'ocean';
    if (elevation < 0.18) return 'coastal';
    if (moisture > 0.6) return 'wetland';
    return 'coastal';
  }
  if (elevation > 0.85) return 'alpine';
  if (temperature < 0.2) return 'tundra';
  if (temperature > 0.75 && moisture > 0.65) return 'tropical_rainforest';
  if (temperature > 0.6 && moisture < 0.25) return 'desert';
  if (moisture > 0.5 && temperature > 0.35 && temperature < 0.75) return 'temperate_forest';
  if (moisture > 0.35) return 'grassland';
  if (moisture < 0.2) return 'desert';
  return 'grassland';
}

const FIELD_STRIDE = 4; // elevation, moisture, temperature, fertility

export class WorldGeneratorClass {
  generate(seed: number, width: number, height: number): WorldMap {
    const noise1 = seededNoise2D(seed);
    const noise2 = seededNoise2D(seed + 1337);
    const noise3 = seededNoise2D(seed + 2674);
    const noise4 = seededNoise2D(seed + 9999);
    const noiseM1 = seededNoise2D(seed + 4321);
    const noiseM2 = seededNoise2D(seed + 8765);
    const noiseT1 = seededNoise2D(seed + 3333);

    const cells = new Float32Array(width * height * FIELD_STRIDE);
    const biomes = new Uint8Array(width * height);
    const rivers = new Uint8Array(width * height);

    // Biome type to index mapping
    const biomeIndex: Record<BiomeType, number> = {
      ocean: 0, coastal: 1, wetland: 2, tropical_rainforest: 3, temperate_forest: 4,
      grassland: 5, desert: 6, tundra: 7, alpine: 8, river: 9, lake: 10,
    };

    // Generate base maps
    const elevMap = new Float32Array(width * height);
    const moistMap = new Float32Array(width * height);
    const tempMap = new Float32Array(width * height);
    const fertMap = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = y / height;
        const i = y * width + x;

        // Elevation: octave noise with continent shaping
        const distFromCenter = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 1.4;
        const continentMask = Math.max(0, 1 - distFromCenter * 1.2);
        let elev = (noise1(nx * 3, ny * 3) + 1) * 0.5;
        elev += (noise2(nx * 7, ny * 7) + 1) * 0.25 * 0.5;
        elev += (noise3(nx * 15, ny * 15) + 1) * 0.125 * 0.5;
        elev = elev * 0.7 + continentMask * 0.3;
        elev = Math.max(0, Math.min(1, elev));
        elevMap[i] = elev;

        // Moisture: influenced by elevation and base noise
        let moist = (noiseM1(nx * 4, ny * 4) + 1) * 0.5;
        moist += (noiseM2(nx * 9, ny * 9) + 1) * 0.3 * 0.5;
        moist = moist * 0.6 + (1 - elev) * 0.2 + 0.1;
        moistMap[i] = Math.max(0, Math.min(1, moist));

        // Temperature: latitude gradient + noise
        const latBias = 1 - Math.abs(ny - 0.5) * 2; // equator=1, poles=0
        let temp = latBias * 0.7 + (noiseT1(nx * 5, ny * 5) + 1) * 0.15;
        temp -= elev * 0.3; // altitude cooling
        tempMap[i] = Math.max(0, Math.min(1, temp));

        // Fertility: moisture + temperature interaction, not in extremes
        const fert = moistMap[i] * 0.5 + tempMap[i] * 0.3 + (noise4(nx * 6, ny * 6) + 1) * 0.1;
        fertMap[i] = Math.max(0, Math.min(1, fert * (elev > 0.2 ? 1 : 0.2)));
      }
    }

    // River generation: find high elevation points, flow downhill
    const riverSet = new Set<number>();
    const numRivers = Math.floor(seed % 7) + 8;
    const rng = mulberry32(seed + 12345);
    for (let r = 0; r < numRivers; r++) {
      let rx = Math.floor(rng() * width);
      let ry = Math.floor(rng() * height);
      // Start from a high-elevation non-ocean area
      for (let attempt = 0; attempt < 50; attempt++) {
        const tx = Math.floor(rng() * width);
        const ty = Math.floor(rng() * height);
        const ti = ty * width + tx;
        if (elevMap[ti] > 0.6) { rx = tx; ry = ty; break; }
      }
      // Flow downhill up to 200 steps
      for (let step = 0; step < 200; step++) {
        const ci = ry * width + rx;
        if (elevMap[ci] < 0.18) break; // reached ocean
        riverSet.add(ci);
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        let bestX = rx, bestY = ry, bestElev = elevMap[ci];
        for (const [dx, dy] of dirs) {
          const nx2 = rx + dx, ny2 = ry + dy;
          if (nx2 < 0 || nx2 >= width || ny2 < 0 || ny2 >= height) continue;
          const ni = ny2 * width + nx2;
          if (elevMap[ni] < bestElev) { bestElev = elevMap[ni]; bestX = nx2; bestY = ny2; }
        }
        if (bestX === rx && bestY === ry) break;
        rx = bestX; ry = bestY;
      }
    }

    // Write cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const base = i * FIELD_STRIDE;
        cells[base] = elevMap[i];
        cells[base + 1] = moistMap[i];
        cells[base + 2] = tempMap[i];
        cells[base + 3] = fertMap[i];

        const isRiver = riverSet.has(i);
        rivers[i] = isRiver ? 1 : 0;

        const biome: BiomeType = isRiver
          ? 'river'
          : biomeLookup(elevMap[i], moistMap[i], tempMap[i]);
        biomes[i] = biomeIndex[biome];
      }
    }

    return { width, height, cells, biomes, rivers, seed };
  }

  getCell(world: WorldMap, x: number, y: number): WorldCell {
    const i = Math.floor(y) * world.width + Math.floor(x);
    const base = i * FIELD_STRIDE;
    const biomeNames: BiomeType[] = [
      'ocean', 'coastal', 'wetland', 'tropical_rainforest', 'temperate_forest',
      'grassland', 'desert', 'tundra', 'alpine', 'river', 'lake',
    ];
    const biome = biomeNames[world.biomes[i]] ?? 'grassland';
    return {
      elevation: world.cells[base],
      moisture: world.cells[base + 1],
      temperature: world.cells[base + 2],
      fertility: world.cells[base + 3],
      biome,
      isWater: biome === 'ocean' || biome === 'lake' || biome === 'coastal',
      isRiver: world.rivers[i] === 1,
      diseaseLevel: 0,
      populationDensity: 0,
    };
  }

  getInitialClimate(seed: number): ClimateState {
    return {
      temperature: 14,
      co2: 415,
      oceanHeat: 0.5,
      iceCoverage: 0.1,
      rainfall: 1.0,
      solarOutput: 1.0,
      soilFertility: 0.7,
      oceanSalinity: 1.0,
      windPatterns: 0.5,
      humidity: 0.5,
      seasonalVariation: 0.5,
      tectonicActivity: 0.2,
      season: 'spring',
      seasonProgress: 0,
      yearOfCycle: 0,
    };
  }
}

export const WorldGenerator = new WorldGeneratorClass();
