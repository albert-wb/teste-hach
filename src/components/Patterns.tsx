/**
 * Padrões SVG reutilizáveis, em branco translúcido sobre a cor do nível.
 * Nível: ATENÇÃO = pontos · ELEVADO = listras diagonais · CRÍTICO = grade densa · NORMAL = sem padrão.
 */
export function Patterns() {
  const gray = { stroke: '#ffffff', strokeOpacity: 0.45, fill: 'none' } as const;
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {/* cinza: legendas */}
        <pattern id="pat-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#ffffff" fillOpacity="0.5" /></pattern>
        <pattern id="pat-diag-fina" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" strokeWidth="1" {...gray} /></pattern>
        <pattern id="pat-diag-grossa" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" strokeWidth="3" {...gray} /></pattern>
        <pattern id="pat-horizontal" width="5" height="5" patternUnits="userSpaceOnUse"><line x1="0" y1="2.5" x2="5" y2="2.5" strokeWidth="1" {...gray} /></pattern>
        <pattern id="pat-grade" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0H5V5" strokeWidth="1" {...gray} /></pattern>
        <pattern id="pat-vertical" width="5" height="5" patternUnits="userSpaceOnUse"><line x1="2.5" y1="0" x2="2.5" y2="5" strokeWidth="1" {...gray} /></pattern>
        {/* mapa: o padrão do nível vai sobre a zona, sempre em cinza */}
        <pattern id="pat-nivel-atencao" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.1" fill="#ffffff" fillOpacity="0.5" /></pattern>
        <pattern id="pat-nivel-elevado" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" strokeWidth="1.4" {...gray} /></pattern>
        <pattern id="pat-nivel-critico" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0H5V5" strokeWidth="1" {...gray} /></pattern>
      </defs>
    </svg>
  );
}

export const LEGEND_PATTERN = ['', 'pat-dots', 'pat-diag-fina', 'pat-grade'] as const;
