import { useApp } from '../state/AppContext';
import { Icon, type IconName } from './icons';
import { Card, CardHead } from './ui';

export function QuickActions() {
  const { setWhatIf, goToFirstAlert, restart, setPanel } = useApp();
  const items: Array<{ icon: IconName; title: string; sub: string; on: () => void; haspopup?: boolean }> = [
    { icon: 'plus', title: 'E se +1 equipe?', sub: 'Simule um reforço na região selecionada', on: () => setWhatIf(true), haspopup: true },
    { icon: 'alert', title: 'Ir ao primeiro alerta', sub: 'Salta o replay para 14:10', on: goToFirstAlert },
    { icon: 'restart', title: 'Reiniciar replay', sub: 'Volta para 14:00', on: restart },
    { icon: 'info', title: 'Como funciona', sub: 'Fórmula e níveis do Pressure Engine', on: () => setPanel('como') }
  ];
  return (
    <Card label="Ações rápidas" className="flex min-h-0 flex-col">
      <CardHead icon="target" title="Ações rápidas" />
      <ul className="m-0 flex min-h-0 flex-1 list-none flex-col p-0">
        {items.map((it) => (
          <li key={it.title} className="min-h-0 flex-1 border-b border-line last:border-b-0">
            <button onClick={it.on} aria-haspopup={it.haspopup ? 'dialog' : undefined} className="row-hover flex h-full w-full items-center gap-3 px-4 text-left">
              <Icon name={it.icon} size={16} className="flex-none text-t1" />
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-[13px] font-medium leading-[18px]">{it.title}</span><span className="truncate text-[12px] leading-4 text-t2">{it.sub}</span></span>
              <Icon name="right" size={14} className="flex-none text-t2" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
