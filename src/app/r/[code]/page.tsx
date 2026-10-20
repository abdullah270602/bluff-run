import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/Logo";
import { Results } from "@/components/Results";
import { decodeRun, emptyStats, ladderGlyphs } from "@/game/share";

interface Props { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const stats = decodeRun(code);
  if (!stats) return { title: "Bluff Run" };
  const head = stats.daily ? `Bluff Run #${stats.daily}` : `Bluff Run, council ${stats.seed}`;
  const title = stats.won ? `${head}: beat all 100 Jevs` : `${head}: out at stage ${stats.stageIdx + 1}, ${stats.beaten} Jevs outlasted`;
  const description = `${ladderGlyphs(stats)} ${stats.hands} hands, biggest pot ${stats.biggestPot.toLocaleString()}. Same council, your turn.`;
  return { title, description, openGraph: { title, description, type: "website" }, twitter: { card: "summary_large_image", title, description } };
}

export default async function SharePage({ params }: Props) {
  const { code } = await params;
  const stats = decodeRun(code) ?? emptyStats("", 0);
  return (
    <div className="page-shell share-shell">
      <div className="intro-top">
        <Link href="/" className="brand"><Mark color="var(--accent)" />Bluff Run</Link>
        <nav className="intro-nav"><Link href={`/play?council=${stats.seed || "random"}`}>Sit at the table</Link></nav>
      </div>
      <div className="poker-window">
        <Results
          stats={stats}
          shareView
          right={<div className="results-empty">Someone sat down against this council and got this far. It is the same council for you: same Jevs, same temperaments, same cards. Beat it.</div>}
        />
      </div>
    </div>
  );
}
