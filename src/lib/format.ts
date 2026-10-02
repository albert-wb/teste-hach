const nf = new Map<number, Intl.NumberFormat>();

/** Número em pt-BR com `decimals` casas fixas (vírgula decimal). */
export function fmt(n: number, decimals = 0): string {
  let f = nf.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    nf.set(decimals, f);
  }
  return f.format(Object.is(n, -0) ? 0 : n);
}

/** Variação com sinal tipográfico: +6, −3, 0 */
export function signed(n: number, decimals = 0): string {
  const v = fmt(Math.abs(n), decimals);
  if (n > 0) return `+${v}`;
  if (n < 0) return `−${v}`;
  return v;
}

/** Situação de saturação de uma região, em frase curta. */
export function etaLine(eta: number | 'saturado' | null): string {
  if (eta === 'saturado') return 'Capacidade esgotada';
  if (eta === null) return 'Sem tendência';
  return `Saturação em ~${Math.max(1, Math.round(eta))} min`;
}
