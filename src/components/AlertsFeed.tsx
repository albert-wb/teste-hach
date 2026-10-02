import { useEffect, useRef } from 'react';
import { RED } from '../lib/levels';
import { useApp } from '../state/AppContext';
import { Icon } from './icons';
import { Card, CardHead, LevelIcon } from './ui';

export function AlertsFeed() {
  const { model, selectRegion, setPanel, registerAlerts } = useApp();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { registerAlerts(ref.current); return () => registerAlerts(null); }, [registerAlerts]);
  const feed = model.feed;

  return (
    <Card ref={ref} tabIndex={-1} label="Alertas" className="flex min-h-0 flex-col">
      <CardHead icon="bell" title="Alertas" right={<span className="t-micro"><span className="num">{feed.length}</span> {feed.length === 1 ? 'emitido' : 'emitidos'}</span>} />
      {feed.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 px-4 text-center" aria-live="polite">
          <span className="mb-1 flex h-9 w-9 items-center justify-center border border-line2 text-t2" style={{ borderRadius: 999 }}><Icon name="check" size={18} /></span>
          <b className="text-[13px] font-semibold">Nenhum alerta ativo</b>
          <span className="text-[12px] text-t2">A situação está dentro da capacidade.</span>
          <button className="btn mt-2" onClick={() => setPanel('como')}>Ver regras de alerta</button>
        </div>
      ) : (
        <>
          <ul className="scroll m-0 flex min-h-0 flex-1 list-none flex-col overflow-y-auto p-0" aria-live="polite" aria-label="Alertas emitidos, do mais recente para o mais antigo">
            {feed.map((e) => {
              const level = model.steps[e.t].regions[e.regionId].level;
              return (
                <li key={`${e.t}-${e.regionId}-${e.kind}`} className="border-b border-line">
                  <button className="row-hover flex w-full items-start gap-3 px-4 py-3 text-left" onClick={() => selectRegion(e.regionId)}>
                    <span className="num w-[38px] flex-none pt-px text-[12px] text-t2">{e.time}</span>
                    <span className="mt-[3px] flex-none"><LevelIcon level={level} size={12} color={e.kind === 'esgotada' ? RED : undefined} /></span>
                    <span className="min-w-0 flex-1 text-[13px] leading-[18px]" style={e.kind === 'esgotada' ? { color: '#f5f5f5', fontWeight: 600 } : undefined}>{e.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {model.lead !== null && (
            <div className="flex flex-none items-center border-t border-line px-3 py-2">
              <span className="pill pill-line" style={{ height: 22 }}><Icon name="clock" size={12} />Antecedência do primeiro alerta: <span className="num">{model.lead} min</span></span>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
