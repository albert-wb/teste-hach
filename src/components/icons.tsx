import type { ReactNode } from 'react';

/** Ícones de linha (24×24, traço 1,5). Desenhados à mão, monocromáticos (currentColor). */
const P: Record<string, ReactNode> = {
  grid: <path d="M4 4h6v6H4V4ZM14 4h6v6h-6V4ZM4 14h6v6H4v-6ZM14 14h6v6h-6v-6Z" />,
  home: <path d="M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10" />,
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" />,
  chart: <path d="M4 20h16M7 17v-5M12 17V6M17 17v-8" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" />,
  box: <path d="m12 3 8 4v10l-8 4-8-4V7l8-4ZM4 7l8 4 8-4M12 11v10" />,
  doc: <path d="M6 3h8l5 5v13H6V3ZM14 3v5h5M9 13h7M9 17h7" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  rain: <path d="M7 15a4 4 0 0 1-.5-7.9A5.5 5.5 0 0 1 17 7.5a4 4 0 0 1 .5 7.5H7ZM8 18l-1 3M12 18l-1 3M16 18l-1 3" />,
  thermo: <path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0ZM12 9v7" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  alert: <path d="M12 3 22 20H2L12 3ZM12 10v5M12 17.5v.5" />,
  users: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a6 6 0 0 1 12 0M17 9a2.5 2.5 0 1 0 0-5M16 14a5 5 0 0 1 6 5" />,
  trending: <path d="m3 17 6-6 4 4 8-8M15 7h6v6" />,
  pin: <path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21ZM12 7.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />,
  bell: <path d="M6 17v-6a6 6 0 0 1 12 0v6l2 2H4l2-2ZM10 21h4" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />,
  right: <path d="m9 5 7 7-7 7" />,
  down: <path d="m5 9 7 7 7-7" />,
  up: <path d="m5 15 7-7 7 7" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  play: <path d="M7 4.5v15L19 12 7 4.5Z" fill="currentColor" />,
  pause: <><rect x="6" y="4.5" width="4" height="15" fill="currentColor" /><rect x="14" y="4.5" width="4" height="15" fill="currentColor" /></>,
  prev: <path d="M18 5v14L8 12l10-7ZM6 5v14" />,
  next: <path d="M6 5v14l10-7L6 5ZM18 5v14" />,
  restart: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  close: <path d="m5 5 14 14M19 5 5 19" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17v.2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.2" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  shield: <path d="m12 3 8 3v6c0 5-4 8-8 10-4-2-8-5-8-10V6l8-3Z" />,
  building: <path d="M5 21V5h10v16M15 10h4v11M8 9h4M8 13h4M8 17h4M3 21h18" />,
  flood: <path d="M3 10q3-3 6 0t6 0t6 0M3 15q3-3 6 0t6 0t6 0M3 20q3-3 6 0t6 0t6 0M12 3l3 4h-6l3-4Z" />,
  tree: <path d="M12 21v-7M12 3a5 5 0 0 0-4 8 4 4 0 0 0 4 3 4 4 0 0 0 4-3 5 5 0 0 0-4-8Z" />,
  car: <path d="M4 17v-5l2-4h12l2 4v5H4ZM4 12h16M7 17v2M17 17v2" />,
  lifebuoy: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="m5.6 5.6 3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" /></>,
  drop: <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />,
  house: <path d="M3 11 12 4l9 7M5 10v10h14V10M12 13v4M10 15h4" />,
  health: <path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6V4Z" />,
  school: <path d="m12 4 9 5-9 5-9-5 9-5ZM7 12v5c2 2 8 2 10 0v-5M21 9v6" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
  slash: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 16, className, strokeWidth = 1.5 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}
    >
      {P[name]}
    </svg>
  );
}

/** Logo: gota com raio, monocromática. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 3.5S7.5 13 7.5 19a8.5 8.5 0 0 0 17 0C24.5 13 16 3.5 16 3.5Z" />
      <path d="m17.2 11.5-4.4 6.3h4.2L14.8 24" />
    </svg>
  );
}

/** Ícones das ocorrências, na ordem do ciclo de tipos. */
export const OCCURRENCE_ICONS_CHUVA: IconName[] = ['flood', 'tree', 'car', 'building', 'lifebuoy'];
export const OCCURRENCE_ICONS_CALOR: IconName[] = ['thermo', 'drop', 'user', 'sun', 'house'];
