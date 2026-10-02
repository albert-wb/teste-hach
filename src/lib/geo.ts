/** Geometria 2D simples (plano em km). Tudo determinístico — sem Math.random. */
export type Pt = [number, number];
export type Ring = Pt[];
export type Poly = Ring[];
export type Multi = Poly[];

export function ringArea(ring: Ring): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return a / 2;
}
export const polyArea = (p: Poly): number => p.reduce((acc, r, i) => acc + (i === 0 ? Math.abs(ringArea(r)) : -Math.abs(ringArea(r))), 0);
export const multiArea = (m: Multi): number => m.reduce((a, p) => a + polyArea(p), 0);

export function bbox(points: Pt[]): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
export const multiPoints = (m: Multi): Pt[] => m.flatMap((p) => p.flatMap((r) => r));

function inRing(p: Pt, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const inPoly = (p: Pt, poly: Poly): boolean => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h));
export const inMulti = (p: Pt, m: Multi): boolean => m.some((poly) => inPoly(p, poly));

function distSeg(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
/** distância do ponto à borda do multipolígono */
export function distToBoundary(p: Pt, m: Multi): number {
  let d = Infinity;
  for (const poly of m) for (const ring of poly) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) d = Math.min(d, distSeg(p, ring[j], ring[i]));
  return d;
}

/** Ponto interno mais afastado da borda (grade + refinamento). */
export function labelPoint(m: Multi): Pt {
  const [x0, y0, x1, y1] = bbox(multiPoints(m));
  let best: Pt = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestD = -1;
  const scan = (ax: number, ay: number, bx: number, by: number, n: number) => {
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const p: Pt = [ax + ((bx - ax) * i) / n, ay + ((by - ay) * j) / n];
      if (!inMulti(p, m)) continue;
      const d = distToBoundary(p, m);
      if (d > bestD) { bestD = d; best = p; }
    }
  };
  scan(x0, y0, x1, y1, 36);
  const step = Math.max(x1 - x0, y1 - y0) / 36;
  scan(best[0] - step, best[1] - step, best[0] + step, best[1] + step, 12);
  return best;
}

export function centroid(m: Multi): Pt {
  let A = 0, X = 0, Y = 0;
  for (const poly of m) {
    const ring = poly[0];
    const a = Math.abs(ringArea(ring));
    let cx = 0, cy = 0, s = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      s += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
    }
    const c: Pt = s === 0 ? ring[0] : [cx / (3 * s), cy / (3 * s)];
    A += a; X += c[0] * a; Y += c[1] * a;
  }
  return A === 0 ? m[0][0][0] : [X / A, Y / A];
}

export function halton(index: number, base: number): number {
  let f = 1, r = 0, i = index;
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); }
  return r;
}

/**
 * Posições determinísticas dentro de um multipolígono (sequência de Halton), afastadas da borda,
 * do ponto de rótulo e entre si. Sempre a mesma saída para a mesma entrada.
 */
export function scatter(m: Multi, label: Pt, count: number): Pt[] {
  const area = Math.max(multiArea(m), 1e-6);
  const unit = Math.sqrt(area);
  const [x0, y0, x1, y1] = bbox(multiPoints(m));
  const out: Pt[] = [];
  for (let i = 1; i < 4000 && out.length < count; i++) {
    const p: Pt = [x0 + (x1 - x0) * halton(i, 2), y0 + (y1 - y0) * halton(i, 3)];
    if (!inMulti(p, m)) continue;
    if (distToBoundary(p, m) < unit * 0.07) continue;
    if (Math.hypot(p[0] - label[0], p[1] - label[1]) < unit * 0.27) continue;
    if (out.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < unit * 0.13)) continue;
    out.push(p);
  }
  return out;
}
