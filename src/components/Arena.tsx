"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { allowedChoices, timedOutChoice, type Decision, type Vote } from "@/brains/types";
import { bestFive, evaluate } from "@/engine/evaluate";
import { act, dealHand, legal, liveSeats, potSize, type Action, type HandState } from "@/engine/hand";
import { ARCHETYPES, buildCouncil, groupOf, hashSeed, newSeed, rngFrom, tally, type Member } from "@/game/council";
import { blindsFor, buildView, PLAYER_ID, resolveChoice, SEAT_ID, START_STACK, STAGES } from "@/game/run";
import { memberStats, recordHand, type HandRecord } from "@/game/review";
import { dailyNumber, emptyStats, todaySeed, type RunStats } from "@/game/share";
import type { Mood } from "./Bot";
import { Mark } from "./Logo";
import { Results } from "./Results";
import { Review } from "./Review";
import { TableWindow, type Deliberation, type Flight, type SeatVM, type Tone } from "./TableWindow";

export const BEST_RUN_KEY = "bluff_run_best_v2";
export function saveBestRun(s: RunStats) {
  try {
    const prev = JSON.parse(localStorage.getItem(BEST_RUN_KEY) || "null") as RunStats | null;
    const better = !prev || s.cleared > prev.cleared || (s.cleared === prev.cleared && s.beaten > prev.beaten) || (s.cleared === prev.cleared && s.beaten === prev.beaten && s.biggestPot > prev.biggestPot);
    if (better) localStorage.setItem(BEST_RUN_KEY, JSON.stringify(s));
  } catch { /* storage unavailable */ }
}

type Phase = "hand" | "handDone" | "stageCleared" | "runOver";
type Status = { text: string; tone: Tone };

const statusFor = (a: Action, allIn: boolean): Status => {
  if (a.type === "fold") return { text: "Folded", tone: "fold" };
  if (a.type === "check") return { text: "Checked", tone: "plain" };
  if (a.type === "call") return { text: allIn ? "All in" : "Called", tone: "call" };
  return { text: allIn ? "All in" : `Raised to ${a.to.toLocaleString()}`, tone: "raise" };
};

/** Rough strength of the seat's own hand, for the timing tell. */
function strong(h: HandState, i: number): boolean {
  const s = h.seats[i];
  if (h.board.length >= 3) return evaluate(s.hole.concat(h.board)).category >= 2;
  const r = s.hole.map((c) => c % 13);
  return r[0] === r[1] || Math.min(...r) >= 10;
}

export function Arena() {
  const params = useSearchParams();
  const [seed] = useState(() => { const q = params.get("council"); return q === "random" ? newSeed() : q && /^[A-Z0-9]{4,8}$/i.test(q) ? q.toUpperCase() : todaySeed(); });
  const daily = seed === todaySeed() ? dailyNumber() : 0;

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [stageIdx, setStageIdx] = useState(0);
  const [council, setCouncil] = useState<Member[]>([]);
  const [hand, setHand] = useState<HandState | null>(null);
  const [dealer, setDealer] = useState(0);
  const [handNo, setHandNo] = useState(1);
  const [phase, setPhase] = useState<Phase>("hand");
  const [stats, setStats] = useState<RunStats>(() => emptyStats(seed, daily));
  const [thinking, setThinking] = useState(false);
  const [delib, setDelib] = useState<Deliberation | null>(null);
  const [seatShape, setSeatShape] = useState(0);
  const [tellMood, setTellMood] = useState<Mood | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);
  const [drawer, setDrawer] = useState<null | "help" | "log">(null);
  const [runLog, setRunLog] = useState<HandRecord[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [pendingWin, setPendingWin] = useState<Record<string, number>>({});
  const [intro, setIntro] = useState(false);
  const [youVariant] = useState(() => [0, 4, 3, 1][Math.floor(Math.random() * 4)]);
  const decisions = useRef<Record<number, Decision>>({});
  const startStacks = useRef(new Map<string, number>());
  const processed = useRef(-1);
  const lock = useRef(false);
  const tiltUntil = useRef(0);
  const flightSeq = useRef(0);
  const lastSeatDecision = useRef<Decision | null>(null);

  const names = useMemo(() => new Map<string, string>([[PLAYER_ID, "You"], [SEAT_ID, "Jev"]]), []);
  const stageN = STAGES[stageIdx];

  const fly = useCallback((items: Omit<Flight, "id">[], ttl = 1300) => {
    if (!items.length) return;
    const batch = items.map((f) => ({ ...f, id: ++flightSeq.current }));
    setFlights((prev) => [...prev, ...batch]);
    setTimeout(() => setFlights((prev) => prev.filter((f) => !batch.some((b) => b.id === f.id))), ttl);
  }, []);

  const deal = useCallback((seats: { id: string; stack: number }[], d: number, n: number, stage: number) => {
    const [sb, bb] = blindsFor(n);
    decisions.current = {};
    lastSeatDecision.current = null;
    startStacks.current = new Map(seats.map((s) => [s.id, s.stack]));
    processed.current = -1;
    // the deck is seeded too, so a daily council deals everyone the same hands
    const h = dealHand(seats, d, sb, bb, n, rngFrom(hashSeed(`${seed}:${stage}:${n}`)));
    setHand({ ...h });
    setStatuses({});
    setDelib(null);
    setRaiseOpen(false);
    setPhase("hand");
    setHandNo(n);
    setDealer(d);
    setIntro(true);
    setTimeout(() => setIntro(false), 2600);
  }, [seed]);

  const startStage = useCallback((stage: number) => {
    setStageIdx(stage);
    setCouncil(buildCouncil(stage, seed, STAGES[stage]));
    setSeatShape(0);
    tiltUntil.current = 0;
    deal([{ id: PLAYER_ID, stack: START_STACK }, { id: SEAT_ID, stack: START_STACK }], hashSeed(`${seed}:${stage}`) % 2, 1, stage);
  }, [deal, seed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/council").then((r) => (r.ok ? r.json() : { configured: false })).catch(() => ({ configured: false }))
      .then((d: { configured: boolean; mock?: boolean }) => {
        if (cancelled) return;
        setConfigured(d.configured);
        // dev shortcut: with BLUFF_MOCK on, ?stage=5 opens at that stage
        const jump = d.mock ? Math.min(STAGES.length, Math.max(1, Number(params.get("stage")) || 1)) - 1 : 0;
        if (d.configured) startStage(jump);
      });
    return () => { cancelled = true; };
  }, [startStage, params]);

  const nextHand = useCallback(() => {
    if (!hand) return;
    const survivors = liveSeats(hand).map((s) => ({ id: s.id, stack: s.stack }));
    if (survivors.length <= 1) return;
    deal(survivors, (dealer + 1) % survivors.length, handNo + 1, stageIdx);
  }, [hand, dealer, handNo, stageIdx, deal]);

  const applyAction = useCallback((h: HandState, a: Action, decision?: Decision) => {
    const i = h.toAct, seat = h.seats[i];
    const prevStreet = h.street;
    const before = h.seats.map((s) => ({ id: s.id, bet: s.bet, committed: s.committed }));
    if (decision) { decisions.current[h.log.length] = decision; if (seat.id === SEAT_ID) lastSeatDecision.current = decision; }
    act(h, a);
    if (h.street !== prevStreet) fly(before.map((b) => ({ from: b.id, to: "pot", amount: b.bet + (b.id === seat.id ? seat.committed - b.committed : 0) })).filter((f) => f.amount > 0));
    const st = statusFor(a, seat.allIn);
    setStatuses((prev) => ({ ...(h.street !== prevStreet && h.street !== "done" ? {} : prev), [seat.id]: st }));
    setHand({ ...h });
  }, [fly]);

  const you = useCallback((a: Action) => {
    if (!hand || phase !== "hand" || hand.street === "done" || hand.seats[hand.toAct]?.id !== PLAYER_ID) return;
    setRaiseOpen(false);
    applyAction(hand, a);
  }, [hand, phase, applyAction]);

  // the council votes
  useEffect(() => {
    if (!hand || phase !== "hand" || hand.street === "done" || hand.toAct < 0) return;
    const actor = hand.seats[hand.toAct];
    if (actor.id !== SEAT_ID || lock.current || !council.length) return;
    lock.current = true;
    const view = buildView(hand, hand.toAct, names, stageN);
    const allowed = allowedChoices(view);
    const allowedFlags = { fold: allowed.includes("fold"), raise: allowed.includes("raise_small") };
    const total = council.length;
    const counts = { fold: 0, call: 0, raise: 0 };
    const votes: Vote[] = [];
    setThinking(true);
    setDelib({ counts: { ...counts }, total, done: false, allowed: allowedFlags });
    let cancelled = false;
    (async () => {
      const t0 = Date.now();
      try {
        const res = await fetch("/api/council", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ members: council, view, tilted: handNo <= tiltUntil.current }), signal: AbortSignal.timeout(20_000 + total * 400) });
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });
            let nl;
            while ((nl = buf.indexOf("\n")) >= 0) {
              const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
              if (!line) continue;
              const v = JSON.parse(line) as Vote;
              votes.push(v); counts[groupOf(v.choice)]++;
              if (!cancelled) setDelib({ counts: { ...counts }, total, done: false, allowed: allowedFlags });
            }
          }
        }
      } catch { /* treated as timeouts below */ }
      for (const m of council) if (!votes.some((v) => v.member === m.id)) { const v: Vote = { member: m.id, choice: timedOutChoice(view), timedOut: true }; votes.push(v); counts[groupOf(v.choice)]++; }
      const t = tally(votes, allowed);
      const decision: Decision = { choice: t.choice, votes, counts: t.counts, carriedBy: t.carriedBy, timedOut: votes.every((v) => v.timedOut) };
      const carrier = council.find((m) => t.carriedBy.includes(m.id) && m.archetype !== "plain") ?? council.find((m) => t.carriedBy.includes(m.id));
      // the timing tell: a council with a timing member takes longer when the seat is strong
      const timing = council.some((m) => m.tell === "timing") && strong(hand, hand.toAct) ? 1400 : 0;
      const minimum = Math.min(2600, 900 + total * 12) + timing;
      const wait = minimum - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (cancelled) return;
      setDelib({ counts: t.counts, total, done: true, allowed: allowedFlags, carried: carrier && total > 1 ? `${carrier.name} the ${ARCHETYPES[carrier.archetype].label} carried it` : undefined });
      if (carrier) setSeatShape(carrier.shape);
      // visual tells: wide eyes before a raise, a blink before a fold
      const g = groupOf(t.choice);
      const tellMs = g === "raise" && council.some((m) => m.tell === "wide_eyes") ? 520 : g === "fold" && council.some((m) => m.tell === "blink") ? 420 : 0;
      if (tellMs) { setTellMood(g === "raise" ? "allin" : "fold"); await new Promise((r) => setTimeout(r, tellMs)); setTellMood(null); }
      if (cancelled) return;
      lock.current = false;
      setThinking(false);
      applyAction(hand, resolveChoice(hand, hand.toAct, t.choice), decision);
      setTimeout(() => setDelib((d) => (d?.done ? null : d)), 1800);
    })();
    return () => { cancelled = true; lock.current = false; };
  }, [hand, phase, council, names, stageN, handNo, applyAction]);

  // hand finished
  useEffect(() => {
    if (!hand || hand.street !== "done" || processed.current === hand.handNo) return;
    processed.current = hand.handNo;
    setPhase("handDone");
    const ws = hand.result?.winners ?? [];
    setPendingWin(Object.fromEntries(ws.map((w) => [w.seat, w.amount])));
    const delay = hand.result?.showdown ? 1400 : 500;
    const t1 = setTimeout(() => fly(ws.map((w) => ({ from: "pot", to: w.seat, amount: w.amount })), 1400), delay);
    const t2 = setTimeout(() => setPendingWin({}), delay + 1100);
    setRunLog((log) => [...log, recordHand(hand, decisions.current, names, startStacks.current, stageN)]);
    const youSeat = hand.seats.find((s) => s.id === PLAYER_ID);
    const jev = hand.seats.find((s) => s.id === SEAT_ID);
    const busted = !youSeat || youSeat.stack === 0;
    const cleared = !busted && Boolean(jev) && jev!.stack === 0;
    const won = ws.find((w) => w.seat === PLAYER_ID);
    const ev = youSeat && !youSeat.folded && hand.board.length >= 3 ? evaluate(youSeat.hole.concat(hand.board)) : null;
    // tilt: the seat lost a big pot
    if (jev && (startStacks.current.get(SEAT_ID) ?? 0) - jev.stack >= 0.4 * (startStacks.current.get(SEAT_ID) ?? 1)) tiltUntil.current = hand.handNo + 3;
    setStatuses((prev) => {
      const next = { ...prev };
      const winIds = new Set(ws.map((w) => w.seat));
      if (hand.result?.showdown) for (const s of hand.seats) { if (!s.folded) next[s.id] = { text: evaluate(s.hole.concat(hand.board)).label, tone: winIds.has(s.id) ? "win" : "plain" }; }
      else for (const w of ws) next[w.seat] = { text: `Wins ${w.amount.toLocaleString()}`, tone: "win" };
      return next;
    });
    setStats((prev) => {
      const next: RunStats = {
        ...prev, stageIdx, hands: prev.hands + 1,
        biggestPot: Math.max(prev.biggestPot, won?.amount ?? 0),
        bestHand: won && ev && ev.score > prev.bestHandScore ? ev.label : prev.bestHand,
        bestHandScore: won && ev ? Math.max(prev.bestHandScore, ev.score) : prev.bestHandScore,
      };
      if (cleared) { next.cleared = stageIdx + 1; next.beaten = prev.beaten + stageN; if (stageIdx === STAGES.length - 1) next.won = true; }
      if (busted) { const d = lastSeatDecision.current; if (d?.counts && d.votes && d.votes.length > 1) next.bust = { ...d.counts, choice: d.choice }; }
      if (busted || next.won) saveBestRun(next);
      return next;
    });
    if (!busted && !cleared) return () => { clearTimeout(t1); clearTimeout(t2); };
    const t = setTimeout(() => setPhase(busted ? "runOver" : stageIdx === STAGES.length - 1 ? "runOver" : "stageCleared"), hand.result?.showdown ? 5200 : 2400);
    return () => { clearTimeout(t); clearTimeout(t1); clearTimeout(t2); };
  }, [hand, stageIdx, stageN, names, fly]);

  const advance = useCallback(() => {
    if (phase === "stageCleared") startStage(stageIdx + 1);
    else if (phase === "handDone") nextHand();
  }, [phase, stageIdx, startStage, nextHand]);

  const restart = (sameCouncil: boolean) => {
    if (!sameCouncil) { window.location.href = "/play?council=random"; return; }
    setStats(emptyStats(seed, daily)); setRunLog([]); startStage(0);
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (k === "escape") { setRaiseOpen(false); setDrawer(null); return; }
      if (k === "h") { setDrawer((d) => (d === "help" ? null : "help")); return; }
      if (k === "l") { setDrawer((d) => (d === "log" ? null : "log")); return; }
      if (e.code === "Space" || k === "n" || k === "enter") { if (phase === "handDone" || phase === "stageCleared") { e.preventDefault(); advance(); } return; }
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
  const youIdx = hand ? hand.seats.findIndex((s) => s.id === PLAYER_ID) : -1;
  const jevIdx = hand ? hand.seats.findIndex((s) => s.id === SEAT_ID) : -1;
  const youSeat = hand && youIdx >= 0 ? hand.seats[youIdx] : null;
  const jevSeat = hand && jevIdx >= 0 ? hand.seats[jevIdx] : null;
  const yourTurn = Boolean(hand && phase === "hand" && hand.street !== "done" && hand.toAct === youIdx);
  const L = hand && yourTurn ? legal(hand) : null;
  const pot = hand ? potSize(hand) : 0;
  const done = hand?.street === "done";
  const winners = new Set(hand?.result?.winners.map((w) => w.seat) ?? []);
  const youWon = hand?.result?.winners.find((w) => w.seat === PLAYER_ID);
  const heroEval = youSeat && !youSeat.folded && hand && hand.board.length >= 3 ? evaluate(youSeat.hole.concat(hand.board)).label : null;
  const firstWinner = hand?.result?.winners[0];
  const winSeat = firstWinner ? hand!.seats.find((s) => s.id === firstWinner.seat) : null;
  const highlight = done && hand?.result?.showdown && winSeat ? new Set(bestFive(winSeat.hole.concat(hand!.board))) : null;

  const moodFor = (id: string, s: { folded: boolean; allIn: boolean } | null, tone?: Tone): Mood => {
    if (!s) return "out";
    if (id === SEAT_ID && tellMood) return tellMood;
    if (id === SEAT_ID && thinking) return "think";
    if (done && winners.has(id)) return "win";
    if (s.folded) return "fold";
    if (done && hand?.result?.showdown) return "lose";
    if (s.allIn) return "allin";
    if (tone === "raise") return "raise";
    return "idle";
  };

  const seatVM: SeatVM | null = jevSeat ? {
    id: SEAT_ID, name: "Jev", mood: moodFor(SEAT_ID, jevSeat, statuses[SEAT_ID]?.tone), variant: seatShape, sub: stageN > 1 ? `council of ${stageN}` : undefined,
    stack: jevSeat.stack - (pendingWin[SEAT_ID] ?? 0), bet: done ? 0 : jevSeat.bet, folded: jevSeat.folded, allIn: jevSeat.allIn, out: jevSeat.stack === 0 && !done,
    hole: done && hand?.result?.showdown && !jevSeat.folded ? jevSeat.hole : null,
    status: thinking ? { text: stageN > 1 ? "Deliberating" : "Thinking", tone: "think" } : statuses[SEAT_ID] ?? null,
    dealer: hand?.dealer === jevIdx, turn: Boolean(hand && phase === "hand" && hand.street !== "done" && hand.toAct === jevIdx), winner: winners.has(SEAT_ID),
  } : null;

  const potView = (() => {
    if (!hand) return { label: "Pot", value: 0, note: "", tone: undefined as "win" | "lose" | undefined };
    if (phase === "stageCleared") return { label: `Stage ${stageIdx + 1} cleared`, value: STAGES[stageIdx + 1], note: "Jevs on the council next, stacks reset", tone: "win" as const };
    if (done && hand.result) {
      const w = hand.result.winners, first = w[0];
      const label = w.length > 1 ? "Split pot" : first.seat === PLAYER_ID ? "You win" : "Jev wins";
      return { label, value: w.reduce((t, x) => t + x.amount, 0), note: first.label ? `with ${first.label.toLowerCase()}` : "everyone else folded", tone: first.seat === PLAYER_ID ? ("win" as const) : ("lose" as const) };
    }
    if (intro && phase === "hand") return { label: `Hand ${handNo}`, value: pot, note: `Stage ${stageIdx + 1}, Jev ×${stageN}, blinds ${hand.sb}/${hand.bb}`, tone: undefined };
    return { label: "Pot", value: pot, note: hand.street === "preflop" ? "" : hand.street[0].toUpperCase() + hand.street.slice(1), tone: undefined };
  })();

  const turn = (() => {
    if (!hand) return { text: "Setting the table", progress: 0 };
    if (phase === "handDone") return { text: "Next hand", sub: "Space", progress: 100 };
    if (phase === "stageCleared") return { text: "Deal", sub: "Space", progress: 100, gold: true };
    if (yourTurn) return { text: "Your turn", progress: 100, gold: true };
    if (thinking) return { text: stageN > 1 ? "The council is voting" : "Jev is thinking", progress: 100 };
    return { text: "Dealing", progress: 100 };
  })();

  const presets = L ? [
    { label: "Min", to: L.minRaiseTo },
    { label: "Half pot", to: Math.round(hand!.currentBet + (pot + L.toCall) * 0.5) },
    { label: "Pot", to: Math.round(hand!.currentBet + pot + L.toCall) },
    { label: "All in", to: L.maxRaiseTo },
  ].map((x) => ({ ...x, to: Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, x.to)) })) : [];

  const actions = (() => {
    if (!hand) return null;
    if (yourTurn && L) return (
      <>
        <button type="button" className={`text-btn ${L.canCheck ? "" : "text-fold"}`} onClick={() => you(L.canCheck ? { type: "check" } : { type: "fold" })}><FoldIcon />{L.canCheck ? "Check" : "Fold"}<span className="key">F</span></button>
        {L.canRaise && <button type="button" className="text-btn text-raise" onClick={() => (raiseOpen ? you({ type: "raise", to: raiseTo }) : setRaiseOpen(true))}><RaiseIcon />{raiseOpen ? `${hand.currentBet === 0 ? "Bet" : "Raise to"} ${raiseTo.toLocaleString()}` : hand.currentBet === 0 ? "Bet" : "Raise"}<span className="key">R</span></button>}
        {!L.canCheck && <button type="button" className="text-btn" onClick={() => you({ type: "call" })}><CallIcon />{L.toCall >= youSeat!.stack ? "Call all in" : `Call ${L.toCall.toLocaleString()}`}<span className="key">C</span></button>}
      </>
    );
    if (phase === "handDone" && liveSeats(hand).length > 1 && youSeat && youSeat.stack > 0) return <button type="button" className="text-btn" onClick={advance}><NextIcon />Next hand<span className="key">N</span></button>;
    if (phase === "stageCleared") return <button type="button" className="text-btn text-raise" onClick={advance}><NextIcon />Deal stage {stageIdx + 2}, Jev ×{STAGES[stageIdx + 1]}<span className="key">N</span></button>;
    return null;
  })();

  const leftLinks = (
    <>
      <button type="button" className="text-btn text-muted" onClick={() => setDrawer(drawer === "help" ? null : "help")}><span className="meta-dot">?</span>Help<span className="key">H</span></button>
      <button type="button" className="text-btn text-muted" onClick={() => setDrawer(drawer === "log" ? null : "log")}><LogIcon />Log<span className="key">L</span></button>
      <button type="button" className="text-btn text-muted" onClick={() => restart(true)}>Restart</button>
    </>
  );

  const banner = hand && phase === "stageCleared" ? { key: `stage-${stageIdx}`, title: `Stage ${stageIdx + 1} cleared`, sub: `Jev ×${STAGES[stageIdx + 1]} next`, big: true } : null;

  const floating = (
    <>
      {raiseOpen && L && (
        <div className="raise-pop">
          <div className="raise-row">{presets.map((x) => <button key={x.label} type="button" className={`pill ${raiseTo === x.to ? "active" : ""}`} onClick={() => setRaiseTo(x.to)}>{x.label}</button>)}</div>
          <div className="raise-slider">
            <input type="range" min={L.minRaiseTo} max={L.maxRaiseTo} step={Math.max(1, Math.floor(hand!.bb / 2))} value={raiseTo} onChange={(e) => setRaiseTo(Number(e.target.value))} aria-label="Raise to" />
            <strong className="num">{raiseTo.toLocaleString()}</strong>
          </div>
        </div>
      )}
      {drawer === "help" && (
        <aside className="drawer">
          <div className="drawer-head">How it works<button type="button" className="drawer-close" onClick={() => setDrawer(null)} aria-label="Close">×</button></div>
          <p className="drawer-copy">The seat across from you is a council of Jevs, each with its own style. They vote on every action and the seat does what the majority says. Take every chip to clear the stage, and the council doubles: 1, 2, 4, 8, 16, 32, 64, 100. Lose your stack and the run is over.</p>
          <div className="shortcuts">
            <div><span>Fold or check</span><kbd>F</kbd></div><div><span>Check or call</span><kbd>C</kbd></div>
            <div><span>Raise</span><kbd>R</kbd></div><div><span>Next</span><kbd>Space</kbd></div>
          </div>
        </aside>
      )}
      {drawer === "log" && hand && (
        <aside className="drawer">
          <div className="drawer-head">Hand {hand.handNo}<button type="button" className="drawer-close" onClick={() => setDrawer(null)} aria-label="Close">×</button></div>
          {hand.street !== "done" && <p className="drawer-copy">How the council split appears here once the hand is over, and in the review after the run.</p>}
          <ul className="log-list num">
            {hand.log.map((e, i) => {
              const d = hand.street === "done" ? decisions.current[i] : undefined;
              return (
                <li key={i}>
                  <span><span className="log-street">{e.street}</span>{names.get(e.seat)} {e.action}{e.amount ? ` ${e.amount.toLocaleString()}` : ""}{e.note ? ` (${e.note.toLowerCase()})` : ""}</span>
                  {d?.counts && <span className="log-thought">fold {d.counts.fold}, call {d.counts.call}, raise {d.counts.raise}</span>}
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </>
  );

  const overlay = (() => {
    if (configured === false) return (
      <div className="window-center">
        <Mark size={32} color="var(--accent)" />
        <p>No OpenRouter key on this server. Add <code>OPENROUTER_API_KEY</code> to <code>.env.local</code> and restart. Every Jev on the council is played through OpenRouter.</p>
      </div>
    );
    if (configured === null || !hand) return <div className="window-center"><Mark size={32} color="var(--accent)" /><p>Setting the table</p></div>;
    if (phase === "runOver") return (
      <Results
        stats={stats}
        council={memberStats(council, runLog, SEAT_ID, stageN)}
        onPlayAgain={() => restart(false)}
        onSameCouncil={() => restart(true)}
        right={<><div className="results-right-head"><h3>Every decision, hand by hand</h3><span className="num">{runLog.length} {runLog.length === 1 ? "hand" : "hands"}</span></div><Review hands={runLog} members={council} /></>}
      />
    );
    return null;
  })();

  return (
    <TableWindow
      stage={{ n: stageIdx + 1, hand: handNo, cleared: stats.cleared }}
      counter={{ n: stageN, name: "Jev" }}
      blinds={hand ? `${hand.sb}/${hand.bb}` : "10/20"}
      pot={potView.value}
      potLabel={potView.label}
      potTone={potView.tone}
      potNote={potView.note}
      board={hand?.board ?? []}
      handNo={handNo}
      seat={seatVM}
      you={youSeat ? { id: PLAYER_ID, name: "You", mood: moodFor(PLAYER_ID, youSeat, statuses[PLAYER_ID]?.tone), variant: youVariant, stack: youSeat.stack - (pendingWin[PLAYER_ID] ?? 0), bet: done ? 0 : youSeat.bet, folded: youSeat.folded, allIn: youSeat.allIn, out: false, hole: null, status: statuses[PLAYER_ID] ?? null, dealer: hand?.dealer === youIdx, turn: yourTurn, winner: Boolean(youWon) } : null}
      hero={youSeat ? { hole: youSeat.hole, folded: youSeat.folded, winner: Boolean(youWon), outcome: youSeat.folded ? "Folded" : done ? (youWon ? (youWon.label ?? "You win") : heroEval) : null } : null}
      deliberation={stageN > 1 ? delib : null}
      highlight={highlight}
      reveal={done && hand?.result?.showdown && winSeat ? { seatId: winSeat.id, hole: winSeat.hole, heroWon: winSeat.id === PLAYER_ID } : null}
      banner={banner}
      flights={flights}
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
