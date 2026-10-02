#!/usr/bin/env node
/**
 * Gera src/data/franca.geo.json com dados reais do OpenStreetMap para o município de Franca (SP).
 *
 *   node scripts/fetch-osm.mjs          (ou: npm run fetch-osm)
 *   node scripts/make-zones.mjs         (ou: npm run make-zones)  ← recalcula as 4 zonas a partir da nova mancha
 *
 * 1. Localiza o município pelo Nominatim (nada de coordenadas de memória).
 * 2. Extrai pela Overpass API: mancha urbana (landuse residencial/comercial/industrial/varejo), vias principais e
 *    secundárias, cursos d'água (em especial Córrego Cubatão e Córrego dos Bagres) e de 6 a 10 nomes de bairros.
 * 3. Simplifica (Douglas–Peucker) até ficar abaixo de ~400 KB.
 *
 * O painel não faz chamadas de rede em tempo de execução: este script roda uma vez, o resultado é commitado.
 * Dados © OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright
 */
import { writeFile } from 'node:fs/promises';
import polygonClipping from 'polygon-clipping';
import { bboxOf, multiArea, multiCentroid, round, simplifyLine, simplifyRing } from './geo-utils.mjs';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const UA = 'stormops-franca-prototype/0.1 (prototipo de hackathon; dados simulados)';
const MAX_BYTES = 400 * 1024;
const OUT = new URL('../src/data/franca.geo.json', import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim() {
  const url = `${NOMINATIM}?q=${encodeURIComponent('Franca, São Paulo, Brasil')}&format=jsonv2&addressdetails=1&limit=10`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' } });
  if (!res.ok) throw new Error(`Nominatim respondeu ${res.status}`);
  const list = await res.json();
  const hit = list.find((r) => r.osm_type === 'relation' && r.class === 'boundary' && /Franca/i.test(r.name ?? r.display_name) && /São Paulo/i.test(r.display_name));
  if (!hit) throw new Error('Município de Franca (SP) não encontrado no Nominatim.');
  return hit;
}

async function overpass(query) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const endpoint of OVERPASS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST', headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query)
        });
        if (res.ok) return (await res.json()).elements ?? [];
        last = new Error(`Overpass ${endpoint} respondeu ${res.status}`);
      } catch (e) { last = e; }
      await sleep(3000);
    }
    await sleep(8000 * (attempt + 1));
  }
  throw last;
}

const geomToCoords = (g) => g.map((p) => [p.lon, p.lat]);

/** junta segmentos (ways) ponta a ponta em anéis fechados */
function stitch(segments) {
  const rings = [];
  const pool = segments.map((s) => s.slice()).filter((s) => s.length > 1);
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  while (pool.length) {
    let cur = pool.pop();
    let progress = true;
    while (!same(cur[0], cur[cur.length - 1]) && progress) {
      progress = false;
      for (let i = 0; i < pool.length; i++) {
        const s = pool[i];
        if (same(cur[cur.length - 1], s[0])) { cur = cur.concat(s.slice(1)); }
        else if (same(cur[cur.length - 1], s[s.length - 1])) { cur = cur.concat(s.slice(0, -1).reverse()); }
        else if (same(cur[0], s[s.length - 1])) { cur = s.concat(cur.slice(1)); }
        else if (same(cur[0], s[0])) { cur = s.slice(1).reverse().concat(cur); }
        else continue;
        pool.splice(i, 1);
        progress = true;
        break;
      }
    }
    if (same(cur[0], cur[cur.length - 1]) && cur.length >= 4) rings.push(cur);
  }
  return rings;
}

function elementToPolygons(el) {
  if (el.type === 'way' && el.geometry) {
    const c = geomToCoords(el.geometry);
    return c.length >= 4 && c[0][0] === c[c.length - 1][0] && c[0][1] === c[c.length - 1][1] ? [[c]] : [];
  }
  if (el.type === 'relation' && el.members) {
    const outer = stitch(el.members.filter((m) => m.role === 'outer' && m.geometry).map((m) => geomToCoords(m.geometry)));
    const inner = stitch(el.members.filter((m) => m.role === 'inner' && m.geometry).map((m) => geomToCoords(m.geometry)));
    return outer.map((o) => [o, ...inner]);
  }
  return [];
}

const [, , ...flags] = process.argv;
console.log('1/5 localizando o município no Nominatim…');
const place = await nominatim();
const areaId = 3600000000 + Number(place.osm_id);
console.log(`    ${place.display_name} (relation ${place.osm_id})`);

console.log('2/5 mancha urbana (landuse)…');
const urbEls = await overpass(`[out:json][timeout:240];area(${areaId})->.m;(way["landuse"~"^(residential|commercial|industrial|retail)$"](area.m);relation["landuse"~"^(residential|commercial|industrial|retail)$"](area.m););out geom tags;`);
const polys = urbEls.flatMap(elementToPolygons);
if (!polys.length) throw new Error('Nenhum polígono de landuse urbano encontrado.');
let urban = polygonClipping.union(...polys);
// descarta fragmentos minúsculos (< 0,3% da maior área)
const areas = urban.map((p) => multiArea([p]));
const maxA = Math.max(...areas);
urban = urban.filter((_, i) => areas[i] >= maxA * 0.003);
const [x0, y0, x1, y1] = bboxOf(urban.flat(2));
const padX = (x1 - x0) * 0.1, padY = (y1 - y0) * 0.1;
const inBox = (p) => p[0] >= x0 - padX && p[0] <= x1 + padX && p[1] >= y0 - padY && p[1] <= y1 + padY;
console.log(`    ${urban.length} polígono(s) urbano(s)`);

await sleep(2000);
console.log('3/5 vias principais e secundárias…');
const roadEls = await overpass(`[out:json][timeout:240];area(${areaId})->.m;way["highway"~"^(trunk|primary|secondary|trunk_link|primary_link)$"](area.m);out geom tags;`);
await sleep(2000);
console.log("4/5 cursos d'água…");
const waterEls = await overpass(`[out:json][timeout:240];area(${areaId})->.m;way["waterway"~"^(river|stream|canal|drain)$"](area.m);out geom tags;`);
await sleep(2000);
console.log('5/5 bairros e ponto central (catedral/praça)…');
const placeEls = await overpass(`[out:json][timeout:120];area(${areaId})->.m;(node["place"~"^(suburb|neighbourhood|quarter)$"]["name"](area.m););out tags center;`);
const centerEls = await overpass(`[out:json][timeout:120];area(${areaId})->.m;(nwr["amenity"="place_of_worship"]["name"~"Catedral",i](area.m);nwr["place"="square"]["name"~"Pra[cç]a",i](area.m););out tags center;`);

const clip = (coords) => {
  const out = [];
  let cur = [];
  for (const p of coords) { if (inBox(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } }
  if (cur.length > 1) out.push(cur);
  return out;
};

const roads = [];
for (const el of roadEls) {
  if (!el.geometry) continue;
  const classe = /^(trunk|primary)/.test(el.tags.highway) ? 'principal' : 'secundaria';
  for (const part of clip(geomToCoords(el.geometry))) roads.push({ classe, nome: el.tags.name ?? null, coords: part });
}
const NAMED = /cubat[aã]o|bagres/i;
const water = [];
for (const el of waterEls) {
  if (!el.geometry) continue;
  const nome = el.tags.name ?? null;
  if (!(nome && (NAMED.test(nome) || el.tags.waterway === 'river'))) continue;
  for (const part of clip(geomToCoords(el.geometry))) water.push({ nome, coords: part });
}
const found = (re) => water.some((w) => w.nome && re.test(w.nome));
if (!found(/cubat[aã]o/i)) console.warn('AVISO: Córrego Cubatão não encontrado no OSM — traçado omitido.');
if (!found(/bagres/i)) console.warn('AVISO: Córrego dos Bagres não encontrado no OSM — traçado omitido.');

// bairros: até 10, espalhados (amostragem do ponto mais distante)
const hoods = placeEls.filter((e) => e.lat && e.lon && inBox([e.lon, e.lat])).map((e) => ({ nome: e.tags.name, p: [e.lon, e.lat] }));
const chosen = [];
while (chosen.length < Math.min(10, hoods.length)) {
  let best = null, bestD = -1;
  for (const h of hoods) {
    if (chosen.includes(h)) continue;
    const d = chosen.length ? Math.min(...chosen.map((c) => Math.hypot(c.p[0] - h.p[0], c.p[1] - h.p[1]))) : 0;
    if (d > bestD) { bestD = d; best = h; }
  }
  chosen.push(best);
}

// ponto central: catedral > praça mais próxima do centroide > centroide da mancha
const ctr = multiCentroid(urban);
const cands = centerEls.map((e) => ({ nome: e.tags.name, tipo: e.tags.amenity ?? e.tags.place, p: [e.lon ?? e.center?.lon, e.lat ?? e.center?.lat] })).filter((c) => c.p[0] && inBox(c.p));
const cathedral = cands.find((c) => /catedral/i.test(c.nome));
const square = cands.filter((c) => c.tipo === 'square').sort((a, b) => Math.hypot(a.p[0] - ctr[0], a.p[1] - ctr[1]) - Math.hypot(b.p[0] - ctr[0], b.p[1] - ctr[1]))[0];
const centro = cathedral ?? square ?? { nome: 'Centroide da mancha urbana', p: ctr };
console.log(`    ponto central: ${centro.nome}`);

function build(tol) {
  const r5 = (c) => c.map((p) => [round(p[0], 5), round(p[1], 5)]);
  const features = [];
  features.push({
    type: 'Feature', properties: { tipo: 'mancha-urbana' },
    geometry: { type: 'MultiPolygon', coordinates: urban.map((poly) => poly.map((ring) => r5(simplifyRing(ring, tol)))) }
  });
  for (const r of roads) {
    const s = r5(simplifyLine(r.coords, tol));
    if (s.length > 1) features.push({ type: 'Feature', properties: { tipo: 'via', classe: r.classe, nome: r.nome }, geometry: { type: 'LineString', coordinates: s } });
  }
  for (const w of water) {
    const s = r5(simplifyLine(w.coords, tol / 2));
    if (s.length > 1) features.push({ type: 'Feature', properties: { tipo: 'corrego', nome: w.nome }, geometry: { type: 'LineString', coordinates: s } });
  }
  for (const h of chosen) features.push({ type: 'Feature', properties: { tipo: 'bairro', nome: h.nome }, geometry: { type: 'Point', coordinates: r5([h.p])[0] } });
  features.push({ type: 'Feature', properties: { tipo: 'centro', nome: centro.nome }, geometry: { type: 'Point', coordinates: r5([centro.p])[0] } });
  return {
    type: 'FeatureCollection',
    meta: {
      fonte: 'osm', projecao: 'wgs84', municipio: place.display_name, osm_relation: place.osm_id,
      atribuicao: '© OpenStreetMap contributors', geradoEm: new Date().toISOString(), tolerancia: tol
    },
    features
  };
}

let tol = 0.00008; // ≈ 9 m
let json = JSON.stringify(build(tol));
while (json.length > MAX_BYTES && tol < 0.01) { tol *= 1.4; json = JSON.stringify(build(tol)); }
await writeFile(OUT, json);
console.log(`\nsrc/data/franca.geo.json gravado (${(json.length / 1024).toFixed(0)} KB, tolerância ${tol.toFixed(5)}°).`);
console.log('Agora rode: node scripts/make-zones.mjs  (recalcula as 4 zonas) e confira o mapa.');
if (flags.includes('--help')) console.log('Sem opções: o script é determinístico dado o estado atual do OpenStreetMap.');
