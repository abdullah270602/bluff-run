import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "@/components/Bot";
import { Mark } from "@/components/Logo";
import { ARCHETYPES, buildCouncil } from "@/game/council";
import { STAGES } from "@/game/run";
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

const SHOW = 8;

function niceDate(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The challenge card: how far someone got against this council, who is waiting at that stage, and one way in. */
export default async function SharePage({ params }: Props) {
  const { code } = await params;
  const stats = decodeRun(code) ?? emptyStats("", 0);
  const valid = Boolean(stats.seed);
  const n = STAGES[Math.min(STAGES.length - 1, stats.stageIdx)];
  const council = valid ? buildCouncil(stats.stageIdx, stats.seed, n) : [];
  const b = stats.bust;
  const top = b ? Math.max(b.fold, b.call, b.raise) : 0;
  const second = b ? [b.fold, b.call, b.raise].sort((x, y) => y - x)[1] : 0;
  const bustWord = b ? (b.choice === "fold" ? "a fold" : b.choice === "check_call" ? "a call" : b.choice === "all_in" ? "a shove" : "a raise") : "";
  const kicker = stats.daily ? `Daily council #${stats.daily}` : `Council ${stats.seed}`;
  const title = !valid ? "This link has no run in it." : stats.won ? "Someone beat all 100 Jevs on this council." : stats.cleared === 0 ? "Someone sat down against this council and Jev held the first table." : `Someone got to stage ${stats.stageIdx + 1} against this council.`;
  const sub = !valid
    ? "Sit at the table and make one of your own."
    : stats.won
      ? `Every stage cleared over ${stats.hands} hands. ${stats.beaten} Jevs outlasted. The ladder has no rung above this one.`
      : `${stats.cleared === 0 ? "Out heads-up" : `Out at ×${n}`} after ${stats.hands} hands, ${stats.beaten} Jev${stats.beaten === 1 ? "" : "s"} outlasted.${b ? ` The vote that ended it went ${top} to ${second} for ${bustWord}.` : ""}`;
  const mid = (Math.min(council.length, SHOW) - 1) / 2;

  return (
    <div className="page-shell share-page">
      <div className="intro-top">
        <Link href="/" className="brand"><Mark color="var(--accent)" />Bluff Run</Link>
        <nav className="intro-nav"><Link href="/jevs">The Jevs</Link><Link href="/play">Sit at the table</Link></nav>
      </div>

      <section className="challenge">
        <div className="challenge-kicker num">{valid ? kicker : "Bluff Run"}{stats.date ? <span>{niceDate(stats.date)}</span> : null}</div>
        <h1 className="challenge-title">{title}</h1>
        <p className="challenge-sub">{sub}</p>
        {valid && (
          <ol className="challenge-ladder" aria-label="Stages">
            {STAGES.map((s, i) => {
              const state = i < stats.cleared ? "done" : i === stats.stageIdx && !stats.won ? "bust" : "";
              return <li key={s} className={`num ${state}`} style={{ "--h": `${10 + i * 3}px` } as React.CSSProperties} aria-label={`Stage ${i + 1}, Jev ×${s}${state === "done" ? ", cleared" : state === "bust" ? ", where the run ended" : ""}`}><i /><span>×{s}</span></li>;
            })}
          </ol>
        )}
        {b && top > 0 && (
          <div className="challenge-vote" aria-label="The vote that ended the run">
            <span className="challenge-vote-label">The vote that ended it</span>
            {([["fold", "Fold", b.fold], ["call", "Call", b.call], ["raise", "Raise", b.raise]] as const).map(([k, label, c]) => (
              <div key={k} className={`delib-row ${k} ${c === top ? "winner" : ""}`}><span>{label}</span><div className="delib-bar"><i style={{ width: `${(c / top) * 100}%` }} /></div><span className="num">{c}</span></div>
            ))}
          </div>
        )}
      </section>

      {valid && (
        <section className="challenge-table" aria-label="The council waiting">
          <div className="challenge-rail">
            <ul className="challenge-council">
              {council.slice(0, SHOW).map((m, i) => (
                <li key={m.id} style={{ "--d": i - mid } as React.CSSProperties}>
                  <div className="avatar"><Bot id={`share-${m.id}`} variant={m.shape} mood="idle" /></div>
                  <b>{m.name}</b>
                  <small>{ARCHETYPES[m.archetype].label}</small>
                </li>
              ))}
            </ul>
            {council.length > SHOW && <div className="challenge-more num">and {council.length - SHOW} more on the council</div>}
          </div>
          <div className="challenge-felt">
            <h2>{stats.won ? "The same hundred are waiting." : `This is the council at stage ${stats.stageIdx + 1}.`}</h2>
            <p>Same Jevs, same temperaments, same cards in the same order. You start at stage 1 against one of them and work up to here.</p>
            <Link href={`/play?council=${stats.seed}`} className="pill pill-lime pill-lg">Beat this council<span className="pill-sub num">Same deal, from ×1</span></Link>
          </div>
        </section>
      )}

      {valid && (
        <dl className="challenge-stats">
          <div><dt>Hands played</dt><dd className="num">{stats.hands}</dd></div>
          <div><dt>Biggest pot won</dt><dd className="num">{stats.biggestPot.toLocaleString()}</dd></div>
          <div><dt>Best hand</dt><dd>{stats.bestHand || "No showdowns won"}</dd></div>
          <div><dt>Stage reached</dt><dd className="num">{stats.won ? "All 8" : `${stats.stageIdx + 1} of 8`}</dd></div>
        </dl>
      )}

      <footer className="site-foot">
        <span className="brand" style={{ fontSize: 14 }}><Mark size={18} color="var(--accent)" />Bluff Run</span>
        <span>Heads-up poker against a council of AI players. <Link href="/">How it works</Link>.</span>
      </footer>
    </div>
  );
}
