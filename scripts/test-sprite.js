#!/usr/bin/env node
/**
 * Real Earth Simulation Setup — Sprite / Species Validation CLI
 *
 * Usage:
 *   npm run test-sprite
 *
 * What it does:
 *   - Parses the SPECIES_CATALOG from src/types/simulation.ts
 *   - Validates every species entry (id, name, type, icon, biomes)
 *   - Reports counts by organism type
 *   - Estimates initial population size after world generation
 *   - Checks that canvas rendering constants are present in SimCanvas.tsx
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more validation errors
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const speciesPath = resolve(root, "src/types/simulation.ts");
const canvasPath = resolve(root, "src/components/canvas/SimCanvas.tsx");
const enginePath = resolve(root, "src/lib/SimulationEngine.ts");

let exitCode = 0;

function fail(message) {
  console.error(`❌ ${message}`);
  exitCode = 1;
}

function ok(message) {
  console.log(`✅ ${message}`);
}

function info(message) {
  console.log(`ℹ️  ${message}`);
}

// ---------------------------------------------------------------------------
// 1. Load and parse SPECIES_CATALOG
// ---------------------------------------------------------------------------

if (!existsSync(speciesPath)) {
  fail(`Species catalog not found at ${speciesPath}`);
  process.exit(exitCode);
}

const speciesSource = readFileSync(speciesPath, "utf-8");

const catalogStart = speciesSource.indexOf("export const SPECIES_CATALOG = [");
if (catalogStart === -1) {
  fail("Could not locate SPECIES_CATALOG array in src/types/simulation.ts");
  process.exit(exitCode);
}

// Find the matching closing `];` by scanning brackets
let bracketDepth = 0;
let catalogEnd = -1;
for (let i = catalogStart + "export const SPECIES_CATALOG = [".length - 1; i < speciesSource.length; i++) {
  const ch = speciesSource[i];
  if (ch === "[") bracketDepth++;
  else if (ch === "]") {
    bracketDepth--;
    if (bracketDepth === 0) {
      catalogEnd = i + 1;
      break;
    }
  }
}

if (catalogEnd === -1) {
  fail("Could not find the end of SPECIES_CATALOG array");
  process.exit(exitCode);
}

const catalogText = speciesSource.slice(catalogStart, catalogEnd);

// Extract each { ... } object block inside the catalog array
const blockPattern = /\{[^{}]*\}/g;
const rawBlocks = catalogText.match(blockPattern) || [];

const species = [];
for (const block of rawBlocks) {
  // Skip section comment markers that happen to be inside braces (they shouldn't, but be safe)
  if (!block.includes("type:")) continue;

  const id = block.match(/id:\s*['"]([^'"]+)['"]/)?.[1];
  const name = block.match(/name:\s*['"]([^'"]+)['"]/)?.[1];
  const type = block.match(/type:\s*['"]([^'"]+)['"]/)?.[1];
  const icon = block.match(/icon:\s*['"]([^'"]+)['"]/)?.[1];
  const biomesMatch = block.match(/biomes:\s*\[([^\]]*)\]/);
  const biomes = biomesMatch
    ? biomesMatch[1]
        .split(",")
        .map((b) => b.trim().replace(/['"]/g, ""))
        .filter(Boolean)
    : [];

  species.push({ id, name, type, icon, biomes });
}

info(`Loaded ${species.length} species from SPECIES_CATALOG`);

// ---------------------------------------------------------------------------
// 2. Validate species entries
// ---------------------------------------------------------------------------

const validTypes = new Set(["plant", "herbivore", "carnivore", "omnivore", "insect"]);
const validBiomes = new Set([
  "ocean",
  "coastal",
  "grassland",
  "tropical_rainforest",
  "temperate_forest",
  "desert",
  "tundra",
  "alpine",
  "wetland",
  "river",
  "lake",
]);

const countsByType = {};
for (const type of validTypes) countsByType[type] = 0;

for (const s of species) {
  if (!s.id || !/^[a-z0-9_]+$/.test(s.id)) {
    fail(`Species "${s.name || s.id}" has invalid id: "${s.id}"`);
  }
  if (!s.name || s.name.trim().length < 2) {
    fail(`Species "${s.id}" has invalid name: "${s.name}"`);
  }
  if (!validTypes.has(s.type)) {
    fail(`Species "${s.name}" has invalid type: "${s.type}"`);
  } else {
    countsByType[s.type]++;
  }
  if (!s.icon || s.icon.length === 0) {
    fail(`Species "${s.name}" is missing an icon`);
  }
  if (s.biomes.length === 0) {
    fail(`Species "${s.name}" has no biomes`);
  }
  for (const biome of s.biomes) {
    if (!validBiomes.has(biome)) {
      fail(`Species "${s.name}" references unknown biome: "${biome}"`);
    }
  }
}

if (exitCode === 0) {
  ok("All species entries passed validation");
}

info("Species counts by type:");
for (const [type, count] of Object.entries(countsByType)) {
  console.log(`   ${type.padEnd(12)} ${String(count).padStart(3)}`);
}

// ---------------------------------------------------------------------------
// 3. Estimate initial population
// ---------------------------------------------------------------------------

if (existsSync(enginePath)) {
  const engineSource = readFileSync(enginePath, "utf-8");
  const countMatch = engineSource.match(/const count = template\.type === 'plant' \? (\d+) : (\d+);/);
  if (countMatch) {
    const plantCount = Number(countMatch[1]);
    const otherCount = Number(countMatch[2]);
    const estimatedInitial =
      countsByType.plant * plantCount +
      (species.length - countsByType.plant) * otherCount;
    info(`Initial organism estimate: ~${estimatedInitial} (plants=${plantCount}, others=${otherCount})`);
  } else {
    info("Could not determine initial spawn counts from SimulationEngine.ts");
  }
} else {
  fail(`SimulationEngine.ts not found at ${enginePath}`);
}

// ---------------------------------------------------------------------------
// 4. Check SimCanvas rendering constants
// ---------------------------------------------------------------------------

if (existsSync(canvasPath)) {
  const canvasSource = readFileSync(canvasPath, "utf-8");
  const hasDotRadius = /const DOT_RADIUS/.test(canvasSource);
  const hasBiomeNames = /const BIOME_NAMES/.test(canvasSource);
  const hasLegend = /const LEGEND_ENTRIES/.test(canvasSource);
  if (hasDotRadius && hasBiomeNames && hasLegend) {
    ok("SimCanvas rendering constants (DOT_RADIUS, BIOME_NAMES, LEGEND_ENTRIES) are present");
  } else {
    if (!hasDotRadius) fail("SimCanvas is missing DOT_RADIUS constant");
    if (!hasBiomeNames) fail("SimCanvas is missing BIOME_NAMES constant");
    if (!hasLegend) fail("SimCanvas is missing LEGEND_ENTRIES constant");
  }
} else {
  fail(`SimCanvas.tsx not found at ${canvasPath}`);
}

// ---------------------------------------------------------------------------
// 5. Done
// ---------------------------------------------------------------------------

if (exitCode === 0) {
  console.log("\n🎉 Sprite / species validation passed.");
} else {
  console.log("\n⚠️  Sprite / species validation failed.");
}
process.exit(exitCode);
