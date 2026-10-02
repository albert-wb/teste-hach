import { REGIONS } from '../data/regions';
import { stepClock } from '../engine/derived';
import { STEP_COUNT } from '../engine/pressure';
import type { RegionId } from '../engine/types';
import { RED } from '../lib/levels';
import { useApp } from '../state/AppContext';
import { Card, CardHead } from './ui';

/** 0 → #1A1A1A, 100 → #F0F0F0, em escala de cinza. */
const shade = (score: number): string => {
  const v = Math.round(0x1a + ((0xf0 - 0x1a) * Math.min(Math.max(score, 0), 100)) / 100);
  const h = v.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
};

type RowKey = RegionId | 'cidade';

export function HeatmapCard() {
  const { model, step, regionId, selectRegion, setStep } = useApp();
  const rows: Array<{ key: RowKey; name: string; values: number[] }> = [
    ...REGIONS.map((r) => ({ key: r.id as RowKey, name: r.name, values: model.steps.map((s) => s.regions[r.id].score) })),
    { key: 'cidade', name: 'Cidade', values: model.steps.map((s) => s.city.score) }
  ];
  let peak = { v: -1, name: '', t: 0 };
  for (const r of rows.slice(0, 4)) r.values.slice(0, step + 1).forEach((v, t) => { if (v > peak.v) peak = { v, name: r.name, t }; });

  return (
    <Card label="Pressão ao longo do tempo" className="flex min-h-0 flex-col">
      <CardHead icon="clock" title="Pressão ao longo do tempo" right={<span className="t-micro">Replay 14:00–14:40</span>} />
      <div className="flex flex-none items-start justify-between px-4 pt-3">
        <div className="flex flex-col"><span className="t-hero">{peak.v}</span><span className="text-[11px] leading-[14px] text-t2">Pico até agora · {peak.name} {stepClock(peak.t)}</span></div>
        <div className="flex flex-col items-end"><span className="t-hero">{model.cur.city.score}</span><span className="text-[11px] leading-[14px] text-t2">Cidade agora</span></div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-1 pt-3">
        <div className="grid min-h-0 flex-1 gap-1" style={{ gridTemplateColumns: '44px repeat(5, minmax(0, 1fr))', gridTemplateRows: `10px repeat(${rows.length}, minmax(0, 1fr)) 14px` }}>
          <span />
          {Array.from({ length: STEP_COUNT }, (_, t) => <span key={t} className="flex items-start justify-center">{t === step && <span className="mt-0 block h-[3px] w-[18px] bg-t1" aria-hidden="true" />}</span>)}
          {rows.map((r) => (
            <div key={r.key} className="contents" role="row">
              <span className="flex items-center text-[11px]" style={{ color: r.key === regionId ? '#f5f5f5' : '#a3a3a3', fontWeight: r.key === regionId ? 600 : 400 }}>{r.name}</span>
              {r.values.map((v, t) => {
                const future = t > step;
                const crit = !future && v >= 76;
                if (future) return <span key={t} style={{ border: '1px dashed #3a3a3a', borderRadius: 2 }} aria-hidden="true" />;
                return (
                  <button
                    key={t} aria-label={`${r.name}, ${stepClock(t)}, pressão ${v}${crit ? ', nível crítico' : ''}`} aria-pressed={r.key === regionId && t === step}
                    onClick={() => { if (r.key !== 'cidade') selectRegion(r.key); setStep(t); }}
                    className="relative flex items-center justify-center overflow-hidden"
                    style={{ background: shade(v), borderRadius: 2, outline: crit ? `1.5px solid ${RED}` : r.key === regionId && t === step ? '1.5px solid #f5f5f5' : undefined, outlineOffset: crit ? -1.5 : -1.5 }}
                  >
                    {crit && <svg className="absolute inset-0" width="100%" height="100%" aria-hidden="true"><rect width="100%" height="100%" fill="url(#pat-grade)" /></svg>}
                    <span className="num relative text-[12px] font-semibold" style={{ color: v > 55 ? '#0a0a0a' : '#f5f5f5' }}>{v}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <span />
          {Array.from({ length: STEP_COUNT }, (_, t) => <span key={t} className="num text-center text-[10px] leading-[14px]" style={{ color: t === step ? '#f5f5f5' : '#6e6e6e' }}>{stepClock(t)}</span>)}
        </div>
      </div>
      <div className="flex flex-none items-center justify-end gap-1.5 px-4 pb-2 text-[10px] text-t2">
        Menor
        {[0, 25, 50, 75, 100].map((v) => <span key={v} className="block h-[8px] w-[12px]" style={{ background: shade(v), border: '1px solid #3a3a3a', borderRadius: 1 }} />)}
        Maior
      </div>
    </Card>
  );
}
