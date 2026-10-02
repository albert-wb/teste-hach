import type { Hazard, RegionId } from '../engine/types';

export type MapTab = 'pressao' | 'ocorrencias' | 'recursos';
export interface UrlState {
  passo: number;
  regiao: RegionId;
  aba: Hazard;
  mapa: MapTab;
}

const REGIOES: RegionId[] = ['norte', 'centro', 'leste', 'sul'];
const MAPAS: MapTab[] = ['pressao', 'ocorrencias', 'recursos'];

export const DEFAULT_URL: UrlState = { passo: 0, regiao: 'norte', aba: 'chuva', mapa: 'pressao' };

/** Lê `?passo=0..4&regiao=norte|centro|leste|sul&aba=chuva|calor&mapa=pressao|ocorrencias|recursos`. */
export function readUrl(search: string): UrlState {
  const q = new URLSearchParams(search);
  const passo = Number.parseInt(q.get('passo') ?? '', 10);
  const regiao = q.get('regiao') as RegionId | null;
  const aba = q.get('aba');
  const mapa = q.get('mapa') as MapTab | null;
  return {
    passo: Number.isFinite(passo) ? Math.min(4, Math.max(0, passo)) : DEFAULT_URL.passo,
    regiao: regiao && REGIOES.includes(regiao) ? regiao : DEFAULT_URL.regiao,
    aba: aba === 'calor' ? 'calor' : 'chuva',
    mapa: mapa && MAPAS.includes(mapa) ? mapa : DEFAULT_URL.mapa
  };
}

export function toSearch(s: UrlState): string {
  const q = new URLSearchParams();
  q.set('passo', String(s.passo));
  q.set('regiao', s.regiao);
  q.set('aba', s.aba);
  q.set('mapa', s.mapa);
  return `?${q.toString()}`;
}
