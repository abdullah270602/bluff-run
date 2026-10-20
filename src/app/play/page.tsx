import type { Metadata } from "next";
import { PokerArena } from "@/components/PokerArena";

export const metadata: Metadata = {
  title: "Play · Bluff Run",
  description: "No-limit Texas Hold'em gauntlet against escalating AI opponents: 1, 2, 4, 8, 16, 32, 64, 100.",
};

export default function PlayPage() {
  return <PokerArena />;
}
