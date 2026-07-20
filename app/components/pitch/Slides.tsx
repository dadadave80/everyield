import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { FlowDiagram } from "@/components/pitch/FlowDiagram";

/** Stagger helper: drives the per-slide `.pitch-reveal` animation delay. */
const rise = (ms: number): CSSProperties => ({ "--pitch-d": `${ms}ms` }) as CSSProperties;

const VAULT = "0x4aE34A2fA9efD143C0330c306dDF8808eE34815D";
const VAULT_URL = `https://arbiscan.io/address/${VAULT}`;

/** Everyield mark: a rising stem — money that grows, quietly. */
function Leaf({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden className="text-accent">
      <path d="M12 21.5V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 12C12 8.5 9 6 5.5 6C5.5 9.5 8.5 12 12 12Z" fill="currentColor" opacity="0.9" />
      <path d="M12 10.5C12 6.5 15.4 3.5 19 3.5C19 7.5 15.6 10.5 12 10.5Z" fill="currentColor" />
    </svg>
  );
}

/* ---------------------------------------------------------------- 01 · Title */
function TitleSlide() {
  return (
    <div className="text-center">
      <div className="pitch-reveal mb-9 flex justify-center" style={rise(40)}>
        <Leaf size={62} />
      </div>
      <h1
        className="pitch-reveal font-display text-6xl font-medium tracking-[-0.035em] text-ink sm:text-8xl"
        style={rise(140)}
      >
        Everyield
      </h1>
      <p
        className="pitch-reveal mx-auto mt-6 max-w-2xl font-display text-xl italic text-ink-soft sm:text-2xl"
        style={rise(260)}
      >
        The savings account that doesn&apos;t know what a chain is.
      </p>
      <p
        className="pitch-reveal mx-auto mt-11 max-w-xl text-[11px] uppercase leading-relaxed tracking-[0.22em] text-ink-faint sm:text-xs"
        style={rise(400)}
      >
        Encode UXMAXX 2026 · Universal Accounts Track · everyield.vercel.app
      </p>
      <p
        className="pitch-reveal mt-8 font-mono text-[11px] tracking-wide text-ink-faint/70"
        style={rise(560)}
      >
        ↓ scroll · or use ↑ ↓ / space
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- 02 · Problem */
const FRICTIONS = [
  "Pick the right network",
  "Bridge funds across chains",
  "Hold a gas token on each one",
  "Decode the fee before every signature",
];

function ProblemSlide() {
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center md:gap-16">
      <div>
        <h2
          className="pitch-reveal font-display text-4xl leading-[1.08] tracking-[-0.02em] text-ink sm:text-5xl"
          style={rise(40)}
        >
          On-chain saving today is a<span className="text-ink-faint"> checklist</span>,
          <br className="hidden sm:block" /> not a savings account.
        </h2>
        <p className="pitch-reveal mt-6 text-base text-ink-soft" style={rise(160)}>
          To earn a few points of yield, an ordinary person is asked to:
        </p>
      </div>

      <div className="flex flex-col">
        {FRICTIONS.map((f, i) => (
          <div
            key={f}
            className="pitch-reveal flex items-baseline gap-4 border-b border-line py-4"
            style={rise(240 + i * 90)}
          >
            <span className="font-mono text-xs tabular-nums tnum text-danger/80">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-lg text-ink line-through decoration-danger/30 decoration-1">
              {f}
            </span>
          </div>
        ))}
        <p
          className="pitch-reveal mt-7 font-display text-2xl leading-snug tracking-[-0.01em] text-ink sm:text-[1.7rem]"
          style={rise(240 + FRICTIONS.length * 90)}
        >
          Nobody does any of that for a savings account.
          <span className="text-ink-faint"> So most people never start.</span>
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- 03 · Product */
const STEPS = [
  ["Email login", "no wallet, no seed phrase"],
  ["One balance", "across every chain, one number"],
  ["One Save button", "routed into real Aave yield"],
  ["Every fee quoted", "before you ever sign"],
];

function ProductSlide() {
  return (
    <div className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-14">
      <div>
        <h2
          className="pitch-reveal font-display text-4xl leading-[1.06] tracking-[-0.02em] text-ink sm:text-6xl"
          style={rise(40)}
        >
          One balance. One button.
          <br /> <span className="text-accent">Real yield.</span>
        </h2>
        <dl className="mt-8 flex flex-col gap-4">
          {STEPS.map(([t, s], i) => (
            <div key={t} className="pitch-reveal flex items-baseline gap-3" style={rise(180 + i * 90)}>
              <span className="mt-1 size-1.5 shrink-0 translate-y-1 rounded-full bg-accent" aria-hidden />
              <div>
                <dt className="text-lg font-medium text-ink">{t}</dt>
                <dd className="text-sm text-ink-soft">{s}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p
          className="pitch-reveal mt-7 text-sm text-ink-faint"
          style={rise(180 + STEPS.length * 90)}
        >
          Withdraw partial or full, anytime.
        </p>
      </div>

      {/* stylized hero mockup — real UI values, not a screenshot */}
      <div className="pitch-reveal" style={rise(300)}>
        <div className="card-shadow mx-auto max-w-sm rounded-3xl border border-line bg-surface p-7">
          <p className="text-center font-display text-sm italic text-ink-faint">Total balance</p>
          <p className="mt-2 text-center font-display text-6xl leading-none tracking-[-0.02em] tnum text-ink">
            $4<span className="text-3xl text-ink-faint">.00</span>
          </p>
          <p className="mt-3 text-center text-sm text-ink-soft">Everything you own, one number.</p>

          <div className="mt-6 rounded-2xl border border-line bg-surface-2/50 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink-soft">Total cost, incl. routing + gas</span>
              <span className="text-[15px] font-semibold tabular-nums tnum text-ink">$0.36</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-ink-faint">Quoted before you sign</span>
              <span className="text-xs text-accent">Nothing hidden</span>
            </div>
          </div>

          <div className="mt-4 grid h-12 place-items-center rounded-full bg-accent font-medium text-accent-ink">
            Save $4.00
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- 04 · Evidence */
function Stat({ label, value, note }: { label: string; value: ReactNode; note: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface/60 px-4 py-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">{label}</p>
      <p className="mt-1.5 font-display text-3xl tracking-[-0.01em] tnum text-ink">{value}</p>
      <p className="mt-1 text-xs leading-snug text-ink-soft">{note}</p>
    </div>
  );
}

function EvidenceSlide() {
  return (
    <div>
      <h2
        className="pitch-reveal font-display text-4xl leading-[1.06] tracking-[-0.02em] text-ink sm:text-5xl"
        style={rise(40)}
      >
        Live on mainnet.
        <span className="text-ink-faint"> Proven with real money.</span>
      </h2>
      <p className="pitch-reveal mt-3 text-base text-ink-soft" style={rise(140)}>
        2026-07-20 rehearsal — $2.00 of real USDC, end to end, every step on-chain.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="pitch-reveal" style={rise(220)}>
          <Stat label="Deposited" value="$2.00" note="USDC · Base → Arbitrum · via an EIP-7702 account" />
        </div>
        <div className="pitch-reveal" style={rise(300)}>
          <Stat
            label="All-in fee"
            value="$0.36"
            note="charged exactly as quoted — to the cent"
          />
        </div>
        <div className="pitch-reveal" style={rise(380)}>
          <Stat label="Keeper crank" value="80 / 20" note="Aave / idle — the exact target split" />
        </div>
        <div className="pitch-reveal" style={rise(460)}>
          <Stat label="Withdrew" value="$1.00" note="partial · exact share math · $0.14 fee" />
        </div>
      </div>

      <div
        className="pitch-reveal mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        style={rise(560)}
      >
        <div className="flex items-center gap-2.5 text-sm text-ink-soft">
          <span className="relative grid size-2.5 place-items-center">
            <span className="absolute size-2.5 rounded-full bg-positive ey-breathe" />
          </span>
          Yield accruing live, block by block.
        </div>
        <a
          href={VAULT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-3.5 py-2 font-mono text-[11px] text-ink-soft transition-colors hover:text-ink hover:bg-surface-2 sm:self-auto"
        >
          <span className="text-ink-faint">Vault · Arbitrum One</span>
          <span className="break-all text-ink">{VAULT}</span>
          <ArrowUpRight className="size-3.5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>

      <p
        className="pitch-reveal mt-6 font-display text-xl italic text-accent"
        style={rise(660)}
      >
        Every cent verifiable on-chain.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------- 05 · How it works */
function HowSlide() {
  return (
    <div className="grid gap-10 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-14">
      <div>
        <h2
          className="pitch-reveal font-display text-4xl leading-[1.06] tracking-[-0.02em] text-ink sm:text-5xl"
          style={rise(40)}
        >
          One tap, six layers,
          <br /> <span className="text-ink-faint">zero bridges to think about.</span>
        </h2>
        <p className="pitch-reveal mt-6 text-base leading-relaxed text-ink-soft" style={rise(160)}>
          A login becomes an account. The account routes value across chains and abstracts gas.
          The contracts only ever see funds arrive — they never bridge anything themselves.
        </p>
      </div>
      <FlowDiagram />
    </div>
  );
}

/* -------------------------------------------------------------- 06 · Lattice */
function Diamond({ highlight = false }: { highlight?: boolean }) {
  return (
    <svg width={92} height={92} viewBox="0 0 100 100" fill="none" aria-hidden className="text-accent">
      <path d="M50 6 92 42 50 94 8 42Z" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" />
      <path d="M8 42H92" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M50 6 34 42 50 94" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M50 6 66 42 50 94" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" />
      {highlight && <path d="M50 6 92 42 66 42Z" fill="currentColor" fillOpacity="0.9" />}
    </svg>
  );
}

const LAYERS = [
  ["Facet", "external entry points"],
  ["Lib", "logic + namespaced storage"],
  ["Init", "one-time setup"],
];

function LatticeSlide() {
  return (
    <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:gap-14">
      <div>
        <h2
          className="pitch-reveal font-display text-4xl leading-[1.06] tracking-[-0.02em] text-ink sm:text-5xl"
          style={rise(40)}
        >
          Three diamonds,
          <br /> assembled from <span className="text-accent">Lattice</span>.
        </h2>
        <p className="pitch-reveal mt-5 text-base leading-relaxed text-ink-soft" style={rise(150)}>
          Everyield is three EIP-2535 diamonds built on the Lattice framework — each facet, its
          library, and its init following one three-layer pattern.
        </p>

        <div className="pitch-reveal mt-6 flex flex-wrap gap-2" style={rise(240)}>
          {LAYERS.map(([t, s]) => (
            <div key={t} className="rounded-xl border border-line bg-surface-2/50 px-3.5 py-2">
              <p className="text-sm font-medium text-ink">{t}</p>
              <p className="text-xs text-ink-faint">{s}</p>
            </div>
          ))}
        </div>

        <code
          className="pitch-reveal mt-6 flex w-fit items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-2 font-mono text-xs text-ink-soft"
          style={rise(330)}
        >
          <span className="text-accent">$</span> forge install dadadave80/lattice
          <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">
            v0.2.0
          </span>
        </code>

        <p
          className="pitch-reveal mt-7 border-l-2 border-accent pl-4 font-display text-xl leading-snug italic text-ink"
          style={rise(420)}
        >
          “Extend a live diamond with one facet. That&apos;s the point of diamonds.”
        </p>
      </div>

      <div className="pitch-reveal flex flex-col items-center" style={rise(280)}>
        <div className="flex items-end gap-2">
          <Diamond />
          <Diamond highlight />
          <Diamond />
        </div>
        <p className="mt-5 text-center text-sm text-ink-soft">
          A custom <span className="font-medium text-ink">EveryieldCrank</span> facet,
          <br /> cut into a stock StrategyManager diamond.
        </p>
      </div>
    </div>
  );
}

/* --------------------------------------------------- 07 · Honest engineering */
const GUARDRAILS = [
  ["Interaction-window guard", "no user transaction runs while funds are deployed to Aave"],
  ["Full-NAV display pricing", "the frontend prices shares on the whole position, not idle-only"],
  ["Pinned by an exact assertion", "the regression can never quietly return"],
  ["Upstream fix scoped", "the real correction is queued back into the framework"],
];

function HonestSlide() {
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_1fr] md:items-center md:gap-14">
      <div>
        <h2
          className="pitch-reveal font-display text-4xl leading-[1.07] tracking-[-0.02em] text-ink sm:text-5xl"
          style={rise(40)}
        >
          We found a bug in
          <br /> our own framework.
        </h2>
        <p className="pitch-reveal mt-6 text-base leading-relaxed text-ink-soft" style={rise(150)}>
          An Arbitrum-fork test caught a share-pricing bug in Lattice&apos;s{" "}
          <span className="font-mono text-sm text-ink">ERC4626Lib</span> — it priced on idle
          assets only, while funds were deployed. So we built the app to fail closed around it.
        </p>
        <p
          className="pitch-reveal mt-7 border-l-2 border-accent pl-4 font-display text-2xl leading-snug italic text-ink"
          style={rise(250)}
        >
          We ship the constraint honestly instead of hiding it.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {GUARDRAILS.map(([t, s], i) => (
          <li
            key={t}
            className="pitch-reveal flex items-start gap-3 rounded-xl border border-line bg-surface-2/40 px-4 py-3"
            style={rise(220 + i * 90)}
          >
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Check className="size-3.5" />
            </span>
            <div>
              <p className="text-[15px] font-medium leading-tight text-ink">{t}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{s}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------- 08 · Roadmap */
const ROADMAP = [
  ["Upstream the fix", "correct ERC4626Lib share pricing in Lattice itself"],
  ["Keeper → Chainlink Automation", "the rebalance crank, fully decentralized"],
  ["Multi-vault", "multi-asset, multi-strategy savings"],
];

const LINKS = [
  ["everyield.vercel.app", "https://everyield.vercel.app"],
  ["github.com/dadadave80/everyield", "https://github.com/dadadave80/everyield"],
  ["Vault on Arbiscan", VAULT_URL],
];

function RoadmapSlide() {
  return (
    <div>
      <h2
        className="pitch-reveal font-display text-4xl leading-[1.06] tracking-[-0.02em] text-ink sm:text-5xl"
        style={rise(40)}
      >
        Where it goes next.
      </h2>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {ROADMAP.map(([t, s], i) => (
          <div
            key={t}
            className="pitch-reveal rounded-2xl border border-line bg-surface/60 px-4 py-4"
            style={rise(140 + i * 100)}
          >
            <span className="font-mono text-xs tabular-nums tnum text-accent">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="mt-2 text-[15px] font-medium leading-tight text-ink">{t}</p>
            <p className="mt-1 text-sm text-ink-soft">{s}</p>
          </div>
        ))}
      </div>

      <div
        className="pitch-reveal mt-12 flex flex-col items-center border-t border-line pt-10 text-center"
        style={rise(480)}
      >
        <div className="flex items-center gap-2.5">
          <Leaf size={26} />
          <span className="font-display text-2xl font-medium tracking-[-0.01em] text-ink">
            Everyield
          </span>
        </div>
        <p className="mt-3 font-display text-lg italic text-ink-soft">
          The savings account that doesn&apos;t know what a chain is.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs text-ink-soft transition-colors hover:text-ink hover:bg-surface-2"
            >
              {label}
              <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          ))}
        </div>

        <p className="mt-7 font-mono text-xs tracking-wide text-ink-faint">
          David Dada · @dadadave80
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- exports */
export interface SlideDef {
  label: string;
  kicker: string | null;
  Component: () => ReactNode;
}

export const SLIDES: SlideDef[] = [
  { label: "Title", kicker: null, Component: TitleSlide },
  { label: "Problem", kicker: "02 — The problem", Component: ProblemSlide },
  { label: "Product", kicker: "03 — The product", Component: ProductSlide },
  { label: "Evidence", kicker: "04 — Proven on mainnet", Component: EvidenceSlide },
  { label: "How it works", kicker: "05 — How it works", Component: HowSlide },
  { label: "Lattice", kicker: "06 — Built on Lattice", Component: LatticeSlide },
  { label: "Honest engineering", kicker: "07 — Honest engineering", Component: HonestSlide },
  { label: "Close", kicker: "08 — What's next", Component: RoadmapSlide },
];
