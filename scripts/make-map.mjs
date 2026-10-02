#!/usr/bin/env node
/**
 * Gera src/data/franca.geo.json a partir do contorno oficial do município de Franca (IBGE, malha municipal),
 * guardado em src/data/franca-limite.geo.json (fonte: https://github.com/tbrugz/geodata-br, derivado do IBGE).
 * Depois rode: node scripts/make-zones.mjs  (divide o município nas 4 zonas).
 *
 * O ponto do centro é a Praça Nossa Senhora da Conceição (Praça da Matriz), região central de Franca.
 * Vias, córregos e bairros não vêm do IBGE e por isso não estão no mapa.
 */
import { readFile, writeFile } from 'node:fs/promises';
import polygonClipping from 'polygon-clipping';
import { makeProjection, round } from './geo-utils.mjs';

/** Raio (km) da área de análise em volta do centro. O município é grande e comprido (zona rural); o painel foca na cidade. */
const RAIO_KM = 11;

const limite = JSON.parse(await readFile(new URL('../src/data/franca-limite.geo.json', import.meta.url), 'utf8'));
const ring = limite.geometry.coordinates[0].map(([lon, lat]) => [round(lon, 5), round(lat, 5)]);
const CENTRO = [-47.4008, -20.5386];

const inside = (pt, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if ((r[i][1] > pt[1]) !== (r[j][1] > pt[1]) && pt[0] < ((r[j][0] - r[i][0]) * (pt[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  }
  return c;
};
if (!inside(CENTRO, ring)) throw new Error('O ponto central está fora do contorno do município.');

// área de análise = município ∩ círculo de RAIO_KM em volta do centro (em km locais; volta para lon/lat)
const proj = makeProjection(CENTRO[0], CENTRO[1]);
const ringKm = ring.map(proj.forward);
const disc = [Array.from({ length: 97 }, (_, i) => { const a = (i / 96) * 2 * Math.PI; return [RAIO_KM * Math.sin(a), RAIO_KM * Math.cos(a)]; })];
const area = polygonClipping.intersection([[ringKm]], [disc]);
const areaLL = area.map((poly) => poly.map((r) => r.map((p) => proj.inverse(p).map((v) => round(v, 5)))));

const fc = {
  type: 'FeatureCollection',
  meta: {
    fonte: 'ibge',
    projecao: 'wgs84',
    atribuicao: 'Contorno do município: IBGE',
    rotulo: `Contorno oficial do município (IBGE); área de análise = raio de ${RAIO_KM} km em volta do centro. A divisão em zonas é esquemática e não oficial.`,
    geradoEm: new Date().toISOString()
  },
  features: [
    { type: 'Feature', properties: { tipo: 'municipio', nome: 'Município de Franca' }, geometry: { type: 'Polygon', coordinates: [ring] } },
    { type: 'Feature', properties: { tipo: 'mancha-urbana', nome: `Área de análise (raio de ${RAIO_KM} km)` }, geometry: { type: 'MultiPolygon', coordinates: areaLL } },
    { type: 'Feature', properties: { tipo: 'centro', nome: 'Centro de Franca' }, geometry: { type: 'Point', coordinates: CENTRO } }
  ]
};
await writeFile(new URL('../src/data/franca.geo.json', import.meta.url), JSON.stringify(fc));
console.log(`src/data/franca.geo.json gerado (${ring.length - 1} vértices; área de análise com ${area.length} polígono(s)). Agora: node scripts/make-zones.mjs`);
