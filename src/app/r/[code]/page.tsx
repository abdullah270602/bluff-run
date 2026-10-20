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
    return { title: "Bluff Run" };
  }
  const stageNum = STAGES[Math.min(STAGES.length - 1, Math.max(0, stats.stageIdx))];
  const title = stats.won
    ? `Bluff Run: cleared all 8 stages, ${stats.beaten} AI opponents beaten`
    : `Bluff Run: reached stage ${stageNum}, ${stats.beaten} AI opponents beaten`;
  const description = `${stats.hands} hands, biggest pot ${stats.biggestPot.toLocaleString()}${stats.bestHand ? `, best hand ${stats.bestHand.toLowerCase()}` : ""}. How far can you go against AI?`;

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
          Sit down
        </Link>
      </header>

      <main className="share-page-main">
        <SummaryCard stats={stats} isShareView />
      </main>
    </div>
  );
}
