/**
 * Dados derivados, determinísticos, a partir dos resultados do engine.
 * Nada aqui inventa valores: tudo vem dos cenários.
 */
import type { Hazard, Region, RegionId, StepResult } from './types';
import { STEP_MINUTES } from './pressure';

export const OCCURRENCE_TYPES_CHUVA = [
  'Alagamento em via pública', 'Queda de árvore', 'Acidente de trânsito', 'Dano estrutural', 'Pedido de resgate'
] as const;
export const OCCURRENCE_TYPES_CALOR = [
  'Mal-estar por calor', 'Desidratação', 'Atendimento a idoso', 'Exaustão pelo calor', 'Pedido de refúgio'
] as const;

export const BASE_HOUR = 14;

/** minutos desde 14:00 -> "14:20" */
export function clockLabel(minutes: number): string {
  const h = BASE_HOUR + Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
export const stepClock = (t: number): string => clockLabel(t * STEP_MINUTES);

export interface Occurrence {
  /** posição global (0-based) na ordem passo → região → sequência */
  seq: number;
  regionId: RegionId;
  /** posição da ocorrência dentro da região (0-based) */
  indexInRegion: number;
  type: string;
  typeIndex: number;
  /** passo em que a ocorrência entra */
  t: number;
  /** minutos desde 14:00 */
  minutes: number;
  time: string;
}

/**
 * Novas ocorrências de uma região em um passo = máx(0, ativas[t] − ativas[t−1]); em T0, igual às ativas.
 * Horário no passo t ≥ 1: 14:(10·(t−1)) + round(k × 10 ÷ (N + 1)); em T0, tudo às 14:00.
 */
export function buildOccurrences(steps: StepResult[], regions: Region[], hazard: Hazard): Occurrence[] {
  const types = hazard === 'chuva' ? OCCURRENCE_TYPES_CHUVA : OCCURRENCE_TYPES_CALOR;
  const out: Occurrence[] = [];
  const perRegion: Record<string, number> = {};
  for (const step of steps) {
    const fresh: Array<{ regionId: RegionId }> = [];
    for (const r of regions) {
      const cur = step.regions[r.id].active;
      const prev = step.t > 0 ? steps[step.t - 1].regions[r.id].active : 0;
      const n = step.t === 0 ? cur : Math.max(0, cur - prev);
      for (let i = 0; i < n; i++) fresh.push({ regionId: r.id });
    }
    const N = fresh.length;
    fresh.forEach((f, idx) => {
      const k = idx + 1;
      const minutes = step.t === 0 ? 0 : STEP_MINUTES * (step.t - 1) + Math.round((k * STEP_MINUTES) / (N + 1));
      const seq = out.length;
      const typeIndex = seq % types.length;
      const indexInRegion = perRegion[f.regionId] ?? 0;
      perRegion[f.regionId] = indexInRegion + 1;
      out.push({ seq, regionId: f.regionId, indexInRegion, type: types[typeIndex], typeIndex, t: step.t, minutes, time: clockLabel(minutes) });
    });
  }
  return out;
}

/** Ocorrências com horário até o relógio do passo t. */
export function occurrencesUntil(all: Occurrence[], t: number): Occurrence[] {
  return all.filter((o) => o.minutes <= t * STEP_MINUTES);
}

export interface AlertEvent {
  t: number;
  regionId: RegionId;
  kind: 'alerta' | 'esgotada';
  etaMinutes: number | null;
}

/** Primeiro alerta e primeira saturação de cada região, até o passo t. */
export function alertEventsUntil(steps: StepResult[], regions: Region[], t: number): AlertEvent[] {
  const events: AlertEvent[] = [];
  const seenAlert = new Set<RegionId>();
  const seenSat = new Set<RegionId>();
  for (let s = 0; s <= t; s++) {
    for (const r of regions) {
      const p = steps[s].regions[r.id];
      if (p.alert && !seenAlert.has(r.id)) {
        seenAlert.add(r.id);
        events.push({ t: s, regionId: r.id, kind: 'alerta', etaMinutes: Math.max(1, Math.round(p.etaMinutes as number)) });
      }
      if (p.etaMinutes === 'saturado' && !seenSat.has(r.id)) {
        seenSat.add(r.id);
        events.push({ t: s, regionId: r.id, kind: 'esgotada', etaMinutes: null });
      }
    }
  }
  return events;
}

/** Antecedência (min) entre o primeiro alerta e a primeira saturação da mesma região. */
export function leadMinutes(events: AlertEvent[]): number | null {
  let best: { t: number; lead: number } | null = null;
  for (const sat of events.filter((e) => e.kind === 'esgotada')) {
    const first = events.find((e) => e.kind === 'alerta' && e.regionId === sat.regionId && e.t < sat.t);
    if (first && (best === null || sat.t < best.t)) best = { t: sat.t, lead: (sat.t - first.t) * STEP_MINUTES };
  }
  return best ? best.lead : null;
}

export interface Totals {
  active: number;
  free: number;
  teams: number;
}
export function totalsAt(steps: StepResult[], regions: Region[], t: number): Totals {
  let active = 0, free = 0, teams = 0;
  for (const r of regions) {
    const p = steps[t].regions[r.id];
    active += p.active; free += p.teamsFree; teams += p.teamsTotal;
  }
  return { active, free, teams };
}

/** Região por pressão decrescente (desempate pela ordem fixa). */
export function regionsByPressure(steps: StepResult[], regions: Region[], t: number): Region[] {
  return regions
    .map((r, i) => ({ r, i, s: steps[t].regions[r.id].rawScore }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.r);
}

export interface FeedEntry {
  t: number;
  time: string;
  regionId: RegionId;
  kind: 'alerta' | 'esgotada';
  text: string;
}

/** Feed de alertas até o passo t, do mais recente para o mais antigo (um item por evento, sem repetir nos passos seguintes). */
export function alertFeedAt(steps: StepResult[], regions: Region[], t: number): FeedEntry[] {
  const name = (id: RegionId) => regions.find((r) => r.id === id)!.name;
  return alertEventsUntil(steps, regions, t)
    .map((e, i) => ({
      i,
      entry: {
        t: e.t,
        time: stepClock(e.t),
        regionId: e.regionId,
        kind: e.kind,
        text: e.kind === 'esgotada'
          ? `${name(e.regionId)}: capacidade esgotada`
          : `Alerta ${name(e.regionId)}: possível saturação em ~${e.etaMinutes} min`
      } satisfies FeedEntry
    }))
    .sort((a, b) => b.entry.t - a.entry.t || b.i - a.i)
    .map((x) => x.entry);
}

/** Primeiro passo em que há alerta no cenário inteiro (para "Ir ao primeiro alerta"). */
export function firstAlert(steps: StepResult[], regions: Region[]): { t: number; regionId: RegionId } | null {
  const e = alertEventsUntil(steps, regions, steps.length - 1).find((x) => x.kind === 'alerta');
  return e ? { t: e.t, regionId: e.regionId } : null;
}
