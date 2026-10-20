import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SummaryCard } from "@/components/SummaryCard";
import { STAGES } from "@/game/run";
import { decodeRun, emptyStats } from "@/game/share";

interface SharePageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { code } = await params;
  const stats = decodeRun(code);
  if (!stats) {
    return { title: "Bluff Run — AI Poker Gauntlet" };
  }
  const stageNum = STAGES[Math.min(STAGES.length - 1, Math.max(0, stats.stageIdx))];
  const title = stats.won
    ? `Bluff Run — Cleared all 8 stages (${stats.beaten} AI beaten)`
    : `Bluff Run — Reached Stage ${stageNum} (${stats.beaten} AI beaten)`;
  const description = `Survived ${stats.hands} hands · Biggest pot: ${stats.biggestPot.toLocaleString()} · Best hand: ${stats.bestHand || "Uncontested"}. How far can you go against AI?`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ShareRunPage({ params }: SharePageProps) {
  const { code } = await params;
  const stats = decodeRun(code) ?? emptyStats();

  return (
    <div className="share-page-shell">
      <header className="site-nav">
        <Logo />
        <Link href="/play" className="btn btn-primary btn-sm">
          Play Bluff Run →
        </Link>
      </header>

      <main className="share-page-main">
        <SummaryCard stats={stats} isShareView />
      </main>
    </div>
  );
}
