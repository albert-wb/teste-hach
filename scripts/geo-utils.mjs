// Utilitários geométricos compartilhados pelos scripts (sem dependências de rede).
export const R_KM = 6371.0088;

/** Projeção equiretangular com correção de cos(latitude): [lon, lat] → [x km, y km]. */
export function makeProjection(lon0, lat0) {
  const k = Math.cos((lat0 * Math.PI) / 180);
  const kmPerDeg = (Math.PI / 180) * R_KM;
  return {
    forward: ([lon, lat]) => [(lon - lon0) * k * kmPerDeg, (lat - lat0) * kmPerDeg],
    inverse: ([x, y]) => [x / (k * kmPerDeg) + lon0, y / kmPerDeg + lat0]
  };
}

export function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return a / 2;
}

export function polygonArea(poly) {
  return poly.reduce((acc, ring, i) => acc + (i === 0 ? Math.abs(ringArea(ring)) : -Math.abs(ringArea(ring))), 0);
}

export function multiArea(mp) {
  return mp.reduce((a, p) => a + polygonArea(p), 0);
}

export function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f; cx += (ring[j][0] + ring[i][0]) * f; cy += (ring[j][1] + ring[i][1]) * f;
  }
  a /= 2;
  return a === 0 ? ring[0] : [cx / (6 * a), cy / (6 * a)];
}

export function multiCentroid(mp) {
  let A = 0, X = 0, Y = 0;
  for (const p of mp) {
    const a = polygonArea(p);
    const c = ringCentroid(p[0]);
    A += a; X += c[0] * a; Y += c[1] * a;
  }
  return A === 0 ? mp[0][0][0] : [X / A, Y / A];
}

function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas–Peucker (iterativo, sem estourar a pilha). Mantém primeiro e último pontos. */
export function simplifyLine(pts, tol) {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(pts[i], pts[s], pts[e]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > -1) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export function simplifyRing(ring, tol) {
  const open = ring.slice(0, -1);
  let s = simplifyLine(open, tol);
  if (s.length < 3) s = open.slice(0, 3);
  return [...s, s[0]];
}

export function bboxOf(coords) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of coords) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

export const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
