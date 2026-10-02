import { useEffect, useState } from 'react';
import { AlertsFeed } from './components/AlertsFeed';
import { HeatmapCard } from './components/HeatmapCard';
import { MapCard } from './components/MapCard';
import { PanelHost, WhatIfDialog } from './components/Panels';
import { Patterns } from './components/Patterns';
import { QuickActions } from './components/QuickActions';
import { RegionsRanking } from './components/RegionsRanking';
import { ReplayBar } from './components/ReplayBar';
import { SelectedRegion } from './components/SelectedRegion';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { AppProvider, useApp } from './state/AppContext';

const W = 1440, H = 900;

/** Escala o quadro de 1440×900 de forma uniforme para caber na janela. */
function useFrameScale(): number {
  const calc = () => Math.min(window.innerWidth / W, window.innerHeight / H);
  const [s, setS] = useState(calc);
  useEffect(() => {
    const on = () => setS(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return s;
}

function Skeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-busy="true" aria-label="Carregando cenário">
      <div className="flex gap-3" style={{ height: 400 }}><div className="skeleton" style={{ flex: 56 }} /><div className="skeleton" style={{ flex: 44 }} /></div>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" />)}</div>
    </div>
  );
}

function Dashboard() {
  const { loading } = useApp();
  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-3" aria-label="Painel de operações">
      <h1 className="sr-only">StormOps Franca: painel de operações da Defesa Civil</h1>
      {loading ? <Skeleton /> : (
        <>
          <div className="flex min-h-0 gap-3" style={{ height: 400 }}>
            <MapCard />
            <SelectedRegion />
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">
            <RegionsRanking />
            <AlertsFeed />
            <HeatmapCard />
            <QuickActions />
          </div>
        </>
      )}
      <ReplayBar />
      <PanelHost />
      <WhatIfDialog />
    </main>
  );
}

export function App() {
  const scale = useFrameScale();
  return (
    <AppProvider>
      <Patterns />
      <div className="fixed inset-0 overflow-hidden bg-base">
        <div
          className="absolute left-1/2 top-1/2 flex bg-base text-t1"
          style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}
        >
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <Dashboard />
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
