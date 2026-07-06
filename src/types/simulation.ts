// Core simulation type definitions

export type BiomeType =
  | 'tropical_rainforest'
  | 'temperate_forest'
  | 'grassland'
  | 'desert'
  | 'tundra'
  | 'alpine'
  | 'wetland'
  | 'ocean'
  | 'coastal'
  | 'river'
  | 'lake';

export type OrganismType = 'plant' | 'herbivore' | 'carnivore' | 'omnivore' | 'insect';

export type BehaviorState =
  | 'idle'
  | 'feeding'
  | 'hunting'
  | 'fleeing'
  | 'reproducing'
  | 'migrating'
  | 'sleeping'
  | 'drinking'
  | 'dying';

export interface GeneticProfile {
  speed: number;           // 0-1
  sensorRange: number;     // 0-1
  bodyMass: number;        // 0-1
  reproThreshold: number;  // 0-1
  gestationPeriod: number; // 0-1
  litterSize: number;      // 0-1
  lifespanCeiling: number; // 0-1
  metabolicRate: number;   // 0-1
  thermalMin: number;      // -1 to 1 (cold to hot tolerance)
  thermalMax: number;      // -1 to 1
  diseaseResistance: number; // 0-1
  aggression: number;      // 0-1
  socialAffinity: number;  // 0-1
  intelligence: number;    // 0-1
  camouflage: number;      // 0-1
  dietaryBreadth: number;  // 0-1
}

export interface Organism {
  id: string;
  speciesId: string;
  parentIds: [string?, string?];
  x: number;
  y: number;
  age: number;         // simulated ticks
  energy: number;      // 0-1
  health: number;      // 0-1
  genes: GeneticProfile;
  state: BehaviorState;
  stateDetail: string;
  alive: boolean;
  birthTick: number;
  reproductionCooldown: number;
  targetId: string | null;
  diseaseStatus: Record<string, DiseaseStatus>;
  migrationTarget: { x: number; y: number } | null;
}

export interface DiseaseStatus {
  diseaseId: string;
  stage: 'susceptible' | 'exposed' | 'infected' | 'recovered';
  timer: number;
}

export interface Species {
  id: string;
  name: string;
  ancestorId: string | null;
  type: OrganismType;
  color: string;
  avgGenes: GeneticProfile;
  population: number;
  extinct: boolean;
  extinctTick: number | null;
  extinctCause: string | null;
  speciationTick: number;
  biomePreferences: BiomeType[];
  taxonomicGroup: string;
  childSpeciesIds: string[];
}

export interface SpeciationEvent {
  tick: number;
  parentSpeciesId: string;
  newSpeciesId: string;
  cause: string;
  location: { x: number; y: number };
}

export interface ExtinctionEvent {
  tick: number;
  speciesId: string;
  speciesName: string;
  cause: string;
  finalPopulation: number;
}

export interface Disease {
  id: string;
  name: string;
  transmissionRate: number; // 0-1
  incubationPeriod: number; // ticks
  mortalityRate: number;    // 0-1
  mutationRate: number;     // 0-1
  hostSpeciesIds: string[];
  active: boolean;
}

export interface ClimateState {
  temperature: number;      // -50 to 50 degrees C global avg
  co2: number;              // 280-1000 ppm
  oceanHeat: number;        // 0-1
  iceCoverage: number;      // 0-1
  rainfall: number;         // 0-2 (multiplier)
  solarOutput: number;      // 0.8-1.2
  soilFertility: number;    // 0-1
  oceanSalinity: number;    // 0.5-1.5
  windPatterns: number;     // 0-1 intensity
  humidity: number;         // 0-1
  seasonalVariation: number; // 0-1 amplitude
  tectonicActivity: number; // 0-1 frequency
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  seasonProgress: number;   // 0-1
  yearOfCycle: number;
}

export interface WorldCell {
  elevation: number;   // 0-1
  moisture: number;    // 0-1
  temperature: number; // 0-1
  fertility: number;   // 0-1
  biome: BiomeType;
  isWater: boolean;
  isRiver: boolean;
  diseaseLevel: number; // 0-1
  populationDensity: number; // computed
}

export interface WorldMap {
  width: number;
  height: number;
  cells: Float32Array; // packed: elevation, moisture, temperature, fertility per cell
  biomes: Uint8Array;
  rivers: Uint8Array;  // bitmask
  seed: number;
}

export interface SimulationState {
  tick: number;
  simulatedYear: number;
  simulatedEra: string;
  running: boolean;
  speed: SimSpeed;
  organisms: Map<string, Organism>;
  species: Map<string, Species>;
  diseases: Map<string, Disease>;
  climate: ClimateState;
  world: WorldMap;
  extinctions: ExtinctionEvent[];
  speciations: SpeciationEvent[];
  totalBorn: number;
  totalDied: number;
}

export type SimSpeed = 'pause' | '1x' | '5x' | '20x' | '100x' | 'geo';

export const SIM_SPEED_MULTIPLIERS: Record<SimSpeed, number> = {
  pause: 0,
  '1x': 1,
  '5x': 5,
  '20x': 20,
  '100x': 100,
  geo: 1000,
};

export interface HistoryRecord {
  tick: number;
  year: number;
  populationBySpecies: Record<string, number>;
  totalPop: number;
  speciesCount: number;
  temperature: number;
  rainfall: number;
  co2: number;
  biodiversityIndex: number;
}

export interface DataLayerType {
  id: 'terrain' | 'biome' | 'population' | 'temperature' | 'rainfall' | 'fertility' | 'disease';
  label: string;
}

export const DATA_LAYERS: DataLayerType[] = [
  { id: 'terrain', label: 'Terrain' },
  { id: 'biome', label: 'Biome' },
  { id: 'population', label: 'Population' },
  { id: 'temperature', label: 'Temp' },
  { id: 'rainfall', label: 'Rain' },
  { id: 'fertility', label: 'Fertility' },
  { id: 'disease', label: 'Disease' },
];

export const BIOME_COLORS: Record<BiomeType, string> = {
  tropical_rainforest: '#1a6b2f',
  temperate_forest: '#2d6b3a',
  grassland: '#7a8c2a',
  desert: '#c4933a',
  tundra: '#8fa8b0',
  alpine: '#9eb4c0',
  wetland: '#3a7a6b',
  ocean: '#0a2a5c',
  coastal: '#1a3d6b',
  river: '#1a4a8c',
  lake: '#1a4070',
};

export const ORGANISM_COLORS: Record<OrganismType, string> = {
  plant: '#2ecc71',
  herbivore: '#f0a500',
  carnivore: '#e74c3c',
  omnivore: '#9b59b6',
  insect: '#1abc9c',
};

export interface DisasterType {
  id: string;
  name: string;
  icon: string;
  description: string;
  cooldown: number; // ticks
  effect: string;
}

export const DISASTERS: DisasterType[] = [
  {
    id: 'volcano',
    name: 'Volcanic Eruption',
    icon: '🌋',
    description: 'Ash clouds reduce solar output for decades. Nearby organisms perish.',
    cooldown: 500,
    effect: 'Kills organisms in radius, reduces solar output, raises CO₂',
  },
  {
    id: 'meteor',
    name: 'Meteor Impact',
    icon: '☄️',
    description: 'Catastrophic impact causing mass extinction and global winter.',
    cooldown: 2000,
    effect: 'Massive kill radius, global temperature drop, triggers fires',
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    icon: '🔥',
    description: 'Rapidly consumes vegetation, displaces animal populations.',
    cooldown: 200,
    effect: 'Burns flora in wide area, animals flee or perish',
  },
  {
    id: 'flood',
    name: 'Mega Flood',
    icon: '🌊',
    description: 'Floods low-elevation zones, drowns ground-dwelling organisms.',
    cooldown: 300,
    effect: 'Drowns organisms in coastal/low zones',
  },
  {
    id: 'epidemic',
    name: 'Epidemic',
    icon: '🦠',
    description: 'Introduces a novel pathogen with no host immunity.',
    cooldown: 400,
    effect: 'High mortality for unresistant organisms',
  },
  {
    id: 'glaciation',
    name: 'Glaciation',
    icon: '❄️',
    description: 'Rapid cooling expands ice caps, contracts tropical zones.',
    cooldown: 800,
    effect: 'Temperature drop, ice expansion, habitat loss',
  },
  {
    id: 'earthquake',
    name: 'Earthquake',
    icon: '🏔',
    description: 'Seismic event reshapes terrain, triggers landslides.',
    cooldown: 600,
    effect: 'Terrain deformation, organism displacement',
  },
  {
    id: 'tsunami',
    name: 'Tsunami',
    icon: '🌊',
    description: 'Giant wave devastates coastlines and wetlands.',
    cooldown: 700,
    effect: 'Coastal devastation, marine ecosystem disruption',
  },
  {
    id: 'drought',
    name: 'Drought Wave',
    icon: '🏜',
    description: 'Extended dry period causes widespread dehydration.',
    cooldown: 350,
    effect: 'Water source depletion, plant mortality spike',
  },
  {
    id: 'solarflare',
    name: 'Solar Flare',
    icon: '☀️',
    description: 'Intense radiation burst damages organisms and climate.',
    cooldown: 900,
    effect: 'Radiation damage, temporary temperature spike',
  },
  {
    id: 'poleflip',
    name: 'Pole Reversal',
    icon: '🧭',
    description: 'Magnetic field reversal confuses migratory species.',
    cooldown: 1500,
    effect: 'Migration disruption, navigation chaos',
  },
  {
    id: 'superstorm',
    name: 'Superstorm',
    icon: '🌪',
    description: 'Hyper-intense cyclone with continental reach.',
    cooldown: 450,
    effect: 'Massive wind damage, flooding, ecosystem collapse',
  },
];

export const SPECIES_CATALOG = [
  // Plants
  { id: 'grass',      name: 'Grass',          type: 'plant'     as OrganismType, icon: '🌿', biomes: ['grassland', 'temperate_forest'] },
  { id: 'fern',       name: 'Fern',           type: 'plant'     as OrganismType, icon: '🌿', biomes: ['tropical_rainforest', 'wetland'] },
  { id: 'tree_oak',   name: 'Oak Tree',       type: 'plant'     as OrganismType, icon: '🌳', biomes: ['temperate_forest', 'grassland'] },
  { id: 'tree_pine',  name: 'Pine Tree',      type: 'plant'     as OrganismType, icon: '🌲', biomes: ['alpine', 'tundra'] },
  { id: 'cactus',     name: 'Cactus',         type: 'plant'     as OrganismType, icon: '🌵', biomes: ['desert'] },
  { id: 'moss',       name: 'Tundra Moss',    type: 'plant'     as OrganismType, icon: '🌱', biomes: ['tundra', 'alpine'] },
  { id: 'bamboo',     name: 'Bamboo',         type: 'plant'     as OrganismType, icon: '🎋', biomes: ['tropical_rainforest', 'wetland'] },
  { id: 'seaweed',    name: 'Seaweed',        type: 'plant'     as OrganismType, icon: '🌊', biomes: ['coastal', 'ocean'] },
  { id: 'lily',       name: 'Water Lily',     type: 'plant'     as OrganismType, icon: '🌸', biomes: ['wetland', 'lake'] },
  { id: 'mangrove',   name: 'Mangrove',       type: 'plant'     as OrganismType, icon: '🌴', biomes: ['coastal', 'wetland'] },
  // Herbivores
  { id: 'rabbit',     name: 'Rabbit',         type: 'herbivore' as OrganismType, icon: '🐇', biomes: ['grassland', 'temperate_forest'] },
  { id: 'deer',       name: 'Deer',           type: 'herbivore' as OrganismType, icon: '🦌', biomes: ['temperate_forest', 'grassland'] },
  { id: 'mammoth',    name: 'Mammoth',        type: 'herbivore' as OrganismType, icon: '🦣', biomes: ['tundra', 'grassland'] },
  { id: 'elephant',   name: 'Elephant',       type: 'herbivore' as OrganismType, icon: '🐘', biomes: ['grassland', 'tropical_rainforest'] },
  { id: 'zebra',      name: 'Zebra',          type: 'herbivore' as OrganismType, icon: '🦓', biomes: ['grassland'] },
  { id: 'bison',      name: 'Bison',          type: 'herbivore' as OrganismType, icon: '🦬', biomes: ['grassland', 'temperate_forest'] },
  { id: 'horse',      name: 'Horse',          type: 'herbivore' as OrganismType, icon: '🐎', biomes: ['grassland'] },
  { id: 'turtle',     name: 'Sea Turtle',     type: 'herbivore' as OrganismType, icon: '🐢', biomes: ['coastal', 'ocean'] },
  { id: 'sheep',      name: 'Sheep',          type: 'herbivore' as OrganismType, icon: '🐑', biomes: ['grassland', 'alpine'] },
  { id: 'giraffe',    name: 'Giraffe',        type: 'herbivore' as OrganismType, icon: '🦒', biomes: ['grassland', 'tropical_rainforest'] },
  // Carnivores
  { id: 'wolf',       name: 'Wolf',           type: 'carnivore' as OrganismType, icon: '🐺', biomes: ['temperate_forest', 'tundra'] },
  { id: 'hawk',       name: 'Hawk',           type: 'carnivore' as OrganismType, icon: '🦅', biomes: ['grassland', 'temperate_forest'] },
  { id: 'lion',       name: 'Lion',           type: 'carnivore' as OrganismType, icon: '🦁', biomes: ['grassland'] },
  { id: 'tiger',      name: 'Tiger',          type: 'carnivore' as OrganismType, icon: '🐯', biomes: ['tropical_rainforest', 'temperate_forest'] },
  { id: 'crocodile',  name: 'Crocodile',      type: 'carnivore' as OrganismType, icon: '🐊', biomes: ['wetland', 'river'] },
  { id: 'shark',      name: 'Shark',          type: 'carnivore' as OrganismType, icon: '🦈', biomes: ['ocean', 'coastal'] },
  { id: 'fox',        name: 'Fox',            type: 'carnivore' as OrganismType, icon: '🦊', biomes: ['temperate_forest', 'grassland'] },
  { id: 'snake',      name: 'Viper',          type: 'carnivore' as OrganismType, icon: '🐍', biomes: ['desert', 'grassland'] },
  { id: 'owl',        name: 'Owl',            type: 'carnivore' as OrganismType, icon: '🦉', biomes: ['temperate_forest', 'alpine'] },
  // Omnivores
  { id: 'bear',       name: 'Bear',           type: 'omnivore'  as OrganismType, icon: '🐻', biomes: ['temperate_forest', 'alpine'] },
  { id: 'boar',       name: 'Wild Boar',      type: 'omnivore'  as OrganismType, icon: '🐗', biomes: ['temperate_forest', 'grassland'] },
  { id: 'raccoon',    name: 'Raccoon',        type: 'omnivore'  as OrganismType, icon: '🦝', biomes: ['temperate_forest', 'wetland'] },
  { id: 'crow',       name: 'Crow',           type: 'omnivore'  as OrganismType, icon: '🐦', biomes: ['grassland', 'temperate_forest'] },
  { id: 'crab',       name: 'Crab',           type: 'omnivore'  as OrganismType, icon: '🦀', biomes: ['coastal', 'wetland'] },
  // Insects
  { id: 'insect_swarm', name: 'Locust Swarm', type: 'insect'    as OrganismType, icon: '🐛', biomes: ['tropical_rainforest', 'grassland'] },
  { id: 'butterfly',  name: 'Butterfly',      type: 'insect'    as OrganismType, icon: '🦋', biomes: ['grassland', 'tropical_rainforest'] },
  { id: 'beetle',     name: 'Beetle',         type: 'insect'    as OrganismType, icon: '🪲', biomes: ['temperate_forest', 'wetland'] },
  { id: 'ant',        name: 'Ant Colony',     type: 'insect'    as OrganismType, icon: '🐜', biomes: ['grassland', 'tropical_rainforest'] },
  { id: 'firefly',    name: 'Firefly',        type: 'insect'    as OrganismType, icon: '🪲', biomes: ['wetland', 'temperate_forest'] },
  // Additional plants
  { id: 'orchid',     name: 'Orchid',         type: 'plant'     as OrganismType, icon: '🌺', biomes: ['tropical_rainforest', 'wetland'] },
  { id: 'algae_bloom', name: 'Algae Bloom',   type: 'plant'     as OrganismType, icon: '🟢', biomes: ['lake', 'river', 'coastal'] },
  { id: 'juniper',    name: 'Juniper',        type: 'plant'     as OrganismType, icon: '🌲', biomes: ['alpine', 'desert'] },
  // Additional herbivores
  { id: 'koala',      name: 'Koala',          type: 'herbivore' as OrganismType, icon: '🐨', biomes: ['temperate_forest', 'tropical_rainforest'] },
  { id: 'hippo',      name: 'Hippo',          type: 'herbivore' as OrganismType, icon: '🦛', biomes: ['river', 'wetland', 'lake'] },
  { id: 'panda',      name: 'Panda',          type: 'herbivore' as OrganismType, icon: '🐼', biomes: ['temperate_forest'] },
  // Additional carnivores
  { id: 'leopard',    name: 'Leopard',        type: 'carnivore' as OrganismType, icon: '🐆', biomes: ['tropical_rainforest', 'grassland'] },
  { id: 'orca',       name: 'Orca',           type: 'carnivore' as OrganismType, icon: '🐋', biomes: ['ocean', 'coastal'] },
  { id: 'eagle',      name: 'Eagle',          type: 'carnivore' as OrganismType, icon: '🦅', biomes: ['alpine', 'temperate_forest', 'grassland'] },
  { id: 'octopus',    name: 'Octopus',        type: 'carnivore' as OrganismType, icon: '🐙', biomes: ['ocean', 'coastal'] },
  // Additional omnivores
  { id: 'chimp',      name: 'Chimpanzee',     type: 'omnivore'  as OrganismType, icon: '🐵', biomes: ['tropical_rainforest', 'temperate_forest'] },
  { id: 'rat',        name: 'Rat',            type: 'omnivore'  as OrganismType, icon: '🐀', biomes: ['grassland', 'wetland', 'temperate_forest'] },
  // Additional insects
  { id: 'wasp',       name: 'Wasp',           type: 'insect'    as OrganismType, icon: '🐝', biomes: ['temperate_forest', 'grassland'] },
  { id: 'dragonfly',  name: 'Dragonfly',      type: 'insect'    as OrganismType, icon: '🦟', biomes: ['wetland', 'river', 'lake'] },
  { id: 'spider',     name: 'Spider',         type: 'insect'    as OrganismType, icon: '🕷', biomes: ['temperate_forest', 'grassland', 'tropical_rainforest'] },
  // Deep ocean
  { id: 'whale',      name: 'Blue Whale',     type: 'herbivore' as OrganismType, icon: '🐋', biomes: ['ocean'] },
  { id: 'dolphin',    name: 'Dolphin',        type: 'omnivore'  as OrganismType, icon: '🐬', biomes: ['ocean', 'coastal'] },
  { id: 'jellyfish',  name: 'Jellyfish',      type: 'carnivore' as OrganismType, icon: '🪼', biomes: ['ocean', 'coastal'] },
  { id: 'clam',       name: 'Giant Clam',     type: 'herbivore' as OrganismType, icon: '🐚', biomes: ['coastal', 'ocean'] },
  { id: 'coral',      name: 'Coral Reef',     type: 'plant'     as OrganismType, icon: '🪸', biomes: ['coastal', 'ocean'] },
  // Prehistoric
  { id: 'dino_raptor',name: 'Velociraptor',   type: 'carnivore' as OrganismType, icon: '🦖', biomes: ['tropical_rainforest', 'grassland'] },
  { id: 'dino_trex',  name: 'T-Rex',          type: 'carnivore' as OrganismType, icon: '🦕', biomes: ['tropical_rainforest', 'temperate_forest'] },
  { id: 'pterodactyl',name: 'Pterodactyl',    type: 'carnivore' as OrganismType, icon: '🦅', biomes: ['alpine', 'coastal', 'grassland'] },
  { id: 'mammothwool',name: 'Woolly Mammoth', type: 'herbivore' as OrganismType, icon: '🦣', biomes: ['tundra', 'alpine'] },
  // Fungi & Microbes
  { id: 'mushroom',   name: 'Mushroom Patch', type: 'plant'     as OrganismType, icon: '🍄', biomes: ['temperate_forest', 'wetland', 'tropical_rainforest'] },
  { id: 'lichen',     name: 'Lichen',         type: 'plant'     as OrganismType, icon: '🌱', biomes: ['tundra', 'alpine', 'desert'] },
  // Birds
  { id: 'flamingo',   name: 'Flamingo',       type: 'omnivore'  as OrganismType, icon: '🦩', biomes: ['wetland', 'coastal', 'lake'] },
  { id: 'penguin',    name: 'Penguin',        type: 'carnivore' as OrganismType, icon: '🐧', biomes: ['tundra', 'coastal'] },
  { id: 'toucan',     name: 'Toucan',         type: 'omnivore'  as OrganismType, icon: '🦜', biomes: ['tropical_rainforest'] },
  { id: 'albatross',  name: 'Albatross',      type: 'carnivore' as OrganismType, icon: '🐦', biomes: ['ocean', 'coastal'] },
  // Reptiles & Amphibians
  { id: 'frog',       name: 'Tree Frog',      type: 'insect'    as OrganismType, icon: '🐸', biomes: ['wetland', 'tropical_rainforest', 'river'] },
  { id: 'iguana',     name: 'Iguana',         type: 'herbivore' as OrganismType, icon: '🦎', biomes: ['tropical_rainforest', 'desert', 'coastal'] },
  { id: 'monitor',    name: 'Monitor Lizard', type: 'carnivore' as OrganismType, icon: '🐊', biomes: ['tropical_rainforest', 'desert'] },
  // Primates & Mammals
  { id: 'gorilla',    name: 'Gorilla',        type: 'herbivore' as OrganismType, icon: '🦍', biomes: ['tropical_rainforest'] },
  { id: 'lemur',      name: 'Lemur',          type: 'omnivore'  as OrganismType, icon: '🐒', biomes: ['tropical_rainforest'] },
  { id: 'bat',        name: 'Fruit Bat',      type: 'omnivore'  as OrganismType, icon: '🦇', biomes: ['tropical_rainforest', 'temperate_forest', 'alpine'] },
  { id: 'mole',       name: 'Mole',           type: 'omnivore'  as OrganismType, icon: '🐀', biomes: ['grassland', 'temperate_forest'] },
  // Arctic / Polar
  { id: 'polar_bear', name: 'Polar Bear',     type: 'carnivore' as OrganismType, icon: '🐻‍❄️', biomes: ['tundra'] },
  { id: 'arctic_fox', name: 'Arctic Fox',     type: 'omnivore'  as OrganismType, icon: '🦊', biomes: ['tundra', 'alpine'] },
  { id: 'reindeer',   name: 'Reindeer',       type: 'herbivore' as OrganismType, icon: '🦌', biomes: ['tundra', 'alpine'] },
  // Savanna
  { id: 'cheetah',    name: 'Cheetah',        type: 'carnivore' as OrganismType, icon: '🐆', biomes: ['grassland'] },
  { id: 'hyena',      name: 'Hyena',          type: 'omnivore'  as OrganismType, icon: '🐕', biomes: ['grassland', 'desert'] },
  { id: 'meerkat',    name: 'Meerkat',        type: 'omnivore'  as OrganismType, icon: '🐹', biomes: ['desert', 'grassland'] },
  { id: 'vulture',    name: 'Vulture',        type: 'carnivore' as OrganismType, icon: '🦅', biomes: ['desert', 'grassland'] },
  // Insects expanded
  { id: 'termite',    name: 'Termite Colony', type: 'insect'    as OrganismType, icon: '🐜', biomes: ['tropical_rainforest', 'grassland', 'desert'] },
  { id: 'scorpion',   name: 'Scorpion',       type: 'insect'    as OrganismType, icon: '🦂', biomes: ['desert'] },
  { id: 'mantis',     name: 'Praying Mantis', type: 'insect'    as OrganismType, icon: '🦗', biomes: ['tropical_rainforest', 'grassland'] },
];
