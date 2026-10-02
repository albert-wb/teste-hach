export type RegionId = 'norte' | 'centro' | 'leste' | 'sul';
export type Hazard = 'chuva' | 'calor';
export type LevelIndex = 0 | 1 | 2 | 3;
export type FactorKey = 'demanda' | 'crescimento' | 'clima' | 'recursos' | 'vulnerabilidade' | 'infra';

export interface Region {
  id: RegionId;
  name: string;
  /** 0–1 */
  vulnerability: number;
  /** contagem de equipamentos críticos (saúde, escolas) */
  criticalInfra: number;
  teamsTotal: number;
}

/** Estado de uma região em um passo: ocorrências ativas e equipes livres. */
export interface RegionState {
  active: number;
  teamsFree: number;
}

/** Tudo o que o Pressure Engine precisa. Qualquer DataProvider devolve isto. */
export interface Snapshot {
  hazard: Hazard;
  regions: Region[];
  /** mm/h (chuva) ou índice de calor em °C (calor), um valor por passo */
  weather: number[];
  /** states[regionId][t] */
  states: Record<RegionId, RegionState[]>;
}

export interface Factor {
  key: FactorKey;
  /** pontos exatos (não arredondados) */
  points: number;
  max: number;
}

/** minutos até a saturação, "saturado" (sem equipes livres) ou null (sem tendência) */
export type Eta = number | 'saturado' | null;

export interface RegionPressure {
  regionId: RegionId;
  t: number;
  active: number;
  teamsFree: number;
  teamsTotal: number;
  factors: Factor[];
  /** soma exata dos fatores */
  rawScore: number;
  /** pontuação arredondada (a que é exibida) */
  score: number;
  level: LevelIndex;
  deltaVs10min: number;
  etaMinutes: Eta;
  /** crescimento de ocorrências em relação ao passo anterior */
  growth: number;
  /** regra de alerta: pontuação ≥ 45 e tempo até saturação numérico ≤ 15 min */
  alert: boolean;
}

export interface CityPressure {
  rawScore: number;
  score: number;
  level: LevelIndex;
  deltaVs10min: number;
}

export interface StepResult {
  t: number;
  weather: number;
  regions: Record<RegionId, RegionPressure>;
  city: CityPressure;
}
