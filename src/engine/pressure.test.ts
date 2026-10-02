import { describe, expect, it } from 'vitest';
import { SimulationDataProvider } from '../data/provider';
import { REGIONS } from '../data/regions';
import {
  alertEventsUntil, alertFeedAt, buildOccurrences, firstAlert, leadMinutes, occurrencesUntil, regionsByPressure, stepClock, totalsAt
} from './derived';
import { computeSteps, roundFactors, whatIfExtraTeam } from './pressure';
import type { RegionId } from './types';

const provider = new SimulationDataProvider();
const snap = (h: 'chuva' | 'calor') => provider.getSnapshot(h);
const run = (h: 'chuva' | 'calor') => computeSteps(snap(h));

const EXPECTED: Record<RegionId | 'cidade', number[]> = {
  norte: [21, 47, 71, 86, 94],
  centro: [16, 28, 36, 47, 51],
  leste: [9, 21, 29, 43, 47],
  sul: [11, 16, 29, 26, 35],
  cidade: [18, 37, 56, 68, 75]
};

describe('Pressure Engine — Super El Niño (tabela de aceitação, tolerância ±1)', () => {
  const steps = run('chuva');
  for (const id of ['norte', 'centro', 'leste', 'sul'] as RegionId[]) {
    it(`pontuações de ${id}`, () => {
      steps.forEach((s, t) => expect(Math.abs(s.regions[id].score - EXPECTED[id][t])).toBeLessThanOrEqual(1));
    });
  }
  it('pontuação da cidade', () => {
    steps.forEach((s, t) => expect(Math.abs(s.city.score - EXPECTED.cidade[t])).toBeLessThanOrEqual(1));
  });
  it('níveis do Norte: normal → atenção → elevado → crítico', () => {
    expect(steps.map((s) => s.regions.norte.level)).toEqual([0, 1, 2, 3, 3]);
  });
  it('alerta do Norte às 14:10 com ~10 min; Norte saturado às 14:30; alerta do Leste às 14:40 com ~10 min', () => {
    expect(steps[1].regions.norte.alert).toBe(true);
    expect(steps[1].regions.norte.etaMinutes).toBeCloseTo(10, 5);
    expect(steps[3].regions.norte.etaMinutes).toBe('saturado');
    expect(steps[4].regions.leste.alert).toBe(true);
    expect(steps[4].regions.leste.etaMinutes).toBeCloseTo(10, 5);
    const events = alertEventsUntil(steps, REGIONS, 4).map((e) => `${stepClock(e.t)} ${e.regionId} ${e.kind}`);
    expect(events).toEqual(['14:10 norte alerta', '14:30 norte esgotada', '14:40 leste alerta']);
  });
  it('antecedência do primeiro alerta: 20 min, só depois que o Norte esgota', () => {
    expect(leadMinutes(alertEventsUntil(steps, REGIONS, 2))).toBeNull();
    expect(leadMinutes(alertEventsUntil(steps, REGIONS, 3))).toBe(20);
  });
  it('em T0 não há variação nem crescimento', () => {
    expect(steps[0].regions.norte.deltaVs10min).toBe(0);
    expect(steps[0].regions.norte.growth).toBe(0);
  });
});

describe('Aba Calor', () => {
  it('usa clamp((IC − 28) ÷ 14) × 20 e mantém pontuações no intervalo 0–100', () => {
    const steps = run('calor');
    const clima = steps[4].regions.norte.factors.find((f) => f.key === 'clima')!;
    expect(clima.points).toBe(20); // IC 42 → (42 − 28) ÷ 14 = 1
    const clima0 = steps[0].regions.norte.factors.find((f) => f.key === 'clima')!;
    expect(clima0.points).toBeCloseTo((20 * 4) / 14, 5); // IC 32
    for (const s of steps) for (const r of REGIONS) {
      expect(s.regions[r.id].score).toBeGreaterThanOrEqual(0);
      expect(s.regions[r.id].score).toBeLessThanOrEqual(100);
    }
  });
});

describe('Fatores inteiros (método do maior resto)', () => {
  it('somam exatamente a pontuação exibida em todos os passos e nas duas abas', () => {
    for (const h of ['chuva', 'calor'] as const) {
      for (const step of run(h)) for (const r of REGIONS) {
        const p = step.regions[r.id];
        const ints = roundFactors(p.factors.map((f) => f.points), p.score);
        expect(ints.reduce((a, b) => a + b, 0)).toBe(p.score);
        ints.forEach((v, i) => expect(v).toBeLessThanOrEqual(p.factors[i].max));
      }
    }
  });
});

describe('"E se +1 equipe?"', () => {
  it('reduz a pontuação do Norte esgotado e devolve tempo até saturação numérico', () => {
    const sn = snap('chuva');
    const steps = computeSteps(sn);
    const depois = whatIfExtraTeam(sn, steps, 'norte', 3);
    expect(steps[3].regions.norte.etaMinutes).toBe('saturado');
    expect(depois.score).toBeLessThan(steps[3].regions.norte.score);
    expect(typeof depois.etaMinutes).toBe('number');
  });
});

describe('Dados derivados', () => {
  const sn = snap('chuva');
  const steps = computeSteps(sn);
  it('totais de equipes e ocorrências', () => {
    expect(totalsAt(steps, REGIONS, 0)).toEqual({ active: 2, free: 10, teams: 10 });
    expect(totalsAt(steps, REGIONS, 4)).toEqual({ active: 23, free: 5, teams: 10 });
  });
  it('regiões ordenadas da maior para a menor pressão', () => {
    expect(regionsByPressure(steps, REGIONS, 4).map((r) => r.id)).toEqual(['norte', 'centro', 'leste', 'sul']);
  });
  it('feed de alertas: um item por evento, o mais recente primeiro, sem repetir', () => {
    expect(alertFeedAt(steps, REGIONS, 0)).toEqual([]);
    expect(alertFeedAt(steps, REGIONS, 1).map((e) => `${e.time} ${e.text}`)).toEqual(['14:10 Alerta Norte: possível saturação em ~10 min']);
    expect(alertFeedAt(steps, REGIONS, 2)).toHaveLength(1); // 14:20: o Norte continua em alerta, sem nova entrada
    expect(alertFeedAt(steps, REGIONS, 4).map((e) => `${e.time} ${e.text}`)).toEqual([
      '14:40 Alerta Leste: possível saturação em ~10 min',
      '14:30 Norte: capacidade esgotada',
      '14:10 Alerta Norte: possível saturação em ~10 min'
    ]);
  });
  it('primeiro alerta do cenário: Norte às 14:10', () => {
    expect(firstAlert(steps, REGIONS)).toEqual({ t: 1, regionId: 'norte' });
  });
});

describe('Feed de ocorrências', () => {
  const steps = computeSteps(snap('chuva'));
  const all = buildOccurrences(steps, REGIONS, 'chuva');
  it('em 14:00 todas as ocorrências ativas entram às 14:00 (Norte 1, Centro 1)', () => {
    const t0 = all.filter((o) => o.t === 0);
    expect(t0.map((o) => o.regionId)).toEqual(['norte', 'centro']);
    expect(t0.every((o) => o.time === '14:00')).toBe(true);
  });
  it('ordem global passo → região → sequência e tipos em ciclo fixo', () => {
    expect(all.slice(0, 5).map((o) => o.type)).toEqual([
      'Alagamento em via pública', 'Queda de árvore', 'Acidente de trânsito', 'Dano estrutural', 'Pedido de resgate'
    ]);
    expect(all[5].type).toBe('Alagamento em via pública');
  });
  it('horário em 14:10: 14:00 + round(k × 10 ÷ (N + 1))', () => {
    const t1 = all.filter((o) => o.t === 1); // Norte +2, Centro +1, Leste +1 → N = 4
    expect(t1.map((o) => o.time)).toEqual(['14:02', '14:04', '14:06', '14:08']);
    expect(t1.map((o) => o.regionId)).toEqual(['norte', 'norte', 'centro', 'leste']);
  });
  it('o feed só mostra ocorrências com horário até o relógio atual', () => {
    expect(occurrencesUntil(all, 0).every((o) => o.minutes <= 0)).toBe(true);
    expect(occurrencesUntil(all, 2).every((o) => o.minutes <= 20)).toBe(true);
  });
  it('total de ocorrências do feed = ocorrências ativas (cenário sem queda)', () => {
    expect(occurrencesUntil(all, 4)).toHaveLength(23);
  });
});
