#!/usr/bin/env node
/**
 * Gera src/data/zones.geo.json: 4 zonas (Norte, Centro, Leste, Sul) a partir da mancha urbana de franca.geo.json.
 *  - Centro: disco em torno do ponto central (praça/catedral quando existem no OSM) ∩ mancha urbana.
 *  - Norte, Leste e Sul: o restante da mancha, dividido por cortes a partir do centro, sem lacunas nem sobreposição.
 *    O setor a oeste é incorporado às zonas vizinhas (Norte, a noroeste; Sul, a sudoeste).
 * O arquivo gerado é editável pelo time (cada zona é um MultiPolygon).
 */
import { readFile, writeFile } from 'node:fs/promises';
import polygonClipping from 'polygon-clipping';
import { makeProjection, multiArea, multiCentroid } from './geo-utils.mjs';

const src = new URL('../src/data/franca.geo.json', import.meta.url);
const fc = JSON.parse(await readFile(src, 'utf8'));
const wgs = fc.meta.projecao === 'wgs84';

const urbanFeatures = fc.features.filter((f) => f.properties.tipo === 'mancha-urbana');
if (!urbanFeatures.length) throw new Error('franca.geo.json não tem mancha urbana.');
const toMulti = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
let urbanLL = urbanFeatures.flatMap((f) => toMulti(f.geometry));

// plano local em km
const first = urbanLL[0][0][0];
const proj = wgs ? makeProjection(first[0], first[1]) : { forward: (p) => p, inverse: (p) => p };
const mapRing = (ring, fn) => ring.map((p) => fn(p));
const mapMulti = (mp, fn) => mp.map((poly) => poly.map((ring) => mapRing(ring, fn)));
const urban = polygonClipping.union(...mapMulti(urbanLL, proj.forward));

const centroFeature = fc.features.find((f) => f.properties.tipo === 'centro');
const c = centroFeature ? proj.forward(centroFeature.geometry.coordinates) : multiCentroid(urban);

const urbanArea = multiArea(urban);
const radius = 0.45 * Math.sqrt(urbanArea / Math.PI);
const disc = [[Array.from({ length: 49 }, (_, i) => {
  const a = (i / 48) * 2 * Math.PI;
  return [c[0] + radius * Math.sin(a), c[1] + radius * Math.cos(a)];
})]];

const extent = 6 * Math.sqrt(urbanArea);
const wedge = (from, to) => {
  const pts = [[c[0], c[1]]];
  for (let b = from; b <= to + 1e-9; b += 5) {
    const r = (b * Math.PI) / 180; // rumo, em graus no sentido horário a partir do norte
    pts.push([c[0] + extent * Math.sin(r), c[1] + extent * Math.cos(r)]);
  }
  pts.push([c[0], c[1]]);
  return [[pts]];
};

const centro = polygonClipping.intersection(urban, disc);
const rest = polygonClipping.difference(urban, disc);
const zones = {
  norte: polygonClipping.intersection(rest, wedge(-60, 45)),
  centro,
  leste: polygonClipping.intersection(rest, wedge(45, 150)),
  sul: polygonClipping.intersection(rest, wedge(150, 300))
};
const names = { norte: 'Norte', centro: 'Centro', leste: 'Leste', sul: 'Sul' };

const out = {
  type: 'FeatureCollection',
  meta: {
    projecao: fc.meta.projecao,
    rotulo: 'Limites das zonas aproximados, não oficiais. Editável pelo time.',
    origem: fc.meta.fonte,
    geradoEm: new Date().toISOString()
  },
  features: Object.entries(zones).map(([id, mp]) => ({
    type: 'Feature',
    properties: { id, nome: names[id] },
    geometry: { type: 'MultiPolygon', coordinates: mapMulti(mp, proj.inverse).map((poly) => poly.map((ring) => ring.map((p) => p.map((v) => Math.round(v * 1e5) / 1e5)))) }
  }))
};
await writeFile(new URL('../src/data/zones.geo.json', import.meta.url), JSON.stringify(out));

const total = Object.values(zones).reduce((a, mp) => a + multiArea(mp), 0);
console.log(`zonas geradas. Cobertura: ${((total / urbanArea) * 100).toFixed(2)}% da mancha urbana (esperado ≈ 100%).`);
for (const [id, mp] of Object.entries(zones)) console.log(`  ${names[id]}: ${(multiArea(mp) / urbanArea * 100).toFixed(1)}%`);
