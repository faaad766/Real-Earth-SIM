# Requirements Document

## 1. Application Overview

**Application Name**: Real Earth Simulation Setup

**Description**: A living universe simulator and evolution sandbox where users observe and influence geological, atmospheric, and biological processes across millions of simulated years. Users reshape terrain, adjust climate parameters, introduce species, and trigger natural events, then observe emergent evolutionary outcomes driven by natural selection and environmental pressures.

---

## 2. Users and Usage Scenarios

**Target Users**: 
- Science enthusiasts interested in evolutionary biology and ecology
- Simulation game players seeking open-ended sandbox experiences
- Educators demonstrating natural selection and ecosystem dynamics

**Core Usage Scenarios**:
- Observing how species adapt to environmental changes over geological timescales
- Experimenting with climate interventions and observing cascading ecological effects
- Tracking evolutionary lineages and speciation events across millions of years
- Analyzing population dynamics, extinction events, and biodiversity patterns

---

## 3. Page Structure and Functional Description

### 3.1 Page Structure

```
Real Earth Simulation Setup Application
├── Main Menu
│   ├── New World Generation
│   ├── Load Saved World
│   └── Settings
└── Simulation Workspace
    ├── Top Control Bar
    ├── Environmental Control Panel (Left)
    ├── Main Canvas (Center)
    ├── Data Visualization Panel (Right)
    └── Minimap (Below Data Visualization Panel)
```

### 3.2 Main Menu

**Purpose**: Entry point for creating or loading simulation worlds

**Functional Elements**:
- **New World Generation**: User inputs numeric seed (optional) or generates random seed; system creates procedurally generated world with terrain, biomes, and initial species placement
- **Load Saved World**: User selects from five named save slots to restore previous simulation state
- **Settings Panel**: User configures audio volume, autosave interval (default 60 seconds), performance mode toggle, reduced motion toggle, and colorblind-friendly palette option
- **Background Simulation**: Live miniature simulation runs behind menu interface

### 3.3 Simulation Workspace

**Purpose**: Primary interface for observing and interacting with the evolving world

**Layout**:
- **Left Side**: Environmental Control Panel
- **Center**: Main Canvas (Simulation View)
- **Right Side**: Data Visualization Panel with Minimap positioned below
- **Top**: Top Control Bar

#### 3.3.1 Main Canvas

**Display Modes**:
- **Individual Organism View** (zoom levels showing discrete entities): Renders terrain, water bodies, vegetation, and individual animals as distinct visual elements
- **Density Visualization** (high simulation speeds above 20×): Displays population concentration as layered translucent heatmaps per species group

**Interaction**:
- Zoom: Continuous zoom from individual-organism scale to full-world view
- Pan: Click-drag to reposition viewport
- Organism Selection: Click any organism to open Organism Inspector Panel
- **Organism Placement**: When in place mode, clicking on canvas places organism exactly at clicked coordinates with accurate coordinate conversion

**World Elements**:
- **Terrain**: Elevation-based landscape with mountains, valleys, plains
- **Water Systems**: Rivers flowing from highlands to lowlands, lakes, oceans, coastlines, deltas, wetlands
- **Biomes**: Tropical rainforests, temperate forests, grasslands, deserts, tundra, alpine zones, transitional zones
- **Organisms**: Plants (grass, shrubs, trees) and animals (herbivores, carnivores, omnivores) rendered according to current zoom level and simulation speed

#### 3.3.2 Environmental Control Panel

**Position**: Left side of workspace

**Climate Controls** (grouped sliders with real-time feedback):
- Rainfall Intensity: Adjusts global precipitation levels
- Global Temperature Offset: Shifts average temperature up or down
- Atmospheric CO₂: Modifies carbon dioxide concentration
- Soil Fertility: Changes nutrient availability
- Solar Output: Alters incoming solar radiation
- Ocean Salinity: Adjusts salt concentration in water bodies
- Wind Patterns: Modifies prevailing wind direction and intensity
- Humidity Levels: Controls atmospheric moisture content
- Seasonal Variation: Adjusts amplitude of seasonal temperature swings
- Tectonic Activity: Controls frequency of geological events

**Species Introduction**:
- Species Palette: Categorized list of available organisms (plants, herbivores, carnivores, omnivores) with expanded catalog of diverse life forms
- Drag-and-Drop: User drags species from palette onto canvas to introduce at chosen location

**Disaster Triggers** (single-click buttons with cooldown timers):
- Volcanic Eruption
- Meteor Impact
- Wildfire Ignition
- Flood Trigger
- Epidemic Introduction
- Glaciation Onset
- Earthquake
- Tsunami
- Drought Wave
- Solar Flare
- Magnetic Pole Reversal
- Superstorm

#### 3.3.3 Data Visualization Panel

**Position**: Right side of workspace

**Chart Tabs**:

1. **Population History**: Stacked area chart showing population counts by species over simulated time; zoomable time axis, hoverable for exact values

2. **Biodiversity Index**: Line chart tracking species count and genetic variance across geological eras

3. **Climate History**: Multi-line chart displaying temperature and rainfall trends over time

4. **Extinction Event Log**: Vertical timeline showing extinction events with severity indicators, inferred causes (disease, climate shift, predation, habitat loss), and final population counts

5. **Food Web Diagram**: Dynamic network graph showing predator-prey relationships; updates as species are added or removed

6. **Evolutionary Tree**: Interactive collapsible dendrogram showing full branching history of all species including extinct lineages; color-coded by taxonomic group; extinct branches rendered in desaturated gray

#### 3.3.4 Organism Inspector Panel

**Triggered By**: Clicking any organism on canvas

**Information Displayed**:
- Species classification and individual identifier
- Current age and projected lifespan
- Real-time behavioral state (e.g., \"hunting — low energy — tracking deer 34m northeast\")
- Trait comparison radar chart: individual values vs. species average vs. grandparents
- Family tree: parents, offspring, siblings (living only)
- Life history timeline: key events since birth
- Mutation log: traits diverged from parent genotype with magnitude of change

#### 3.3.5 Top Control Bar

**Position**: Top of workspace

**New Game Button**:
- Single-click button labeled \"New Game\"
- When clicked: clears autosave slot, generates fresh world with random seed, resets all simulation state to initial conditions

**Simulation Speed Controls**:
- Pause
- 1× (real-time)
- 5× (accelerated)
- 20× (fast-forward)
- 100× (rapid simulation)
- Geological Fast-Forward (year-per-second increments)

**Global Readouts**:
- Simulated date display (current year and era)
- Total organism count
- Active species count

**Audio Controls**:
- Mute toggle
- Master volume slider

#### 3.3.6 Minimap

**Position**: Below Data Visualization Panel on right side

**Display**: Live organism density heatmap showing population concentration across world

**Visual Elements**:
- Day/Night Indicator: Visual representation of current time of day in simulation
- Compass Rose: Directional indicator showing north/south/east/west orientation

**Interaction**: 
- Click minimap to reposition main canvas viewport
- Minimap interactions isolated from main canvas; clicks do not propagate to main map

**Panel Management** (applies to all panels):
- Collapse to icon form
- Drag to reposition
- Resize by handle
- Pin to edges
- Position and state persist between sessions

---

## 4. Business Rules and Logic

### 4.1 World Generation

- World generated procedurally from numeric seed
- Seed determines terrain elevation, moisture distribution, temperature zones, biome placement, initial species locations, and starting climate state
- Same seed produces identical world configuration
- Elevation drives water flow: rivers form in highlands, flow downhill to lakes and oceans
- Biome placement determined by elevation, moisture, and temperature interaction

### 4.2 Simulation Engine

- Discrete-time tick system: each tick advances world by configurable interval (1 hour at 1×, scaling to days/years at higher speeds)
- Every organism (plant and animal) updated each tick according to biological and behavioral rules
- Plants: grow, spread seeds, compete for light and nutrients, respond to drought, burn in wildfires
- Animals: move, feed, drink, rest, flee, hunt, reproduce, age, die

### 4.3 Genetics and Evolution

**Genetic Profile** (per organism):
- Fixed-length array of numerical trait values: movement speed, sensory range, body mass, reproductive threshold, gestation period, litter size, lifespan ceiling, metabolic rate, thermal tolerance range, disease resistance, aggression coefficient, social affinity, intelligence level, camouflage value, dietary breadth

**Reproduction**:
- Offspring receives recombined genotype from both parents
- Per-trait mutation rates (tunable globally by user)
- Mutations are bounded perturbations with variable magnitude

**Natural Selection**:
- Trait fitness determined by current environment
- Populations under consistent pressure evolve measurable trait shifts over generations
- Example: prey in high-predator regions evolve higher speed, smaller body size, shorter gestation, or stronger camouflage

**Speciation**:
- Geographically isolated populations diverge genetically
- When reproductive compatibility lost, system classifies as new species
- Speciation events logged with date and ancestral lineage

**Extinction**:
- Species extinction logged with simulated date, inferred cause, and final population count

### 4.4 Climate System

**Global State Variables**:
- Average temperature
- Atmospheric CO₂
- Ocean heat content
- Ice cap coverage
- Rainfall distribution

**Climate Drivers**:
- Orbital cycles
- Volcanic activity
- Cumulative biological activity (forests increase moisture, desertification raises albedo, animal populations emit gases)
- User interventions (slider adjustments, disaster triggers)

**Seasonal Cycles**:
- Annual temperature and rainfall modulation
- Organisms adapt through migration, hibernation, seasonal reproduction, energy storage

### 4.5 Disease System

**Disease Properties** (per disease):
- Transmission rate
- Incubation period
- Mortality rate
- Mutation rate
- Host species range

**Disease Dynamics**:
- Disease introduced into unexposed population can cause mass mortality
- Survivors carry genetic resistance; resistance prevalence increases through selection
- Diseases mutate: can jump to new host species or change virulence
- Disease that kills host too quickly fails to spread; mild chronic illness may persist as endemic

**Individual Susceptibility**:
- Genetic resistance trait modulates individual disease susceptibility

### 4.6 Data Recording

- System continuously records population counts, species diversity, climate variables, extinction events, and speciation events
- Historical data powers all charts in Data Visualization Panel
- Full simulation state autosaved every 60 seconds to local storage

### 4.7 Audio System

- Ambient audio layers mixed dynamically based on viewport center biome and weather state
- Audio types: forest wind, rain, river flow, birdsong, wolf calls, insect hum, thunder, fire crackle
- Audio defaults to off on first load

### 4.8 New Game Functionality

- New Game button clears current autosave slot
- System generates random numeric seed
- Fresh world created with procedural generation using new seed
- All simulation state reset: population counts, climate variables, historical data, evolutionary trees
- User begins with clean slate in newly generated world

### 4.9 Organism Placement Accuracy

- When user enters place mode and clicks main canvas, organism placed at exact clicked coordinates
- Coordinate conversion between screen space and world space ensures accurate placement
- Placement respects current zoom level and viewport position

### 4.10 Minimap Interaction Isolation

- Minimap click events do not propagate to main canvas
- Clicking minimap repositions main viewport without triggering canvas interactions
- Minimap interactions isolated from main map event handlers

---

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| User inputs invalid seed (non-numeric) | Display error message; prevent world generation until valid seed provided |
| All organisms of a species die | Log extinction event; remove species from active lists; mark as extinct in evolutionary tree |
| User triggers multiple disasters in rapid succession | Cooldown timer prevents stacking; display remaining cooldown time on button |
| Simulation speed exceeds rendering capacity | Automatically switch to density visualization mode; maintain simulation accuracy |
| Save slot full when autosaving | Overwrite existing autosave in designated slot |
| User attempts to introduce species in uninhabitable biome | Allow placement; organism survival determined by environmental fitness |
| Disease mutates to 100% mortality rate | Disease self-extinguishes when all infected hosts die before transmission |
| Climate parameters set to extreme values | System calculates consequences; may result in mass extinction or biome collapse |
| User closes browser during simulation | Autosave ensures minimal data loss (max 60 seconds); resume from last save on reload |
| Organism clicked while simulation paused | Inspector panel opens normally; displays static state |
| User clicks New Game during active simulation | Confirmation prompt appears; if confirmed, current simulation discarded and new world generated |
| Minimap clicked while main canvas in place mode | Viewport repositions; place mode remains active; no organism placed on main canvas |
| User places organism at invalid coordinates (outside world bounds) | Placement rejected; visual feedback indicates invalid location |

---

## 6. Acceptance Criteria

1. User opens application and selects \"New World Generation\" with a numeric seed
2. System generates procedural world with terrain, biomes, water systems, and initial species populations
3. User adjusts rainfall slider in Environmental Control Panel
4. System updates climate state; biomes and organism behavior respond to new rainfall levels over subsequent simulation ticks
5. User increases simulation speed to 100× and observes population changes in Data Visualization Panel
6. System displays population history chart showing species rise and fall over simulated millennia
7. User clicks an organism on canvas
8. System opens Organism Inspector Panel showing genetic traits, behavioral state, and family lineage
9. User triggers a meteor impact disaster
10. System executes impact event; affected organisms die; extinction events logged; evolutionary tree updates
11. User clicks New Game button in Top Control Bar
12. System clears autosave, generates fresh world with random seed, resets all simulation state
13. User enters place mode and clicks main canvas at specific coordinates
14. System places organism exactly at clicked location with accurate coordinate conversion
15. User clicks minimap to reposition viewport
16. System repositions main canvas view without triggering canvas interactions; minimap interaction isolated from main map
17. User observes minimap displaying live organism density heatmap with day/night indicator and compass rose
18. User saves simulation to named slot
19. System persists full simulation state; user can reload exact world state in future session

---

## 7. Out of Scope for This Release

- Emergent tool-using civilizations arising from high-intelligence species
- Asynchronous multiplayer observation with shared world seeds
- Achievement system or external platform integration
- Mod system for custom species defined in external files
- Replay functionality to review past simulation states
- Export of simulation data to external formats (CSV, JSON)
- Mobile device optimization or touch-specific controls
- Localization or multi-language support
- Tutorial or guided onboarding experience
- Social sharing features (screenshots, world seeds, evolutionary trees)
- Performance profiling tools exposed to end users