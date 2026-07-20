import type { Metadata } from "next";
import { PitchDeck } from "@/components/pitch/PitchDeck";

export const metadata: Metadata = {
  title: "Everyield — Pitch",
  description:
    "Everyield pitch deck — the savings account that doesn't know what a chain is. Encode UXMAXX 2026, Universal Accounts Track.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
