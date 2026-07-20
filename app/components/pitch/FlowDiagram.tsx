import type { CSSProperties } from "react";

const rise = (ms: number): CSSProperties => ({ "--pitch-d": `${ms}ms` }) as CSSProperties;

interface Node {
  label: string;
  sub: string;
  layer: "account" | "contract";
}

const NODES: Node[] = [
  { label: "Email / Google", sub: "Privy — no wallet, no seed phrase", layer: "account" },
  { label: "EOA", sub: "upgraded via EIP-7702", layer: "account" },
  {
    label: "Particle Universal Account",
    sub: "routing · one balance · gas abstraction",
    layer: "account",
  },
  { label: "Everyield Vault", sub: "EIP-2535 diamond", layer: "contract" },
  {
    label: "StrategyManager + EveryieldCrank",
    sub: "custom facet · 80 / 20 rebalance",
    layer: "contract",
  },
  { label: "Aave V3", sub: "real lending yield", layer: "contract" },
];

/** The value path: account layer routes; contracts never bridge. */
export function FlowDiagram() {
  return (
    <div className="mx-auto max-w-lg">
      <ol className="flex flex-col">
        {NODES.map((n, i) => {
          const boundary = i === 3; // Universal Account → Vault: the layer handoff
          return (
            <li key={n.label} className="flex flex-col">
              {i > 0 && (
                <div className="pitch-reveal ml-[15px] flex flex-col" style={rise(120 + i * 70)}>
                  {boundary ? (
                    <div className="flex items-center gap-2 py-1.5">
                      <span className="h-6 w-px bg-line" />
                      <span className="text-[11px] leading-tight text-accent">
                        the account layer moves the value —
                        <br className="hidden sm:block" /> the contracts never bridge
                      </span>
                    </div>
                  ) : (
                    <span className="h-5 w-px bg-line" />
                  )}
                </div>
              )}
              <div
                className="pitch-reveal flex items-start gap-3.5"
                style={rise(140 + i * 70)}
              >
                <span
                  aria-hidden
                  className={
                    n.layer === "account"
                      ? "mt-1.5 size-2.5 shrink-0 rounded-full bg-accent"
                      : "mt-1.5 size-2.5 shrink-0 rotate-45 rounded-[1px] border border-accent bg-accent/25"
                  }
                />
                <div
                  className={`flex-1 rounded-xl border px-4 py-3 ${
                    n.layer === "account"
                      ? "border-accent/30 bg-accent-soft/40"
                      : "border-line bg-surface-2/50"
                  }`}
                >
                  <p className="text-[15px] font-medium leading-tight text-ink">{n.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{n.sub}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
