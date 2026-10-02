#!/usr/bin/env node
/**
 * Baixa do OpenStreetMap (Overpass API) os dados brutos de Franca (SP) e grava em uma pasta (padrão: data-raw/).
 * Só faz rede; o processamento fica em scripts/osm-build.mjs. Rodar em máquina com internet ou no GitHub Actions
 * (.github/workflows/mapa-osm.yml).
 *
 *   node scripts/osm-fetch-raw.mjs [pasta-de-saida]
 *
 * A área de busca é o contorno oficial do município (IBGE, src/data/franca-limite.geo.json), sem depender do Nominatim.
 * Dados © OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { simplifyRing } from './geo-utils.mjs';

const OUT = pathToFileURL(resolve(process.argv[2] ?? 'data-raw') + '/');
const TIMEOUT_MS = 170_000; // por tentativa
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const UA = 'stormops-franca-prototype/0.2 (prototipo de hackathon; dados simulados)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const limite = JSON.parse(await readFile(new URL('../src/data/franca-limite.geo.json', import.meta.url), 'utf8'));
const ring = simplifyRing(limite.geometry.coordinates[0], 0.002); // ≈ 200 m: só para delimitar a busca
const POLY = ring.slice(0, -1).map(([lon, lat]) => `${lat.toFixed(4)} ${lon.toFixed(4)}`).join(' ');
const IN = `(poly:"${POLY}")`;

async function overpass(name, query) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const t0 = Date.now();
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });
        if (res.ok) {
          const json = await res.json();
          console.log(`  ${name}: ${json.elements?.length ?? 0} elementos em ${((Date.now() - t0) / 1000).toFixed(0)} s (${endpoint})`);
          return json;
        }
        last = new Error(`${endpoint} respondeu ${res.status} ${(await res.text()).slice(0, 160).replace(/\s+/g, ' ')}`);
      } catch (e) { last = e; }
      console.warn(`  ${name}: falhou (${last.message}); tentando de novo…`);
      await sleep(3000);
    }
    await sleep(8000 * (attempt + 1));
  }
  throw last;
}

const Q = {
  // mancha urbana
  urbano: `[out:json][timeout:300];(way["landuse"~"^(residential|commercial|industrial|retail|education|institutional)$"]${IN};relation["landuse"~"^(residential|commercial|industrial|retail)$"]${IN};);out geom tags;`,
  // parques e áreas verdes públicas
  parques: `[out:json][timeout:200];(way["leisure"~"^(park|garden|nature_reserve)$"]${IN};relation["leisure"~"^(park|nature_reserve)$"]${IN};way["landuse"~"^(forest|recreation_ground)$"]${IN};way["natural"="wood"]${IN};);out geom tags;`,
  // espelhos d'água
  agua: `[out:json][timeout:200];(way["natural"="water"]${IN};relation["natural"="water"]${IN};way["waterway"="riverbank"]${IN};);out geom tags;`,
  // vias: rodovias, avenidas principais, secundárias e terciárias
  vias: `[out:json][timeout:300];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link)$"]${IN};out geom tags;`,
  ferrovia: `[out:json][timeout:200];way["railway"="rail"]${IN};out geom tags;`,
  // cursos d'água
  corregos: `[out:json][timeout:200];way["waterway"~"^(river|stream|canal)$"]${IN};out geom tags;`,
  // bairros e pontos centrais
  bairros: `[out:json][timeout:120];node["place"~"^(suburb|neighbourhood|quarter|village)$"]["name"]${IN};out tags;`,
  centro: `[out:json][timeout:120];(nwr["amenity"="place_of_worship"]["name"~"Catedral|Matriz",i]${IN};nwr["place"="square"]["name"~"Pra[cç]a",i]${IN};nwr["amenity"="townhall"]${IN};);out tags center;`
};

await mkdir(OUT, { recursive: true });
console.log(`Baixando dados do OSM para Franca (${ring.length - 1} vértices de busca)…`);
for (const [name, query] of Object.entries(Q)) {
  const json = await overpass(name, query);
  await writeFile(new URL(`${name}.json`, OUT), JSON.stringify({ osm3s: json.osm3s, elements: json.elements }));
  await sleep(2500);
}
await writeFile(new URL('meta.json', OUT), JSON.stringify({ geradoEm: new Date().toISOString(), fonte: 'OpenStreetMap contributors (ODbL)' }));
console.log('Pronto.');
