import { describe, expect, it } from "bun:test";
import { usdAmount } from "./send";

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
