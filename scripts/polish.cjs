// One-off copy/label polish. Delete after running.
const fs = require("fs");
const edit = (file, pairs) => {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.error("MISSING in", file, ":", a.slice(0, 70)); process.exitCode = 1; continue; }
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s);
};

edit("src/components/PokerArena.tsx", [
  ['{totalRounds > 1 ? ` · Round ${roundNo}/${totalRounds}` : ""}', '{totalRounds > 1 ? `, round ${roundNo} of ${totalRounds}` : ""}'],
  [`{stageOpponentsTotal === 1
                ? "Heads-Up vs. Jev"
                : otherFieldCount > 0
                  ? \`Your table + \${otherFieldCount} AI across \${bgTables.length} parallel \${bgTables.length === 1 ? "table" : "tables"}\`
                  : \`\${tableOpps.length} AI opponents at this table\`}`,
   `{stageOpponentsTotal === 1
                ? \`Heads-up against \${tableOpps[0]?.name ?? "Jev"}\${liveLabelNote}\`
                : otherFieldCount > 0
                  ? \`\${tableOpps.length} at your table, \${otherFieldCount} on \${bgTables.length} other \${bgTables.length === 1 ? "table" : "tables"}\`
                  : \`\${tableOpps.length} opponents at this table\`}`],
  [`  const handsUntilBlindUp = HANDS_PER_LEVEL - ((tableHandNo - 1) % HANDS_PER_LEVEL);`,
   `  const handsUntilBlindUp = HANDS_PER_LEVEL - ((tableHandNo - 1) % HANDS_PER_LEVEL);
  const liveBrain = (o?: Opponent) => !o ? "house" : (o.brain === "jev" && !avail.jev) || (o.brain === "claude" && !avail.claude) || fallbackBrains[o.id] ? "house" : o.brain;
  const liveLabelNote = tableOpps[0] && liveBrain(tableOpps[0]) !== tableOpps[0].brain ? " (house engine, no key)" : "";`],
  [`<span className="hud-blinds-next">↑ in {handsUntilBlindUp}h</span>`, `<span className="hud-blinds-next">up in {handsUntilBlindUp}</span>`],
  [`{fastMode ? "⚡ Fast" : "Normal"}`, `{fastMode ? "Fast" : "Normal"}`],
  ["`${BRAIN_LABEL[opp.brain]} key not configured — running House engine`", "`${BRAIN_LABEL[opp.brain]} key not configured, running the house engine`"],
  ["{isFallback && opp.brain !== \"house\" ? `${opp.brain.toUpperCase()}·H` : opp.brain.toUpperCase()}", "{isFallback && opp.brain !== \"house\" ? \"house engine\" : BRAIN_LABEL[opp.brain]}"],
  [`<span className="opp-busted-label">ELIMINATED</span>`, `<span className="opp-busted-label">Out</span>`],
  [`<span className="opp-allin-tag">ALL-IN</span>`, `<span className="opp-allin-tag">All in</span>`],
  [`? "SHOWDOWN"
                      : "HAND COMPLETE"
                    : hand.street.toUpperCase()}`, `? "Showdown"
                      : "Hand over"
                    : hand.street[0].toUpperCase() + hand.street.slice(1)}`],
  ["{w.label ? ` · ${w.label}` : \"\"}", "{w.label ? ` with ${w.label.toLowerCase()}` : \"\"}"],
  [`<span className="drawer-kicker">PARALLEL SHOOTOUT TABLES</span>`, `<span className="drawer-kicker">Other tables</span>`],
  [`<span className="hero-you-badge">YOU</span>`, `<span className="hero-you-badge">You</span>`],
  [`STAGE {stageOpponentsTotal} · ROUND {roundNo} OF {totalRounds} CLEARED`, `Stage {stageOpponentsTotal}, round {roundNo} of {totalRounds}`],
  [`<h2>Your table is clear.</h2>
              <p>
                While you won your table, {otherFieldCount} AI opponents battled across{" "}
                {bgTables.length} parallel {bgTables.length === 1 ? "table" : "tables"}. Their
                winners now advance to face you with fresh 2,000-chip stacks.
              </p>`, `<h2>Your table is clear.</h2>
              <p>
                While you played, {otherFieldCount} opponents fought it out on {bgTables.length} other{" "}
                {bgTables.length === 1 ? "table" : "tables"}. The {bgWinners.length === 1 ? "winner comes" : "winners come"} back for you, everyone on fresh 2,000-chip stacks.
              </p>`],
  ["Deal Round {roundNo + 1} (vs {bgWinners.length} {bgWinners.length === 1 ? \"winner\" : \"winners\"}) →", "Deal round {roundNo + 1}"],
  [`<span className="modal-kicker num">STAGE {stageOpponentsTotal} CLEARED</span>
              <h2>The field doubles: {STAGES[stageIdx + 1]} AI opponents next.</h2>
              <p>
                You eliminated all {stageOpponentsTotal}{" "}
                {stageOpponentsTotal === 1 ? "opponent" : "opponents"} in Stage {stageOpponentsTotal}.
                Stacks reset to {START_STACK.toLocaleString()} for the next rung on the ladder.
              </p>`, `<span className="modal-kicker num">Stage {stageOpponentsTotal} cleared</span>
              <h2>The field doubles. {STAGES[stageIdx + 1]} opponents next.</h2>
              <p>
                You took every chip from {stageOpponentsTotal === 1 ? "Jev" : \`all \${stageOpponentsTotal} opponents\`}. Stacks reset to {START_STACK.toLocaleString()} for the next stage.
              </p>`],
  ["Deal Stage {STAGES[stageIdx + 1]} →", "Deal stage {STAGES[stageIdx + 1]}"],
  ["Share Progress ↗", "Share progress"],
  [`<p>Setting the felt…</p>`, `<p>Setting the table</p>`],
  [`"Thinking…"`, `"Thinking"`],
  ["`${namesMap.get(thinkingSeat) ?? \"AI\"} is deciding…`", "`${namesMap.get(thinkingSeat) ?? \"Opponent\"} is deciding`"],
  [`"Waiting for table action…"`, `"Waiting on the table"`],
  [`<span className="status-wait-pill">Settling table…</span>`, `<span className="status-wait-pill">Settling the table</span>`],
  ["Next Hand <kbd className=\"kbd-inline\">Space</kbd>", "Next hand <kbd className=\"kbd-inline\">Space</kbd>"],
  [`<span>Auto-deal</span>`, `<span>Deal automatically</span>`],
  [`In front: {youSeat.bet.toLocaleString()}`, `{youSeat.bet.toLocaleString()} in front`],
  [`<h3>Hand #{hand.handNo} Log</h3>`, `<h3>Hand {hand.handNo}</h3>`],
  [`<span className="hud-blinds-label">Hand #{tableHandNo}</span>`, `<span className="hud-blinds-label">Hand {tableHandNo}</span>`],
  [`seatStackAfter === 0 ? "All-In Call" : "Call"`, `seatStackAfter === 0 ? "All-in call" : "Call"`],
  ["seatStackAfter === 0 ? `All-In ${a.to.toLocaleString()}` : `Raise ${a.to.toLocaleString()}`", "seatStackAfter === 0 ? `All in ${a.to.toLocaleString()}` : `Raise to ${a.to.toLocaleString()}`"],
  ["? `Call All-In (${youLegal.toCall.toLocaleString()})`", "? `Call all in (${youLegal.toCall.toLocaleString()})`"],
  ["? `All-In ${youLegal.maxRaiseTo.toLocaleString()}`", "? `All in ${youLegal.maxRaiseTo.toLocaleString()}`"],
  [`{ label: "All-In", val: youLegal.maxRaiseTo }`, `{ label: "All in", val: youLegal.maxRaiseTo }`],
  [`label: "2× Pot",`, `label: "2x pot",`],
  [`label: "½ Pot",`, `label: "Half pot",`],
]);

edit("src/components/SummaryCard.tsx", [
  ["? `Bluff Run — Cleared all 8 stages (${stats.beaten} AI beaten)`\n      : `Bluff Run — Reached Stage ${stageNumber} (${stats.beaten} AI beaten)`;", "? `Bluff Run: cleared all 8 stages, ${stats.beaten} AI opponents beaten`\n      : `Bluff Run: reached stage ${stageNumber}, ${stats.beaten} AI opponents beaten`;"],
  ["`${blocks}  [1 → 100]`,", "`${blocks}  1 to 100`,"],
  ["`Hands: ${stats.hands} · Biggest pot: ${stats.biggestPot.toLocaleString()} · Best hand: ${stats.bestHand || \"—\"}`,", "`${stats.hands} hands, biggest pot ${stats.biggestPot.toLocaleString()}${stats.bestHand ? `, best hand ${stats.bestHand.toLowerCase()}` : \"\"}`,"],
  ["`Beat my run: ${getShareUrl()}`", "`Beat it: ${getShareUrl()}`"],
  [`: \`Cleared \${stats.cleared} of \${STAGES.length} stages (\${STAGES.slice(0, stats.cleared).join(" → ")}) before busting at Stage \${stageNumber}.\`;`, `: \`Cleared \${stats.cleared} of \${STAGES.length} stages before the stack went at stage \${stageNumber}.\`;`],
  [`"You outlasted every AI opponent across all eight stages of the gauntlet."`, `"Every stage cleared. One hundred opponents, none left standing."`],
  [`"Jev defended the opening heads-up table. The ladder awaits a rematch."`, `"Jev held the first table. The ladder is still there."`],
  [`{stats.won ? "GAUNTLET CLEARED" : isShareView ? "CHALLENGE RECORD" : "RUN COMPLETE"}`, `{stats.won ? "All 100 beaten" : isShareView ? "Shared run" : "Run over"}`],
  [`<span className="metric-label">AI opponents beaten</span>`, `<span className="metric-label">Opponents beaten</span>`],
  [`<span className="metric-label">Hands survived</span>`, `<span className="metric-label">Hands played</span>`],
  [`<span className="metric-label">Signature hand</span>`, `<span className="metric-label">Best hand</span>`],
  [`{stats.bestHand || "Uncontested pots"}`, `{stats.bestHand || "No showdowns"}`],
  [`Run It Back →`, `Play again`],
  [`{isShareView ? "Beat This Run →" : "Start New Run →"}`, `{isShareView ? "Beat this run" : "New run"}`],
  [`{copiedMode === "text" ? "Copied Summary ✓" : "Share Summary"}`, `{copiedMode === "text" ? "Copied" : "Copy summary"}`],
  [`{copiedMode === "link" ? "Link Copied ✓" : "Copy Share Link"}`, `{copiedMode === "link" ? "Copied" : "Copy link"}`],
  [`Permalink ↗`, `Open share page`],
]);

edit("src/app/r/[code]/page.tsx", [
  [`return { title: "Bluff Run — AI Poker Gauntlet" };`, `return { title: "Bluff Run" };`],
  ["? `Bluff Run — Cleared all 8 stages (${stats.beaten} AI beaten)`\n    : `Bluff Run — Reached Stage ${stageNum} (${stats.beaten} AI beaten)`;", "? `Bluff Run: cleared all 8 stages, ${stats.beaten} AI opponents beaten`\n    : `Bluff Run: reached stage ${stageNum}, ${stats.beaten} AI opponents beaten`;"],
  ["const description = `Survived ${stats.hands} hands · Biggest pot: ${stats.biggestPot.toLocaleString()} · Best hand: ${stats.bestHand || \"Uncontested\"}. How far can you go against AI?`;", "const description = `${stats.hands} hands, biggest pot ${stats.biggestPot.toLocaleString()}${stats.bestHand ? `, best hand ${stats.bestHand.toLowerCase()}` : \"\"}. How far can you go against AI?`;"],
  [`Play Bluff Run →`, `Sit down`],
]);

edit("src/app/r/[code]/opengraph-image.tsx", [
  [`export const alt = "Bluff Run — AI Poker Challenge Summary";`, `export const alt = "Bluff Run result";`],
  [`              ↗
            </div>`, `              <svg width="24" height="24" viewBox="0 0 32 32" fill="#16200a">
                <rect x="0" y="28" width="4" height="4" rx="1.1" />
                <rect x="5" y="22.5" width="6" height="6" rx="1.6" />
                <rect x="12" y="15" width="9" height="9" rx="2.3" />
                <rect x="19" y="4" width="13" height="13" rx="3.2" />
              </svg>
            </div>`],
  [`              letterSpacing: "0.06em",
            }}
          >
            HOW FAR CAN YOU GO AGAINST AI?`, `            }}
          >
            How far can you go against AI?`],
  [`{stats.beaten} AI opponents eliminated across {stats.hands} hands`, `{stats.beaten} AI opponents beaten over {stats.hands} hands`],
  [`Stages Cleared`, `Stages cleared`], [`AI Eliminated`, `Opponents beaten`], [`Biggest Pot`, `Biggest pot`], [`Best Hand`, `Best hand`],
  [`{stats.bestHand || "Uncontested"}`, `{stats.bestHand || "No showdowns"}`],
  [`, textTransform: "uppercase"`, ``],
]);

edit("src/app/play/page.tsx", [[`title: "Play · Bluff Run"`, `title: "Bluff Run, at the table"`]]);
console.log("edits done");
