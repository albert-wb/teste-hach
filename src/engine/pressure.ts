/**
 * Pressure Engine — funções puras, sem dependência de UI.
 * Responde: "em qual região a capacidade de resposta pode ser sobrecarregada primeiro, e em quanto tempo?"
 * Não prevê ocorrências: extrapola a tendência atual.
 */
import type {
  Eta, Factor, Hazard, LevelIndex, Region, RegionId, RegionPressure, Snapshot, StepResult
} from './types';

export const STEP_COUNT = 5;
export const STEP_MINUTES = 10;
export const ALERT_MIN_SCORE = 45;
export const ALERT_MAX_ETA = 15;

export const clamp = (x: number, min: number, max: number): number => Math.min(Math.max(x, min), max);

export function levelOf(score: number): LevelIndex {
  const s = Math.round(score);
  if (s <= 25) return 0;
  if (s <= 50) return 1;
  if (s <= 75) return 2;
  return 3;
}

export const LEVEL_NAMES = ['NORMAL', 'ATENÇÃO', 'ELEVADO', 'CRÍTICO'] as const;
export const LEVEL_RANGES = ['0–25', '26–50', '51–75', '76–100'] as const;

/** Parcela do clima: chuva (mm/h ÷ 80) ou índice de calor ((IC − 28) ÷ 14), máximo 20 pontos. */
export function weatherPoints(hazard: Hazard, w: number): number {
  return hazard === 'chuva' ? 20 * clamp(w / 80, 0, 1) : 20 * clamp((w - 28) / 14, 0, 1);
}

export interface ScoreInput {
  region: Region;
  hazard: Hazard;
  weather: number;
  active: number;
  /** ocorrências ativas no passo anterior (em t = 0, igual a `active`) */
  prevActive: number;
  teamsFree: number;
  teamsTotal: number;
  t: number;
}

export interface ScoreOutput {
  factors: Factor[];
  rawScore: number;
  etaMinutes: Eta;
  growth: number;
}

/** Fórmula do briefing; cada componente limitado a [0, máximo]. */
export function scoreRegion(i: ScoreInput): ScoreOutput {
  const growth = i.t > 0 ? i.active - i.prevActive : 0;
  const factors: Factor[] = [
    { key: 'demanda', points: 25 * Math.min(i.active / 12, 1), max: 25 },
    { key: 'crescimento', points: 20 * clamp(growth / 4, 0, 1), max: 20 },
    { key: 'clima', points: weatherPoints(i.hazard, i.weather), max: 20 },
    { key: 'recursos', points: 20 * clamp(1 - i.teamsFree / i.teamsTotal, 0, 1), max: 20 },
    { key: 'vulnerabilidade', points: 10 * i.region.vulnerability, max: 10 },
    { key: 'infra', points: 5 * Math.min(i.region.criticalInfra / 2, 1), max: 5 }
  ];
  const rawScore = factors.reduce((a, f) => a + f.points, 0);
  let etaMinutes: Eta = null;
  if (i.teamsFree === 0) etaMinutes = 'saturado';
  else if (growth > 0) etaMinutes = (i.teamsFree / growth) * STEP_MINUTES;
  return { factors, rawScore, etaMinutes, growth };
}

export function isAlert(rawScore: number, eta: Eta): boolean {
  return rawScore >= ALERT_MIN_SCORE && typeof eta === 'number' && eta <= ALERT_MAX_ETA;
}

/**
 * Método do maior resto: pontos inteiros que somam exatamente `total`.
 * Devolve os inteiros na mesma ordem dos fatores.
 */
export function roundFactors(points: number[], total: number): number[] {
  const floors = points.map((p) => Math.floor(p + 1e-9));
  let rest = total - floors.reduce((a, b) => a + b, 0);
  const order = points
    .map((p, idx) => ({ idx, frac: p - Math.floor(p + 1e-9) }))
    .sort((a, b) => b.frac - a.frac || a.idx - b.idx);
  const out = floors.slice();
  for (let k = 0; rest > 0 && k < order.length * 2; k++, rest--) out[order[k % order.length].idx] += 1;
  return out;
}

/** Calcula todos os passos (T0…T4) para um snapshot. */
export function computeSteps(snap: Snapshot): StepResult[] {
  const out: StepResult[] = [];
  for (let t = 0; t < STEP_COUNT; t++) {
    const regions = {} as Record<RegionId, RegionPressure>;
    let max = 0;
    let sum = 0;
    for (const region of snap.regions) {
      const st = snap.states[region.id][t];
      const prevActive = t > 0 ? snap.states[region.id][t - 1].active : st.active;
      const s = scoreRegion({
        region, hazard: snap.hazard, weather: snap.weather[t], active: st.active, prevActive,
        teamsFree: st.teamsFree, teamsTotal: region.teamsTotal, t
      });
      const score = Math.round(s.rawScore);
      const prev = t > 0 ? out[t - 1].regions[region.id] : null;
      regions[region.id] = {
        regionId: region.id, t, active: st.active, teamsFree: st.teamsFree, teamsTotal: region.teamsTotal,
        factors: s.factors, rawScore: s.rawScore, score, level: levelOf(score),
        deltaVs10min: prev ? score - prev.score : 0, etaMinutes: s.etaMinutes, growth: s.growth,
        alert: isAlert(s.rawScore, s.etaMinutes)
      };
      max = Math.max(max, s.rawScore);
      sum += s.rawScore;
    }
    const raw = 0.5 * max + 0.5 * (sum / snap.regions.length);
    const score = Math.round(raw);
    const prevCity = t > 0 ? out[t - 1].city.score : score;
    out.push({
      t, weather: snap.weather[t], regions,
      city: { rawScore: raw, score, level: levelOf(score), deltaVs10min: t > 0 ? score - prevCity : 0 }
    });
  }
  return out;
}

/** "E se +1 equipe?": recalcula a região no passo t com uma equipe adicional, livre. */
export function whatIfExtraTeam(snap: Snapshot, steps: StepResult[], regionId: RegionId, t: number): RegionPressure {
  const region = snap.regions.find((r) => r.id === regionId)!;
  const cur = steps[t].regions[regionId];
  const prevActive = t > 0 ? steps[t - 1].regions[regionId].active : cur.active;
  const teamsTotal = region.teamsTotal + 1;
  const teamsFree = cur.teamsFree + 1;
  const s = scoreRegion({
    region, hazard: snap.hazard, weather: steps[t].weather, active: cur.active, prevActive, teamsFree, teamsTotal, t
  });
  const score = Math.round(s.rawScore);
  return {
    ...cur, teamsFree, teamsTotal, factors: s.factors, rawScore: s.rawScore, score, level: levelOf(score),
    etaMinutes: s.etaMinutes, alert: isAlert(s.rawScore, s.etaMinutes)
  };
}
