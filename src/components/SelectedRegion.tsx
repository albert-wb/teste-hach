import { useMemo } from 'react';
import { REGIONS } from '../data/regions';
import { stepClock } from '../engine/derived';
import { roundFactors } from '../engine/pressure';
import type { FactorKey } from '../engine/types';
import { useCountUp } from '../lib/hooks';
import { fmt } from '../lib/format';
import { levelColor, RED } from '../lib/levels';
import { useApp } from '../state/AppContext';
import { Icon } from './icons';
import { Arrow, Card, DotBar, LevelIcon, LevelPill, Tip, deltaColor } from './ui';

/** Um padrão cinza por fator (mesma associação no gráfico e na legenda). */
const FACTOR_PATTERN: Record<FactorKey, string> = {
  demanda: 'pat-diag-grossa', crescimento: 'pat-dots', clima: 'pat-horizontal', recursos: 'pat-grade', vulnerabilidade: 'pat-vertical', infra: 'pat-diag-fina'
};

/** Cor de cada fator (a legenda e a rosca usam a mesma). O padrão por cima garante que não dependa só da cor. */
const FACTOR_COLOR: Record<FactorKey, string> = {
  demanda: '#ff7a59', crescimento: '#f2c14e', clima: '#4aa8e8', recursos: '#a78bfa', vulnerabilidade: '#2dd4bf', infra: '#f472b6'
};

interface Row { key: FactorKey; int: number; max: number; idx: number }

function Donut({ rows, score, level }: { rows: Row[]; score: number; level: 0 | 1 | 2 | 3 }) {
  const size = 188, c = size / 2, R = 88, r = 52;
  const total = rows.reduce((a, b) => a + b.int, 0) || 1;
  let acc = 0;
  const slices = rows.filter((x) => x.int > 0).map((x) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += x.int;
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const p = (a: number, rad: number) => [c + rad * Math.cos(a), c + rad * Math.sin(a)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = x.int === total
      ? `M${c} ${c - R}A${R} ${R} 0 1 1 ${c - 0.01} ${c - R}ZM${c} ${c - r}A${r} ${r} 0 1 0 ${c - 0.01} ${c - r}Z`
      : `M${x0} ${y0}A${R} ${R} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r} ${r} 0 ${large} 0 ${x3} ${y3}Z`;
    return { key: x.key, d };
  });
  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Composição da pressão: ${rows.map((x) => `${x.int} pontos de ${x.max}`).join(', ')}`}>
        {slices.map((s) => (
          <g key={s.key}>
            <path d={s.d} fill={FACTOR_COLOR[s.key]} fillOpacity="0.62" fillRule="evenodd" />
            <path d={s.d} fill={`url(#${FACTOR_PATTERN[s.key]})`} fillRule="evenodd" stroke="#0f151d" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="t-hero" style={{ fontSize: 34 }}>{fmt(score)}</span>
        <span className="num text-[11px] text-t3">/100</span>
        <span className="mt-0.5"><LevelIcon level={level} size={11} /></span>
      </div>
    </div>
  );
}

export function SelectedRegion() {
  const { model, regionId, step, hazard, setPanel } = useApp();
  const region = REGIONS.find((r) => r.id === regionId)!;
  const p = model.cur.regions[regionId];
  const prev = step > 0 ? model.steps[step - 1].regions[regionId] : null;
  const hero = useCountUp(p.score);
  const chuva = hazard === 'chuva';
  const delta = prev ? p.score - prev.score : null;
  const eta = p.etaMinutes;

  const names: Record<FactorKey, string> = {
    demanda: 'Demanda atual', crescimento: 'Crescimento da demanda', clima: chuva ? 'Intensidade da chuva' : 'Índice de calor',
    recursos: 'Recursos ocupados', vulnerabilidade: 'Vulnerabilidade', infra: 'Infraestrutura crítica'
  };
  const rows = useMemo<Row[]>(() => {
    const ints = roundFactors(p.factors.map((f) => f.points), p.score);
    return p.factors.map((f, i) => ({ key: f.key, int: ints[i], max: f.max, idx: i })).sort((a, b) => b.int - a.int || a.idx - b.idx);
  }, [p]);
  const top = rows[0];

  const SEG = 15;
  const filled = typeof eta === 'number' ? Math.max(1, Math.min(SEG, Math.round((eta / 15) * SEG))) : 0;
  const teams = chuva
    ? `${p.teamsFree} ${p.teamsFree === 1 ? 'equipe livre' : 'equipes livres'} de ${p.teamsTotal}`
    : `${p.teamsFree} de ${p.teamsTotal} equipes e refúgios disponíveis`;

  return (
    <Card className="flex min-h-0 flex-col" label="Região selecionada" style={{ flex: '40 1 0%' }}>
      <div className="flex h-[76px] flex-none items-center gap-3 border-b border-line px-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="t-hero" aria-label={`Região ${region.name}, pressão ${p.score} de 100`}>{fmt(hero)}</span>
            <span className="num text-[13px] text-t3">/100</span>
            <LevelPill level={p.level} />
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap text-[12px] leading-4 text-t2">
            <b className="font-semibold text-t1">{region.name}</b> ·
            Pressão operacional
            <Tip text="Índice de 0 a 100 que combina demanda, chuva, equipes e vulnerabilidade." side="below"><button aria-label="O que é a pressão operacional?" className="text-t2 hover:text-t1"><Icon name="help" size={12} /></button></Tip>
            · <span className="num">{stepClock(step)}</span> · {teams}
          </span>
        </div>
        <div className="flex flex-none flex-col items-end" style={{ color: deltaColor(delta) }}>
          <span className="num flex items-center gap-1 text-[14px] font-semibold">{delta === null ? '—' : <><Arrow delta={delta} size={13} />{Math.abs(delta)} pts</>}</span>
          <span className="t-micro">vs 10 min antes</span>
        </div>
      </div>

      <div className="flex h-10 flex-none items-center gap-3 border-b border-line px-4" role="status" style={eta === 'saturado' ? { background: 'color-mix(in srgb, var(--nivel-critico) 14%, transparent)' } : undefined}>
        {eta === 'saturado' ? (
          <span className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: RED }}><LevelIcon level={3} size={13} color={RED} />Capacidade esgotada nesta região</span>
        ) : eta === null ? (
          <span className="flex items-center gap-2 text-[13px] text-t2"><LevelIcon level={0} size={13} color={levelColor(0)} />Sem tendência de saturação</span>
        ) : (
          <>
            <span className="flex-none text-[12px] text-t2">Tempo até saturação</span>
            <span className="num flex-none whitespace-nowrap text-[14px] font-semibold">~{Math.max(1, Math.round(eta))} min</span>
            <div className="flex min-w-0 flex-1"><DotBar value={filled} max={SEG} segments={SEG} color={typeof eta === 'number' && eta <= 5 ? 'var(--nivel-critico)' : typeof eta === 'number' && eta <= 10 ? 'var(--nivel-elevado)' : 'var(--nivel-atencao)'} /></div>
          </>
        )}
        <span className="ml-auto flex-none text-[10.5px] leading-3 text-t3">Estimativa por tendência;<br />não validada.</span>
      </div>

      <div className="flex min-h-0 flex-1 items-center gap-6 px-6">
        <Donut rows={rows} score={p.score} level={p.level} />
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-2.5 p-0" aria-label="Pontos por fator, do maior para o menor">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2.5">
              <svg width="14" height="14" aria-hidden="true" className="flex-none"><rect x="0.5" y="0.5" width="13" height="13" fill={FACTOR_COLOR[r.key]} fillOpacity="0.62" stroke={FACTOR_COLOR[r.key]} /><rect x="0.5" y="0.5" width="13" height="13" fill={`url(#${FACTOR_PATTERN[r.key]})`} /></svg>
              <span className="min-w-0 flex-1 truncate text-[13px]">{names[r.key]}</span>
              <span className="num w-[24px] flex-none text-right text-[14px] font-semibold">{r.int}</span>
              <span className="num w-[42px] flex-none text-[11px] text-t3">de {r.max}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex h-9 flex-none items-center justify-between border-t border-line px-4 text-[12px]">
        <span className="text-t2">Principal fator: <b className="font-semibold text-t1">{names[top.key]}</b> (<span className="num">{top.int}</span> de <span className="num">{top.max}</span> pontos).</span>
        <button className="text-t1 underline" onClick={() => setPanel('como')}>Como é calculado?</button>
      </div>
    </Card>
  );
}
