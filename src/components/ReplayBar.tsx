import { stepClock } from '../engine/derived';
import { STEP_COUNT } from '../engine/pressure';
import { useApp } from '../state/AppContext';
import { Icon } from './icons';
import { Card } from './ui';

export function ReplayBar() {
  const { step, setStep, playing, togglePlay, speed, setSpeed, restart } = useApp();
  const atEnd = step >= STEP_COUNT - 1;

  return (
    <Card label="Controles do replay" className="flex items-center gap-4 px-3" style={{ height: 56 }}>
      <div className="flex flex-none items-center gap-1.5">
        <button className="btn btn-white" style={{ width: 34, height: 34, padding: 0, borderRadius: 999 }} onClick={togglePlay} aria-label={playing ? 'Pausar replay' : atEnd ? 'Reiniciar e reproduzir' : 'Reproduzir replay'}>
          <Icon name={playing ? 'pause' : 'play'} size={15} />
        </button>
        <button className="btn" style={{ width: 28, padding: 0 }} onClick={() => setStep(step - 1)} disabled={step === 0} aria-label="Passo anterior"><Icon name="prev" size={13} /></button>
        <button className="btn" style={{ width: 28, padding: 0 }} onClick={() => setStep(step + 1)} disabled={atEnd} aria-label="Próximo passo"><Icon name="next" size={13} /></button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="relative px-[6px]">
          <input
            type="range" className="track" min={0} max={STEP_COUNT - 1} step={1} value={step}
            onChange={(e) => setStep(Number(e.target.value))}
            aria-label="Momento do replay" aria-valuetext={`${stepClock(step)}, passo ${step + 1} de ${STEP_COUNT}`}
          />
        </div>
        <div className="relative mx-[6px] h-[14px]" aria-hidden="true">
          {Array.from({ length: STEP_COUNT }, (_, t) => (
            <button key={t} tabIndex={-1} onClick={() => setStep(t)} className="num absolute -translate-x-1/2 text-[10.5px] leading-[14px]" style={{ left: `${(t / (STEP_COUNT - 1)) * 100}%`, color: t === step ? '#f5f5f5' : '#a3a3a3', fontWeight: t === step ? 600 : 400 }}>
              {stepClock(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="seg flex-none" role="group" aria-label="Velocidade do replay">
        {([1, 2, 4] as const).map((s) => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)} className="num">{s}x</button>)}
      </div>
      <button className="btn flex-none" onClick={restart}><Icon name="restart" size={13} />Reiniciar</button>

      <span className="flex-none border-l border-line pl-4 text-[11px] leading-4 text-t2">Cenário: <b className="font-semibold text-t1">Super El Niño</b> · dados simulados</span>
    </Card>
  );
}
