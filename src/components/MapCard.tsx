import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { mapData, fitTo, pathOfLine, pathOfMulti, toPx } from '../data/mapData';
import { REGIONS } from '../data/regions';
import { OCCURRENCE_ICONS_CALOR, OCCURRENCE_ICONS_CHUVA, Icon, type IconName } from './icons';
import { LEVELS, RED, levelPatternId, levelTint } from '../lib/levels';
import { useSize } from '../lib/hooks';
import { fmt } from '../lib/format';
import type { RegionId } from '../engine/types';
import type { Pt } from '../lib/geo';
import { useApp, type LayerKey } from '../state/AppContext';
import type { MapTab } from '../state/urlState';
import { useCountUp } from '../lib/hooks';
import { stepClock } from '../engine/derived';
import { signed } from '../lib/format';
import { Arrow, Card, LevelIcon, LevelPill, deltaColor } from './ui';
import { LEGEND_PATTERN } from './Patterns';

const TABS: Array<{ k: MapTab; label: string }> = [
  { k: 'pressao', label: 'Pressão' }, { k: 'ocorrencias', label: 'Ocorrências' }, { k: 'recursos', label: 'Recursos' }
];
const LAYERS: Array<{ k: LayerKey; label: string; needs?: 'vias' | 'corregos' }> = [
  { k: 'zonas', label: 'Zonas' }, { k: 'vias', label: 'Vias', needs: 'vias' }, { k: 'corregos', label: 'Córregos', needs: 'corregos' },
  { k: 'ocorrencias', label: 'Ocorrências' }, { k: 'equipes', label: 'Equipes' }, { k: 'infra', label: 'Infraestrutura' }, { k: 'refugios', label: 'Refúgios' }
];
const INFRA_KINDS: Record<RegionId, IconName[]> = { norte: ['health', 'school'], centro: ['health'], leste: [], sul: ['school'] };

interface View { k: number; x: number; y: number }
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export function MapCard() {
  const app = useApp();
  const { model, regionId, selectRegion, mapTab, setMapTab, layers, toggleLayer, hazard } = app;
  const boxRef = useRef<HTMLDivElement>(null);
  const { w: W0, h: H0 } = useSize(boxRef);
  const W = W0 || 600, H = H0 || 340;
  const fit = useMemo(() => fitTo(W, H, 18, 44, 44), [W, H]);
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [hover, setHover] = useState<{ id: RegionId; x: number; y: number } | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number; moved: boolean; captured: boolean } | null>(null);
  const suppressClick = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const occTypes = hazard === 'chuva' ? OCCURRENCE_ICONS_CHUVA : OCCURRENCE_ICONS_CALOR;

  const constrain = (v: View): View => ({ k: v.k, x: clamp(v.x, W - W * v.k, 0), y: clamp(v.y, H - H * v.k, 0) });
  const zoomAt = (factor: number, cx = W / 2, cy = H / 2) => setView((v) => {
    const k = clamp(v.k * factor, 1, 8);
    return constrain({ k, x: cx - (cx - v.x) * (k / v.k), y: cy - (cy - v.y) * (k / v.k) });
  });

  /* zoom com a roda (listener não passivo, para poder impedir a rolagem da página) */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = W / r.width;
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, (e.clientX - r.left) * sx, (e.clientY - r.top) * (H / r.height));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H]);

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = boxRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)];
  };
  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, captured: false };
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || e.buttons === 0) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true;
      if (!d.captured) { e.currentTarget.setPointerCapture(e.pointerId); d.captured = true; }
      setHover(null);
    }
    if (d.moved) {
      const r = boxRef.current!.getBoundingClientRect();
      setView((v) => constrain({ k: v.k, x: d.vx + dx * (W / r.width), y: d.vy + dy * (H / r.height) }));
    }
  };
  const onUp = () => { if (drag.current?.moved) { suppressClick.current = true; window.setTimeout(() => { suppressClick.current = false; }, 0); } drag.current = null; };

  const S = (p: Pt): Pt => { const q = toPx(p, fit); return [q[0] * view.k + view.x, q[1] * view.k + view.y]; };

  const urbanPath = useMemo(() => pathOfMulti(mapData.urban, fit), [fit]);
  const zonePaths = useMemo(() => Object.fromEntries(REGIONS.map((r) => [r.id, pathOfMulti(mapData.zones[r.id].multi, fit)])) as Record<RegionId, string>, [fit]);
  const roadPaths = useMemo(() => ({
    main: mapData.roads.filter((r) => r.main).map((r) => pathOfLine(r.pts, fit)).join(''),
    sec: mapData.roads.filter((r) => !r.main).map((r) => pathOfLine(r.pts, fit)).join('')
  }), [fit]);
  const streamPaths = useMemo(() => mapData.streams.map((s) => ({ name: s.name, d: pathOfLine(s.pts, fit) })), [fit]);

  const hasRoads = mapData.roads.length > 0;
  const hasStreams = mapData.streams.length > 0;
  const showZones = layers.zonas;
  const pressure = mapTab === 'pressao';
  const sel = REGIONS.find((r) => r.id === regionId)!;
  const order = [...REGIONS.filter((r) => r.id !== regionId), sel];

  // escala gráfica
  const pxPerKm = fit.scale * view.k;
  const nice = [0.5, 1, 2, 5, 10, 20].filter((n) => n * pxPerKm <= 110).pop() ?? 0.5;

  const hovered = hover ? model.cur.regions[hover.id] : null;
  const hoveredRegion = hover ? REGIONS.find((r) => r.id === hover.id)! : null;

  const labelOf = (id: RegionId) => S(mapData.zones[id].label);

  return (
    <Card className="flex min-h-0 flex-col" label="Mapa de pressão" style={{ flex: '56 1 0%' }}>
      <MapHeader />
      <div className="flex h-9 flex-none items-center justify-between border-b border-line px-3">
        <span className="t-micro">Zonas da cidade · clique para selecionar</span>
        <div className="seg" role="tablist" aria-label="Camada do mapa">
          {TABS.map((t) => <button key={t.k} role="tab" aria-selected={mapTab === t.k} onClick={() => setMapTab(t.k)} style={{ height: 22, padding: '0 10px', fontSize: 11 }}>{t.label}</button>)}
        </div>
      </div>
      <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden" style={{ background: '#0c0c0c' }}>
        <svg
          ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Mapa de Franca com as quatro zonas"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          style={{ display: 'block', touchAction: 'none', cursor: view.k > 1 ? 'grab' : 'default' }}
        >
          <defs>
            <pattern id="pat-fundo" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="0.8" fill="#222" /></pattern>
          </defs>
          <rect width={W} height={H} fill="url(#pat-fundo)" />
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            <path d={urbanPath} fill="#141414" stroke="#2e2e2e" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {layers.vias && roadPaths.sec && <path d={roadPaths.sec} fill="none" stroke="#2e2e2e" strokeWidth="0.75" vectorEffect="non-scaling-stroke" />}
            {layers.vias && roadPaths.main && <path d={roadPaths.main} fill="none" stroke="#3a3a3a" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />}

            {showZones && order.map((r) => {
              const p = model.cur.regions[r.id];
              const isSel = r.id === regionId;
              const pat = levelPatternId(p.level);
              const d = zonePaths[r.id];
              return (
                <g key={r.id}>
                  <path
                    d={d} className="zone" tabIndex={0} role="button"
                    aria-label={`${r.name}, pressão ${p.score}, nível ${LEVELS[p.level].name.toLowerCase()}`}
                    aria-pressed={isSel}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      fill: pressure ? levelTint(p.level) : '#141414',
                      stroke: pressure ? (p.level === 3 ? RED : '#6e6e6e') : '#3a3a3a',
                      strokeWidth: 1.5
                    }}
                    onClick={() => { if (!suppressClick.current) selectRegion(r.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRegion(r.id); } }}
                    onPointerEnter={(e) => { if (!drag.current?.moved) setHover({ id: r.id, ...(() => { const q = local(e); return { x: q[0], y: q[1] }; })() }); }}
                    onPointerMove={(e) => { if (!drag.current?.moved) { const q = local(e); setHover({ id: r.id, x: q[0], y: q[1] }); } }}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => { const q = labelOf(r.id); setHover({ id: r.id, x: q[0], y: q[1] }); }}
                    onBlur={() => setHover(null)}
                  />
                  {pressure && pat && <path d={d} fill={`url(#${pat})`} stroke="none" pointerEvents="none" />}
                  {pressure && p.level === 3 && <path d={d} fill="none" stroke="var(--nivel-critico)" strokeWidth="3.5" vectorEffect="non-scaling-stroke" className="pulse-border" pointerEvents="none" />}
                  {isSel && <path d={d} fill="none" stroke="#f5f5f5" strokeWidth="2" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
                </g>
              );
            })}

            {layers.corregos && streamPaths.map((s, i) => (
              <g key={i} pointerEvents="none">
                <path id={`corrego-${i}`} d={s.d} fill="none" stroke="#9a9a9a" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                {s.name && <text fontSize={10 / view.k} fill="#bdbdbd" fontStyle="italic"><textPath href={`#corrego-${i}`} startOffset="8%">{s.name}</textPath></text>}
              </g>
            ))}
          </g>

          {/* camada em tela (não escala com o zoom) */}
          <g pointerEvents="none" fontFamily="var(--font-sans)">
            {pressure && <text x={S(mapData.cityCenter)[0]} y={S(mapData.cityCenter)[1] + 52} textAnchor="middle" fontSize="26" fontWeight="500" letterSpacing="6" fill="#6e6e6e" opacity="0.7">Franca</text>}
            {view.k >= 1.8 && mapData.hoods.map((h) => { const q = S(h.p); return <text key={h.name} x={q[0]} y={q[1]} textAnchor="middle" fontSize="9" fill="#8a8a8a">{h.name}</text>; })}

            {REGIONS.map((r) => {
              if (!showZones && mapTab === 'pressao') return null;
              const z = mapData.zones[r.id];
              const p = model.cur.regions[r.id];
              const c = S(z.label);
              const showDots = mapTab === 'ocorrencias' || layers.ocorrencias;
              const showTeams = layers.equipes && mapTab !== 'recursos';
              return (
                <g key={r.id}>
                  {showDots && z.dots.slice(0, p.active).map((d, i) => { const q = S(d); return <circle key={i} cx={q[0]} cy={q[1]} r="2.2" fill="#f5f5f5" />; })}
                  {layers.infra && INFRA_KINDS[r.id].map((kind, i) => {
                    const q = z.infra[i] ? S(z.infra[i]) : null;
                    return q ? <g key={i} transform={`translate(${q[0] - 7} ${q[1] - 7})`}><circle cx="7" cy="7" r="9" fill="#0c0c0c" stroke="#3a3a3a" /><g color="#a3a3a3"><Icon name={kind} size={14} /></g></g> : null;
                  })}
                  {layers.refugios && z.refuge && (() => { const q = S(z.refuge!); return <g transform={`translate(${q[0] - 7} ${q[1] - 7})`}><circle cx="7" cy="7" r="9" fill="#0c0c0c" stroke="#a3a3a3" strokeDasharray="2 2" /><g color="#f5f5f5"><Icon name="house" size={14} /></g></g>; })()}

                  {mapTab === 'pressao' && (
                    <>
                      <text x={c[0]} y={c[1] - 11} textAnchor="middle" fontSize="11" fontWeight="500" fill="#f5f5f5" stroke="#0a0a0a" strokeWidth="3" paintOrder="stroke">{r.name}</text>
                      <rect x={c[0] - 28} y={c[1] - 6} width="56" height="19" rx="9.5" fill="#f5f5f5" />
                      <g transform={`translate(${c[0] - 21} ${c[1] - 1.5})`}><LevelIcon level={p.level} size={10} onWhite /></g>
                      <text x={c[0] + 12} y={c[1] + 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#0a0a0a" className="num">{p.score}</text>
                    </>
                  )}
                  {showTeams && Array.from({ length: p.teamsTotal }, (_, i) => (
                    <rect key={i} x={c[0] - (p.teamsTotal * 11 - 3) / 2 + i * 11} y={c[1] + (mapTab === 'pressao' ? 17 : 19)} width="8" height="8" fill={i < p.teamsTotal - p.teamsFree ? '#f5f5f5' : '#0c0c0c'} stroke="#f5f5f5" strokeWidth="1.2" />
                  ))}
                  {mapTab === 'ocorrencias' && (
                    <>
                      <text x={c[0]} y={c[1] - 4} textAnchor="middle" fontSize="11" fontWeight="500" fill="#f5f5f5" stroke="#0a0a0a" strokeWidth="3" paintOrder="stroke">{r.name}</text>
                      <text x={c[0]} y={c[1] + 11} textAnchor="middle" fontSize="11" fill="#a3a3a3" stroke="#0a0a0a" strokeWidth="3" paintOrder="stroke" className="num">{p.active} {p.active === 1 ? 'ocorrência' : 'ocorrências'}</text>
                    </>
                  )}
                  {mapTab === 'recursos' && (
                    <>
                      <text x={c[0]} y={c[1] - 6} textAnchor="middle" fontSize="11" fontWeight="500" fill="#f5f5f5" stroke="#0a0a0a" strokeWidth="3" paintOrder="stroke">{r.name}</text>
                      {Array.from({ length: p.teamsTotal }, (_, i) => (
                        <rect key={i} x={c[0] - (p.teamsTotal * 17 - 3) / 2 + i * 17} y={c[1] + 1} width="14" height="14" fill={i < p.teamsTotal - p.teamsFree ? '#f5f5f5' : '#0c0c0c'} stroke="#f5f5f5" strokeWidth="1.5" />
                      ))}
                      <text x={c[0]} y={c[1] + 29} textAnchor="middle" fontSize="11" fill="#a3a3a3" stroke="#0a0a0a" strokeWidth="3" paintOrder="stroke" className="num">{p.teamsFree} de {p.teamsTotal} livres</text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* ocorrências: tooltip do tipo ao passar sobre o ponto — áreas de acerto maiores que o ponto */}
        {(mapTab === 'ocorrencias' || layers.ocorrencias) && REGIONS.flatMap((r) => {
          const p = model.cur.regions[r.id];
          return mapData.zones[r.id].dots.slice(0, p.active).map((d, i) => {
            const q = S(d);
            const occ = model.occNow.filter((o) => o.regionId === r.id)[i];
            if (!occ) return null;
            return (
              <span key={`${r.id}-${i}`} className="tip absolute block" style={{ left: q[0] - 7, top: q[1] - 7, width: 14, height: 14 }} tabIndex={0} aria-label={`${occ.type}, ${r.name}, ${occ.time}`}>
                <span className="tip-bubble flex items-center gap-1.5"><Icon name={occTypes[occ.typeIndex]} size={12} />{occ.type} · {occ.time}</span>
              </span>
            );
          });
        })}

        {/* controles */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {([['plus', 'Aproximar', () => zoomAt(1.4)], ['minus', 'Afastar', () => zoomAt(1 / 1.4)], ['target', 'Recentralizar', () => setView({ k: 1, x: 0, y: 0 })]] as Array<[IconName, string, () => void]>).map(([ic, label, fn]) => (
            <button key={label} aria-label={label} onClick={fn} className="flex h-7 w-7 items-center justify-center border border-line2 bg-s1 text-t1 hover:bg-s3" style={{ borderRadius: 2 }}><Icon name={ic} size={14} /></button>
          ))}
          <div className="relative">
            <button aria-label="Camadas do mapa" aria-expanded={layersOpen} onClick={() => setLayersOpen((v) => !v)} className="flex h-7 w-7 items-center justify-center border border-line2 bg-s1 text-t1 hover:bg-s3" style={{ borderRadius: 2 }}><Icon name="layers" size={14} /></button>
            {layersOpen && (
              <div role="menu" aria-label="Camadas" className="absolute left-[34px] top-0 z-30 w-[170px] border border-line2 bg-s2 p-1.5">
                {LAYERS.map((l) => {
                  const off = (l.needs === 'vias' && !hasRoads) || (l.needs === 'corregos' && !hasStreams);
                  return (
                    <button key={l.k} role="menuitemcheckbox" aria-checked={layers[l.k]} disabled={off} onClick={() => toggleLayer(l.k)} title={off ? 'Sem dados: rode scripts/fetch-osm.mjs' : undefined}
                      className="flex w-full items-center gap-2 px-1.5 py-1 text-left text-[12px] hover:bg-s3 disabled:opacity-40">
                      <span className="flex h-3.5 w-3.5 items-center justify-center border border-line2">{layers[l.k] && !off && <Icon name="check" size={10} />}</span>{l.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* legenda compacta (canto inferior esquerdo) */}
        <div className="absolute bottom-2 left-2 border border-line2 bg-s1 px-2 py-1.5" aria-label="Legenda: nível de pressão" style={{ borderRadius: 2 }}>
          <ul className="m-0 flex list-none flex-col gap-[2px] p-0">
            {LEVELS.map((l, i) => (
              <li key={l.key} className="flex items-center gap-1.5">
                <LevelIcon level={i as 0 | 1 | 2 | 3} size={9} />
                <svg width="16" height="9" aria-hidden="true"><rect x="0.5" y="0.5" width="15" height="8" fill="#141414" stroke="#6e6e6e" />{LEGEND_PATTERN[i] && <rect x="0.5" y="0.5" width="15" height="8" fill={`url(#${LEGEND_PATTERN[i]})`} />}</svg>
                <span className="t-level w-[48px] text-[9.5px]">{l.name}</span>
                <span className="num text-[9.5px] text-t2">{l.range}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* escala e norte, discretos */}
        <div className="pointer-events-none absolute right-2 top-2 flex items-end gap-2 text-t2" aria-hidden="true">
          <div className="flex flex-col items-end gap-0.5" aria-label={`Escala: ${nice} quilômetros`}>
            <span className="num text-[10px] leading-3">{mapData.approximate ? '~' : ''}{fmt(nice, nice < 1 ? 1 : 0)} km</span>
            <span className="block h-[5px] border border-t-0 border-t2" style={{ width: nice * pxPerKm }} />
          </div>
          <div className="flex flex-col items-center"><span className="text-[10px] font-semibold leading-3">N</span><Icon name="arrowUp" size={12} /></div>
        </div>

        {/* aviso permanente e atribuição (canto inferior direito) */}
        <div className="pointer-events-none absolute bottom-1.5 right-2 flex flex-col items-end text-right text-[10px] leading-3 text-t2">
          <span>Limites das zonas aproximados, não oficiais.</span>
          {(layers.infra || layers.refugios) && <span>Ícones de infraestrutura e refúgios: ilustrativos.</span>}
          <span>{mapData.approximate ? 'Geometria aproximada, sem dados do OpenStreetMap.' : '© OpenStreetMap contributors'}</span>
        </div>

        {/* tooltip da zona */}
        {hover && hovered && hoveredRegion && (
          <div
            role="tooltip" className="pointer-events-none absolute z-20 w-[180px] border border-line2 bg-s2 p-2 text-[12px] leading-4"
            style={{ left: clamp(hover.x + 12, 4, W - 188), top: clamp(hover.y + 12, 4, H - 110), borderRadius: 2 }}
          >
            <div className="flex items-center justify-between gap-2"><b className="font-semibold">{hoveredRegion.name}</b><span className="num font-semibold">{hovered.score}<span className="text-t2">/100</span></span></div>
            <div className="mt-1"><LevelPill level={hovered.level} /></div>
            <div className="num mt-1 text-[11px] text-t2">{hazard === 'chuva' ? 'Ocorrências' : 'Atendimentos'}: <span className="text-t1">{hovered.active}</span></div>
            <div className="num text-[11px] text-t2">Equipes livres: <span className="text-t1">{hovered.teamsFree} de {hovered.teamsTotal}</span></div>
          </div>
        )}
      </div>
    </Card>
  );
}

function Mini({ label, value, unit, delta, deltaText }: { label: string; value: string; unit?: string; delta: number | null; deltaText: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="t-micro">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="num text-[15px] font-semibold leading-5">{value}</span>
        {unit && <span className="text-[10.5px] text-t2">{unit}</span>}
        <span className="num flex items-center gap-0.5 text-[11px]" style={{ color: deltaColor(delta) }}>
          {delta !== null && <Arrow delta={delta} size={10} />}{delta === null ? '—' : `(${deltaText})`}
        </span>
      </span>
    </div>
  );
}

function MapHeader() {
  const { model, step, hazard } = useApp();
  const chuva = hazard === 'chuva';
  const first = step === 0;
  const city = model.cur.city;
  const hero = useCountUp(city.score);
  const w = model.cur.weather;
  const dW = first ? null : w - model.steps[step - 1].weather;
  const tp = model.totalsPrev;
  const dAct = first || !tp ? null : model.totals.active - tp.active;
  const dFree = first || !tp ? null : model.totals.free - tp.free;
  const dCity = first ? null : city.deltaVs10min;
  return (
    <div className="flex h-[76px] flex-none items-center gap-6 border-b border-line px-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="flex items-baseline gap-1"><span className="t-hero" aria-label={`Pressão da cidade ${city.score} de 100`}>{fmt(hero)}</span><span className="num text-[13px] text-t3">/100</span></span>
          <LevelPill level={city.level} />
        </span>
        <span className="text-[12px] leading-4 text-t2">Pressão operacional da cidade · {stepClock(step)}</span>
      </div>
      <div className="flex flex-1 items-center justify-center gap-6">
        <Mini label={chuva ? 'Chuva' : 'Índice de calor'} value={fmt(w, 1)} unit={chuva ? 'mm/h' : '°C'} delta={dW} deltaText={signed(dW ?? 0, 1)} />
        <Mini label={chuva ? 'Ocorrências ativas' : 'Atendimentos ativos'} value={fmt(model.totals.active)} delta={dAct} deltaText={signed(dAct ?? 0)} />
        <Mini label={chuva ? 'Equipes livres' : 'Equipes e refúgios'} value={`${model.totals.free} de ${model.totals.teams}`} delta={dFree} deltaText={signed(dFree ?? 0)} />
      </div>
      <div className="flex flex-none flex-col items-end" style={{ color: deltaColor(dCity) }}>
        <span className="num flex items-center gap-1 text-[14px] font-semibold">{dCity === null ? '—' : <><Arrow delta={dCity} size={13} />{Math.abs(dCity)} pts</>}</span>
        <span className="t-micro">vs 10 min antes</span>
      </div>
    </div>
  );
}
