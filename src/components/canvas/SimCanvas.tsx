// Main simulation canvas — rich terrain, glowing organisms, star field, biome shading
import { useEffect, useRef, useCallback, useState } from 'react';
import * as PIXI from 'pixi.js';
import { useUIStore } from '@/store/UIStore';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { AudioSystem } from '@/lib/AudioSystem';
import type { BiomeType } from '@/types/simulation';
import { EventBus } from '@/lib/EventBus';

const BIOME_NAMES: BiomeType[] = [
  'ocean', 'coastal', 'wetland', 'tropical_rainforest', 'temperate_forest',
  'grassland', 'desert', 'tundra', 'alpine', 'river', 'lake',
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Day phase derived purely from SimulationEngine.dayTime (no Zustand hot path)
function getDayPhase(t: number): 'night' | 'dawn' | 'day' | 'dusk' {
  if (t < 0.21 || t >= 0.85) return 'night';
  if (t < 0.30) return 'dawn';
  if (t < 0.72) return 'day';
  return 'dusk';
}

// Day/night tint: returns [rMul, gMul, bMul, overlayAlpha, overlayR, overlayG, overlayB]
function getDayTint(phase: string): [number, number, number] {
  switch (phase) {
    case 'night': return [0.40, 0.42, 0.65];
    case 'dawn':  return [1.10, 0.82, 0.68];
    case 'dusk':  return [1.08, 0.70, 0.58];
    default:      return [1.00, 1.00, 1.00];
  }
}

// Simple dot sizes per organism type — slightly larger for visibility
const DOT_RADIUS: Record<string, number> = {
  plant: 1.8, insect: 1.4, herbivore: 2.5, carnivore: 3.0, omnivore: 2.2,
};

// Glow color per state — kept for future use

// Frame counter module-level (not in React state)
let _frame = 0;
let _statFrame = 0;
let _lastYpsYear = 0;
let _lastYpsTime = performance.now();

export function SimCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef       = useRef<PIXI.Application | null>(null);
  const terrainRef   = useRef<PIXI.Container | null>(null);
  const orgsRef      = useRef<PIXI.Container | null>(null);
  const dotsGfxRef   = useRef<PIXI.Graphics | null>(null);
  const tintRef      = useRef<PIXI.Graphics | null>(null);
  // Stars layer (drawn once, shown at night)
  const starsRef     = useRef<PIXI.Graphics | null>(null);
  // Grid overlay
  const gridRef      = useRef<PIXI.Graphics | null>(null);
  // Disaster VFX layer (above everything)
  const vfxRef       = useRef<PIXI.Container | null>(null);
  const isDragging   = useRef(false);
  const lastMouse    = useRef({ x: 0, y: 0 });
  const lastPhase    = useRef<string>('day');
  const fpsRef       = useRef<{ times: number[]; last: number }>({ times: [], last: performance.now() });

  const {
    setViewport, setSelectedOrganism, setInspectorPanel,
    setSimTime, setSimStats, setDayTime, audioEnabled,
    placingSpeciesId, setPlacingSpeciesId, setYps, settings,
  } = useUIStore();

  // ── Init PixiJS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;
    const el  = containerRef.current;
    const app = new PIXI.Application();
    appRef.current = app;

    const getSize = () => ({ w: el.clientWidth || el.offsetWidth, h: el.clientHeight || el.offsetHeight });

    const { w, h } = getSize();
    app.init({
      width:  w || 800,
      height: h || 600,
      backgroundColor: 0x080a12,
      antialias: false,
      resolution: 1,
      preference: 'webgl',
    }).then(() => {
      if (!containerRef.current) return;
      // Make the Pixi canvas fill its container fully
      const c = app.canvas as HTMLCanvasElement;
      c.style.width  = '100%';
      c.style.height = '100%';
      c.style.display = 'block';
      containerRef.current.appendChild(c);

      // Force correct size after DOM layout settles
      requestAnimationFrame(() => {
        const { w: fw, h: fh } = getSize();
        if (appRef.current?.renderer && fw > 0 && fh > 0) {
          appRef.current.renderer.resize(fw, fh);
        }
      });

      const terrain = new PIXI.Container();
      const tintGfx = new PIXI.Graphics();
      const stars   = new PIXI.Graphics();
      const grid    = new PIXI.Graphics();
      const orgs    = new PIXI.Container();
      const dots    = new PIXI.Graphics();
      const vfx     = new PIXI.Container();

      terrainRef.current = terrain;
      tintRef.current    = tintGfx;
      starsRef.current   = stars;
      gridRef.current    = grid;
      orgsRef.current    = orgs;
      dotsGfxRef.current = dots;
      vfxRef.current     = vfx;

      // Layer order: terrain → tint → stars → grid → organisms → vfx
      app.stage.addChild(terrain);
      app.stage.addChild(tintGfx);
      app.stage.addChild(stars);
      app.stage.addChild(grid);
      app.stage.addChild(orgs);
      app.stage.addChild(vfx);
      orgs.addChild(dots);

      const unsubWorld = EventBus.on('sim:world-generated', () => { drawTerrain(); drawStars(); });
      const unsubDisaster = EventBus.on('disaster:triggered', ({ type, x, y }) => { spawnDisasterVfx(type, x, y); });

      try {
        if (SimulationEngine.state.world.cells.length > 0) { drawTerrain(); drawStars(); }
      } catch (e) {
        console.error('[SimCanvas] drawTerrain failed on init:', e);
      }

      app.ticker.add(renderLoop);
      return () => { unsubWorld(); unsubDisaster(); };
    }).catch(err => {
      console.error('[SimCanvas] PixiJS init failed:', err);
      appRef.current = null;
    });

    const ro = new ResizeObserver(() => {
      const { w: nw, h: nh } = getSize();
      if (appRef.current?.renderer && nw > 0 && nh > 0) {
        appRef.current.renderer.resize(nw, nh);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  // ── Draw terrain (once on world generation) ───────────────────────────
  const drawTerrain = useCallback(() => {
    const terrain = terrainRef.current;
    const app     = appRef.current;
    if (!terrain || !app) return;
    terrain.removeChildren();

    const { world } = SimulationEngine.state;
    if (!world?.cells?.length) return;

    const { width: ww, height: wh } = world;
    const canvas2d = document.createElement('canvas');
    canvas2d.width = ww; canvas2d.height = wh;
    const ctx = canvas2d.getContext('2d')!;
    const img = ctx.createImageData(ww, wh);
    const d   = img.data;

    // Per-spec vivid biome base colors [R,G,B]
    const BIOME_RGB: Record<string, [number, number, number]> = {
      ocean:               [14,  55, 92],   // dark navy  #1a3d5c
      coastal:             [52, 130, 168],  // light cyan-blue #4a9ab5 → lighter shore
      wetland:             [35,  95,  70],  // dark teal-green
      tropical_rainforest: [26, 107,  58],  // deep emerald #1a6b3a
      temperate_forest:    [74, 122,  46],  // medium olive #4a7a2e
      grassland:           [138, 171, 60],  // warm yellow-green #8aab3c
      desert:              [196, 147,  58], // sandy amber #c4933a
      tundra:              [138, 154, 170], // pale blue-gray #8a9aaa
      alpine:              [200, 205, 208], // cold gray-white #c8cdd0
      river:               [45, 106, 143],  // #2d6a8f
      lake:                [52, 130, 168],  // same as coastal (shallow)
    };

    // Fast xorshift noise for per-pixel texture variation
    const noiseVal = (i: number, seed: number): number => {
      let z = (i * 1664525 + seed) >>> 0;
      z ^= z << 13; z ^= z >>> 17; z ^= z << 5;
      return ((z >>> 0) & 0xffff) / 0xffff;
    };

    const STRIDE = 4;
    for (let i = 0, len = ww * wh; i < len; i++) {
      const b4    = i * STRIDE;
      const bName = BIOME_NAMES[world.biomes?.[i] ?? 0] ?? 'grassland';
      const base  = BIOME_RGB[bName] ?? [80, 80, 80];
      const elev  = world.cells?.[b4]     ?? 0.5;
      const moist = world.cells?.[b4 + 1] ?? 0.5;
      const temp  = world.cells?.[b4 + 2] ?? 0.5;

      // Elevation shading — land darker in valleys, brighter on ridges
      let shade = 0.55 + elev * 0.65;

      // Organic noise texture overlay — subtle variation per biome
      const n1 = noiseVal(i, 0x1234);
      const n2 = noiseVal(i, 0xABCD);
      let tr = base[0], tg = base[1], tb = base[2];

      switch (bName) {
        case 'tropical_rainforest': {
          // Dense canopy: dark + light patches, moisture variation
          const canopy = 0.82 + n1 * 0.28 + moist * 0.12;
          tr = Math.min(255, tr * shade * canopy);
          tg = Math.min(255, tg * shade * canopy * 1.05);
          tb = Math.min(255, tb * shade * canopy * 0.85);
          break;
        }
        case 'temperate_forest': {
          // Mottled green with yellower autumn tone at low moisture
          const autumn = 1 - moist * 0.3;
          const patch  = 0.85 + n1 * 0.25;
          tr = Math.min(255, tr * shade * patch * (1 + autumn * 0.12));
          tg = Math.min(255, tg * shade * patch);
          tb = Math.min(255, tb * shade * patch * 0.75);
          break;
        }
        case 'grassland': {
          // Open savanna: lighter patches, slight yellow-green variation
          const open = 0.82 + n1 * 0.32;
          tr = Math.min(255, tr * shade * open * (1 + n2 * 0.1));
          tg = Math.min(255, tg * shade * open * (1 + n2 * 0.08));
          tb = Math.min(255, tb * shade * open * 0.6);
          break;
        }
        case 'desert': {
          // Dune texture: bright ridges, shadowed troughs
          const dune = 0.78 + n1 * 0.35 + elev * 0.1;
          tr = Math.min(255, tr * shade * dune);
          tg = Math.min(255, tg * shade * dune * 0.88);
          tb = Math.min(255, tb * shade * dune * 0.58);
          break;
        }
        case 'ocean': {
          // Deep gradient: darker further from shore (low elev = deep)
          const depth = 1 - elev;
          const wave  = 0.88 + n1 * 0.08;
          tr = Math.min(255, tr * (0.6 + depth * 0.25) * wave);
          tg = Math.min(255, tg * (0.65 + depth * 0.2) * wave);
          tb = Math.min(255, tb * (0.85 + depth * 0.2) * wave);
          break;
        }
        case 'coastal': {
          // Shimmer — alternating lighter strips
          const shimmer = 0.88 + (i % 3 === 0 ? 0.15 : 0) + n1 * 0.1;
          tr = Math.min(255, tr * shade * shimmer * 0.9);
          tg = Math.min(255, tg * shade * shimmer);
          tb = Math.min(255, tb * shade * shimmer * 1.08);
          break;
        }
        case 'tundra': {
          // Pale, frosty, slight blue tint at high elev
          const frost = 0.8 + n1 * 0.25 + (1 - temp) * 0.12;
          tr = Math.min(255, tr * shade * frost * 0.92);
          tg = Math.min(255, tg * shade * frost * 0.95);
          tb = Math.min(255, tb * shade * frost * 1.04);
          break;
        }
        case 'alpine': {
          // Rocky patches: dark gray against gray-white snow
          const rocky = elev > 0.88 ? 1.1 + n1 * 0.2 : 0.7 + n1 * 0.35;
          tr = Math.min(255, tr * shade * rocky);
          tg = Math.min(255, tg * shade * rocky * 0.97);
          tb = Math.min(255, tb * shade * rocky * 0.98);
          break;
        }
        case 'wetland': {
          const wet = 0.80 + moist * 0.25 + n1 * 0.15;
          tr = Math.min(255, tr * shade * wet * 0.88);
          tg = Math.min(255, tg * shade * wet * 1.04);
          tb = Math.min(255, tb * shade * wet * 0.85);
          break;
        }
        case 'river': {
          tr = 30; tg = 95; tb = 165;
          break;
        }
        case 'lake': {
          tr = Math.min(255, tr * shade * (0.9 + n1 * 0.1));
          tg = Math.min(255, tg * shade * (0.9 + n1 * 0.1));
          tb = Math.min(255, tb * shade * (0.95 + n1 * 0.1));
          break;
        }
        default: {
          tr = Math.min(255, tr * shade);
          tg = Math.min(255, tg * shade);
          tb = Math.min(255, tb * shade);
        }
      }

      // Snow cap on very high alpine peaks
      if (elev > 0.92 && bName === 'alpine') {
        const snow = (elev - 0.92) / 0.08;
        tr = Math.min(255, tr + snow * (245 - tr));
        tg = Math.min(255, tg + snow * (248 - tg));
        tb = Math.min(255, tb + snow * (255 - tb));
      }

      d[b4]     = Math.round(tr);
      d[b4 + 1] = Math.round(tg);
      d[b4 + 2] = Math.round(tb);
      d[b4 + 3] = 255;
    }

    ctx.putImageData(img, 0, 0);
    const tex    = PIXI.Texture.from(canvas2d);
    const sprite = new PIXI.Sprite(tex);
    sprite.width = ww; sprite.height = wh;
    terrain.addChild(sprite);

    drawGrid(ww, wh);
  }, []);

  // ── Draw subtle grid lines over world ─────────────────────────────────
  const drawGrid = useCallback((ww: number, wh: number) => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.clear();
    const step = 32;
    grid.setStrokeStyle({ width: 0.3, color: 0xffffff, alpha: 0.04 });
    for (let x = 0; x <= ww; x += step) {
      grid.moveTo(x, 0).lineTo(x, wh);
    }
    for (let y = 0; y <= wh; y += step) {
      grid.moveTo(0, y).lineTo(ww, y);
    }
    grid.stroke();
  }, []);

  // ── Draw stars (shown at night) ────────────────────────────────────────
  const drawStars = useCallback(() => {
    const stars = starsRef.current;
    if (!stars) return;
    stars.clear();
    // 200 random stars scattered above the world (negative y to appear above terrain)
    const rng = (n: number) => (((n * 1664525 + 1013904223) >>> 0) / 0xffffffff);
    for (let i = 0; i < 300; i++) {
      const sx = rng(i * 3)     * 512 - 128;
      const sy = rng(i * 3 + 1) * 512 - 128;
      const sr = 0.4 + rng(i * 3 + 2) * 0.9;
      const sa = 0.3 + rng(i * 7) * 0.7;
      stars.circle(sx, sy, sr).fill({ color: 0xffffff, alpha: sa });
    }
  }, []);

  // ── Disaster VFX ───────────────────────────────────────────────────────
  interface VfxItem {
    gfx: PIXI.Graphics;
    type: string;
    x: number;
    y: number;
    born: number;
    duration: number;
    maxR: number;
  }
  const vfxItems = useRef<VfxItem[]>([]);

  const spawnDisasterVfx = useCallback((type: string, wx: number, wy: number) => {
    const vfx = vfxRef.current;
    if (!vfx) return;
    const now = performance.now();
    const gfx = new PIXI.Graphics();
    vfx.addChild(gfx);

    const item: VfxItem = { gfx, type, x: wx, y: wy, born: now, duration: 2500, maxR: 120 };

    if (type === 'meteor') {
      item.duration = 1800;
      item.maxR = 200;
      // Full-screen white flash
      gfx.rect(0, 0, 1, 1).fill({ color: 0xffffff, alpha: 1 });
    } else if (type === 'epidemic') {
      item.duration = 3000;
      item.maxR = 90;
    } else if (type === 'flood') {
      item.duration = 3500;
      item.maxR = 160;
    } else if (type === 'wildfire') {
      item.duration = 2800;
      item.maxR = 100;
    } else if (type === 'volcano') {
      item.duration = 3200;
      item.maxR = 140;
    } else {
      item.duration = 2400;
      item.maxR = 100;
    }

    vfxItems.current.push(item);
  }, []);

  const updateVfx = (dt: number, ox: number, oy: number, vz: number) => {
    const now = performance.now();
    const vfxContainer = vfxRef.current;
    if (!vfxContainer) return;

    for (let i = vfxItems.current.length - 1; i >= 0; i--) {
      const item = vfxItems.current[i];
      const age = now - item.born;
      const progress = Math.min(1, age / item.duration);
      const gfx = item.gfx;
      gfx.clear();

      const sx = ox + item.x * vz;
      const sy = oy + item.y * vz;

      if (item.type === 'meteor') {
        // White flash that fades to orange embers
        const flashAlpha = progress < 0.15 ? 1 - progress / 0.15 : 0;
        if (flashAlpha > 0) {
          gfx.rect(0, 0, appRef.current!.renderer.width, appRef.current!.renderer.height)
            .fill({ color: 0xffffff, alpha: flashAlpha * 0.55 });
        }
        // Expanding orange ring + radial streaks
        const ringR = progress * item.maxR * vz;
        const ringA = progress < 0.6 ? 0.7 - progress : 0;
        if (ringA > 0) {
          gfx.circle(sx, sy, ringR).stroke({ width: 3 * vz, color: 0xff8800, alpha: ringA });
          gfx.circle(sx, sy, ringR * 0.7).stroke({ width: 1.5 * vz, color: 0xff4400, alpha: ringA * 0.6 });
        }
        // Center impact glow
        const glowA = progress < 0.3 ? 1 - progress / 0.3 : 0;
        if (glowA > 0) {
          gfx.circle(sx, sy, 12 * vz).fill({ color: 0xffaa00, alpha: glowA * 0.6 });
        }
      } else if (item.type === 'epidemic') {
        // Expanding red ring with dotted secondary ring
        const ringR = progress * item.maxR * vz;
        const ringA = progress < 0.7 ? 0.6 - progress * 0.6 : 0;
        if (ringA > 0) {
          gfx.circle(sx, sy, ringR).stroke({ width: 2.5 * vz, color: 0xff3333, alpha: ringA });
          gfx.circle(sx, sy, ringR * 0.55).stroke({ width: 1.2 * vz, color: 0xff6666, alpha: ringA * 0.5 });
        }
        // Pulsing center
        const pulse = Math.sin(age * 0.02) * 0.5 + 0.5;
        gfx.circle(sx, sy, (6 + pulse * 4) * vz).fill({ color: 0xff2222, alpha: (1 - progress) * 0.4 });
      } else if (item.type === 'flood') {
        // Expanding blue wave rings
        const waveR = progress * item.maxR * vz;
        const waveA = progress < 0.75 ? 0.5 - progress * 0.5 : 0;
        if (waveA > 0) {
          gfx.circle(sx, sy, waveR).stroke({ width: 4 * vz, color: 0x3399ff, alpha: waveA });
          gfx.circle(sx, sy, waveR * 0.75).stroke({ width: 2 * vz, color: 0x66bbff, alpha: waveA * 0.6 });
          gfx.circle(sx, sy, waveR * 0.5).stroke({ width: 1 * vz, color: 0x88ccff, alpha: waveA * 0.4 });
        }
        // Ripple dots along ring
        const dots = 12;
        for (let d = 0; d < dots; d++) {
          const a = (d / dots) * Math.PI * 2 + progress * 3;
          const rx = sx + Math.cos(a) * waveR * 0.9;
          const ry = sy + Math.sin(a) * waveR * 0.9;
          gfx.circle(rx, ry, 1.5 * vz).fill({ color: 0xaaddff, alpha: waveA * 0.7 });
        }
      } else if (item.type === 'wildfire') {
        // Expanding orange/red smoke ring
        const ringR = progress * item.maxR * vz;
        const ringA = progress < 0.65 ? 0.55 - progress * 0.55 : 0;
        if (ringA > 0) {
          gfx.circle(sx, sy, ringR).stroke({ width: 5 * vz, color: 0xff5500, alpha: ringA * 0.7 });
          gfx.circle(sx, sy, ringR * 0.6).stroke({ width: 2.5 * vz, color: 0xff2200, alpha: ringA * 0.5 });
        }
        gfx.circle(sx, sy, 8 * vz).fill({ color: 0xff3300, alpha: (1 - progress) * 0.5 });
      } else if (item.type === 'volcano') {
        // Ash cloud expanding ring + central eruption
        const ringR = progress * item.maxR * vz;
        const ringA = progress < 0.6 ? 0.5 - progress * 0.5 : 0;
        if (ringA > 0) {
          gfx.circle(sx, sy, ringR).stroke({ width: 6 * vz, color: 0x665544, alpha: ringA });
          gfx.circle(sx, sy, ringR * 0.5).stroke({ width: 3 * vz, color: 0x887766, alpha: ringA * 0.6 });
        }
        gfx.circle(sx, sy, 10 * vz).fill({ color: 0xff4400, alpha: (1 - progress) * 0.55 });
        // Ash particles
        const ashCount = 8;
        for (let a = 0; a < ashCount; a++) {
          const ang = (a / ashCount) * Math.PI * 2 + progress * 2;
          const ar = ringR * 0.3 + Math.sin(age * 0.003 + a) * 6 * vz;
          const ax = sx + Math.cos(ang) * ar;
          const ay = sy + Math.sin(ang) * ar - progress * 30 * vz;
          gfx.circle(ax, ay, 2 * vz).fill({ color: 0x554433, alpha: (1 - progress) * 0.6 });
        }
      } else {
        // Generic expanding ring
        const ringR = progress * item.maxR * vz;
        const ringA = progress < 0.7 ? 0.5 - progress * 0.5 : 0;
        if (ringA > 0) {
          gfx.circle(sx, sy, ringR).stroke({ width: 2.5 * vz, color: 0xf0a500, alpha: ringA });
        }
        gfx.circle(sx, sy, 5 * vz).fill({ color: 0xf0a500, alpha: (1 - progress) * 0.4 });
      }

      if (progress >= 1) {
        vfxContainer.removeChild(gfx);
        gfx.destroy();
        vfxItems.current.splice(i, 1);
      }
    }
  };

  // ── Main render loop ──────────────────────────────────────────────────
  const renderLoop = useCallback(() => {
    const app   = appRef.current;
    const orgs  = orgsRef.current;
    const dots  = dotsGfxRef.current;
    const tint  = tintRef.current;
    if (!app || !orgs || !dots || !tint) return;

    const state = SimulationEngine.state;
    if (!state.world?.cells?.length) return;

    _frame++;
    _statFrame++;

    // ── FPS tracking ──────────────────────────────────────────────────
    const now = performance.now();
    fpsRef.current.times.push(now);
    if (fpsRef.current.times.length > 60) fpsRef.current.times.shift();

    // ── Stat updates: every 10 frames ────────────────────────────────
    if (_statFrame % 10 === 0) {
      let livePop = 0, activeSp = 0;
      for (const o of state.organisms.values()) { if (o.alive) livePop++; }
      for (const s of state.species.values())   { if (!s.extinct) activeSp++; }
      setSimTime(state.tick, state.simulatedYear, state.simulatedEra);
      setSimStats(livePop, activeSp);
    }

    // ── YPS update: every 60 frames ───────────────────────────────────
    if (_frame % 60 === 0) {
      const elapsed = (now - _lastYpsTime) / 1000;
      if (elapsed > 0) {
        const yps = Math.round((state.simulatedYear - _lastYpsYear) / elapsed);
        setYps(Math.max(0, yps));
      }
      _lastYpsYear = state.simulatedYear;
      _lastYpsTime = now;
    }

    // ── Day/night: update Zustand once per second (60 frames) ─────────
    if (_frame % 60 === 0) {
      setDayTime(SimulationEngine.dayTime);
    }

    // ── Pause-on-extinction ───────────────────────────────────────────
    // Handled via EventBus in SimulationWorkspace

    // ── Day/night tint on terrain ─────────────────────────────────────
    const phase = getDayPhase(SimulationEngine.dayTime);
    if (phase !== lastPhase.current || _frame % 30 === 0) {
      lastPhase.current = phase;
      const { viewportX: vx, viewportY: vy, viewportZoom: vz } = useUIStore.getState();
      const cx = app.renderer.width  / 2;
      const cy = app.renderer.height / 2;
      const ww = state.world.width, wh = state.world.height;

      // Tint overlay
      tint.clear();
      tint.position.set(cx - vx * vz, cy - vy * vz);
      tint.scale.set(vz);
      let oa = 0, or_ = 0, og_ = 0, ob_ = 0;
      if (phase === 'night') { oa = 0.52; or_ = 4;   og_ = 7;  ob_ = 30; }
      if (phase === 'dawn')  { oa = 0.16; or_ = 210; og_ = 95; ob_ = 35; }
      if (phase === 'dusk')  { oa = 0.18; or_ = 190; og_ = 60; ob_ = 25; }
      if (oa > 0) {
        tint.rect(0, 0, ww, wh).fill({ color: (or_ << 16) | (og_ << 8) | ob_, alpha: oa });
      }

      // Stars — visible at night/dawn only
      const stars = starsRef.current;
      if (stars) {
        stars.visible = phase === 'night' || phase === 'dawn';
        stars.position.set(cx - vx * vz, cy - vy * vz);
        stars.scale.set(vz);
        stars.alpha = phase === 'night' ? 1.0 : 0.35;
      }

      // Grid follows world transform
      const grid = gridRef.current;
      if (grid) {
        grid.position.set(cx - vx * vz, cy - vy * vz);
        grid.scale.set(vz);
      }
    }

    // ── Audio ─────────────────────────────────────────────────────────
    if (audioEnabled && _frame % 30 === 0 && state.world.biomes?.length) {
      const { viewportX: vx, viewportY: vy } = useUIStore.getState();
      const ivx = Math.max(0, Math.min(state.world.width  - 1, Math.floor(vx)));
      const ivy = Math.max(0, Math.min(state.world.height - 1, Math.floor(vy)));
      AudioSystem.setBiome(BIOME_NAMES[state.world.biomes[ivy * state.world.width + ivx] ?? 0] ?? 'grassland');
    }

    // ── Viewport transform ────────────────────────────────────────────
    const { viewportX, viewportY, viewportZoom: vz, selectedOrganismId } = useUIStore.getState();
    const cx = app.renderer.width  / 2;
    const cy = app.renderer.height / 2;
    const ox = cx - viewportX * vz;
    const oy = cy - viewportY * vz;

    if (terrainRef.current) { terrainRef.current.scale.set(vz); terrainRef.current.position.set(ox, oy); }
    orgs.scale.set(vz);
    orgs.position.set(ox, oy);

    // ── Disaster VFX update ─────────────────────────────────────────
    updateVfx(0, ox, oy, vz);

    // ── Draw organisms — fast batched by color, glow only for selected ──
    dots.clear();
    const { settings: s } = useUIStore.getState();
    const density = s.particleDensity ?? 0.8;
    const skipMod = density < 1 ? Math.max(1, Math.round(1 / density)) : 1;
    const [tR, tG, tB] = getDayTint(phase);
    let drawIdx = 0;

    // Build batches: map colorHex → list of {x,y,r,alpha}
    const batches = new Map<number, Array<[number, number, number, number]>>();
    let selectedOrg: { x: number; y: number; r: number } | null = null;

    for (const org of state.organisms.values()) {
      if (!org.alive) continue;
      drawIdx++;
      if (density < 1 && drawIdx % skipMod !== 0) continue;
      const sp = state.species.get(org.speciesId);
      if (!sp) continue;

      const r   = DOT_RADIUS[sp.type] ?? 2;
      const [cr, cg, cb] = hexToRgb(sp.color);
      const energy = org.energy ?? 0.7;
      const alpha  = 0.55 + energy * 0.45;
      const fr = Math.min(255, cr * tR);
      const fg = Math.min(255, cg * tG);
      const fb = Math.min(255, cb * tB);
      const col = ((Math.round(fr) << 16) | (Math.round(fg) << 8) | Math.round(fb));
      const rScaled = r * (0.8 + energy * 0.2);

      if (org.id === selectedOrganismId) {
        selectedOrg = { x: org.x, y: org.y, r: rScaled };
      }

      if (!batches.has(col)) batches.set(col, []);
      batches.get(col)!.push([org.x, org.y, rScaled, alpha]);
    }

    // Draw all batches — one fill call per color
    for (const [col, pts] of batches) {
      for (const [bx, by, br, ba] of pts) {
        dots.circle(bx, by, br).fill({ color: col, alpha: ba });
      }
    }

    // Selected organism highlight drawn on top
    if (selectedOrg) {
      dots.circle(selectedOrg.x, selectedOrg.y, selectedOrg.r + 4).fill({ color: 0x00E5C0, alpha: 0.15 });
      dots.circle(selectedOrg.x, selectedOrg.y, selectedOrg.r + 2).fill({ color: 0x00E5C0, alpha: 0.45 });
      dots.circle(selectedOrg.x, selectedOrg.y, selectedOrg.r + 2).stroke({ width: 0.8, color: 0x00E5C0, alpha: 1.0 });
    }
  }, [audioEnabled, setSimTime, setSimStats, setDayTime, setSelectedOrganism, setInspectorPanel, setYps, settings, drawGrid, drawStars]);

  // ── Click organism selection via hit-test ─────────────────────────────
  const hitTestOrganism = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const { viewportX, viewportY, viewportZoom: vz } = useUIStore.getState();
    const wx = viewportX + (clientX - rect.left  - rect.width  / 2) / vz;
    const wy = viewportY + (clientY - rect.top   - rect.height / 2) / vz;
    const HIT_R = 6 / vz; // hit radius in world coords

    let best: string | null = null;
    let bestDist = Infinity;
    for (const org of SimulationEngine.state.organisms.values()) {
      if (!org.alive) continue;
      const d = Math.hypot(org.x - wx, org.y - wy);
      if (d < HIT_R && d < bestDist) { best = org.id; bestDist = d; }
    }
    return best;
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const placing = useUIStore.getState().placingSpeciesId;
    if (placing) {
      const { viewportX, viewportY, viewportZoom: vz } = useUIStore.getState();
      const rect   = containerRef.current!.getBoundingClientRect();
      const worldX = viewportX + (e.clientX - rect.left  - rect.width  / 2) / vz;
      const worldY = viewportY + (e.clientY - rect.top   - rect.height / 2) / vz;
      SimulationEngine.introduceSpecies(placing, worldX, worldY);
      useUIStore.getState().addNotification(`Placed ${placing.replace(/_/g, ' ')}`, 'success');
      setPlacingSpeciesId(null);
      return;
    }
    isDragging.current = true;
    lastMouse.current  = { x: e.clientX, y: e.clientY };
  }, [setPlacingSpeciesId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    const { viewportX, viewportY, viewportZoom: vz } = useUIStore.getState();
    setViewport(viewportX - dx / vz, viewportY - dy / vz, vz);
  }, [setViewport]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isDragging.current) {
      // If barely moved, treat as a click — try organism selection
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      if (Math.hypot(dx, dy) < 3) {
        const hit = hitTestOrganism(e.clientX, e.clientY);
        if (hit) { setSelectedOrganism(hit); setInspectorPanel({ open: true }); }
      }
    }
    isDragging.current = false;
  }, [hitTestOrganism, setSelectedOrganism, setInspectorPanel]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const speciesId = e.dataTransfer.getData('speciesId');
    if (!speciesId) return;
    const { viewportX, viewportY, viewportZoom: vz } = useUIStore.getState();
    const rect   = containerRef.current!.getBoundingClientRect();
    const worldX = viewportX + (e.clientX - rect.left - rect.width  / 2) / vz;
    const worldY = viewportY + (e.clientY - rect.top  - rect.height / 2) / vz;
    SimulationEngine.introduceSpecies(speciesId, worldX, worldY);
    useUIStore.getState().addNotification(`Introduced ${speciesId.replace(/_/g, ' ')}`, 'success');
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const { viewportZoom: vz, viewportX, viewportY } = useUIStore.getState();
    const factor  = e.deltaY > 0 ? 0.88 : 1.14;
    setViewport(viewportX, viewportY, Math.max(0.4, Math.min(24, vz * factor)));
  }, [setViewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <div className="w-full h-full relative" style={{ background: '#080a12' }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{
          cursor: placingSpeciesId ? 'crosshair' : isDragging.current ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isDragging.current = false; }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      />

      {/* FPS counter */}
      <FpsOverlay fpsRef={fpsRef} />

      {/* Place-mode hint */}
      {placingSpeciesId && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 10 }}>
          <div
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(0,229,192,0.12)', border: '1px solid rgba(0,229,192,0.45)',
              color: '#00E5C0', fontFamily: 'Space Grotesk', backdropFilter: 'blur(6px)',
              letterSpacing: '0.05em', marginTop: '-40vh',
            }}
          >
            ✦ Click anywhere on the map to place
          </div>
        </div>
      )}

      {/* Biome Legend — collapsible bottom-left overlay */}
      <BiomeLegend />
    </div>
  );
}

// ── Biome Legend overlay — collapsible, bottom-left of canvas ────────────
const LEGEND_ENTRIES: { name: string; color: string }[] = [
  { name: 'Tropical Rainforest', color: '#1a6b3a' },
  { name: 'Temperate Forest',    color: '#4a7a2e' },
  { name: 'Grassland / Plains',  color: '#8aab3c' },
  { name: 'Desert / Arid',       color: '#c4933a' },
  { name: 'Tundra',              color: '#8a9aaa' },
  { name: 'Alpine / Mountain',   color: '#c8cdd0' },
  { name: 'Wetland / Swamp',     color: '#2d6b3a' },
  { name: 'Coastal / Shore',     color: '#4a9ab5' },
  { name: 'Deep Ocean',          color: '#1a3d5c' },
  { name: 'River',               color: '#2d6a8f' },
  { name: 'Lake',                color: '#3a7aaa' },
];

function BiomeLegend() {
  const [open, setOpen] = useState(true);
  return (
    <div
      className="absolute bottom-3 left-3"
      style={{ zIndex: 25, fontFamily: 'Space Grotesk, sans-serif' }}
    >
      <div
        style={{
          background: 'rgba(6,8,18,0.88)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          backdropFilter: 'blur(12px)',
          minWidth: 172,
          overflow: 'hidden',
        }}
      >
        {/* Header toggle */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 transition-colors"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <span style={{ fontSize: 10, color: '#00E5C0' }}>🗺</span>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600, flex: 1, textAlign: 'left' }}>Biome Legend</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{open ? '▲' : '▼'}</span>
        </button>
        {/* Legend items */}
        {open && (
          <div style={{ padding: '4px 8px 6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {LEGEND_ENTRIES.map(e => (
              <div key={e.name} className="flex items-center gap-1.5" style={{ paddingTop: 3, paddingBottom: 3 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: e.color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)' }} />
                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>{e.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FPS overlay (reads from ref, not Zustand — no re-render pressure) ────
function FpsOverlay({ fpsRef }: { fpsRef: React.RefObject<{ times: number[]; last: number }> }) {
  const { settings } = useUIStore();
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!settings.showFpsCounter) return;
    const id = setInterval(() => {
      const times = fpsRef.current?.times ?? [];
      if (times.length < 2) return;
      const elapsed = (times[times.length - 1] - times[0]) / 1000;
      const fps = elapsed > 0 ? Math.round((times.length - 1) / elapsed) : 0;
      if (displayRef.current) displayRef.current.textContent = `${fps} fps`;
    }, 500);
    return () => clearInterval(id);
  }, [settings.showFpsCounter, fpsRef]);

  if (!settings.showFpsCounter) return null;
  return (
    <div
      className="absolute top-2 left-2 pointer-events-none"
      style={{ zIndex: 20 }}
    >
      <span
        ref={displayRef}
        style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem',
          color: '#00E5C0', background: 'rgba(0,0,0,0.5)',
          padding: '2px 6px', borderRadius: 4,
        }}
      >
        -- fps
      </span>
    </div>
  );
}
