// Quadtree for spatial queries
export interface QTPoint {
  x: number;
  y: number;
  id: string;
}

interface QTBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MAX_CAPACITY = 8;
const MAX_DEPTH = 8;

export class Quadtree {
  private bounds: QTBounds;
  private points: QTPoint[] = [];
  private divided = false;
  private ne: Quadtree | null = null;
  private nw: Quadtree | null = null;
  private se: Quadtree | null = null;
  private sw: Quadtree | null = null;
  private depth: number;

  constructor(bounds: QTBounds, depth = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  private contains(p: QTPoint): boolean {
    return (
      p.x >= this.bounds.x && p.x < this.bounds.x + this.bounds.w &&
      p.y >= this.bounds.y && p.y < this.bounds.y + this.bounds.h
    );
  }

  private intersects(range: QTBounds): boolean {
    return !(
      range.x > this.bounds.x + this.bounds.w ||
      range.x + range.w < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.h ||
      range.y + range.h < this.bounds.y
    );
  }

  private subdivide(): void {
    const { x, y, w, h } = this.bounds;
    const hw = w / 2, hh = h / 2;
    this.ne = new Quadtree({ x: x + hw, y, w: hw, h: hh }, this.depth + 1);
    this.nw = new Quadtree({ x, y, w: hw, h: hh }, this.depth + 1);
    this.se = new Quadtree({ x: x + hw, y: y + hh, w: hw, h: hh }, this.depth + 1);
    this.sw = new Quadtree({ x, y: y + hh, w: hw, h: hh }, this.depth + 1);
    this.divided = true;
    for (const p of this.points) this.insert(p);
    this.points = [];
  }

  insert(p: QTPoint): boolean {
    if (!this.contains(p)) return false;
    if (!this.divided) {
      if (this.points.length < MAX_CAPACITY || this.depth >= MAX_DEPTH) {
        this.points.push(p);
        return true;
      }
      this.subdivide();
    }
    return (
      this.ne!.insert(p) || this.nw!.insert(p) ||
      this.se!.insert(p) || this.sw!.insert(p)
    );
  }

  query(range: QTBounds, found: QTPoint[] = []): QTPoint[] {
    if (!this.intersects(range)) return found;
    if (!this.divided) {
      for (const p of this.points) {
        if (p.x >= range.x && p.x < range.x + range.w &&
            p.y >= range.y && p.y < range.y + range.h) {
          found.push(p);
        }
      }
      return found;
    }
    this.ne!.query(range, found);
    this.nw!.query(range, found);
    this.se!.query(range, found);
    this.sw!.query(range, found);
    return found;
  }

  queryRadius(cx: number, cy: number, r: number, found: QTPoint[] = []): QTPoint[] {
    const range = { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
    const candidates = this.query(range);
    for (const p of candidates) {
      if (Math.hypot(p.x - cx, p.y - cy) <= r) found.push(p);
    }
    return found;
  }

  clear(): void {
    this.points = [];
    this.divided = false;
    this.ne = this.nw = this.se = this.sw = null;
  }
}
