#!/usr/bin/env node
/**
 * Real Earth Simulation Setup — Simulation Loop Documentation Generator
 *
 * Usage:
 *   npm run generate:loop-md
 *
 * What it does:
 *   - Reads the SimulationEngine tick loop
 *   - Generates loop.md, a beginner-friendly explanation of the simulation loop
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const enginePath = resolve(root, "src/lib/SimulationEngine.ts");
const outputPath = resolve(root, "loop.md");

if (!existsSync(enginePath)) {
  console.error(`❌ SimulationEngine.ts not found at ${enginePath}`);
  process.exit(1);
}

const engineSource = readFileSync(enginePath, "utf-8");

// Extract the tick method body
const tickMatch = engineSource.match(/tick\(\)[^{]*\{([\s\S]*?)\n  \}/);
const tickBody = tickMatch ? tickMatch[1].trim() : "(could not extract tick body)";

const lines = tickBody.split("\n").filter((line) => line.trim().length > 0);
const phases = [];
for (const line of lines) {
  const comment = line.match(/\/\/\s*(.+)/);
  if (comment) {
    phases.push(comment[1].trim());
  }
}

const doc = `# Simulation Loop

This document explains how the **Real Earth Simulation Setup** engine advances the world one tick at a time.

## Overview

The simulation uses a discrete tick loop. Each tick represents a small step of simulated time and updates every organism, climate variable, and event tracker. The loop is intentionally split into logical phases so that behavior, reproduction, death, and data recording happen in a predictable order.

## Phases of a Tick

${phases.length > 0 ? phases.map((p, i) => `${i + 1}. ${p}`).join("\n") : "_(No inline phase comments were found in SimulationEngine.ts)_"}

## What Happens in Detail

### 1. Timekeeping

The engine increments the global tick counter and updates the simulated date. The day/night cycle and climate rhythms are derived from this counter.

### 2. Climate Update

The climate system updates temperature, rainfall, and other global variables. Seasonal cycles may trigger biome transitions and influence organism metabolism.

### 3. Organism Update Loop

Every living organism is processed:

- **Plants** grow, compete for nutrients, and may spread seeds.
- **Animals** choose a behavior based on energy, nearby threats, and mates.
- Common updates include aging, metabolism, movement, and state transitions.

### 4. Interactions

During the update, organisms may:

- Eat plants or other animals
- Flee from predators
- Hunt prey
- Mate and produce offspring
- Die from starvation, age, disease, or disasters

### 5. Genetics & Evolution

Offspring inherit a recombination of parent genes with small mutations. Over many generations, populations drift genetically. When divergence crosses a threshold, a new species may be declared.

### 6. Disease Dynamics

The disease engine checks transmission between nearby organisms, updates infection timers, and applies mortality based on genetic resistance.

### 7. Population Reconciliation

At the end of the tick, the engine recounts living organisms per species, checks for extinctions, and updates the species registry.

### 8. Data Recording

Population counts, species diversity, climate variables, and notable events are recorded for charts and the event log.

### 9. Event Broadcasting

Important events (extinction, speciation, disaster, climate shift) are emitted through the EventBus so that the canvas and UI panels can react without direct coupling.

## Performance Notes

- Organism rendering is batched by color into a single PixiJS Graphics call.
- The engine avoids Math.random() in the hot render path.
- Zustand state updates are throttled so React UI re-renders do not slow down the simulation.

## Files to Explore

- \`src/lib/SimulationEngine.ts\` — main tick loop
- \`src/lib/OrganismAI.ts\` — behavior state machines
- \`src/lib/GeneticsEngine.ts\` — mutation and inheritance
- \`src/lib/ClimateSystem.ts\` — climate variables
- \`src/lib/DiseaseEngine.ts\` — epidemics and resistance
- \`src/lib/DataRecorder.ts\` — time-series data
- \`src/lib/EventBus.ts\` — cross-module event communication

---

*Generated automatically from SimulationEngine.ts.*
`;

writeFileSync(outputPath, doc, "utf-8");
console.log(`✅ loop.md generated at ${outputPath}`);
