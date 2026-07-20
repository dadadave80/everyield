import { useEffect, useRef, useState } from "react";

/** Format a number as USD. Falls back to $0.00 for non-finite input. */
export function formatUsd(n: number, opts?: { cents?: boolean }): string {
  const cents = opts?.cents ?? true;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Split "$1,234.56" into big dollars + small cents for the hero number. */
export function splitUsd(n: number): { dollars: string; cents: string } {
  const full = formatUsd(n);
  const dot = full.lastIndexOf(".");
  if (dot === -1) return { dollars: full, cents: "" };
  return { dollars: full.slice(0, dot), cents: full.slice(dot) };
}

/** Smoothly counts a displayed value toward `target` whenever it changes. */
export function useCountUp(target: number, durationMs = 850): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = from + (target - from) * eased;
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return value;
}

/** Returns `value` delayed by `delayMs`, resetting the timer on each change. */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
