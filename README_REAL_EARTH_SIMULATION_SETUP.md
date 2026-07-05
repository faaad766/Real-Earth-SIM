# Real Earth Simulation Setup 🌍

> A living planet simulator and evolution sandbox — watch billions of years unfold in your browser.

---

## Table of Contents

- [What Is This?](#what-is-this)
- [Features](#features)
- [Screenshots / Canvas Preview](#screenshots--canvas-preview)
- [Species Catalog](#species-catalog)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [CLI Tools](#cli-tools)
- [Simulation Controls](#simulation-controls)
- [Disaster System](#disaster-system)
- [Climate System](#climate-system)
- [Genetics & Evolution](#genetics--evolution)
- [Data Visualization](#data-visualization)
- [Persistence & Save System](#persistence--save-system)
- [Configuration](#configuration)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

---

## What Is This?

**Real Earth Simulation Setup** is a fully client-side, browser-based ecosystem and evolution simulator. You take the role of an unseen planetary force — adjusting climate knobs, dropping species onto biomes, triggering geological disasters, and watching natural selection do the rest.

Every planet is procedurally generated from a numeric seed. The same seed always produces the same terrain, biome layout, rivers, and initial species distribution. Change one digit and you get an entirely different world.

The simulation runs in real time using a discrete-tick engine. At higher simulation speeds the renderer switches to a density heatmap so the browser stays smooth even with hundreds of organisms on screen.

---

## Features

| Feature | Description |
|---------|-------------|
| 🌏 Procedural World Generation | Terrain, rivers, lakes, and 11 biome types generated from any numeric seed |
| 🦎 86-Species Catalog | Plants, herbivores, carnivores, omnivores, insects — each locked to real biome preferences |
| 🧬 Genetics Engine | 15-trait genotype per organism; mutation, crossover, and genetic drift each generation |
| 🌡️ Climate System | Temperature, CO₂, rainfall, ice cover, ocean heat — driven by orbital cycles and your interventions |
| 🌋 Disaster System | 14+ disaster types: volcano, meteor, wildfire, flood, epidemic, glaciation, pole reversal, and more |
| 🌙 Day / Night Cycle | Canvas transitions from dawn through dusk to a star-filled night sky |
| 🔬 Organism Inspector | Click any organism — see genotype, behavioral state, lineage, and mutation log |
| 📊 Data Visualization | Population history, biodiversity index, climate trends, extinction event log |
| 🗂️ Event Log | Every extinction, speciation, disaster, and climate shift recorded with coordinates |
| 💾 Autosave | Full world state saved to localStorage every 60 seconds; 5 named save slots |
| 🎛️ Environment Panel | Sliders for rainfall, temperature, CO₂, soil fertility, and solar output |
| 🗺️ Minimap | Live thumbnail with switchable data layers (terrain, biome, population density, temperature) |
| 🔊 Audio System | Biome-matched ambient audio: forest, rain, ocean, wind, fire, birdsong |
| ⚡ Performance Mode | Automatic density-map fallback at high simulation speeds (20×+) |

---

## Screenshots / Canvas Preview

The simulation canvas renders in WebGL via PixiJS v8:

- **Terrain layer** — elevation-based color gradients from deep ocean to alpine snow
- **Biome shading** — tinted overlays per biome type (green for forest, tan for desert, etc.)
- **Organism dots** — color and size vary by organism type; glow effects signal behavioral state
- **Grid overlay** — optional biome grid for orientation
- **Star field** — visible during night phase
- **Disaster FX** — radial shockwave for meteor impact, orange tint for wildfire, blue pulse for flood

---

## Species Catalog

86 species across 5 organism types:

| Type | Count | Examples |
|------|-------|---------|
| Plant | 16 | Grass, Oak Tree, Cactus, Bamboo, Seaweed, Coral Reef, Mushroom Patch |
| Herbivore | 19 | Rabbit, Deer, Elephant, Zebra, Reindeer, Iguana, Gorilla |
| Carnivore | 23 | Wolf, Tiger, Shark, Velociraptor, T-Rex, Cheetah, Polar Bear |
| Omnivore | 16 | Bear, Fox, Dolphin, Flamingo, Lemur, Hyena, Meerkat |
| Insect | 12 | Butterfly, Bee, Dragonfly, Scorpion, Termite, Praying Mantis |

Each species entry in `src/types/simulation.ts` declares:
- Unique `id` and display `name`
- Organism `type` (`plant` | `herbivore` | `carnivore` | `omnivore` | `insect`)
- Emoji `icon` for rendering
- `biomes` array — the biome types this species is placed into on world generation

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  React UI (shadcn/ui + Tailwind)                                │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ EnvironmentPanel│  │ DataVizPanel │  │ OrganismInspector    │ │
│  │ (climate,      │  │ (charts,     │  │ (genotype, lineage,  │ │
│  │  disasters,    │  │  diversity,  │  │  behavioral state)   │ │
│  │  species list) │  │  ext. log)   │  │                      │ │
│  └───────┬───────┘  └──────┬───────┘  └──────────────────────┘ │
│          │                 │                                     │
│  ┌───────▼─────────────────▼──────────────────────────────────┐ │
│  │  Zustand (UIStore) — simulation state, selected organism,  │ │
│  │  panel positions, speed setting, chart data                │ │
│  └───────┬────────────────────────────────────────────────────┘ │
│          │                                                       │
│  ┌───────▼────────────────────────────────────────────────────┐ │
│  │  SimCanvas (PixiJS v8 WebGL)                               │ │
│  │  — terrain, biome tint, organisms, grid, stars, FX layers  │ │
│  └───────┬────────────────────────────────────────────────────┘ │
└──────────┼──────────────────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────────────────┐
│  SimulationEngine (requestAnimationFrame tick loop)             │
│  ┌────────────┐ ┌────────────────┐ ┌──────────────────────────┐ │
│  │ WorldGen   │ │ OrganismAI     │ │ GeneticsEngine           │ │
│  │ (terrain,  │ │ (behavior FSM: │ │ (crossover, mutation,    │ │
│  │  biomes,   │ │  hunt/flee/eat │ │  speciation detection)   │ │
│  │  rivers)   │ │  /mate/wander) │ │                          │ │
│  └────────────┘ └────────────────┘ └──────────────────────────┘ │
│  ┌────────────┐ ┌────────────────┐ ┌──────────────────────────┐ │
│  │ Climate    │ │ DiseaseEngine  │ │ DataRecorder             │ │
│  │ System     │ │                │ │ (time-series, ext. log)  │ │
│  └────────────┘ └────────────────┘ └──────────────────────────┘ │
│                                                                  │
│  EventBus — extinction, speciation, disaster, climate events    │
│  Quadtree — spatial indexing for fast neighbor queries          │
│  PersistenceManager — localStorage save/load/autosave          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
real-earth-simulation-setup/
├── index.html                          # App entry point
├── package.json                        # Dependencies and npm scripts
├── vite.config.ts                      # Vite build configuration
├── tailwind.config.js                  # Tailwind CSS tokens
├── tsconfig.json                       # TypeScript config
├── loop.md                             # Auto-generated simulation loop docs
├── scripts/
│   ├── test-sprite.js                  # Species catalog validation CLI
│   └── generate-loop-md.js             # loop.md generator
├── public/
│   └── favicon.png
├── src/
│   ├── main.tsx                        # React entry
│   ├── App.tsx                         # Router setup
│   ├── routes.tsx                      # Route definitions
│   ├── index.css                       # Design system CSS variables
│   ├── types/
│   │   └── simulation.ts               # Types + SPECIES_CATALOG + DISASTERS_CATALOG
│   ├── lib/
│   │   ├── SimulationEngine.ts         # Main tick loop and world state
│   │   ├── WorldGenerator.ts           # Procedural terrain + biome generation
│   │   ├── OrganismAI.ts               # Behavioral state machines
│   │   ├── GeneticsEngine.ts           # Mutation, crossover, speciation
│   │   ├── ClimateSystem.ts            # Temperature, CO₂, rainfall dynamics
│   │   ├── DiseaseEngine.ts            # Epidemics, transmission, resistance
│   │   ├── DataRecorder.ts             # Time-series population + event data
│   │   ├── AudioSystem.ts              # Web Audio API biome ambient sounds
│   │   ├── EventBus.ts                 # Cross-module event pub/sub
│   │   ├── Quadtree.ts                 # 2D spatial index for neighbor queries
│   │   └── PersistenceManager.ts       # LocalStorage save/load
│   ├── store/
│   │   └── UIStore.ts                  # Zustand global state
│   ├── pages/
│   │   ├── MainMenu.tsx                # New world, load, settings
│   │   └── SimulationWorkspace.tsx     # Main simulation layout
│   ├── components/
│   │   ├── canvas/
│   │   │   └── SimCanvas.tsx           # PixiJS WebGL renderer
│   │   ├── panels/
│   │   │   ├── EnvironmentPanel.tsx    # Climate sliders + disasters
│   │   │   ├── DataVizPanel.tsx        # Charts and metrics
│   │   │   ├── OrganismInspector.tsx   # Per-organism detail view
│   │   │   ├── LogsPanel.tsx           # Event log
│   │   │   └── DraggablePanel.tsx      # Resizable/draggable container
│   │   └── ui/
│   │       ├── TopBar.tsx              # Speed controls, date, screenshot
│   │       ├── Minimap.tsx             # Live world thumbnail
│   │       └── ...                     # shadcn/ui components
│   └── contexts/
│       └── AuthContext.tsx
└── docs/
    └── prd.md                          # Product requirements document
```

---

## Getting Started

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | ≥ 20 LTS | https://nodejs.org |
| npm | ≥ 10 | Bundled with Node.js |
| Git | any | https://git-scm.com |

### Installation

```bash
# 1. Clone or extract the source
git clone <your-repository-url> real-earth-simulation-setup
cd real-earth-simulation-setup

# 2. Install all dependencies
npm install

# 3. Verify everything is healthy
npm run lint
#   Expected output: Checked 100 files. No fixes applied.

# 4. Build for production
npm exec vite build
#   Output goes into dist/

# 5. Preview the production build locally
npm exec vite preview
#   Open http://localhost:4173 in your browser
```

> **VS Code users:** Open the folder with `File → Open Folder`, then press `Ctrl + `` ` `` (backtick) to open the integrated terminal and run the commands above.

---

## CLI Tools

Two custom scripts are included to support development and documentation workflows.

### `npm run test-sprite`

Validates the species catalog (`src/types/simulation.ts`) and checks that SimCanvas rendering constants are present.

```bash
npm run test-sprite
```

**Sample output:**

```
ℹ️  Loaded 86 species from SPECIES_CATALOG
✅ All species entries passed validation
ℹ️  Species counts by type:
   plant           16
   herbivore       19
   carnivore       23
   omnivore        16
   insect          12
ℹ️  Initial organism estimate: ~102 (plants=2, others=1)
✅ SimCanvas rendering constants (DOT_RADIUS, BIOME_NAMES, LEGEND_ENTRIES) are present

🎉 Sprite / species validation passed.
```

**Exit codes:** `0` = all checks passed · `1` = one or more validation errors

**What it checks:**
- Every species has a non-empty `id` matching `[a-z0-9_]+`
- Every species has a `name` of at least 2 characters
- Every species `type` is one of `plant | herbivore | carnivore | omnivore | insect`
- Every species has at least one `biome` from the supported biome list
- All referenced biomes are valid (`ocean`, `coastal`, `grassland`, `tropical_rainforest`, `temperate_forest`, `desert`, `tundra`, `alpine`, `wetland`, `river`, `lake`)
- `DOT_RADIUS`, `BIOME_NAMES`, and `LEGEND_ENTRIES` constants exist in SimCanvas

Run this command after editing `src/types/simulation.ts` to catch any mistakes before deploying.

---

### `npm run generate:loop-md`

Generates `loop.md` — a markdown document explaining the simulation tick loop in human-readable form.

```bash
npm run generate:loop-md
```

The file is written to `loop.md` at the root of the project. Open it in VS Code (`Ctrl + Shift + V` for Markdown preview) to read about each simulation phase.

Run this command whenever you make significant changes to `SimulationEngine.ts` to keep the documentation in sync.

---

## Simulation Controls

### Speed Controls (Top Bar)

| Button | Speed | Time per tick |
|--------|-------|---------------|
| ⏸ Pause | 0× | — |
| ▶ 1× | Normal | 1 simulation hour |
| ⏩ 5× | Accelerated | 5 hours |
| ⏩⏩ 20× | Fast | 1 day |
| ⏩⏩⏩ 100× | Rapid | 5 days |
| 🌍 Geological | Deep time | Years |

At speeds above 20×, the canvas automatically switches to a density heatmap for performance.

### Camera

- **Zoom:** Scroll wheel or pinch gesture
- **Pan:** Click and drag on the canvas
- **Select organism:** Click any dot on the canvas to open the Organism Inspector

### Environment Panel (Left)

| Slider | Effect |
|--------|--------|
| Rainfall Intensity | Changes global precipitation; affects biome moisture and plant growth |
| Global Temperature | Shifts average temperature; changes ice coverage and biome transitions |
| Atmospheric CO₂ | Higher CO₂ warms the planet; affects photosynthesis rate |
| Soil Fertility | Determines plant growth speed and carrying capacity |
| Solar Output | Drives photosynthesis and temperature; solar flares cause spikes |

---

## Disaster System

Disasters are triggered from the Environment Panel. Each has a cooldown timer.

| Disaster | Cooldown | Effect |
|----------|----------|--------|
| Volcanic Eruption | 500 ticks | Local terrain damage, ash cloud, temperature spike |
| Meteor Impact | 800 ticks | Radial kill zone, crater formation, global temperature drop |
| Wildfire | 300 ticks | Spreads through dry biomes, kills plants and slow animals |
| Flood | 200 ticks | Inundates low-elevation areas, resets soil fertility |
| Epidemic | 400 ticks | Disease outbreak in a target species, resistance selection |
| Glaciation | 600 ticks | Spreads ice from poles, freezes wetlands, kills tropical species |
| Tsunami | 700 ticks | Coastal devastation, marine ecosystem disruption |
| Drought Wave | 350 ticks | Water source depletion, plant mortality spike |
| Solar Flare | 900 ticks | Radiation damage, temporary temperature spike |
| Pole Reversal | 1500 ticks | Migration disruption, navigation chaos |
| Superstorm | 450 ticks | Massive wind damage, flooding, ecosystem collapse |

---

## Climate System

The climate state is a set of global variables updated every tick:

- **Average Temperature** — affected by CO₂, solar output, ice coverage, and biological activity
- **Atmospheric CO₂** — changed by user slider, volcanic eruptions, forest coverage
- **Rainfall Distribution** — varies by season and temperature; drives biome transitions
- **Ocean Heat Content** — absorbs excess temperature; buffers rapid changes
- **Ice Cap Coverage** — expands in cold, low-CO₂ conditions; reflects solar radiation

Biological feedback loops are active:
- Large forests increase rainfall and lower temperature
- Desertification raises surface albedo and reduces rainfall further
- Animal populations contribute trace gas emissions

---

## Genetics & Evolution

Each organism carries a fixed-length genotype of 15 numerical traits:

| Trait | Effect |
|-------|--------|
| Movement Speed | Distance covered per tick |
| Sensory Range | Detection radius for food and threats |
| Body Mass | Affects energy cost, combat, and visibility |
| Reproductive Threshold | Energy level required to attempt mating |
| Gestation Period | Ticks between mating and offspring |
| Litter Size | Number of offspring per reproduction event |
| Lifespan Ceiling | Maximum age in simulation ticks |
| Metabolic Rate | Energy consumed per tick |
| Thermal Tolerance | Temperature range before health degrades |
| Disease Resistance | Reduces infection probability and mortality |
| Aggression Coefficient | Willingness to attack vs. flee |
| Social Affinity | Tendency to group with conspecifics |
| Intelligence Level | Improves path-finding and threat avoidance |
| Camouflage Value | Reduces predator detection range |
| Dietary Breadth | Number of acceptable food species |

**Speciation:** Geographically isolated populations accumulate genetic divergence. When divergence crosses a threshold, a new species is registered and logged in the event stream.

---

## Data Visualization

The Data Visualization Panel (right side) provides five chart tabs:

| Tab | Chart Type | Shows |
|-----|-----------|-------|
| Population | Stacked area | Per-species population over simulated time |
| Biodiversity | Line | Species count and genetic variance |
| Climate | Multi-line | Temperature and rainfall over geological eras |
| Extinctions | Timeline | Extinction events with severity and inferred cause |
| Food Web | Network graph | Live predator-prey relationship diagram |

---

## Persistence & Save System

- **Autosave:** Every 60 seconds the full simulation state (organism positions, genotypes, climate, history, event log) is serialized and written to `localStorage`
- **5 Save Slots:** Named slots available from the Main Menu
- **Session Resume:** On page reload the autosave is detected and offered for restoration
- **Panel State:** Panel positions, tab selections, and open/closed states persist between sessions

---

## Configuration

All configurable constants are at the top of their respective files:

| File | Constants |
|------|-----------|
| `src/types/simulation.ts` | `SPECIES_CATALOG`, `DISASTERS_CATALOG`, biome and trait type definitions |
| `src/lib/SimulationEngine.ts` | Spawn counts, tick interval, autosave interval |
| `src/lib/GeneticsEngine.ts` | Mutation rate, divergence threshold for speciation |
| `src/lib/ClimateSystem.ts` | Seasonal cycle amplitude, CO₂ sensitivity |
| `src/lib/DiseaseEngine.ts` | Transmission rate, virulence, mutation probability |
| `src/components/canvas/SimCanvas.tsx` | `DOT_RADIUS`, `BIOME_NAMES`, `LEGEND_ENTRIES`, render constants |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19 |
| Language | TypeScript | ~5.9 |
| Canvas | PixiJS | 8 |
| UI Components | shadcn/ui + Radix | latest |
| Styling | Tailwind CSS | 3 |
| State Management | Zustand | 5 |
| Build Tool | Vite (rolldown-vite) | latest |
| Charts | Recharts | 2.15 |
| Animation | Framer Motion | 12 |
| Noise | simplex-noise | 4 |
| Linter | Biome | 2 |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run the validation suite:
   ```bash
   npm run lint
   npm run test-sprite
   ```
5. Commit with a descriptive message: `git commit -m "Add: describe what you added"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request

**Adding a new species:**
- Add an entry to `SPECIES_CATALOG` in `src/types/simulation.ts`
- Run `npm run test-sprite` to validate the new entry
- Biome assignments control spawn location; make sure at least one biome is correct for the organism

**Modifying the simulation loop:**
- Edit `src/lib/SimulationEngine.ts`
- Run `npm run generate:loop-md` to regenerate documentation

---

## License

MIT License — free to use, modify, and distribute.

---

*Real Earth Simulation Setup — watch evolution happen.*
