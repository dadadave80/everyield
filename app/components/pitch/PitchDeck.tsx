"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SLIDES } from "@/components/pitch/Slides";

export function PitchDeck() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const count = SLIDES.length;

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // The tab title: the root layout hardcodes a <title>, so pin ours at runtime.
  useEffect(() => {
    const prev = document.title;
    document.title = "Everyield — Pitch";
    return () => {
      document.title = prev;
    };
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const next = Math.max(0, Math.min(count - 1, i));
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scroller.scrollTo({
        top: next * scroller.clientHeight,
        behavior: reduce ? "auto" : "smooth",
      });
      setActive(next);
    },
    [count],
  );

  // Keyboard deck controls. Space activates a focused button/link instead.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const onControl = !!el?.closest("button, a, input, textarea, select");
      if (e.key === " " && onControl) return;

      const down =
        e.key === "ArrowDown" || e.key === "PageDown" || e.key === "j" || (e.key === " " && !e.shiftKey);
      const up =
        e.key === "ArrowUp" || e.key === "PageUp" || e.key === "k" || (e.key === " " && e.shiftKey);

      if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(count - 1);
      } else if (down) {
        e.preventDefault();
        goTo(activeRef.current + 1);
      } else if (up) {
        e.preventDefault();
        goTo(activeRef.current - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, count]);

  // Track the active slide on manual (wheel / touch) scrolling.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting && en.intersectionRatio >= 0.55) {
            const idx = Number((en.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        }
      },
      { root: scroller, threshold: [0.55] },
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* fixed home link + theme toggle */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-2 text-xs text-ink-soft backdrop-blur transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to app
        </Link>
        <ThemeToggle />
      </div>

      {/* dot rail navigation */}
      <nav
        aria-label="Slides"
        className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-2.5 sm:flex"
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}: ${s.label}`}
            aria-current={active === i}
            className={`rounded-full outline-none transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active === i ? "h-5 w-1.5 bg-accent" : "size-1.5 bg-ink-faint/50 hover:bg-ink-faint"
            }`}
          />
        ))}
      </nav>

      {/* slide counter */}
      <div className="fixed bottom-4 right-5 z-30 font-mono text-xs tabular-nums tnum text-ink-faint sm:right-8">
        {String(active + 1).padStart(2, "0")}
        <span className="opacity-40"> / {String(count).padStart(2, "0")}</span>
      </div>

      {/* the deck */}
      <main
        ref={scrollerRef}
        className="pitch-deck scroll-quiet relative z-10 h-[100dvh] overflow-y-scroll"
      >
        {SLIDES.map((s, i) => {
          const Body = s.Component;
          return (
            <section
              key={s.label}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              data-index={i}
              data-active={active === i ? "true" : "false"}
              className="pitch-slide relative flex h-[100dvh] items-center justify-center px-6 py-24 sm:px-12"
            >
              {s.kicker && (
                <span className="pointer-events-none absolute left-6 top-16 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint sm:left-12 sm:top-20">
                  {s.kicker}
                </span>
              )}
              <div className="w-full max-w-4xl">
                <Body />
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
