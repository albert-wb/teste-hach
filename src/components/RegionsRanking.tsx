import { stepClock } from '../engine/derived';
import { etaLine, fmt } from '../lib/format';
import { RED } from '../lib/levels';
import { useApp } from '../state/AppContext';
import { Card, CardHead, DotBar, LevelIcon } from './ui';

export function RegionsRanking() {
  const { model, step, regionId, selectRegion } = useApp();
  return (
    <Card label="Regiões por pressão" className="flex min-h-0 flex-col">
      <CardHead icon="layers" title="Regiões por pressão" right={<span className="t-micro">Agora · <span className="num">{stepClock(step)}</span></span>} />
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col p-0" aria-label="Regiões, da maior para a menor pressão">
        {model.sorted.map((r) => {
          const p = model.cur.regions[r.id];
          const sel = r.id === regionId;
          return (
            <li key={r.id} className="min-h-0 flex-1 border-b border-line last:border-b-0">
              <button
                onClick={() => selectRegion(r.id)} aria-pressed={sel} aria-label={`${r.name}, pressão ${p.score}, ${etaLine(p.etaMinutes)}`}
                className="row-hover flex h-full w-full flex-col justify-center gap-1.5 px-4 text-left" style={{ background: sel ? '#161616' : undefined }}
              >
                <span className="flex items-center justify-between">
                  <span className="text-[14px] font-medium">{r.name}</span>
                  <span className="flex items-center gap-2"><LevelIcon level={p.level} size={12} /><span className="num text-[14px] font-semibold">{fmt(p.score)}</span></span>
                </span>
                <DotBar value={p.score} max={100} segments={20} color={p.level === 3 ? RED : '#f5f5f5'} />
                <span className="text-[11px] leading-[14px] text-t2">{etaLine(p.etaMinutes)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
