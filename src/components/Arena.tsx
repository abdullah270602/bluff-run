"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { timedOutDecision, type Decision } from "@/brains/types";
import { evaluate } from "@/engine/evaluate";
import { act, dealHand, legal, liveSeats, potSize, type Action, type HandState } from "@/engine/hand";
import { blindsFor, buildView, type Opponent, PLAYER_ID, resolveChoice, rosterForStage, roundsForStage, splitRound, START_STACK, STAGES } from "@/game/run";
import { recordHand, type HandRecord } from "@/game/review";
import { emptyStats, type RunStats } from "@/game/share";
import { Mark } from "./Logo";
import { Results } from "./Results";
import { Review } from "./Review";
import { TableWindow, type SeatVM, type Tone } from "./TableWindow";

export const BEST_RUN_KEY = "bluff_run_best_v1";
export function saveBestRun(s: RunStats) {
  try {
    const prev = JSON.parse(localStorage.getItem(BEST_RUN_KEY) || "null") as RunStats | null;
    const better = !prev || s.cleared > prev.cleared || (s.cleared === prev.cleared && s.beaten > prev.beaten) || (s.cleared === prev.cleared && s.beaten === prev.beaten && s.biggestPot > prev.biggestPot);
    if (better) localStorage.setItem(BEST_RUN_KEY, JSON.stringify(s));
  } catch { /* storage unavailable */ }
}

type Phase = "hand" | "handDone" | "waitingBg" | "roundCleared" | "stageCleared" | "runOver";
type Status = { text: string; tone: Tone };
interface BgJob { id: string; done: boolean; total: number; tablesDone: number; hands: number }

const statusFor = (a: Action, allIn: boolean): Status => {
  if (a.type === "fold") return { text: "Folded", tone: "fold" };
  if (a.type === "check") return { text: "Checked", tone: "plain" };
  if (a.type === "call") return { text: allIn ? "All in" : "Called", tone: "call" };
  return { text: allIn ? "All in" : `Raised to ${a.to.toLocaleString()}`, tone: "raise" };
};

export function Arena() {
  const [avail, setAvail] = useState<{ configured: boolean; models: { id: string }[] } | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [roundNo, setRoundNo] = useState(1);
  const [tableOpps, setTableOpps] = useState<Opponent[]>([]);
  const [bgTables, setBgTables] = useState<Opponent[][]>([]);
  const [bgJob, setBgJob] = useState<BgJob | null>(null);
  const [bgWinners, setBgWinners] = useState<Opponent[]>([]);
  const [hand, setHand] = useState<HandState | null>(null);
  const [dealer, setDealer] = useState(0);
  const [handNo, setHandNo] = useState(1);
  const [phase, setPhase] = useState<Phase>("hand");
  const [stats, setStats] = useState<RunStats>(emptyStats);
  const [thinking, setThinking] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);
  const [drawer, setDrawer] = useState<null | "help" | "log">(null);
  const [runLog, setRunLog] = useState<HandRecord[]>([]);
  const decisions = useRef<Record<number, Decision>>({});
  const startStacks = useRef(new Map<string, number>());
  const processed = useRef(-1);
  const lock = useRef(false);

  const names = useMemo(() => new Map<string, string>([[PLAYER_ID, "You"], ...tableOpps.map((o) => [o.id, o.name] as [string, string])]), [tableOpps]);
  const models = useMemo(() => new Map(tableOpps.map((o) => [o.id, o.model])), [tableOpps]);
  const personas = useMemo(() => new Map(tableOpps.map((o) => [o.id, o.persona])), [tableOpps]);
  const oppById = useMemo(() => new Map(tableOpps.map((o) => [o.id, o])), [tableOpps]);
  const modelIds = useCallback(() => avail?.models.map((m) => m.id) ?? ["jev"], [avail]);

  const deal = useCallback((seats: { id: string; stack: number }[], d: number, n: number) => {
    const [sb, bb] = blindsFor(n);
    decisions.current = {};
    startStacks.current = new Map(seats.map((s) => [s.id, s.stack]));
    processed.current = -1;
    const h = dealHand(seats, d, sb, bb, n);
    setHand({ ...h });
    setStatuses({});
    setRaiseOpen(false);
    setPhase("hand");
    setHandNo(n);
    setDealer(d);
  }, []);

  const startRound = useCallback((field: Opponent[], round: number, stage: number) => {
    const { mine, others } = splitRound(field);
    setTableOpps(mine);
    setBgTables(others);
    setBgWinners([]);
    setBgJob(null);
    setRoundNo(round);
    setStageIdx(stage);
    if (others.length) {
      fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tables: others }) })
        .then((r) => r.json())
        .then((d: { id?: string }) => d.id && setBgJob({ id: d.id, done: false, total: others.length, tablesDone: 0, hands: 0 }))
        .catch(() => {});
    }
    deal([{ id: PLAYER_ID, stack: START_STACK }, ...mine.map((o) => ({ id: o.id, stack: START_STACK }))], 0, 1);
  }, [deal]);

  const startStage = useCallback((stage: number, ids: string[]) => startRound(rosterForStage(stage, ids), 1, stage), [startRound]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/decide").then((r) => (r.ok ? r.json() : { configured: false, models: [] })).catch(() => ({ configured: false, models: [] }))
      .then((d: { configured: boolean; models: { id: string }[] }) => {
        if (cancelled) return;
        setAvail(d);
        if (d.configured) startStage(0, d.models.map((m) => m.id));
      });
    return () => { cancelled = true; };
  }, [startStage]);

  // background tables: poll until done
  useEffect(() => {
    if (!bgJob || bgJob.done) return;
    const id = bgJob.id;
    const tick = async () => {
      try {
        const d = (await (await fetch(`/api/simulate?id=${id}`)).json()) as BgJob & { winners: Opponent[] };
        setBgJob((prev) => (prev && prev.id === id ? { ...prev, done: d.done, total: d.total, tablesDone: d.tablesDone, hands: d.hands } : prev));
        if (d.done) setBgWinners(d.winners);
      } catch { /* next tick */ }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => clearInterval(t);
  }, [bgJob?.id, bgJob?.done]);
  useEffect(() => { if (phase === "waitingBg" && bgWinners.length) setPhase("roundCleared"); }, [phase, bgWinners]);

  const nextHand = useCallback(() => {
    if (!hand) return;
    const survivors = liveSeats(hand).map((s) => ({ id: s.id, stack: s.stack }));
    if (survivors.length <= 1) return;
    deal(survivors, (dealer + 1) % survivors.length, handNo + 1);
  }, [hand, dealer, handNo, deal]);

  const applyAction = useCallback((h: HandState, a: Action, decision?: Decision) => {
    const i = h.toAct, seat = h.seats[i];
    const prevStreet = h.street;
    if (decision) decisions.current[h.log.length] = decision;
    act(h, a);
    const st = statusFor(a, seat.allIn);
    setStatuses((prev) => ({ ...(h.street !== prevStreet && h.street !== "done" ? {} : prev), [seat.id]: st }));
    setHand({ ...h });
  }, []);

  const you = useCallback((a: Action) => {
    if (!hand || phase !== "hand" || hand.street === "done" || hand.seats[hand.toAct]?.id !== PLAYER_ID) return;
    setRaiseOpen(false);
    applyAction(hand, a);
  }, [hand, phase, applyAction]);

  // opponents act
  useEffect(() => {
    if (!hand || phase !== "hand" || hand.street === "done" || hand.toAct < 0) return;
    const actor = hand.seats[hand.toAct];
    if (actor.id === PLAYER_ID || lock.current) return;
    lock.current = true;
    const model = oppById.get(actor.id)?.model ?? "jev";
    const view = buildView(hand, hand.toAct, names, personas, STAGES[stageIdx]);
    setThinking(actor.id);
    let cancelled = false;
    (async () => {
      const t0 = Date.now();
      let d: Decision | null = null;
      try {
        const res = await fetch("/api/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, view }) });
        if (res.ok) d = (await res.json()) as Decision;
      } catch { /* timed out below */ }
      d ??= timedOutDecision(view, model);
      const wait = 650 - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (cancelled) return;
      lock.current = false;
      setThinking(null);
      applyAction(hand, resolveChoice(hand, hand.toAct, d.choice), d);
    })();
    return () => { cancelled = true; lock.current = false; };
  }, [hand, phase, oppById, names, personas, stageIdx, applyAction]);

  // hand finished
  useEffect(() => {
    if (!hand || hand.street !== "done" || processed.current === hand.handNo) return;
    processed.current = hand.handNo;
    setPhase("handDone");
    setRunLog((log) => [...log, recordHand(hand, decisions.current, names, models, startStacks.current, STAGES[stageIdx], roundNo)]);
    const youSeat = hand.seats.find((s) => s.id === PLAYER_ID);
    const busted = !youSeat || youSeat.stack === 0;
    const alive = liveSeats(hand);
    const cleared = !busted && alive.length === 1;
    const won = hand.result?.winners.find((w) => w.seat === PLAYER_ID);
    const ev = youSeat && !youSeat.folded && hand.board.length >= 3 ? evaluate(youSeat.hole.concat(hand.board)) : null;
    setStatuses((prev) => {
      const next = { ...prev };
      for (const w of hand.result?.winners ?? []) next[w.seat] = { text: `Wins ${w.amount.toLocaleString()}`, tone: "win" };
      return next;
    });
    setStats((prev) => {
      const next: RunStats = {
        ...prev, stageIdx, hands: prev.hands + 1,
        beaten: prev.beaten + hand.seats.filter((s) => s.id !== PLAYER_ID && s.stack === 0).length + (cleared ? bgTables.reduce((t, x) => t + x.length - 1, 0) : 0),
        biggestPot: Math.max(prev.biggestPot, won?.amount ?? 0),
        bestHand: won && ev && ev.score > prev.bestHandScore ? ev.label : prev.bestHand,
        bestHandScore: won && ev ? Math.max(prev.bestHandScore, ev.score) : prev.bestHandScore,
      };
      if (cleared && bgTables.length === 0) { next.cleared = stageIdx + 1; if (stageIdx === STAGES.length - 1) next.won = true; }
      if (busted || next.won) saveBestRun(next);
      return next;
    });
    const t = setTimeout(() => {
      if (busted) setPhase("runOver");
      else if (cleared) setPhase(bgTables.length ? (bgWinners.length ? "roundCleared" : "waitingBg") : stageIdx === STAGES.length - 1 ? "runOver" : "stageCleared");
      else nextHand();
    }, busted || cleared ? 2200 : 2600);
    return () => clearTimeout(t);
  }, [hand, stageIdx, roundNo, names, models, bgTables, bgWinners, nextHand]);

  const advance = useCallback(() => {
    if (phase === "stageCleared") startStage(stageIdx + 1, modelIds());
    else if (phase === "roundCleared") startRound(bgWinners, roundNo + 1, stageIdx);
    else if (phase === "handDone") nextHand();
  }, [phase, stageIdx, roundNo, bgWinners, startStage, startRound, nextHand, modelIds]);

  const restart = () => { setStats(emptyStats()); setRunLog([]); startStage(0, modelIds()); };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { setRaiseOpen(false); setDrawer(null); return; }
      if (k === "h") { setDrawer((d) => (d === "help" ? null : "help")); return; }
      if (k === "l") { setDrawer((d) => (d === "log" ? null : "log")); return; }
      if (e.code === "Space" || k === "n" || k === "enter") {
        if (phase === "handDone" || phase === "stageCleared" || phase === "roundCleared") { e.preventDefault(); advance(); }
        return;
      }
      if (!hand || phase !== "hand" || hand.street === "done" || hand.seats[hand.toAct]?.id !== PLAYER_ID) return;
      const L = legal(hand);
      if (k === "f") you(L.canCheck ? { type: "check" } : { type: "fold" });
      else if (k === "c") you(L.canCheck ? { type: "check" } : { type: "call" });
      else if (k === "r" && L.canRaise) { if (raiseOpen) you({ type: "raise", to: raiseTo }); else { setRaiseTo((v) => Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, v || L.minRaiseTo))); setRaiseOpen(true); } }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hand, phase, raiseOpen, raiseTo, you, advance]);

  useEffect(() => {
    if (hand && phase === "hand" && hand.toAct >= 0 && hand.seats[hand.toAct].id === PLAYER_ID) {
      const L = legal(hand);
      setRaiseTo((v) => Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, v || L.minRaiseTo)));
    }
  }, [hand, phase]);

  // ---------- view ----------
  const stageN = STAGES[stageIdx];
  const totalRounds = roundsForStage(stageN);
  const youIdx = hand ? hand.seats.findIndex((s) => s.id === PLAYER_ID) : -1;
  const youSeat = hand && youIdx >= 0 ? hand.seats[youIdx] : null;
  const yourTurn = Boolean(hand && phase === "hand" && hand.street !== "done" && hand.toAct === youIdx);
  const L = hand && yourTurn ? legal(hand) : null;
  const pot = hand ? potSize(hand) : 0;
  const winners = new Set(hand?.result?.winners.map((w) => w.seat) ?? []);
  const revealed = new Set(hand?.result?.revealed ?? []);
  const youWon = hand?.result?.winners.find((w) => w.seat === PLAYER_ID);
  const heroEval = youSeat && !youSeat.folded && hand && hand.board.length >= 3 ? evaluate(youSeat.hole.concat(hand.board)).label : null;

  const seats: SeatVM[] = tableOpps.map((o) => {
    const s = hand?.seats.find((x) => x.id === o.id);
    const idx = hand ? hand.seats.findIndex((x) => x.id === o.id) : -1;
    return {
      id: o.id, name: o.name, model: o.model, persona: o.persona,
      stack: s?.stack ?? 0, bet: hand?.street === "done" ? 0 : s?.bet ?? 0, folded: s?.folded ?? false, allIn: s?.allIn ?? false, out: !s,
      hole: s && (revealed.has(o.id) || (hand?.street === "done" && hand.result?.showdown && !s.folded)) ? s.hole : null,
      status: thinking === o.id ? { text: "Thinking", tone: "think" } : statuses[o.id] ?? null,
      dealer: idx >= 0 && hand?.dealer === idx, turn: Boolean(hand && phase === "hand" && hand.street !== "done" && hand.toAct === idx), winner: winners.has(o.id),
    };
  });

  const otherCount = bgTables.reduce((t, x) => t + x.length, 0);
  const centerLabel = `Stage ${stageIdx + 1}${totalRounds > 1 ? `, round ${roundNo} of ${totalRounds}` : ""}, hand ${handNo}`;
  const potView = (() => {
    if (!hand) return { label: "Pot", value: 0, note: "" as string, tone: undefined as "win" | "lose" | undefined };
    if (phase === "stageCleared") return { label: `Stage ${stageIdx + 1} cleared`, value: STAGES[stageIdx + 1], note: `${STAGES[stageIdx + 1]} opponents next, stacks reset`, tone: "win" as const };
    if (phase === "roundCleared") return { label: "Table cleared", value: bgWinners.length, note: `${bgWinners.length === 1 ? "winner from the other table comes" : "winners from the other tables come"} back for you`, tone: "win" as const };
    if (phase === "waitingBg") return { label: "Table cleared", value: bgJob ? bgJob.tablesDone : 0, note: `of ${bgTables.length} other tables finished, Jev is still playing them`, tone: "win" as const };
    if (hand.street === "done" && hand.result) {
      const w = hand.result.winners;
      const first = w[0];
      const label = w.length > 1 ? "Split pot" : first.seat === PLAYER_ID ? "You win" : `${names.get(first.seat)} wins`;
      return { label, value: w.reduce((t, x) => t + x.amount, 0), note: first.label ? `with ${first.label.toLowerCase()}` : "everyone else folded", tone: first.seat === PLAYER_ID ? ("win" as const) : ("lose" as const) };
    }
    return { label: "Pot", value: pot, note: hand.street === "preflop" ? "" : hand.street[0].toUpperCase() + hand.street.slice(1), tone: undefined };
  })();

  const turn = (() => {
    if (!hand) return { text: "Setting the table", progress: 0 };
    if (phase === "handDone") return { text: "Next hand", sub: "Space", progress: 100 };
    if (phase === "stageCleared" || phase === "roundCleared") return { text: "Deal", sub: "Space", progress: 100, lime: true };
    if (phase === "waitingBg") return { text: "Other tables", sub: bgJob ? `${bgJob.tablesDone}/${bgJob.total}` : "", progress: bgJob ? (bgJob.tablesDone / bgJob.total) * 100 : 0 };
    if (yourTurn) return { text: "Your turn", progress: 100, lime: true };
    if (thinking) return { text: `${names.get(thinking)} is thinking`, progress: 100 };
    return { text: "Dealing", progress: 100 };
  })();

  const presets = L ? [
    { label: "Min", to: L.minRaiseTo },
    { label: "Half pot", to: Math.round(hand!.currentBet + (pot + L.toCall) * 0.5) },
    { label: "Pot", to: Math.round(hand!.currentBet + pot + L.toCall) },
    { label: "All in", to: L.maxRaiseTo },
  ].map((p) => ({ ...p, to: Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, p.to)) })) : [];

  const actions = (() => {
    if (!hand) return null;
    if (yourTurn && L) return (
      <>
        <button type="button" className={`text-btn ${L.canCheck ? "" : "text-fold"}`} onClick={() => you(L.canCheck ? { type: "check" } : { type: "fold" })}>
          <FoldIcon />{L.canCheck ? "Check" : "Fold"}<span className="key">F</span>
        </button>
        {L.canRaise && (
          <button type="button" className="text-btn text-raise" onClick={() => (raiseOpen ? you({ type: "raise", to: raiseTo }) : setRaiseOpen(true))}>
            <RaiseIcon />{raiseOpen ? `${hand.currentBet === 0 ? "Bet" : "Raise to"} ${raiseTo.toLocaleString()}` : hand.currentBet === 0 ? "Bet" : "Raise"}<span className="key">R</span>
          </button>
        )}
        {!L.canCheck && (
          <button type="button" className="text-btn" onClick={() => you({ type: "call" })}>
            <CallIcon />{L.toCall >= youSeat!.stack ? `Call all in` : `Call ${L.toCall.toLocaleString()}`}<span className="key">C</span>
          </button>
        )}
      </>
    );
    if (phase === "handDone" && liveSeats(hand).length > 1 && youSeat && youSeat.stack > 0) return <button type="button" className="text-btn" onClick={advance}><NextIcon />Next hand<span className="key">N</span></button>;
    if (phase === "stageCleared") return <button type="button" className="text-btn text-raise" onClick={advance}><NextIcon />Deal stage {stageIdx + 2}, {STAGES[stageIdx + 1]} opponents<span className="key">N</span></button>;
    if (phase === "roundCleared") return <button type="button" className="text-btn text-raise" onClick={advance}><NextIcon />Deal round {roundNo + 1}<span className="key">N</span></button>;
    return null;
  })();

  const leftLinks = (
    <>
      <button type="button" className="text-btn text-muted" onClick={() => setDrawer(drawer === "help" ? null : "help")}><span className="meta-dot">?</span>Help<span className="key">H</span></button>
      <button type="button" className="text-btn text-muted" onClick={() => setDrawer(drawer === "log" ? null : "log")}><LogIcon />Log<span className="key">L</span></button>
      <button type="button" className="text-btn text-muted" onClick={restart}>Restart</button>
    </>
  );

  const floating = (
    <>
      {raiseOpen && L && (
        <div className="raise-pop">
          <div className="raise-row">
            {presets.map((p) => <button key={p.label} type="button" className={`pill ${raiseTo === p.to ? "active" : ""}`} onClick={() => setRaiseTo(p.to)}>{p.label}</button>)}
          </div>
          <div className="raise-slider">
            <input type="range" min={L.minRaiseTo} max={L.maxRaiseTo} step={Math.max(1, Math.floor(hand!.bb / 2))} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} aria-label="Raise to" />
            <strong className="num">{raiseTo.toLocaleString()}</strong>
          </div>
        </div>
      )}
      {drawer === "help" && (
        <aside className="drawer">
          <div className="drawer-head">Controls<button type="button" className="drawer-close" onClick={() => setDrawer(null)} aria-label="Close">×</button></div>
          <p className="drawer-copy">Take every chip at the table to clear the stage. Each cleared stage doubles the field: 1, 2, 4, 8, 16, 32, 64, 100. Lose your stack and the run is over.</p>
          <div className="shortcuts">
            <div><span>Fold or check</span><kbd>F</kbd></div><div><span>Check or call</span><kbd>C</kbd></div>
            <div><span>Raise</span><kbd>R</kbd></div><div><span>Next</span><kbd>Space</kbd></div>
          </div>
        </aside>
      )}
      {drawer === "log" && hand && (
        <aside className="drawer">
          <div className="drawer-head">Hand {hand.handNo}<button type="button" className="drawer-close" onClick={() => setDrawer(null)} aria-label="Close">×</button></div>
          {bgTables.length > 0 && <p className="drawer-copy">{otherCount} opponents on {bgTables.length} other {bgTables.length === 1 ? "table" : "tables"}, played by Jev.{bgJob ? ` ${bgJob.tablesDone} of ${bgJob.total} finished.` : ""}</p>}
          <ul className="log-list num">
            {hand.log.map((e, i) => {
              const d = decisions.current[i];
              return (
                <li key={i}>
                  <span><span className="log-street">{e.street}</span>{names.get(e.seat)} {e.action}{e.amount ? ` ${e.amount.toLocaleString()}` : ""}{e.note ? ` (${e.note.toLowerCase()})` : ""}</span>
                  {d && (d.reason ? <span className="log-thought">“{d.reason}”</span> : d.probabilities ? <span className="log-thought">{Object.entries(d.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, p]) => `${k.replace("_", " ")} ${Math.round(p * 100)}%`).join(", ")}</span> : d.timedOut ? <span className="log-thought">timed out</span> : null)}
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </>
  );

  const overlay = (() => {
    if (avail && !avail.configured) return (
      <div className="window-center">
        <Mark size={32} color="var(--lime)" />
        <p>No OpenRouter key on this server. Add <code>OPENROUTER_API_KEY</code> to <code>.env.local</code> and restart. Every opponent is played through OpenRouter.</p>
      </div>
    );
    if (!avail || !hand) return <div className="window-center"><Mark size={32} color="var(--lime)" /><p>Setting the table</p></div>;
    if (phase === "runOver") return (
      <Results stats={stats} onPlayAgain={restart} right={<><div className="results-right-head"><h3>Every decision, hand by hand</h3><span className="num">{runLog.length} {runLog.length === 1 ? "hand" : "hands"}</span></div><Review hands={runLog} /></>} />
    );
    return null;
  })();

  return (
    <TableWindow
      centerLabel={hand ? centerLabel : "Bluff Run"}
      counter={{ n: stageN, unit: stageN === 1 ? "opponent" : "opponents" }}
      blinds={hand ? `${hand.sb}/${hand.bb}` : "10/20"}
      pot={potView.value}
      potLabel={potView.label}
      potTone={potView.tone}
      potNote={potView.note}
      board={hand?.board ?? []}
      handNo={handNo}
      seats={seats}
      you={youSeat ? { id: PLAYER_ID, name: "You", model: "you", persona: { aggression: 1, bluff: 0, patience: 0 }, stack: youSeat.stack, bet: hand?.street === "done" ? 0 : youSeat.bet, folded: youSeat.folded, allIn: youSeat.allIn, out: false, hole: null, status: statuses[PLAYER_ID] ?? null, dealer: hand?.dealer === youIdx, turn: yourTurn, winner: Boolean(youWon) } : null}
      hero={youSeat ? { hole: youSeat.hole, folded: youSeat.folded, winner: Boolean(youWon), outcome: youSeat.folded ? "Folded" : hand?.street === "done" ? (youWon ? (youWon.label ?? "You win") : heroEval) : null } : null}
      turn={turn}
      actions={actions}
      leftLinks={leftLinks}
      floating={floating}
      overlay={overlay}
      fit={{ min: 0.55, fitHeight: true }}
    />
  );
}

const FoldIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="11" height="15" rx="2" /><path d="M15 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7" /><path d="M8 9l3 3M11 9l-3 3" /></svg>;
const RaiseIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="15" r="5" /><path d="M15 11V4M12 7l3-3 3 3M14 15h4a2 2 0 0 0 2-2v-1" /></svg>;
const CallIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="6" height="6" rx="1.5" /><rect x="3" y="13" width="6" height="6" rx="1.5" /><path d="M13 8h6M16 5l3 3-3 3" /></svg>;
const NextIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
const LogIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ width: 14, height: 14, color: "#9cb0a6" }}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h10M7 17h6" /></svg>;
