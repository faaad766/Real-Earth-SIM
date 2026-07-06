// Minimap — redesigned: larger, compass, day/night badge, collapsible, click-to-navigate
import { useEffect, useRef, useCallback, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '@/store/UIStore';
import { SimulationEngine } from '@/lib/SimulationEngine';
import { BIOME_COLORS, DATA_LAYERS } from '@/types/simulation';
import type { BiomeType } from '@/types/simulation';

const W = 220;
const H = 150;

const LAYER_ICONS: Record<string, string> = {
  terrain: '⛰', biome: '🌍', population: '🐾',
  temperature: '🌡', rainfall: '💧', fertility: '🌱', disease: '🦠',
};

const BIOME_NAMES: BiomeType[] = [
  'ocean', 'coastal', 'wetland', 'tropical_rainforest', 'temperate_forest',
  'grassland', 'desert', 'tundra', 'alpine', 'river', 'lake',
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const DAY_PHASE_META: Record<string, { icon: string; label: string; color: string }> = {
  night: { icon: '🌙', label: 'Night',  color: '#7C6BFF' },
  dawn:  { icon: '🌅', label: 'Dawn',   color: '#F0A500' },
  day:   { icon: '☀️', label: 'Day',    color: '#FFD700' },
  dusk:  { icon: '🌇', label: 'Dusk',   color: '#FF6B6B' },
};

// Throttle minimap redraws to ~10 fps
let minimapFrame = 0;

export function Minimap({ docked }: { docked?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | undefined>(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const {
    minimapLayer, setMinimapLayer,
    viewportX, viewportY, viewportZoom, setViewport,
    totalPop, activeSpecies, dayPhase, dayTime,
  } = useUIStore();

  const draw = useCallback(() => {
    minimapFrame++;
    // Throttle to every 6 RAF frames (~10fps) — enough for a minimap
    if (minimapFrame % 6 !== 0) {
      animFrameRef.current = requestAnimationFrame(draw);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) { animFrameRef.current = requestAnimationFrame(draw); return; }
    const ctx = canvas.getContext('2d');
    if (!ctx) { animFrameRef.current = requestAnimationFrame(draw); return; }

    const { world, organisms } = SimulationEngine.state;
    if (!world?.cells?.length) { animFrameRef.current = requestAnimationFrame(draw); return; }

    const ww = world.width, wh = world.height;
    const sx = W / ww, sy = H / wh;
    const img  = ctx.createImageData(W, H);
    const data = img.data;

    // Build density maps once
    const popMap     = minimapLayer === 'population' ? new Float32Array(ww * wh) : null;
    const diseaseMap = minimapLayer === 'disease'    ? new Float32Array(ww * wh) : null;
    if (popMap || diseaseMap) {
      for (const org of organisms.values()) {
        if (!org.alive) continue;
        const ix = Math.floor(org.x), iy = Math.floor(org.y);
        if (ix < 0 || ix >= ww || iy < 0 || iy >= wh) continue;
        const ci = iy * ww + ix;
        if (popMap) popMap[ci] += 0.1;
        if (diseaseMap && Object.values(org.diseaseStatus).some(s => s.stage === 'infected')) {
          diseaseMap[ci] += 0.15;
        }
      }
    }

    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const wx  = Math.floor(px / sx);
        const wy  = Math.floor(py / sy);
        const i   = wy * ww + wx;
        const b4  = i * 4;
        const idx = (py * W + px) * 4;
        let r = 15, g = 15, b = 25;

        switch (minimapLayer) {
          case 'biome': {
            const biome = BIOME_NAMES[world.biomes[i] ?? 0] ?? 'grassland';
            [r, g, b] = hexToRgb(BIOME_COLORS[biome] ?? '#334455');
            break;
          }
          case 'terrain': {
            const elev = world.cells[b4] ?? 0;
            if (elev < 0.25) { r = 10; g = 25; b = 90; }
            else { const v = elev * 180; r = v * 0.6; g = v * 0.85; b = v * 0.5; }
            break;
          }
          case 'temperature': {
            const t = world.cells[b4 + 2] ?? 0.5;
            r = Math.floor(t * 255); g = 40; b = Math.floor((1 - t) * 200);
            break;
          }
          case 'rainfall': {
            const m = world.cells[b4 + 1] ?? 0.5;
            r = 0; g = Math.floor(m * 100 + 50); b = Math.floor(m * 200 + 30);
            break;
          }
          case 'fertility': {
            const f = world.cells[b4 + 3] ?? 0.5;
            r = 20; g = Math.floor(f * 200 + 30); b = 40;
            break;
          }
          case 'population': {
            const p = Math.min(1, popMap![i] ?? 0);
            r = Math.floor(p * 220); g = Math.floor(p * 90); b = Math.floor(p * 40);
            break;
          }
          case 'disease': {
            const d = Math.min(1, diseaseMap![i] ?? 0);
            r = Math.floor(d * 255); g = 20; b = 20;
            break;
          }
        }

        // Day/night tint
        let tR = 1, tG = 1, tB = 1;
        if (dayPhase === 'night')      { tR = 0.45; tG = 0.50; tB = 0.75; }
        else if (dayPhase === 'dawn')  { tR = 1.10; tG = 0.80; tB = 0.65; }
        else if (dayPhase === 'dusk')  { tR = 1.10; tG = 0.72; tB = 0.60; }

        data[idx]     = Math.min(255, r * tR);
        data[idx + 1] = Math.min(255, g * tG);
        data[idx + 2] = Math.min(255, b * tB);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);

    // Viewport rect
    const vpW = Math.min(W, W / viewportZoom / (ww / W));
    const vpH = Math.min(H, vpW * (H / W));
    const vpX = (viewportX / ww) * W - vpW / 2;
    const vpY = (viewportY / wh) * H - vpH / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(0,229,192,0.85)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00E5C0';
    ctx.shadowBlur = 4;
    ctx.strokeRect(
      Math.max(0, vpX), Math.max(0, vpY),
      Math.min(W - Math.max(0, vpX), vpW),
      Math.min(H - Math.max(0, vpY), vpH),
    );
    ctx.restore();

    // Compass rose (top-right)
    const cx2 = W - 14, cy2 = 14;
    ctx.save();
    ctx.font = 'bold 9px Inter';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx2, cy2 - 7);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 - 4); ctx.lineTo(cx2, cy2 + 4);
    ctx.moveTo(cx2 - 4, cy2); ctx.lineTo(cx2 + 4, cy2);
    ctx.stroke();
    ctx.restore();

    animFrameRef.current = requestAnimationFrame(draw);
  }, [minimapLayer, viewportX, viewportY, viewportZoom, dayPhase]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const { world } = SimulationEngine.state;
    setViewport(
      ((e.clientX - rect.left) / W) * world.width,
      ((e.clientY - rect.top)  / H) * world.height,
      viewportZoom,
    );
  }, [viewportZoom, setViewport]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const phaseMeta = DAY_PHASE_META[dayPhase] ?? DAY_PHASE_META.day;
  // Day progress arc angle
  const arcAngle  = dayTime * Math.PI * 2 - Math.PI / 2;

  const wrapperClass = docked
    ? 'relative z-30 rounded-xl overflow-hidden flex flex-col w-full h-full'
    : 'fixed bottom-4 right-4 z-40 rounded-xl overflow-hidden flex flex-col';
  const wrapperStyle = docked
    ? { background: 'rgba(8,8,18,0.90)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 6px 32px rgba(0,0,0,0.7)' }
    : { width: W, background: 'rgba(8,8,18,0.90)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 6px 32px rgba(0,0,0,0.7), 0 0 1px rgba(255,255,255,0.05)' };

  return (
    <div
      className={wrapperClass}
      style={wrapperStyle}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'Space Grotesk', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Minimap
        </span>

        {/* Day/night badge */}
        <div className="flex items-center gap-1 ml-1">
          <svg width={14} height={14} viewBox="0 0 14 14">
            <circle cx={7} cy={7} r={5.5} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} />
            <path
              d={`M 7 7 L ${7 + 5.5 * Math.cos(-Math.PI / 2)} ${7 + 5.5 * Math.sin(-Math.PI / 2)}
                  A 5.5 5.5 0 ${dayTime > 0.5 ? 1 : 0} 1
                  ${7 + 5.5 * Math.cos(arcAngle)} ${7 + 5.5 * Math.sin(arcAngle)} Z`}
              fill={phaseMeta.color}
              opacity={0.7}
            />
          </svg>
          <span style={{ fontSize: '0.62rem', color: phaseMeta.color, fontFamily: 'Space Grotesk' }}>
            {phaseMeta.icon} {phaseMeta.label}
          </span>
        </div>

        <div className="flex-1" />
        <span className="font-mono" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono' }}>
          {LAYER_ICONS[minimapLayer]}
        </span>
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-0.5 rounded hover:bg-white/5 transition-colors"
          title={collapsed ? 'Expand minimap' : 'Collapse minimap'}
        >
          {collapsed
            ? <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
            : <ChevronUp   size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
          }
        </button>
      </div>

      {/* Collapsible body */}
      {!collapsed && (
        <>
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={W} height={H}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ display: 'block', cursor: 'crosshair', width: '100%' }}
          />

          {/* Stats row */}
          <div className="flex items-center justify-between px-2.5 py-1 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="font-mono" style={{ fontSize: '0.6rem', color: '#00E5C0', fontFamily: 'JetBrains Mono' }}>
              🐾 {totalPop.toLocaleString()}
            </span>
            <span className="font-mono" style={{ fontSize: '0.6rem', color: '#7C6BFF', fontFamily: 'JetBrains Mono' }}>
              🧬 {activeSpecies}
            </span>
          </div>

          {/* Layer switcher */}
          <div className="flex items-center justify-center gap-0.5 px-1.5 pb-1.5 shrink-0">
            {DATA_LAYERS.map(layer => (
              <button
                key={layer.id}
                onClick={() => setMinimapLayer(layer.id)}
                title={layer.label}
                className="px-1.5 py-0.5 rounded transition-all duration-150"
                style={{
                  fontSize: '0.62rem',
                  color:      minimapLayer === layer.id ? '#00E5C0' : 'rgba(255,255,255,0.3)',
                  background: minimapLayer === layer.id ? 'rgba(0,229,192,0.15)' : 'transparent',
                  fontFamily: 'Space Grotesk',
                }}
              >
                {LAYER_ICONS[layer.id]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
