#!/usr/bin/env node
/**
 * Gera uma mancha urbana APROXIMADA (desenho esquemático, NÃO oficial) em src/data/franca.geo.json.
 * Serve só como reserva quando o OpenStreetMap não está acessível. Não contém vias, córregos nem bairros:
 * nada de geometria é inventada além do contorno esquemático, e ele vem rotulado como "geometria aproximada".
 * Para a geometria real, rode: node scripts/fetch-osm.mjs
 *
 * Unidades: quilômetros locais, com origem no "centro" (projecao = "local-km").
 */
import { writeFile } from 'node:fs/promises';
import { round } from './geo-utils.mjs';

// raios (km) a cada 15°, no sentido horário a partir do norte — contorno orgânico desenhado à mão
const radii = [4.5, 4.9, 5.3, 5.1, 4.5, 4.1, 4.4, 4.9, 5.3, 4.8, 4.2, 3.9, 4.2, 4.7, 5.0, 4.6, 4.0, 3.8, 4.1, 4.5, 4.9, 5.1, 4.9, 4.6];
const STRETCH_X = 1.2; // a mancha é mais larga que alta
const ring = radii.map((r, i) => {
  const th = (i * 15 * Math.PI) / 180; // 0 = norte
  return [round(r * Math.sin(th) * STRETCH_X, 3), round(r * Math.cos(th), 3)];
});
ring.push(ring[0]);

const fc = {
  type: 'FeatureCollection',
  meta: {
    fonte: 'aproximada',
    projecao: 'local-km',
    rotulo: 'Geometria aproximada — desenho esquemático, não oficial. Rode scripts/fetch-osm.mjs para a geometria do OpenStreetMap.',
    geradoEm: new Date().toISOString()
  },
  features: [
    { type: 'Feature', properties: { tipo: 'mancha-urbana', aproximada: true }, geometry: { type: 'Polygon', coordinates: [ring] } },
    { type: 'Feature', properties: { tipo: 'centro', nome: 'Centro (aproximado)', aproximada: true }, geometry: { type: 'Point', coordinates: [0, 0] } }
  ]
};
await writeFile(new URL('../src/data/franca.geo.json', import.meta.url), JSON.stringify(fc));
console.log('src/data/franca.geo.json (geometria aproximada) gerado.');
