"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { houseDecide } from "@/brains/house";
import { BRAIN_LABEL, type BrainId, type Decision } from "@/brains/types";
import { evaluate } from "@/engine/evaluate";
import { act, dealHand, legal, liveSeats, potSize, type Action, type HandState, type SeatState } from "@/engine/hand";
import {
  type Availability,
  blindsFor,
  buildView,
  HANDS_PER_LEVEL,
  type Opponent,
  PLAYER_ID,
  resolveChoice,
  rosterForStage,
  roundsForStage,
  simulateTable,
  splitRound,
  START_STACK,
  STAGES,
} from "@/game/run";
import { emptyStats, encodeRun, type RunStats } from "@/game/share";
import { Ladder } from "./Ladder";
import { Logo, Mark } from "./Logo";
import { PlayingCard } from "./PlayingCard";
import { SummaryCard } from "./SummaryCard";

export const BEST_RUN_STORAGE_KEY = "bluff_run_best_v1";

export function saveBestRun(stats: RunStats) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(BEST_RUN_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(BEST_RUN_STORAGE_KEY, JSON.stringify(stats));
      return;
    }
    const prev = JSON.parse(raw) as RunStats;
    const isBetter =
      stats.cleared > prev.cleared ||
      (stats.cleared === prev.cleared && stats.beaten > prev.beaten) ||
      (stats.cleared === prev.cleared && stats.beaten === prev.beaten && stats.biggestPot > prev.biggestPot);
    if (isBetter) {
      window.localStorage.setItem(BEST_RUN_STORAGE_KEY, JSON.stringify(stats));
    }
  } catch {
    // ignore storage errors
  }
}

interface SeatBadgeAction {
  label: string;
  tone: "fold" | "call" | "raise" | "blind" | "win" | "neutral";
  reason?: string;
  fallback?: boolean;
}

type Phase =
  | "playing"          // live hand or between hands at a table
  | "round_cleared"    // player cleared their table, advancing to next round of same stage
  | "stage_cleared"    // player cleared the entire stage
  | "run_over";        // player busted or beat stage 100

export function PokerArena() {
  const [avail, setAvail] = useState<{ jev: boolean; claude: boolean }>({ jev: false, claude: false });
  const [availLoaded, setAvailLoaded] = useState(false);

  // Run-level state
  const [stageIdx, setStageIdx] = useState(0);
  const [roundNo, setRoundNo] = useState(1);
  const [totalRounds, setTotalRounds] = useState(1);
  const [stats, setStats] = useState<RunStats>(emptyStats);
  const [phase, setPhase] = useState<Phase>("playing");

  // Table-level state
  const [tableOpps, setTableOpps] = useState<Opponent[]>([]);
  const [bgTables, setBgTables] = useState<Opponent[][]>([]);
  const [bgWinners, setBgWinners] = useState<Opponent[]>([]);
  const [hand, setHand] = useState<HandState | null>(null);
  const [dealerCursor, setDealerCursor] = useState(0);
  const [tableHandNo, setTableHandNo] = useState(1);

  // Turn & UI feedback state
  const [thinkingSeat, setThinkingSeat] = useState<string | null>(null);
  const [seatActions, setSeatActions] = useState<Record<string, SeatBadgeAction>>({});
  const [fallbackBrains, setFallbackBrains] = useState<Record<string, boolean>>({});
  const [raiseAmount, setRaiseAmount] = useState<number>(40);
  const [fastMode, setFastMode] = useState(false);
  const [autoDeal, setAutoDeal] = useState(true);
  const [showLog, setShowLog] = useState(false);

  // Refs to prevent duplicate effect execution
  const handProcessedRef = useRef<number>(-1);
  const aiTurnLockRef = useRef<boolean>(false);

  const namesMap = useMemo(() => {
    const m = new Map<string, string>([[PLAYER_ID, "You"]]);
    for (const o of tableOpps) m.set(o.id, o.name);
    return m;
  }, [tableOpps]);

  const personasMap = useMemo(() => {
    const m = new Map(tableOpps.map((o) => [o.id, o.persona]));
    return m;
  }, [tableOpps]);

  const oppById = useMemo(() => {
    return new Map(tableOpps.map((o) => [o.id, o]));
  }, [tableOpps]);

  // Start a round table with a specific field of remaining opponents in this stage
  const startRoundTable = useCallback(
    (field: Opponent[], nextRoundNo: number, stageIndex: number) => {
      const { mine, others } = splitRound(field);
      const winners = others.map((t) => simulateTable(t));
      setTableOpps(mine);
      setBgTables(others);
      setBgWinners(winners);
      setRoundNo(nextRoundNo);
      setTotalRounds(roundsForStage(STAGES[stageIndex]));
      setDealerCursor(0);
      setTableHandNo(1);
      setSeatActions({});
      handProcessedRef.current = -1;

      const initialSeats = [
        { id: PLAYER_ID, stack: START_STACK },
        ...mine.map((o) => ({ id: o.id, stack: START_STACK })),
      ];
      const [sb, bb] = blindsFor(1);
      const firstHand = dealHand(initialSeats, 0, sb, bb, 1);
      setHand({ ...firstHand });
      const L = legal(firstHand, firstHand.toAct >= 0 ? firstHand.toAct : 0);
      setRaiseAmount(L.minRaiseTo);
      setPhase("playing");
    },
    []
  );

  // Start a stage from scratch
  const startStage = useCallback(
    (stageIndex: number, currentAvail: { jev: boolean; claude: boolean }) => {
      const roster = rosterForStage(stageIndex, currentAvail);
      setStageIdx(stageIndex);
      startRoundTable(roster, 1, stageIndex);
    },
    [startRoundTable]
  );

  // Fetch brain availability once on mount and deal Stage 1
  useEffect(() => {
    let cancelled = false;
    fetch("/api/decide")
      .then((r) => (r.ok ? r.json() : { jev: false, claude: false }))
      .catch(() => ({ jev: false, claude: false }))
      .then((data: { jev: boolean; claude: boolean }) => {
        if (cancelled) return;
        setAvail(data);
        setAvailLoaded(true);
        startStage(0, data);
      });
    return () => {
      cancelled = true;
    };
  }, [startStage]);

  // Deal the next hand at the current table
  const dealNextHand = useCallback(() => {
    if (!hand) return;
    const survivors = liveSeats(hand).map((s) => ({ id: s.id, stack: s.stack }));
    if (survivors.length <= 1) return;
    const nextHandNo = tableHandNo + 1;
    const nextDealer = (dealerCursor + 1) % survivors.length;
    const [sb, bb] = blindsFor(nextHandNo);
    handProcessedRef.current = -1;
    setTableHandNo(nextHandNo);
    setDealerCursor(nextDealer);
    setSeatActions({});
    const nextH = dealHand(survivors, nextDealer, sb, bb, nextHandNo);
    setHand({ ...nextH });
    const L = legal(nextH, nextH.toAct >= 0 ? nextH.toAct : 0);
    setRaiseAmount(L.minRaiseTo);
  }, [hand, tableHandNo, dealerCursor]);

  // Format an action for the seat badge
  const formatActionBadge = (a: Action, prevBet: number, seatStackAfter: number): SeatBadgeAction => {
    if (a.type === "fold") return { label: "Fold", tone: "fold" };
    if (a.type === "check") return { label: "Check", tone: "neutral" };
    if (a.type === "call") {
      return { label: seatStackAfter === 0 ? "All-In Call" : "Call", tone: "call" };
    }
    return {
      label: seatStackAfter === 0 ? `All-In ${a.to.toLocaleString()}` : `Raise ${a.to.toLocaleString()}`,
      tone: "raise",
    };
  };

  // Player action handler
  const handlePlayerAction = useCallback(
    (action: Action) => {
      if (!hand || hand.street === "done" || hand.toAct < 0) return;
      const actor = hand.seats[hand.toAct];
      if (actor.id !== PLAYER_ID) return;

      const prevStreet = hand.street;
      const prevBet = actor.bet;
      act(hand, action);
      const badge = formatActionBadge(action, prevBet, actor.stack);

      setSeatActions((prev) => {
        const base = hand.street !== prevStreet ? {} : { ...prev };
        return { ...base, [PLAYER_ID]: badge };
      });

      setHand({ ...hand });
      if (hand.toAct >= 0 && hand.seats[hand.toAct]?.id === PLAYER_ID) {
        const L = legal(hand, hand.toAct);
        setRaiseAmount(L.minRaiseTo);
      }
    },
    [hand]
  );

  // Sync default raise amount when turn arrives at player
  useEffect(() => {
    if (!hand || hand.street === "done" || hand.toAct < 0) return;
    if (hand.seats[hand.toAct]?.id === PLAYER_ID) {
      const L = legal(hand, hand.toAct);
      setRaiseAmount((prev) => Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, prev || L.minRaiseTo)));
    }
  }, [hand]);

  // AI Turn Execution Effect
  useEffect(() => {
    if (!hand || phase !== "playing" || hand.street === "done" || hand.toAct < 0) return;
    const actor = hand.seats[hand.toAct];
    if (!actor || actor.id === PLAYER_ID) return;
    if (aiTurnLockRef.current) return;

    aiTurnLockRef.current = true;
    const seatId = actor.id;
    const seatIdx = hand.toAct;
    const opp = oppById.get(seatId);
    const brain: BrainId = opp?.brain ?? "house";
    setThinkingSeat(seatId);

    const view = buildView(hand, seatIdx, namesMap, personasMap, STAGES[stageIdx]);
    const delayMs = fastMode ? 130 : 420;
    let cancelled = false;

    const runAiTurn = async () => {
      const t0 = Date.now();
      let decision: Decision | null = null;
      const shouldCallServer = (brain === "jev" && avail.jev) || (brain === "claude" && avail.claude);

      if (shouldCallServer) {
        try {
          const res = await fetch("/api/decide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brain, view }),
          });
          if (res.ok) {
            decision = (await res.json()) as Decision;
          }
        } catch {
          // Fallback to local house brain below
        }
      }

      if (!decision) {
        decision = {
          choice: houseDecide(view),
          brain: "house",
          fallback: brain !== "house",
        };
      }

      const elapsed = Date.now() - t0;
      if (elapsed < delayMs) {
        await new Promise((r) => setTimeout(r, delayMs - elapsed));
      }
      if (cancelled) return;

      const prevStreet = hand.street;
      const prevBet = actor.bet;
      const engineAction = resolveChoice(hand, seatIdx, decision.choice);
      act(hand, engineAction);

      const badge = formatActionBadge(engineAction, prevBet, actor.stack);
      badge.reason = decision.reason;
      badge.fallback = decision.fallback;

      if (decision.fallback) {
        setFallbackBrains((prev) => ({ ...prev, [seatId]: true }));
      }

      setSeatActions((prev) => {
        const base = hand.street !== prevStreet ? {} : { ...prev };
        return { ...base, [seatId]: badge };
      });

      setThinkingSeat(null);
      aiTurnLockRef.current = false;
      setHand({ ...hand });
    };

    runAiTurn();

    return () => {
      cancelled = true;
      aiTurnLockRef.current = false;
    };
  }, [hand, phase, oppById, namesMap, personasMap, stageIdx, fastMode, avail]);

  // Process hand completion once per hand
  useEffect(() => {
    if (!hand || hand.street !== "done") return;
    if (handProcessedRef.current === hand.handNo) return;
    handProcessedRef.current = hand.handNo;

    const youSeat = hand.seats.find((s) => s.id === PLAYER_ID);
    const knockedOutAtTable = hand.seats.filter((s) => s.id !== PLAYER_ID && s.stack === 0).length;
    const youWonEntry = hand.result?.winners.find((w) => w.seat === PLAYER_ID);
    const potWonByYou = youWonEntry ? youWonEntry.amount : 0;

    let handScore = 0;
    let handLabel = "";
    if (youSeat && !youSeat.folded && hand.board.length >= 3) {
      const ev = evaluate(youSeat.hole.concat(hand.board));
      handScore = ev.score;
      handLabel = ev.label;
    }

    const aliveAfter = liveSeats(hand);
    const playerBusted = !youSeat || youSeat.stack === 0;
    const tableCleared = !playerBusted && aliveAfter.length === 1 && aliveAfter[0].id === PLAYER_ID;

    // Count background eliminations when the player clears their table in a multi-table round
    const bgEliminatedCount = tableCleared
      ? bgTables.reduce((sum, t) => sum + Math.max(0, t.length - 1), 0)
      : 0;

    setStats((prev) => {
      const next: RunStats = {
        ...prev,
        stageIdx,
        hands: prev.hands + 1,
        beaten: prev.beaten + knockedOutAtTable + bgEliminatedCount,
        biggestPot: Math.max(prev.biggestPot, potWonByYou),
        bestHand: handScore > prev.bestHandScore ? handLabel : prev.bestHand,
        bestHandScore: Math.max(prev.bestHandScore, handScore),
      };

      if (tableCleared && bgWinners.length === 0) {
        next.cleared = stageIdx + 1;
        if (stageIdx === STAGES.length - 1) {
          next.won = true;
        }
      }

      if (playerBusted || next.won) {
        saveBestRun(next);
      }
      return next;
    });

    if (playerBusted) {
      const timer = setTimeout(() => setPhase("run_over"), fastMode ? 900 : 1800);
      return () => clearTimeout(timer);
    }

    if (tableCleared) {
      const timer = setTimeout(() => {
        if (bgWinners.length > 0) {
          setPhase("round_cleared");
        } else if (stageIdx === STAGES.length - 1) {
          setPhase("run_over");
        } else {
          setPhase("stage_cleared");
        }
      }, fastMode ? 700 : 1400);
      return () => clearTimeout(timer);
    }

    if (autoDeal) {
      const timer = setTimeout(() => {
        dealNextHand();
      }, fastMode ? 950 : 2100);
      return () => clearTimeout(timer);
    }
  }, [hand, stageIdx, bgTables, bgWinners, fastMode, autoDeal, dealNextHand]);

  // Keyboard shortcuts for player actions & advancing hands
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!hand) return;

      if (phase === "playing" && hand.street === "done") {
        const you = hand.seats.find((s) => s.id === PLAYER_ID);
        const alive = liveSeats(hand);
        if (e.code === "Space" && you && you.stack > 0 && alive.length > 1) {
          e.preventDefault();
          dealNextHand();
        }
        return;
      }

      if (phase === "round_cleared" && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        startRoundTable(bgWinners, roundNo + 1, stageIdx);
        return;
      }

      if (phase === "stage_cleared" && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        startStage(stageIdx + 1, avail);
        return;
      }

      if (phase !== "playing" || hand.street === "done" || hand.toAct < 0) return;
      if (hand.seats[hand.toAct]?.id !== PLAYER_ID) return;

      const L = legal(hand, hand.toAct);
      const pot = potSize(hand);
      const key = e.key.toLowerCase();

      if (key === "f") {
        e.preventDefault();
        handlePlayerAction(L.canCheck ? { type: "check" } : { type: "fold" });
      } else if (key === "c" || e.code === "Space") {
        e.preventDefault();
        handlePlayerAction(L.canCheck ? { type: "check" } : { type: "call" });
      } else if (key === "r" && L.canRaise) {
        e.preventDefault();
        handlePlayerAction({ type: "raise", to: raiseAmount });
      } else if (key === "p" && L.canRaise) {
        e.preventDefault();
        const potRaise = Math.min(L.maxRaiseTo, Math.max(L.minRaiseTo, Math.round(hand.currentBet + pot + L.toCall)));
        handlePlayerAction({ type: "raise", to: potRaise });
      } else if (key === "a" && L.canRaise) {
        e.preventDefault();
        handlePlayerAction({ type: "raise", to: L.maxRaiseTo });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hand, phase, raiseAmount, bgWinners, roundNo, stageIdx, avail, dealNextHand, handlePlayerAction, startRoundTable, startStage]);

  // Restart a full run from Stage 1
  const restartRun = () => {
    setStats(emptyStats());
    setFallbackBrains({});
    startStage(0, avail);
  };

  if (!availLoaded || !hand) {
    return (
      <div className="arena-loading">
        <Mark size={36} color="var(--signal)" />
        <p>Setting the felt…</p>
      </div>
    );
  }

  const youSeat: SeatState | undefined = hand.seats.find((s) => s.id === PLAYER_ID);
  const youIndex = hand.seats.findIndex((s) => s.id === PLAYER_ID);
  const isYourTurn = phase === "playing" && hand.street !== "done" && hand.toAct === youIndex && youIndex >= 0;
  const youLegal = youIndex >= 0 ? legal(hand, youIndex) : { toCall: 0, canCheck: true, canRaise: false, minRaiseTo: 0, maxRaiseTo: 0 };
  const currentPot = potSize(hand);
  const stageOpponentsTotal = STAGES[stageIdx];
  const otherFieldCount = bgTables.reduce((acc, t) => acc + t.length, 0);
  const handsUntilBlindUp = HANDS_PER_LEVEL - ((tableHandNo - 1) % HANDS_PER_LEVEL);

  // Live hand evaluation helper for hero's cards
  const heroHandLabel =
    youSeat && youSeat.hole.length === 2 && hand.board.length >= 3
      ? evaluate(youSeat.hole.concat(hand.board)).label
      : null;

  // Map seat positions around the upper arc based on number of opponents at this table
  const getSeatSlotClass = (idx: number, total: number) => {
    if (total === 1) return "seat-slot-1-0";
    if (total === 2) return `seat-slot-2-${idx}`;
    if (total <= 4) return `seat-slot-4-${idx}`;
    return `seat-slot-8-${idx}`;
  };

  const winnerIds = new Set(hand.result?.winners.map((w) => w.seat) ?? []);
  const revealedIds = new Set(hand.result?.revealed ?? []);

  return (
    <div className="arena-shell">
      {/* Top HUD Bar */}
      <header className="arena-hud">
        <div className="hud-left">
          <Logo />
          <div className="hud-divider" />
          <div className="hud-stage-meta">
            <span className="hud-stage-title num">
              Stage {stageOpponentsTotal}
              {totalRounds > 1 ? ` · Round ${roundNo}/${totalRounds}` : ""}
            </span>
            <span className="hud-stage-sub num">
              {stageOpponentsTotal === 1
                ? "Heads-Up vs. Jev"
                : otherFieldCount > 0
                  ? `Your table + ${otherFieldCount} AI across ${bgTables.length} parallel ${bgTables.length === 1 ? "table" : "tables"}`
                  : `${tableOpps.length} AI opponents at this table`}
            </span>
          </div>
        </div>

        <div className="hud-center">
          <Ladder current={stageIdx} cleared={stats.cleared} />
        </div>

        <div className="hud-right">
          <div className="hud-blinds num" title={`Blinds rise every ${HANDS_PER_LEVEL} hands`}>
            <span className="hud-blinds-label">Hand #{tableHandNo}</span>
            <span className="hud-blinds-val">
              {hand.sb}/{hand.bb}
            </span>
            <span className="hud-blinds-next">↑ in {handsUntilBlindUp}h</span>
          </div>

          <button
            type="button"
            className={`hud-toggle ${fastMode ? "is-on" : ""}`}
            onClick={() => setFastMode((v) => !v)}
            title="Toggle AI turn speed"
          >
            {fastMode ? "⚡ Fast" : "Normal"}
          </button>

          <button
            type="button"
            className={`hud-toggle ${showLog ? "is-on" : ""}`}
            onClick={() => setShowLog((v) => !v)}
          >
            Log
          </button>

          <button
            type="button"
            className="hud-toggle"
            onClick={restartRun}
            title="Restart run from Stage 1"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Felt Stage */}
      <main className="arena-stage">
        <div className="poker-table-outer">
          <div className="poker-table-felt">
            <div className="poker-table-rail" />

            {/* Opponent Seats around the perimeter */}
            <div className="opponents-ring">
              {tableOpps.map((opp, idx) => {
                const liveSeat = hand.seats.find((s) => s.id === opp.id);
                const liveSeatIdx = hand.seats.findIndex((s) => s.id === opp.id);
                const isEliminated = !liveSeat;
                const isTurn =
                  phase === "playing" &&
                  hand.street !== "done" &&
                  liveSeatIdx >= 0 &&
                  hand.toAct === liveSeatIdx;
                const isThinking = thinkingSeat === opp.id;
                const isWinner = winnerIds.has(opp.id);
                const showCards =
                  Boolean(liveSeat) &&
                  !liveSeat!.folded &&
                  (revealedIds.has(opp.id) || (hand.street === "done" && hand.result?.showdown));
                const actionBadge = seatActions[opp.id];
                const isDealer = liveSeatIdx >= 0 && hand.dealer === liveSeatIdx;
                const isFallback = fallbackBrains[opp.id] || (opp.brain === "jev" && !avail.jev) || (opp.brain === "claude" && !avail.claude);
                const styleTag =
                  opp.persona.aggression > 0.62
                    ? "AGG"
                    : opp.persona.aggression < 0.4
                      ? "TAG"
                      : "BAL";

                return (
                  <div
                    key={opp.id}
                    className={`opp-seat ${getSeatSlotClass(idx, tableOpps.length)} ${
                      isEliminated ? "is-eliminated" : ""
                    } ${liveSeat?.folded ? "is-folded" : ""} ${isTurn || isThinking ? "is-active" : ""} ${
                      isWinner ? "is-winner" : ""
                    }`}
                  >
                    {/* Opponent Cards */}
                    {!isEliminated && liveSeat && (
                      <div className="opp-cards">
                        <PlayingCard
                          card={liveSeat.hole[0]}
                          faceDown={!showCards}
                          size="sm"
                          highlighted={isWinner}
                          dimmed={liveSeat.folded}
                        />
                        <PlayingCard
                          card={liveSeat.hole[1]}
                          faceDown={!showCards}
                          size="sm"
                          highlighted={isWinner}
                          dimmed={liveSeat.folded}
                        />
                      </div>
                    )}

                    {/* Opponent Capsule */}
                    <div className="opp-capsule">
                      <div className="opp-top-row">
                        <span className="opp-name">{opp.name}</span>
                        <span
                          className={`opp-brain-tag brain-${isFallback ? "house" : opp.brain}`}
                          title={
                            isFallback && opp.brain !== "house"
                              ? `${BRAIN_LABEL[opp.brain]} key not configured — running House engine`
                              : `${BRAIN_LABEL[opp.brain]} (${styleTag})`
                          }
                        >
                          {isFallback && opp.brain !== "house" ? `${opp.brain.toUpperCase()}·H` : opp.brain.toUpperCase()}
                        </span>
                      </div>

                      <div className="opp-bottom-row num">
                        {isEliminated ? (
                          <span className="opp-busted-label">ELIMINATED</span>
                        ) : (
                          <>
                            <span className="opp-stack">{liveSeat.stack.toLocaleString()}</span>
                            {liveSeat.allIn && <span className="opp-allin-tag">ALL-IN</span>}
                          </>
                        )}
                      </div>

                      {isDealer && !isEliminated && (
                        <span className="dealer-puck" title="Dealer Button">
                          D
                        </span>
                      )}
                    </div>

                    {/* Street Bet Chip Pill or Action Callout */}
                    <div className="opp-callout-row">
                      {!isEliminated && liveSeat && liveSeat.bet > 0 && hand.street !== "done" && (
                        <span className="chip-pill num">
                          <span className="chip-dot" />
                          {liveSeat.bet.toLocaleString()}
                        </span>
                      )}
                      {isThinking ? (
                        <span className="action-tag tone-thinking">Thinking…</span>
                      ) : (
                        actionBadge && (
                          <span
                            className={`action-tag tone-${actionBadge.tone}`}
                            title={actionBadge.reason || undefined}
                          >
                            {actionBadge.label}
                          </span>
                        )
                      )}
                    </div>

                    {actionBadge?.reason && (
                      <p className="opp-reason" title={actionBadge.reason}>
                        “{actionBadge.reason}”
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Center Board & Pot */}
            <div className="table-center">
              <div className="pot-cluster">
                <span className="street-pill">
                  {hand.street === "done"
                    ? hand.result?.showdown
                      ? "SHOWDOWN"
                      : "HAND COMPLETE"
                    : hand.street.toUpperCase()}
                </span>
                <div className="pot-readout num">
                  <span className="pot-label">Pot</span>
                  <strong className="pot-amount">{currentPot.toLocaleString()}</strong>
                </div>
              </div>

              {/* 5 Community Card Slots */}
              <div className="board-row" aria-label="Community cards">
                {Array.from({ length: 5 }, (_, i) => {
                  const c = hand.board[i];
                  return (
                    <div key={i} className="board-slot">
                      <AnimatePresence mode="popLayout">
                        {c !== undefined ? (
                          <motion.div
                            key={`card-${hand.handNo}-${i}-${c}`}
                            initial={{ opacity: 0, y: -14, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                          >
                            <PlayingCard card={c} size="md" />
                          </motion.div>
                        ) : (
                          <div className="board-placeholder" />
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Hand Result Banner */}
              <AnimatePresence>
                {hand.street === "done" && hand.result && (
                  <motion.div
                    className="hand-result-banner"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {hand.result.winners.map((w) => {
                      const wName = namesMap.get(w.seat) ?? w.seat;
                      return (
                        <span key={w.seat} className="winner-line num">
                          <strong>{wName}</strong> {w.seat === PLAYER_ID ? "win" : "wins"}{" "}
                          <span className="winner-amt">+{w.amount.toLocaleString()}</span>
                          {w.label ? ` · ${w.label}` : ""}
                        </span>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Collapsible Hand Log & Bracket Drawer */}
        <AnimatePresence>
          {showLog && (
            <motion.aside
              className="arena-log-drawer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="drawer-header">
                <h3>Hand #{hand.handNo} Log</h3>
                <button type="button" onClick={() => setShowLog(false)}>
                  Close
                </button>
              </div>
              {bgTables.length > 0 && (
                <div className="drawer-bracket">
                  <span className="drawer-kicker">PARALLEL SHOOTOUT TABLES</span>
                  <p>
                    {bgTables.length} background {bgTables.length === 1 ? "table" : "tables"} ({otherFieldCount} AI)
                    playing down to {bgWinners.length} round {bgWinners.length === 1 ? "winner" : "winners"}.
                  </p>
                </div>
              )}
              <ul className="drawer-log-list num">
                {hand.log.map((entry, idx) => (
                  <li key={idx}>
                    <span className="log-street">{entry.street}</span>
                    <strong>{namesMap.get(entry.seat) ?? entry.seat}</strong>{" "}
                    <span>
                      {entry.action}
                      {entry.amount ? ` ${entry.amount.toLocaleString()}` : ""}
                      {entry.note ? ` (${entry.note})` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Hero Dock & Betting Controls */}
      <footer className={`hero-dock ${isYourTurn ? "is-your-turn" : ""}`}>
        <div className="hero-identity">
          <div className="hero-cards-wrap">
            {youSeat?.hole.map((c, idx) => (
              <motion.div
                key={`hero-${hand.handNo}-${idx}-${c}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.24 }}
              >
                <PlayingCard
                  card={c}
                  size="lg"
                  highlighted={winnerIds.has(PLAYER_ID)}
                  dimmed={youSeat.folded}
                />
              </motion.div>
            ))}
          </div>

          <div className="hero-meta">
            <div className="hero-name-row">
              <span className="hero-you-badge">YOU</span>
              {youIndex >= 0 && hand.dealer === youIndex && (
                <span className="dealer-puck" title="You have the Dealer Button">
                  D
                </span>
              )}
              {youSeat && youSeat.bet > 0 && hand.street !== "done" && (
                <span className="chip-pill num">
                  <span className="chip-dot" />
                  In front: {youSeat.bet.toLocaleString()}
                </span>
              )}
              {seatActions[PLAYER_ID] && (
                <span className={`action-tag tone-${seatActions[PLAYER_ID].tone}`}>
                  {seatActions[PLAYER_ID].label}
                </span>
              )}
            </div>

            <div className="hero-stack-row num">
              <strong className="hero-stack-val">{(youSeat?.stack ?? 0).toLocaleString()}</strong>
              <span className="hero-stack-unit">chips</span>
            </div>

            {heroHandLabel && !youSeat?.folded && (
              <span className="hero-hand-strength">{heroHandLabel}</span>
            )}
          </div>
        </div>

        {/* Action Controls or Between-Hand Controls */}
        <div className="hero-controls">
          {isYourTurn ? (
            <div className="action-cluster">
              {/* Raise sizing bar when raising is legal */}
              {youLegal.canRaise && (
                <div className="raise-bar num">
                  <div className="raise-presets">
                    {[
                      { label: "Min", val: youLegal.minRaiseTo },
                      {
                        label: "½ Pot",
                        val: Math.round(hand.currentBet + (currentPot + youLegal.toCall) * 0.5),
                      },
                      {
                        label: "Pot",
                        val: Math.round(hand.currentBet + currentPot + youLegal.toCall),
                      },
                      {
                        label: "2× Pot",
                        val: Math.round(hand.currentBet + (currentPot + youLegal.toCall) * 2),
                      },
                      { label: "All-In", val: youLegal.maxRaiseTo },
                    ].map((preset) => {
                      const clamped = Math.max(
                        youLegal.minRaiseTo,
                        Math.min(youLegal.maxRaiseTo, preset.val)
                      );
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          className={`preset-pill ${raiseAmount === clamped ? "is-selected" : ""}`}
                          onClick={() => setRaiseAmount(clamped)}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="raise-slider-row">
                    <input
                      type="range"
                      min={youLegal.minRaiseTo}
                      max={youLegal.maxRaiseTo}
                      step={Math.max(1, Math.floor(hand.bb / 2))}
                      value={Math.max(youLegal.minRaiseTo, Math.min(youLegal.maxRaiseTo, raiseAmount))}
                      onChange={(e) => setRaiseAmount(Number(e.target.value))}
                      aria-label="Raise amount"
                      className="raise-slider"
                    />
                    <span className="raise-readout num">{raiseAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Primary Action Buttons */}
              <div className="action-buttons">
                <button
                  type="button"
                  className="act-btn act-fold"
                  onClick={() =>
                    handlePlayerAction(youLegal.canCheck ? { type: "check" } : { type: "fold" })
                  }
                >
                  <span>{youLegal.canCheck ? "Check" : "Fold"}</span>
                  <kbd>F</kbd>
                </button>

                {!youLegal.canCheck && (
                  <button
                    type="button"
                    className="act-btn act-call num"
                    onClick={() => handlePlayerAction({ type: "call" })}
                  >
                    <span>
                      {youLegal.toCall >= (youSeat?.stack ?? 0)
                        ? `Call All-In (${youLegal.toCall.toLocaleString()})`
                        : `Call ${youLegal.toCall.toLocaleString()}`}
                    </span>
                    <kbd>C</kbd>
                  </button>
                )}

                {youLegal.canCheck && (
                  <button
                    type="button"
                    className="act-btn act-call"
                    onClick={() => handlePlayerAction({ type: "check" })}
                  >
                    <span>Check</span>
                    <kbd>Space</kbd>
                  </button>
                )}

                {youLegal.canRaise && (
                  <button
                    type="button"
                    className="act-btn act-raise num"
                    onClick={() => handlePlayerAction({ type: "raise", to: raiseAmount })}
                  >
                    <span>
                      {raiseAmount >= youLegal.maxRaiseTo
                        ? `All-In ${youLegal.maxRaiseTo.toLocaleString()}`
                        : `${hand.currentBet === 0 ? "Bet" : "Raise to"} ${raiseAmount.toLocaleString()}`}
                    </span>
                    <kbd>R</kbd>
                  </button>
                )}
              </div>
            </div>
          ) : hand.street === "done" && phase === "playing" ? (
            <div className="between-hand-bar">
              {youSeat && youSeat.stack > 0 && liveSeats(hand).length > 1 ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={dealNextHand}>
                    Next Hand <kbd className="kbd-inline">Space</kbd>
                  </button>
                  <label className="autodeal-toggle">
                    <input
                      type="checkbox"
                      checked={autoDeal}
                      onChange={(e) => setAutoDeal(e.target.checked)}
                    />
                    <span>Auto-deal</span>
                  </label>
                </>
              ) : (
                <span className="status-wait-pill">Settling table…</span>
              )}
            </div>
          ) : (
            <div className="between-hand-bar">
              <span className="status-wait-pill">
                {thinkingSeat
                  ? `${namesMap.get(thinkingSeat) ?? "AI"} is deciding…`
                  : "Waiting for table action…"}
              </span>
            </div>
          )}
        </div>
      </footer>

      {/* Intermission Overlay: Round Cleared (Multi-Table Bracket Progression) */}
      <AnimatePresence>
        {phase === "round_cleared" && (
          <motion.div
            className="arena-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="arena-modal"
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
            >
              <span className="modal-kicker num">
                STAGE {stageOpponentsTotal} · ROUND {roundNo} OF {totalRounds} CLEARED
              </span>
              <h2>Your table is clear.</h2>
              <p>
                While you won your table, {otherFieldCount} AI opponents battled across{" "}
                {bgTables.length} parallel {bgTables.length === 1 ? "table" : "tables"}. Their
                winners now advance to face you with fresh 2,000-chip stacks.
              </p>

              <div className="survivor-chips">
                {bgWinners.map((w) => (
                  <span key={w.id} className="survivor-chip">
                    <strong>{w.name}</strong>
                    <small>{BRAIN_LABEL[w.brain]}</small>
                  </span>
                ))}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => startRoundTable(bgWinners, roundNo + 1, stageIdx)}
                >
                  Deal Round {roundNo + 1} (vs {bgWinners.length} {bgWinners.length === 1 ? "winner" : "winners"}) →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intermission Overlay: Stage Cleared (The Doubling Escalation) */}
      <AnimatePresence>
        {phase === "stage_cleared" && (
          <motion.div
            className="arena-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="arena-modal"
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
            >
              <span className="modal-kicker num">STAGE {stageOpponentsTotal} CLEARED</span>
              <h2>The field doubles: {STAGES[stageIdx + 1]} AI opponents next.</h2>
              <p>
                You eliminated all {stageOpponentsTotal}{" "}
                {stageOpponentsTotal === 1 ? "opponent" : "opponents"} in Stage {stageOpponentsTotal}.
                Stacks reset to {START_STACK.toLocaleString()} for the next rung on the ladder.
              </p>

              <div className="modal-ladder-wrap">
                <Ladder current={stageIdx + 1} cleared={stageIdx + 1} />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => startStage(stageIdx + 1, avail)}
                >
                  Deal Stage {STAGES[stageIdx + 1]} →
                </button>
                <a
                  href={`/r/${encodeRun({ ...stats, cleared: stageIdx + 1 })}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost"
                >
                  Share Progress ↗
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End of Run Summary Overlay */}
      <AnimatePresence>
        {phase === "run_over" && (
          <motion.div
            className="arena-modal-backdrop is-summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="arena-summary-wrap"
              initial={{ scale: 0.96, y: 14 }}
              animate={{ scale: 1, y: 0 }}
            >
              <SummaryCard stats={stats} onPlayAgain={restartRun} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
