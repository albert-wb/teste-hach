import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Count-up: anima até `target` em `ms` ms (ease-out). Desligado com prefers-reduced-motion. */
export function useCountUp(target: number, ms = 400): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (prefersReducedMotion() || from.current === target) { from.current = target; setV(target); return; }
    const a = from.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      const val = a + (target - a) * (1 - Math.pow(1 - p, 3));
      from.current = val;
      setV(val);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, ms]);
  return v;
}

/** Tamanho (px de layout) de um elemento, com ResizeObserver. */
export function useSize<T extends HTMLElement | SVGElement>(ref: RefObject<T | null>): { w: number; h: number } {
  const [s, setS] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setS({ w: (el as HTMLElement).clientWidth, h: (el as HTMLElement).clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return s;
}

/** Fecha popovers ao clicar fora ou apertar Esc. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key); };
  }, [ref, open, onClose]);
}
