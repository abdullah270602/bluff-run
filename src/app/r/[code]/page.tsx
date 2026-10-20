import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/Logo";
import { Results } from "@/components/Results";
import { STAGES } from "@/game/run";
import { decodeRun, emptyStats } from "@/game/share";

interface Props { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const stats = decodeRun(code);
  if (!stats) return { title: "Bluff Run" };
  const stage = STAGES[Math.min(STAGES.length - 1, Math.max(0, stats.stageIdx))];
  const title = stats.won ? `Bluff Run: cleared all 8 stages, ${stats.beaten} AI opponents beaten` : `Bluff Run: reached stage ${stats.stageIdx + 1} (${stage} opponents), ${stats.beaten} AI opponents beaten`;
  const description = `${stats.hands} hands, biggest pot ${stats.biggestPot.toLocaleString()}${stats.bestHand ? `, best hand ${stats.bestHand.toLowerCase()}` : ""}. How far can you go against AI?`;
  return { title, description, openGraph: { title, description, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function SharePage({ params }: Props) {
  const { code } = await params;
  const stats = decodeRun(code) ?? emptyStats();
  return (
    <div className="page-shell share-shell">
      <div className="intro-top">
        <Link href="/" className="brand"><Mark color="var(--accent)" />Bluff Run</Link>
        <nav className="intro-nav"><Link href="/play">Sit at the table</Link></nav>
      </div>
      <div className="poker-window">
        <Results
          stats={stats}
          shareView
          right={<div className="results-empty">Someone sat down against the field and got this far. The table is open: heads-up against Jev to start, and the count doubles every time you clear it.</div>}
        />
      </div>
    </div>
  );
}
