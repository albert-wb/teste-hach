import type { Region } from '../engine/types';

/** Ordem fixa usada em listas, feed e desempates. */
export const REGIONS: Region[] = [
  { id: 'norte', name: 'Norte', vulnerability: 0.9, criticalInfra: 2, teamsTotal: 3 },
  { id: 'centro', name: 'Centro', vulnerability: 0.6, criticalInfra: 1, teamsTotal: 3 },
  { id: 'leste', name: 'Leste', vulnerability: 0.4, criticalInfra: 0, teamsTotal: 2 },
  { id: 'sul', name: 'Sul', vulnerability: 0.3, criticalInfra: 1, teamsTotal: 2 }
];

export const REGION_IDS = REGIONS.map((r) => r.id);
