"use client";

import { useState } from "react";
import type { Decision } from "@/brains/types";
import { bestFive } from "@/engine/evaluate";
import { groupOf, type Member } from "@/game/council";
import { PLAYER_ID } from "@/game/run";
import type { HandRecord } from "@/game/review";
import { CardFace } from "./PlayingCard";

const ACTION_LABEL: Record<string, string> = { blind: "posts blind", fold: "folds", check: "checks", call: "calls", raise: "raises to" };

function Thought({ d, members }: { d: Decision; members: Map<string, Member> }) {
  if (!d.votes?.length) return <div className="rr-thought"><em>{d.timedOut ? "Jev did not answer in time." : ""}</em></div>;
  const total = d.votes.length;
  const names = (g: "fold" | "call" | "raise") => d.votes!.filter((v) => groupOf(v.choice) === g).map((v) => members.get(v.member)?.name ?? v.member).join(", ");
  const c = d.counts ?? { fold: 0, call: 0, raise: 0 };
  const winner = groupOf(d.choice);
  const carried = (d.carriedBy ?? []).slice(0, 3).map((id) => members.get(id)?.name ?? id);
  return (
    <div className="rr-thought">
      <div className="probs">
        {(["fold", "call", "raise"] as const).filter((g) => c[g] > 0 || g === winner).map((g) => (
          <div key={g} className={`prob ${g === winner ? "chosen" : ""}`} title={names(g)}>
            <span>{g === "call" ? "Check or call" : g[0].toUpperCase() + g.slice(1)}</span>
            <i><b style={{ width: `${Math.round((c[g] / total) * 100)}%` }} /></i>
            <span className="num">{c[g]}</span>
          </div>
        ))}
      </div>
      {total > 1 && <em>{total} votes. {carried.length ? `Carried by ${carried.join(", ")}${(d.carriedBy?.length ?? 0) > 3 ? ` and ${d.carriedBy!.length - 3} more` : ""}.` : ""}</em>}
    </div>
  );
}

const Cards = ({ cards, win }: { cards: number[]; win?: Set<number> }) => (
  <div>{cards.map((c) => <div key={c} className="card-xs"><CardFace card={c} className={win?.has(c) ? "win" : ""} dim={Boolean(win && !win.has(c))} /></div>)}</div>
);

/** Every hand of the run, with how the council voted on each action. */
export function Review({ hands, members }: { hands: HandRecord[]; members: Member[] }) {
  const [open, setOpen] = useState<number | null>(hands.length ? hands.length - 1 : null);
  const byId = new Map(members.map((m) => [m.id, m]));
  if (!hands.length) return <div className="results-empty">No hands were played.</div>;
  return (
    <div className="review">
      {hands.map((h, idx) => {
        const you = h.seats.find((s) => s.id === PLAYER_ID);
        const delta = you ? you.end - you.start : 0;
        const first = h.winners[0];
        const winnerSeat = first ? h.seats.find((s) => s.id === first.seat) : undefined;
        const wName = h.winners.map((x) => h.seats.find((s) => s.id === x.seat)?.name ?? x.seat).join(", ");
        const isOpen = open === idx;
        const names = new Map(h.seats.map((s) => [s.id, s.name]));
        const win = winnerSeat && first?.label && h.board.length === 5 ? new Set(bestFive(winnerSeat.hole.concat(h.board))) : undefined;
        let street = "";
        return (
          <div key={`${h.stageN}-${h.handNo}`} className={`review-hand ${isOpen ? "open" : ""}`}>
            <button type="button" className="review-hand-head" onClick={() => setOpen(isOpen ? null : idx)} aria-expanded={isOpen}>
              <span className="rh-no num">Stage {h.stageN}, hand {h.handNo}</span>
              <span className="rh-sum">{wName} {h.winners.length === 1 && first.seat === PLAYER_ID ? "win" : "wins"} {h.winners.reduce((t, x) => t + x.amount, 0).toLocaleString()}{first?.label ? ` with ${first.label.toLowerCase()}` : ""}</span>
              <span className={`rh-res num ${delta > 0 ? "win" : delta < 0 ? "lose" : ""}`}>{delta > 0 ? "+" : ""}{delta.toLocaleString()}</span>
            </button>
            {isOpen && (
              <div className="review-body">
                <div className="review-cards">
                  <div className="review-group"><span>Board</span>{h.board.length ? <Cards cards={h.board} win={win} /> : <span>No flop</span>}</div>
                  {h.seats.map((s) => <div key={s.id} className="review-group"><span>{s.name}</span><Cards cards={s.hole} win={win} /></div>)}
                </div>
                {h.actions.filter((a) => a.action !== "blind").map((a, i) => {
                  const header = a.street !== street ? (street = a.street, <div className="review-street" key={`s${i}`}>{a.street[0].toUpperCase() + a.street.slice(1)}</div>) : null;
                  return (
                    <div key={i}>
                      {header}
                      <div className="review-row">
                        <span className="rr-who">{names.get(a.seat) ?? a.seat}</span>
                        <span className={`rr-act ${a.action}`}>{ACTION_LABEL[a.action] ?? a.action}{a.amount ? ` ${a.amount.toLocaleString()}` : ""}</span>
                        {a.decision ? <Thought d={a.decision} members={byId} /> : <span className="rr-thought" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
