interface WordmarkProps {
  size?: "sm" | "md";
}

/** Everyield mark: a rising stem — money that grows, quietly. */
export function Wordmark({ size = "md" }: WordmarkProps) {
  const text = size === "sm" ? "text-lg" : "text-xl";
  const glyph = size === "sm" ? 18 : 20;
  return (
    <div className="flex items-center gap-2 text-ink">
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-accent"
      >
        <path
          d="M12 21V8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M12 12C12 8.5 9 6 5.5 6C5.5 9.5 8.5 12 12 12Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M12 10.5C12 6.5 15.4 3.5 19 3.5C19 7.5 15.6 10.5 12 10.5Z"
          fill="currentColor"
        />
      </svg>
      <span className={`font-display ${text} font-medium tracking-[-0.01em]`}>
        Everyield
      </span>
    </div>
  );
}
