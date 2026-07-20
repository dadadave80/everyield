import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";

interface LandingHeroProps {
  onLogin: () => void;
  ready: boolean;
  authenticated: boolean;
}

export function LandingHero({ onLogin, ready, authenticated }: LandingHeroProps) {
  return (
    <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-between px-6 py-8">
      <header className="flex w-full max-w-lg items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </header>

      <main className="flex w-full max-w-xl flex-col items-center text-center">
        <span
          className="ey-breathe mb-8 block size-2 rounded-full bg-accent"
          style={{ animationDelay: "40ms" }}
          aria-hidden="true"
        />

        <h1
          className="ey-rise font-display text-[2.7rem] leading-[1.08] tracking-[-0.01em] text-ink sm:text-6xl"
          style={{ animationDelay: "120ms" }}
        >
          The savings account that doesn&apos;t know
          <span className="text-ink-faint"> what a chain is.</span>
        </h1>

        <div
          className="ey-rise mt-10 flex flex-col items-center gap-3"
          style={{ animationDelay: "260ms" }}
        >
          <button
            onClick={onLogin}
            disabled={!ready || authenticated}
            className="group relative inline-flex h-14 items-center justify-center rounded-full bg-accent px-10 font-medium text-accent-ink transition-[transform,filter] duration-200 hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          >
            {ready ? "Log in" : "Loading…"}
          </button>
          <p className="text-sm text-ink-faint">
            Email or Google. Your money stays one number.
          </p>
        </div>
      </main>

      <footer className="text-xs tracking-wide text-ink-faint">
        Earns everywhere at once · Withdraw anytime
      </footer>
    </div>
  );
}
