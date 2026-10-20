const fs = require("fs");

// ---------- TableWindow ----------
let t = fs.readFileSync("src/components/TableWindow.tsx", "utf8");
const rt = (a, b) => { if (!t.includes(a)) { console.error("MISSING TW", a.slice(0, 70)); process.exitCode = 1; return; } t = t.split(a).join(b); };
rt(`  stage: { n: number; hand: number; round?: string };`, `  stage: { n: number; hand: number; cleared: number; round?: string };`);
rt(`        <div className="topbar-center">
          <div className="stage-pill num" key={\`\${p.stage.n}-\${p.stage.hand}\`}>
            <span className="stage-badge">Stage {p.stage.n}</span>
            {p.stage.round && <><span>{p.stage.round}</span><span className="sep">·</span></>}
            <span>Hand {p.stage.hand}</span>
          </div>
        </div>`,
`        <div className="topbar-center">
          <div className="stage-ind num" aria-label={\`Stage \${p.stage.n}, hand \${p.stage.hand}\`}>
            <span className="rungs" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < p.stage.cleared ? "done" : i === p.stage.n - 1 ? "now" : ""} />)}
            </span>
            <span className="stage-txt">Stage {p.stage.n}{p.stage.round ? \`, \${p.stage.round.toLowerCase()}\` : ""}</span>
            <span className="hair" aria-hidden="true" />
            <span className="stage-txt">Hand <Odometer value={p.stage.hand} /></span>
          </div>
        </div>`);
rt(`export function TableWindow(p: WindowProps) {`,
`/** Digits that roll into place when the value changes. */
function Odometer({ value }: { value: number }) {
  const digits = String(Math.max(0, value)).split("");
  return (
    <span className="odo" aria-hidden="true">
      {digits.map((d, i) => (
        <span className="odo-col" key={digits.length - i}>
          <span className="odo-strip" style={{ transform: \`translateY(-\${Number(d) * 10}%)\` }}>
            {Array.from({ length: 10 }, (_, k) => <span key={k}>{k}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function TableWindow(p: WindowProps) {`);
// reveal: both winners use the same row; hero hand goes away when it won; no outcome pill during reveal
rt(`          <div className={\`hero-hand \${p.hero.folded ? "dim" : ""} \${p.reveal ? (p.reveal.heroWon ? "won" : "lost") : ""}\`} key={\`hero-\${p.handNo}\`}>
            <div className={\`hero-outcome \${p.hero.outcome ? "" : "empty"} \${p.hero.winner ? "tone-win" : ""}\`}>{p.hero.outcome ?? "\\u00a0"}</div>`,
`          <div className={\`hero-hand \${p.hero.folded ? "dim" : ""} \${p.reveal ? (p.reveal.heroWon ? "away" : "lost") : ""}\`} key={\`hero-\${p.handNo}\`}>
            <div className={\`hero-outcome \${p.hero.outcome && !p.reveal ? "" : "empty"} \${p.hero.winner ? "tone-win" : ""}\`}>{p.hero.outcome ?? "\\u00a0"}</div>`);
rt(`        {p.reveal && !p.reveal.heroWon && (() => {
          const i = p.seats.findIndex((s) => s.id === p.reveal!.seatId);
          const pos = layout.opps[i] ?? layout.opps[0];
          const seatW = compact ? 132 : 150;
          const cx = pos.side === "l" ? pos.x + seatW / 2 : 1180 - pos.x - seatW / 2;
          const cy = pos.y + (compact ? 70 : 100);
          return (`,
`        {p.reveal && (() => {
          let cx = 590, cy = 560;
          if (!p.reveal.heroWon) {
            const i = p.seats.findIndex((s) => s.id === p.reveal!.seatId);
            const pos = layout.opps[i] ?? layout.opps[0];
            const seatW = compact ? 132 : 150;
            cx = pos.side === "l" ? pos.x + seatW / 2 : 1180 - pos.x - seatW / 2;
            cy = pos.y + (compact ? 70 : 100);
          }
          return (`);
fs.writeFileSync("src/components/TableWindow.tsx", t);

// ---------- Arena ----------
let a = fs.readFileSync("src/components/Arena.tsx", "utf8");
const ra = (x, y) => { if (!a.includes(x)) { console.error("MISSING AR", x.slice(0, 70)); process.exitCode = 1; return; } a = a.split(x).join(y); };
ra("      stage={{ n: stageIdx + 1, hand: handNo, round: totalRounds > 1 ? `Round ${roundNo} of ${totalRounds}` : undefined }}",
   "      stage={{ n: stageIdx + 1, hand: handNo, cleared: stats.cleared, round: totalRounds > 1 ? `Round ${roundNo} of ${totalRounds}` : undefined }}");
ra(`    const t = setTimeout(() => {
      if (busted) setPhase("runOver");
      else if (cleared) setPhase(bgTables.length ? (bgWinners.length ? "roundCleared" : "waitingBg") : stageIdx === STAGES.length - 1 ? "runOver" : "stageCleared");
      else nextHand();
    }, hand.result?.showdown ? 6200 : 2400);
    return () => clearTimeout(t);`,
`    // The table waits for the player to deal the next hand. Only busts and cleared tables move on by themselves.
    if (!busted && !cleared) return;
    const t = setTimeout(() => {
      if (busted) setPhase("runOver");
      else setPhase(bgTables.length ? (bgWinners.length ? "roundCleared" : "waitingBg") : stageIdx === STAGES.length - 1 ? "runOver" : "stageCleared");
    }, hand.result?.showdown ? 5200 : 2400);
    return () => clearTimeout(t);`);
fs.writeFileSync("src/components/Arena.tsx", a);

// ---------- landing ----------
let p = fs.readFileSync("src/app/page.tsx", "utf8");
p = p.replace(`          stage={{ n: 1, hand: 7 }}`, `          stage={{ n: 1, hand: 7, cleared: 0 }}`);
fs.writeFileSync("src/app/page.tsx", p);

// ---------- CSS ----------
let c = fs.readFileSync("src/app/globals.css", "utf8");
const rc = (x, y) => { if (!c.includes(x)) { console.error("MISSING CSS", x.slice(0, 70)); process.exitCode = 1; return; } c = c.split(x).join(y); };
rc(`.topbar-center { display: flex; justify-content: center; }
.stage-pill { display: inline-flex; align-items: center; gap: 10px; height: 34px; padding: 0 14px 0 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); font-size: 14px; font-weight: 500; color: var(--text); position: relative; animation: labelIn 0.4s var(--ease-out); }
.stage-pill::before { content: ""; position: absolute; inset: -1px; border-radius: 999px; border: 1px solid var(--gold); opacity: 0; animation: pulseRing 2.8s ease-out infinite; pointer-events: none; }
@keyframes pulseRing { 0% { opacity: 0.55; transform: scale(1); } 70%, 100% { opacity: 0; transform: scale(1.12, 1.4); } }
.stage-badge { display: inline-flex; align-items: center; justify-content: center; height: 24px; padding: 0 9px; border-radius: 999px; background: var(--gold); color: var(--accent-ink); font-weight: 700; font-size: 12.5px; letter-spacing: 0.01em; }
.stage-pill span.sep { color: var(--text-3); }
@keyframes labelIn { from { opacity: 0; transform: translateY(-6px); } }`,
`.topbar-center { display: flex; justify-content: center; }
.stage-ind { display: inline-flex; align-items: center; gap: 12px; font-size: 13.5px; font-weight: 500; color: var(--text-2); }
.stage-ind .stage-txt { display: inline-flex; align-items: baseline; gap: 5px; color: var(--text); }
.stage-ind .hair { width: 1px; height: 14px; background: rgba(255, 255, 255, 0.14); }
.rungs { display: inline-flex; align-items: flex-end; gap: 3px; height: 14px; }
.rungs i { display: block; width: 7px; height: 7px; border-radius: 2px; background: rgba(255, 255, 255, 0.14); transition: background-color 0.5s, height 0.5s var(--ease-out); }
.rungs i.done { background: var(--accent); height: 10px; }
.rungs i.now { background: var(--gold); height: 14px; animation: rung 2.6s ease-in-out infinite; }
@keyframes rung { 50% { opacity: 0.55; } }
.odo { display: inline-flex; height: 1em; overflow: hidden; line-height: 1; vertical-align: baseline; }
.odo-col { display: inline-block; height: 1em; overflow: hidden; }
.odo-strip { display: flex; flex-direction: column; transition: transform 0.6s var(--ease-out); }
.odo-strip span { height: 1em; line-height: 1; display: block; }`);
rc(`.hero-hand.lost { transform: translateX(-50%) translateY(46px) scale(0.6); opacity: 0.45; }
.hero-hand.won { transform: translateX(-50%) translateY(-118px) scale(0.56); }
.hero-hand.won .hero-card { box-shadow: 0 0 0 3px var(--gold), 0 16px 36px rgba(0, 0, 0, 0.65); }`,
`.hero-hand.lost { transform: translateX(-50%) translateY(46px) scale(0.6); opacity: 0.45; }
.hero-hand.away { transform: translateX(-50%) translateY(-60px) scale(0.5); opacity: 0; }`);
rc(`.reveal .slot { transform: none; }
.reveal .slot:first-child { transform: rotate(-5deg); } .reveal .slot:last-child { transform: rotate(5deg); }`,
`.reveal .slot { transform: none; }`);
rc(`.hero-card-l .card-suit-big { opacity: 0.15; }`, ``);
fs.writeFileSync("src/app/globals.css", c);
console.log("patched");
