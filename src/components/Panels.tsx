import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { ALERT_MAX_ETA, ALERT_MIN_SCORE, whatIfExtraTeam } from '../engine/pressure';
import { stepClock } from '../engine/derived';
import { levelColor, LEVELS } from '../lib/levels';
import { useApp } from '../state/AppContext';
import { LEGEND_PATTERN } from './Patterns';
import { Icon } from './icons';
import { LevelIcon } from './ui';

/** Painel lateral sobre o conteúdo. Esc e clique fora fecham; o foco vai para o botão de fechar. */
function Drawer({ title, sub, children, onClose }: { title: string; sub?: string; children: ReactNode; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  return (
    <div className="absolute inset-0 z-40 flex justify-end" style={{ background: 'rgba(0,0,0,0.55)' }} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-label={title} className="drawer card flex h-full w-[420px] flex-col" style={{ borderRadius: 0, background: '#0f151d' }}>
        <header className="flex flex-none items-center gap-2 border-b border-line px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <h2 className="m-0 text-[15px] font-semibold leading-5">{title}</h2>
            {sub && <span className="t-micro">{sub}</span>}
          </div>
          <button ref={closeRef} className="btn ml-auto" style={{ width: 28, padding: 0 }} onClick={onClose} aria-label="Fechar painel"><Icon name="close" size={14} /></button>
        </header>
        <div className="scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

const FACTORS: Array<{ name: string; formula: string; max: number }> = [
  { name: 'Demanda atual', formula: '25 × mín(ocorrências ativas ÷ 12; 1)', max: 25 },
  { name: 'Crescimento da demanda', formula: '20 × limitar((ativas − ativas 10 min antes) ÷ 4; 0; 1). No primeiro passo vale 0.', max: 20 },
  { name: 'Chuva / calor', formula: 'Chuva: 20 × limitar(mm/h ÷ 80). Calor: 20 × limitar((índice de calor − 28) ÷ 14).', max: 20 },
  { name: 'Recursos ocupados', formula: '20 × (1 − equipes livres ÷ equipes totais)', max: 20 },
  { name: 'Vulnerabilidade', formula: '10 × vulnerabilidade da região (0 a 1)', max: 10 },
  { name: 'Infraestrutura crítica', formula: '5 × mín(itens críticos ÷ 2; 1)', max: 5 }
];

function HowItWorksPanel() {
  return (
    <div className="flex flex-col gap-5 px-4 py-4 text-[12.5px] leading-[18px]">
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">O que o Pressure Engine responde</h3>
        <p className="m-0 text-t2">Em qual região a capacidade de resposta pode ser sobrecarregada primeiro, e em quanto tempo. Ele não prevê ocorrências: extrapola a tendência dos últimos 10 minutos.</p>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">Pressão operacional (0 a 100)</h3>
        <p className="m-0 mb-2 text-t2">Soma de seis fatores, arredondada. A pressão da cidade é 0,5 × a maior região + 0,5 × a média das regiões.</p>
        <table className="w-full border-collapse text-left text-[11.5px] leading-4">
          <thead><tr className="text-t2"><th className="border-b border-line py-1 pr-2 font-medium">Fator</th><th className="border-b border-line py-1 pr-2 font-medium">Cálculo</th><th className="border-b border-line py-1 text-right font-medium">Máx.</th></tr></thead>
          <tbody>
            {FACTORS.map((f) => (
              <tr key={f.name} className="align-top">
                <td className="border-b border-line py-1.5 pr-2 font-medium">{f.name}</td>
                <td className="border-b border-line py-1.5 pr-2 text-t2">{f.formula}</td>
                <td className="num border-b border-line py-1.5 text-right">{f.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3 className="m-0 mb-2 text-[13px] font-semibold">Níveis</h3>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {LEVELS.map((l, i) => (
            <li key={l.key} className="flex items-center gap-2.5">
              <svg width="26" height="16" aria-hidden="true" style={{ flex: 'none' }}>
                <rect x="0.5" y="0.5" width="25" height="15" rx="2" fill={LEGEND_PATTERN[i] ? `url(#${LEGEND_PATTERN[i]})` : 'none'} stroke={levelColor(i as 0 | 1 | 2 | 3)} />
              </svg>
              <LevelIcon level={i as 0 | 1 | 2 | 3} size={11} />
              <b className="t-level w-[64px] text-[11px]">{l.name}</b>
              <span className="num w-[52px] text-t2">{l.range}</span>
              <span className="text-t2">{l.shape} · {l.pattern}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">Tempo até saturação</h3>
        <p className="m-0 text-t2">Se não há equipes livres, a região está saturada. Se a demanda cresce, o tempo é (equipes livres ÷ novas ocorrências em 10 min) × 10 min. Se a demanda não cresce, não há tendência de saturação. É uma estimativa por tendência, não validada.</p>
      </section>
      <section>
        <h3 className="m-0 mb-1 text-[13px] font-semibold">Quando o alerta dispara</h3>
        <p className="m-0 text-t2">Pressão de <b className="num text-t1">{ALERT_MIN_SCORE}</b> ou mais e tempo até saturação de <b className="num text-t1">{ALERT_MAX_ETA} min</b> ou menos. A prioridade é Crítica com capacidade esgotada ou tempo ≤ 5 min; Alta de 6 a 15 min.</p>
      </section>
      <section className="border border-line p-3" style={{ borderRadius: 2 }}>
        <b className="font-semibold">Modo demonstração</b>
        <p className="m-0 mt-1 text-t2">Todos os dados são simulados, de forma determinística: o mesmo passo sempre gera o mesmo resultado (cenário único: Super El Niño). A geometria das zonas do mapa é editável em <span className="num">src/data/zones.geo.json</span>.</p>
      </section>
    </div>
  );
}

export function PanelHost() {
  const { panel, setPanel } = useApp();
  if (panel !== 'como') return null;
  return <Drawer title="Como funciona" sub="Pressure Engine: fórmula, fatores e níveis" onClose={() => setPanel(null)}><HowItWorksPanel /></Drawer>;
}

/** Comparativo "Antes → Depois" de uma equipe a mais na região selecionada, no passo atual. */
export function WhatIfDialog() {
  const { whatIf, setWhatIf, model, regionId, step } = useApp();
  const closeRef = useRef<HTMLButtonElement>(null);
  const wi = useMemo(() => (whatIf ? whatIfExtraTeam(model.snap, model.steps, regionId, step) : null), [whatIf, model.snap, model.steps, regionId, step]);
  useEffect(() => {
    if (!whatIf) return;
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setWhatIf(false); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [whatIf, setWhatIf]);
  if (!wi) return null;
  const region = model.regions.find((r) => r.id === regionId)!;
  const before = model.cur.regions[regionId];
  const etaTxt = (e: typeof before.etaMinutes) => (e === 'saturado' ? 'Saturado' : e === null ? 'Sem tendência' : `~${Math.max(1, Math.round(e))} min`);
  const cards = [{ t: 'Antes', pr: before }, { t: 'Depois', pr: wi }];
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onPointerDown={(e) => { if (e.target === e.currentTarget) setWhatIf(false); }}>
      <div role="dialog" aria-modal="true" aria-label="E se mais uma equipe" className="card flex w-[460px] flex-col gap-3 p-4" style={{ background: '#161e29' }}>
        <i className="lm lm-tl" /><i className="lm lm-tr" /><i className="lm lm-bl" /><i className="lm lm-br" />
        <div className="flex items-center justify-between">
          <b className="text-[14px] font-semibold">E se +1 equipe? · Região {region.name}</b>
          <button ref={closeRef} className="btn" style={{ height: 26, width: 26, padding: 0 }} aria-label="Fechar comparação" onClick={() => setWhatIf(false)}><Icon name="close" size={13} /></button>
        </div>
        <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 20px 1fr' }}>
          <Side {...cards[0]} etaTxt={etaTxt} />
          <Icon name="arrowRight" size={18} className="text-t2" />
          <Side {...cards[1]} etaTxt={etaTxt} strong />
        </div>
        <span className="t-micro">Considera uma equipe adicional livre em {stepClock(step)}. Estimativa por tendência; não validada.</span>
      </div>
    </div>
  );
}

function Side({ t, pr, etaTxt, strong }: { t: string; pr: { score: number; level: 0 | 1 | 2 | 3; etaMinutes: number | 'saturado' | null }; etaTxt: (e: number | 'saturado' | null) => string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border p-3" style={{ borderRadius: 2, borderColor: strong ? '#f5f5f5' : '#26313f' }}>
      <span className="t-micro">{t}</span>
      <span className="flex items-baseline gap-2"><span className="t-hero">{pr.score}</span><LevelIcon level={pr.level} size={12} /><span className="t-level text-[10px]">{LEVELS[pr.level].name}</span></span>
      <span className="text-[11px] text-t2">Tempo até saturação: <span className="num text-t1">{etaTxt(pr.etaMinutes)}</span></span>
    </div>
  );
}
