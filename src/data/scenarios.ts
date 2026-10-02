import type { RegionId } from '../engine/types';

/** Pares [ocorrências ativas, equipes livres] por passo T0…T4. */
export type Pairs = Array<[number, number]>;

export interface Scenario {
  /** mm/h (chuva) ou índice de calor em °C */
  weather: number[];
  states: Record<RegionId, Pairs>;
}

/** Chuva — cenário único: Super El Niño */
export const CHUVA: Scenario = {
  weather: [20, 40, 63.8, 72, 80],
  states: {
    norte: [[1, 3], [3, 2], [6, 1], [9, 0], [12, 0]],
    centro: [[1, 3], [2, 3], [3, 3], [4, 2], [5, 2]],
    leste: [[0, 2], [1, 2], [2, 2], [3, 1], [4, 1]],
    sul: [[0, 2], [0, 2], [1, 2], [1, 2], [2, 2]]
  }
};

/** Calor — índice de calor (°C), mesmo cenário Super El Niño. Contagens plausíveis geradas para o protótipo. */
export const CALOR: Scenario = {
  weather: [32, 36, 39, 41, 42],
  states: {
    norte: [[1, 3], [2, 3], [4, 2], [6, 1], [8, 1]],
    centro: [[1, 3], [2, 3], [3, 2], [4, 2], [5, 1]],
    leste: [[0, 2], [1, 2], [1, 2], [2, 1], [3, 1]],
    sul: [[0, 2], [0, 2], [1, 2], [2, 2], [2, 1]]
  }
};
