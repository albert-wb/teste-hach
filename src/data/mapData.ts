/**
 * Dados do mapa: lê franca.geo.json e zones.geo.json (estáticos), projeta e prepara tudo que o SVG precisa.
 * franca.geo.json vem de scripts/fetch-osm.mjs (OpenStreetMap, projecao = "wgs84") ou, na falta de rede,
 * de scripts/make-approx.mjs (geometria APROXIMADA, projecao = "local-km"). Sem chamadas de rede em tempo de execução.
 */
import franca from './franca.geo.json';
import zonesJson from './zones.geo.json';
import type { RegionId } from '../engine/types';
import { bbox, centroid, labelPoint, multiArea, multiPoints, scatter, type Multi, type Pt } from '../lib/geo';

type Feature = { properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } };
type Collection = { meta: Record<string, unknown>; features: Feature[] };

const fc = franca as unknown as Collection;
const zc = zonesJson as unknown as Collection;

const R_KM = 6371.0088;
const wgs = fc.meta.projecao === 'wgs84';
const toMulti = (g: Feature['geometry']): Multi => (g.type === 'Polygon' ? [g.coordinates as Multi[number]] : (g.coordinates as Multi));

const urbanLL: Multi = fc.features.filter((f) => f.properties.tipo === 'mancha-urbana').flatMap((f) => toMulti(f.geometry));
const [ux0, uy0, ux1, uy1] = bbox(multiPoints(urbanLL));
const lon0 = (ux0 + ux1) / 2;
const lat0 = (uy0 + uy1) / 2;
const kx = Math.cos((lat0 * Math.PI) / 180);
const KM = (Math.PI / 180) * R_KM;
/** [lon, lat] (ou km locais) → km com norte para cima no SVG (y invertido) */
const project = (p: Pt): Pt => (wgs ? [(p[0] - lon0) * kx * KM, -(p[1] - lat0) * KM] : [p[0], -p[1]]);
const projMulti = (m: Multi): Multi => m.map((poly) => poly.map((ring) => ring.map(project)));

export interface Place { name: string; p: Pt }
export interface ZoneGeo {
  id: RegionId;
  name: string;
  multi: Multi;
  label: Pt;
  /** posições de ocorrências (12), de infraestrutura (2) e de refúgio (1) */
  dots: Pt[];
  infra: Pt[];
  refuge: Pt | null;
}
export interface MapData {
  approximate: boolean;
  source: 'osm' | 'aproximada';
  attribution: string | null;
  note: string;
  urban: Multi;
  roads: Array<{ main: boolean; pts: Pt[] }>;
  streams: Array<{ name: string | null; pts: Pt[] }>;
  hoods: Place[];
  centro: Place;
  zones: Record<RegionId, ZoneGeo>;
  cityCenter: Pt;
  bbox: [number, number, number, number];
}

function build(): MapData {
  const urban = projMulti(urbanLL);
  const zoneFeatures = zc.features;
  const zones = {} as Record<RegionId, ZoneGeo>;
  for (const f of zoneFeatures) {
    const id = f.properties.id as RegionId;
    const multi = projMulti(toMulti(f.geometry));
    // maior polígono da zona para rótulo e pontos
    const biggest: Multi = [...multi].sort((a, b) => multiArea([b]) - multiArea([a])).slice(0, 1);
    const label = labelPoint(biggest);
    const pts = scatter(biggest, label, 15);
    zones[id] = {
      id, name: String(f.properties.nome), multi, label,
      dots: pts.slice(0, 12), infra: pts.slice(12, 14), refuge: pts[14] ?? null
    };
  }
  const roads = fc.features.filter((f) => f.properties.tipo === 'via').map((f) => ({
    main: f.properties.classe === 'principal',
    pts: (f.geometry.coordinates as Pt[]).map(project)
  }));
  const streams = fc.features.filter((f) => f.properties.tipo === 'corrego').map((f) => ({
    name: (f.properties.nome as string | null) ?? null,
    pts: (f.geometry.coordinates as Pt[]).map(project)
  }));
  const hoods = fc.features.filter((f) => f.properties.tipo === 'bairro').map((f) => ({
    name: String(f.properties.nome), p: project(f.geometry.coordinates as Pt)
  }));
  const cf = fc.features.find((f) => f.properties.tipo === 'centro');
  const centro: Place = cf
    ? { name: String(cf.properties.nome), p: project(cf.geometry.coordinates as Pt) }
    : { name: 'Centro', p: centroid(urban) };
  const approximate = fc.meta.fonte !== 'osm';
  return {
    approximate,
    source: approximate ? 'aproximada' : 'osm',
    attribution: approximate ? null : String(fc.meta.atribuicao ?? '© OpenStreetMap contributors'),
    note: String(fc.meta.rotulo ?? ''),
    urban, roads, streams, hoods, centro, zones,
    cityCenter: centroid(urban),
    bbox: bbox(multiPoints(urban))
  };
}

export const mapData: MapData = build();

export interface Fit { scale: number; tx: number; ty: number }
/** px por km e deslocamento para caber na área W×H com margem. */
/** Encaixa a cidade na área livre: `left` e `right` reservam espaço para os controles e a legenda. */
export function fitTo(W: number, H: number, pad = 28, left = 0, right = 0): Fit {
  const [x0, y0, x1, y1] = mapData.bbox;
  const bw = Math.max(W - left - right, 160);
  const scale = Math.min((bw - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
  return { scale, tx: left + bw / 2 - ((x0 + x1) / 2) * scale, ty: H / 2 - ((y0 + y1) / 2) * scale };
}
export const toPx = (p: Pt, f: Fit): Pt => [p[0] * f.scale + f.tx, p[1] * f.scale + f.ty];

export function pathOfMulti(m: Multi, f: Fit): string {
  return m.map((poly) => poly.map((ring) => ring.map((p, i) => { const q = toPx(p, f); return `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join('') + 'Z').join('')).join('');
}
export function pathOfLine(pts: Pt[], f: Fit): string {
  return pts.map((p, i) => { const q = toPx(p, f); return `${i ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }).join('');
}
