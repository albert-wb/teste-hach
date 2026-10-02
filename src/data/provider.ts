import type { Hazard, Snapshot } from '../engine/types';
import { REGIONS } from './regions';
import { CALOR, CHUVA } from './scenarios';

/**
 * Fonte de dados do painel. Hoje: simulação determinística do cenário Super El Niño.
 * No futuro, um `RealDataProvider` implementa esta mesma interface sem mexer no engine.
 */
export interface DataProvider {
  readonly label: string;
  getSnapshot(hazard: Hazard): Snapshot;
}

export class SimulationDataProvider implements DataProvider {
  readonly label = 'Simulação determinística';

  getSnapshot(hazard: Hazard): Snapshot {
    const scenario = hazard === 'chuva' ? CHUVA : CALOR;
    const states = Object.fromEntries(
      REGIONS.map((r) => [r.id, scenario.states[r.id].map(([active, teamsFree]) => ({ active, teamsFree }))])
    ) as Snapshot['states'];
    return { hazard, regions: REGIONS, weather: [...scenario.weather], states };
  }
}
