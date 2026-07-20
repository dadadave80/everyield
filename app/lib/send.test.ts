import { describe, expect, it } from "bun:test";
import { classifyQuoteError, feeDrifted, usdAmount } from "./send";

describe("usdAmount", () => {
  it("decodes hex (any case) and plain decimal without throwing, and fails closed to 0", () => {
    // 0x6a17d8fa8c03c0 wei == ~0.0299 USD at 18 decimals.
    expect(usdAmount("0x6a17d8fa8c03c0")).toBeCloseTo(0.0299, 3);
    expect(usdAmount("0X6a17d8fa8c03c0")).toBeCloseTo(0.0299, 3); // uppercase 0X prefix
    expect(usdAmount("0x6A17D8FA8C03C0")).toBeCloseTo(0.0299, 3); // uppercase hex digits

    expect(usdAmount("12.5")).toBe(12.5); // plain decimal

    expect(() => usdAmount("0x")).not.toThrow(); // bare "0x": BigInt() would throw
    expect(usdAmount("0x")).toBe(0);

    expect(() => usdAmount("0xzz")).not.toThrow(); // garbage hex: BigInt() would throw
    expect(usdAmount("0xzz")).toBe(0);

    expect(usdAmount("not-a-number")).toBe(0); // non-numeric garbage
    expect(usdAmount(null)).toBe(0);
    expect(usdAmount(undefined)).toBe(0);
    expect(usdAmount("")).toBe(0);
  });
});

// feeDrifted flags a re-confirm when |fresh - prev| exceeds max(20% of prev, $0.25).
// The $0.25 abs floor and the 20% pct term cross over at prev == $1.25
// (1.25 * 0.20 == 0.25): below that the floor dominates, above it the pct does.
describe("feeDrifted", () => {
  it("uses the $0.25 abs floor for small totals (pct alone would be too twitchy)", () => {
    // prev $0.50 → threshold = max($0.10, $0.25) = $0.25 (floor wins).
    // A $0.20 swing clears the 20% pct term ($0.10) but not the floor → no drift.
    expect(feeDrifted(0.5, 0.7)).toBe(false);
    expect(feeDrifted(0.5, 0.3)).toBe(false); // symmetric downward
    // A $0.30 swing clears the floor → drift.
    expect(feeDrifted(0.5, 0.8)).toBe(true);
  });

  it("uses the 20% pct term for large totals (abs floor would be too twitchy)", () => {
    // prev $10 → threshold = max($2.00, $0.25) = $2.00 (pct wins).
    // A $1.00 swing clears the $0.25 floor but not 20% → no drift.
    expect(feeDrifted(10, 11)).toBe(false);
    expect(feeDrifted(10, 9)).toBe(false); // symmetric downward
    // A $3.00 swing clears 20% → drift.
    expect(feeDrifted(10, 13)).toBe(true);
  });

  it("treats a swing exactly equal to the threshold as NOT drifted (strict >)", () => {
    // The implementation uses `> threshold`, so an exact-boundary swing is NOT a drift.
    expect(feeDrifted(1, 1.25)).toBe(false); // diff $0.25 == abs floor ($1 * 0.2 = $0.2 < $0.25)
    expect(feeDrifted(100, 120)).toBe(false); // diff $20 == 20% pct term ($100 * 0.2)
    // Just past each boundary drifts.
    expect(feeDrifted(1, 1.26)).toBe(true);
    expect(feeDrifted(100, 121)).toBe(true);
  });

  it("straddles the $1.25 pct/abs crossover point", () => {
    // At prev $1.25 both terms equal $0.25; a diff of exactly $0.25 is not drift.
    expect(feeDrifted(1.25, 1.5)).toBe(false); // 1.25 * 0.2 == 0.25 == diff
    // Just below crossover (prev $1.20): floor $0.25 governs (pct would be $0.24).
    expect(feeDrifted(1.2, 1.44)).toBe(false); // diff $0.24 < floor $0.25
    // Just above crossover (prev $2.00): pct $0.40 governs (floor would allow $0.25).
    expect(feeDrifted(2, 2.3)).toBe(false); // diff $0.30 < pct $0.40, but > floor $0.25
    expect(feeDrifted(2, 2.45)).toBe(true); // diff $0.45 > pct $0.40
  });
});

// classifyQuoteError names the one quote/build failure whose cause is
// actually knowable (the unified balance can't cover its own network fee) so
// the UI can show honest copy instead of a blanket "couldn't check the cost".
describe("classifyQuoteError", () => {
  it("classifies the SDK's exact insufficient-fee message, case-insensitively", () => {
    expect(
      classifyQuoteError("Insufficient balance for gas fees, please try again after making a deposit."),
    ).toBe("insufficient-fee");
    expect(classifyQuoteError("insufficient balance for gas fees")).toBe("insufficient-fee");
    expect(classifyQuoteError("INSUFFICIENT BALANCE FOR GAS FEES")).toBe("insufficient-fee");
  });

  it("falls back to generic for unrelated errors and empty/missing input", () => {
    expect(classifyQuoteError("Network request failed")).toBe("generic");
    expect(classifyQuoteError("User rejected the request")).toBe("generic");
    expect(classifyQuoteError("")).toBe("generic");
    expect(classifyQuoteError(null)).toBe("generic");
    expect(classifyQuoteError(undefined)).toBe("generic");
  });
});
