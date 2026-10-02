import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '../lib/hooks';
import { STEP_COUNT } from '../engine/pressure';
import { stepClock } from '../engine/derived';
import { useApp } from '../state/AppContext';
import { Icon } from './icons';

export function TopBar() {
  const { hazard, setHazard, step, model, focusAlerts } = useApp();
  const [nino, setNino] = useState(false);
  const ninoRef = useRef<HTMLDivElement>(null);
  useDismiss(ninoRef, nino, useCallback(() => setNino(false), []));
  const emitted = model.feed.length;

  return (
    <header className="relative z-40 flex h-[52px] flex-none items-center gap-3 whitespace-nowrap border-b border-line bg-base px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
        <Icon name="grid" size={14} className="text-t2" />
        <span className="font-medium">Visão geral</span>
        <span className="text-t3">· Franca/SP</span>
      </div>

      <div className="seg flex-none" role="tablist" aria-label="Perigo monitorado">
        <button role="tab" aria-selected={hazard === 'chuva'} onClick={() => setHazard('chuva')} className="flex items-center gap-1.5"><Icon name="rain" size={14} />Chuva</button>
        <button role="tab" aria-selected={hazard === 'calor'} onClick={() => setHazard('calor')} className="flex items-center gap-1.5"><Icon name="thermo" size={14} />Calor</button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2.5">
        <div className="pill" role="status" style={{ border: '1px dashed #3a3a3a', height: 24, fontWeight: 500 }}>
          <span className="h-[6px] w-[6px] rounded-full" style={{ background: 'var(--ponto-demo)' }} aria-hidden="true" />
          MODO DEMONSTRAÇÃO — DADOS SIMULADOS
        </div>

        <div className="flex items-center gap-2 border-l border-line pl-3">
          <div className="flex flex-col items-end">
            <span className="num text-[15px] font-semibold leading-[18px]">{stepClock(step)}</span>
            <span className="text-[10px] leading-3 text-t2">passo {step + 1} de {STEP_COUNT}</span>
          </div>
        </div>

        <div ref={ninoRef} className="relative">
          <button className="btn" aria-expanded={nino} aria-haspopup="dialog" onClick={() => setNino((v) => !v)} style={{ height: 26, borderRadius: 999 }}>
            <Icon name="info" size={14} />El Niño 2026–27
          </button>
          {nino && (
            <div role="dialog" aria-label="Contexto El Niño 2026–27" className="absolute right-0 top-[34px] z-50 w-[330px] border border-line2 bg-s2 p-3 text-[12px] leading-[17px]">
              <p className="m-0">A NOAA estimava, em setembro, mais de 90% de chance de El Niño muito forte na primavera/verão 2026–27. Um evento forte aumenta a probabilidade de extremos, mas não os garante.</p>
              <a className="mt-2 inline-flex items-center gap-1 text-t1 underline" href="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/" target="_blank" rel="noopener noreferrer">
                Fonte: NOAA/CPC <Icon name="external" size={12} />
              </a>
            </div>
          )}
        </div>

        <button
          className="relative flex h-8 w-8 items-center justify-center border border-line2 text-t1 hover:bg-s3"
          style={{ borderRadius: 999, transition: 'background 200ms ease-out' }}
          aria-label={emitted > 0 ? `${emitted} alertas emitidos até agora. Ir ao cartão Alertas` : 'Nenhum alerta emitido. Ir ao cartão Alertas'}
          onClick={focusAlerts}
        >
          <Icon name="bell" size={16} />
          {emitted > 0 && <span className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-full bg-t1" aria-hidden="true" />}
        </button>

        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line2 text-[11px] font-semibold" aria-label="Perfil de demonstração: DC">DC</span>
      </div>
    </header>
  );
}
