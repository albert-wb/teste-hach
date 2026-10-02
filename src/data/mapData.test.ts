import { describe, expect, it } from 'vitest';
import { mapData } from './mapData';
import { REGIONS } from './regions';
import { inMulti, multiArea, scatter } from '../lib/geo';

describe('geometria do mapa', () => {
  it('cada zona tem 12 posições de ocorrência, 2 de infraestrutura e 1 refúgio, todas dentro da zona', () => {
    for (const r of REGIONS) {
      const z = mapData.zones[r.id];
      expect(z.dots).toHaveLength(12);
      expect(z.infra).toHaveLength(2);
      expect(z.refuge).not.toBeNull();
      for (const p of [...z.dots, ...z.infra, z.refuge!]) expect(inMulti(p, z.multi)).toBe(true);
    }
  });

  it('as 4 zonas cobrem a mancha urbana sem lacunas relevantes', () => {
    const sum = REGIONS.reduce((a, r) => a + multiArea(mapData.zones[r.id].multi), 0);
    const urban = multiArea(mapData.urban);
    expect(sum / urban).toBeGreaterThan(0.98);
    expect(sum / urban).toBeLessThan(1.02);
  });

  it('é determinístico: a mesma zona gera sempre as mesmas posições, e elas batem com as usadas no mapa', () => {
    const z = mapData.zones.norte;
    const again = scatter(z.multi, z.label, 15);
    expect(again.slice(0, 12)).toEqual(z.dots);
    expect(scatter(z.multi, z.label, 15)).toEqual(again);
  });
});
