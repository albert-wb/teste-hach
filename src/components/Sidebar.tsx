import { useApp } from '../state/AppContext';
import { Icon, Logo, type IconName } from './icons';
import { Tip } from './ui';

interface Item { key: string; label: string; icon: IconName; on?: boolean }
const TOP: Item[] = [
  { key: 'visao', label: 'Visão geral', icon: 'grid', on: true },
  { key: 'mapa', label: 'Mapa', icon: 'map' },
  { key: 'ocorrencias', label: 'Ocorrências', icon: 'list' },
  { key: 'equipes', label: 'Equipes', icon: 'users' },
  { key: 'alertas', label: 'Alertas', icon: 'bell' },
  { key: 'como', label: 'Como funciona', icon: 'info', on: true }
];
const BOTTOM: Item[] = [
  { key: 'ajuda', label: 'Ajuda', icon: 'help' },
  { key: 'config', label: 'Configurações', icon: 'gear' }
];

export function Sidebar() {
  const { panel, setPanel } = useApp();
  const render = (it: Item) => {
    const active = it.key === 'visao' ? panel === null : it.key === 'como' ? panel === 'como' : false;
    const onClick = () => {
      if (!it.on) return;
      setPanel(it.key === 'como' ? (panel === 'como' ? null : 'como') : null);
    };
    return (
      <Tip
        key={it.key} side="right" className="block"
        text={it.on ? it.label : <><b className="font-semibold">{it.label}</b><br /><span className="text-t2">Fora do escopo do protótipo</span></>}
      >
        <button
          aria-label={it.label} aria-current={active ? 'page' : undefined} aria-disabled={!it.on || undefined} onClick={onClick}
          className={`flex h-9 w-9 items-center justify-center ${!it.on ? 'cursor-not-allowed text-t3' : active ? 'bg-[#14304f] text-[#9cc7ff]' : 'text-t2 hover:bg-s2 hover:text-t1'}`}
          style={{ borderRadius: 2, transition: 'background 200ms ease-out, color 200ms ease-out' }}
        >
          <Icon name={it.icon} size={20} />
        </button>
      </Tip>
    );
  };
  return (
    <aside className="relative z-50 flex w-[56px] flex-none flex-col border-r border-line bg-base" aria-label="Navegação">
      <div className="flex h-[52px] flex-none items-center justify-center border-b border-line text-t1"><Logo size={24} /></div>
      <nav className="flex flex-1 flex-col items-center gap-1 py-3">{TOP.map(render)}</nav>
      <nav className="flex flex-col items-center gap-1 pb-3">{BOTTOM.map(render)}</nav>
    </aside>
  );
}
