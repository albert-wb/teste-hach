import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SimulationDataProvider } from '../data/provider';
import { REGIONS } from '../data/regions';
import {
  alertEventsUntil, alertFeedAt, buildOccurrences, firstAlert, leadMinutes, occurrencesUntil, regionsByPressure, totalsAt,
  type FeedEntry, type Occurrence, type Totals
} from '../engine/derived';
import { computeSteps, STEP_COUNT } from '../engine/pressure';
import type { Hazard, Region, RegionId, Snapshot, StepResult } from '../engine/types';
import { readUrl, toSearch, type MapTab } from './urlState';

export type Panel = null | 'como';
export type LayerKey = 'zonas' | 'vias' | 'corregos' | 'ocorrencias' | 'equipes' | 'infra' | 'refugios';

export interface Model {
  snap: Snapshot;
  steps: StepResult[];
  regions: Region[];
  cur: StepResult;
  occAll: Occurrence[];
  occNow: Occurrence[];
  totals: Totals;
  totalsPrev: Totals | null;
  feed: FeedEntry[];
  lead: number | null;
  sorted: Region[];
}

interface Ctx {
  step: number;
  playing: boolean;
  speed: 1 | 2 | 4;
  regionId: RegionId;
  hazard: Hazard;
  mapTab: MapTab;
  panel: Panel;
  whatIf: boolean;
  loading: boolean;
  layers: Record<LayerKey, boolean>;
  model: Model;
  providerLabel: string;
  setStep: (n: number) => void;
  togglePlay: () => void;
  setSpeed: (s: 1 | 2 | 4) => void;
  restart: () => void;
  selectRegion: (id: RegionId) => void;
  setHazard: (h: Hazard) => void;
  setMapTab: (t: MapTab) => void;
  setPanel: (p: Panel) => void;
  setWhatIf: (v: boolean) => void;
  toggleLayer: (k: LayerKey) => void;
  goToFirstAlert: () => void;
  registerAlerts: (el: HTMLElement | null) => void;
  focusAlerts: () => void;
}

const AppCtx = createContext<Ctx | null>(null);
const provider = new SimulationDataProvider();

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp fora do AppProvider');
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const init = useMemo(() => readUrl(window.location.search), []);
  const [step, setStepState] = useState(init.passo);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [regionId, setRegionId] = useState<RegionId>(init.regiao);
  const [hazard, setHazardState] = useState<Hazard>(init.aba);
  const [mapTab, setMapTab] = useState<MapTab>(init.mapa);
  const [panel, setPanel] = useState<Panel>(null);
  const [whatIf, setWhatIf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    zonas: true, vias: true, corregos: true, ocorrencias: false, equipes: false, infra: true, refugios: init.aba === 'calor'
  });
  const alertsEl = useRef<HTMLElement | null>(null);
  const loadTimer = useRef(0);

  /* ---------- modelo (engine + derivados) ---------- */
  const snap = useMemo(() => provider.getSnapshot(hazard), [hazard]);
  const steps = useMemo(() => computeSteps(snap), [snap]);
  const occAll = useMemo(() => buildOccurrences(steps, REGIONS, hazard), [steps, hazard]);
  const model = useMemo<Model>(() => ({
    snap, steps, regions: REGIONS, cur: steps[step], occAll,
    occNow: occurrencesUntil(occAll, step),
    totals: totalsAt(steps, REGIONS, step),
    totalsPrev: step > 0 ? totalsAt(steps, REGIONS, step - 1) : null,
    feed: alertFeedAt(steps, REGIONS, step),
    lead: leadMinutes(alertEventsUntil(steps, REGIONS, step)),
    sorted: regionsByPressure(steps, REGIONS, step)
  }), [snap, steps, occAll, step]);

  /* ---------- URL ---------- */
  useEffect(() => {
    const next = toSearch({ passo: step, regiao: regionId, aba: hazard, mapa: mapTab });
    if (next !== window.location.search) window.history.replaceState(null, '', `${window.location.pathname}${next}${window.location.hash}`);
  }, [step, regionId, hazard, mapTab]);

  /* ---------- reprodução: um passo a cada 4 s (1x), 2 s (2x) ou 1 s (4x); para em 14:40 ---------- */
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStepState((s) => Math.min(s + 1, STEP_COUNT - 1)), 4000 / speed);
    return () => window.clearInterval(id);
  }, [playing, speed]);
  useEffect(() => { if (playing && step >= STEP_COUNT - 1) setPlaying(false); }, [playing, step]);
  useEffect(() => () => window.clearTimeout(loadTimer.current), []);

  /* ---------- ações ---------- */
  const setStep = useCallback((n: number) => setStepState(Math.min(STEP_COUNT - 1, Math.max(0, n))), []);
  const togglePlay = useCallback(() => {
    if (playing) { setPlaying(false); return; }
    if (step >= STEP_COUNT - 1) setStepState(0);
    setPlaying(true);
  }, [playing, step]);
  const restart = useCallback(() => { setPlaying(false); setStepState(0); }, []);
  const setHazard = useCallback((h: Hazard) => {
    if (h === hazard) return;
    setPlaying(false); setStepState(0); setHazardState(h);
    setLayers((l) => ({ ...l, refugios: h === 'calor' }));
    setLoading(true);
    window.clearTimeout(loadTimer.current);
    loadTimer.current = window.setTimeout(() => setLoading(false), 300);
  }, [hazard]);
  const goToFirstAlert = useCallback(() => {
    const f = firstAlert(steps, REGIONS);
    if (!f) return;
    setPlaying(false); setStepState(f.t); setRegionId(f.regionId);
  }, [steps]);
  const registerAlerts = useCallback((el: HTMLElement | null) => { alertsEl.current = el; }, []);
  const focusAlerts = useCallback(() => {
    setPanel(null);
    window.setTimeout(() => {
      const el = alertsEl.current;
      if (!el) return;
      el.focus();
      el.classList.remove('card-flash');
      void el.offsetWidth;
      el.classList.add('card-flash');
    }, 30);
  }, []);

  const value: Ctx = {
    step, playing, speed, regionId, hazard, mapTab, panel, whatIf, loading, layers, model,
    providerLabel: provider.label,
    setStep, togglePlay, setSpeed, restart, selectRegion: setRegionId, setHazard, setMapTab, setPanel, setWhatIf,
    toggleLayer: (k) => setLayers((l) => ({ ...l, [k]: !l[k] })),
    goToFirstAlert, registerAlerts, focusAlerts
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
