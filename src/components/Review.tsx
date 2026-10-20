"use client";

import { useState } from "react";
import { CHOICES, modelById, type Choice, type Decision } from "@/brains/types";
import { cardPretty } from "@/engine/cards";
import { PLAYER_ID } from "@/game/run";
import type { HandRecord } from "@/game/review";

const CHOICE_LABEL: Record<Choice, string> = { fold: "Fold", check_call: "Check or call", raise_small: "Small raise", raise_big: "Big raise", all_in: "All in" };
const ACTION_LABEL: Record<string, string> = { blind: "posts blind", fold: "folds", check: "checks", call: "calls", raise: "raises to" };

function Thought({ d }: { d: Decision }) {
  if (d.timedOut) return <div className="rr-thought"><em>{modelById(d.model).label} did not answer in time, so the seat {d.choice === "fold" ? "folded" : "checked"}.</em></div>;
  if (d.probabilities) {
    const rows = CHOICES.filter((c) => d.probabilities![c] !== undefined);
    return (
      <div className="rr-thought">
        <em>{modelById(d.model).label} weighed the options and drew {CHOICE_LABEL[d.choice].toLowerCase()}.</em>
        <div className="probs">
          {rows.map((c) => {
            const p = d.probabilities![c] ?? 0;
            return (
              <div key={c} className={`prob ${c === d.choice ? "chosen" : ""}`}>
                <span>{CHOICE_LABEL[c]}</span>
                <i><b style={{ width: `${Math.round(p * 100)}%` }} /></i>
                <span className="num">{Math.round(p * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return <div className="rr-thought">{d.reason ? `“${d.reason}”` : <em>{modelById(d.model).label} chose {CHOICE_LABEL[d.choice].toLowerCase()}.</em>}</div>;
}

/** Every hand of the run, with what each model was thinking when it acted. */
export function Review({ hands }: { hands: HandRecord[] }) {
  const [open, setOpen] = useState<number | null>(hands.length ? hands.length - 1 : null);
  if (!hands.length) return <div className="results-empty">No hands were played.</div>;
  return (
    <div className="review">
      {hands.map((h, idx) => {
        const you = h.seats.find((s) => s.id === PLAYER_ID);
        const delta = you ? you.end - you.start : 0;
        const w = h.winners.map((x) => h.seats.find((s) => s.id === x.seat)?.name ?? x.seat).join(", ");
        const isOpen = open === idx;
        const names = new Map(h.seats.map((s) => [s.id, s.name]));
        let street = "";
        return (
          <div key={`${h.stageN}-${h.roundNo}-${h.handNo}`} className={`review-hand ${isOpen ? "open" : ""}`}>
            <button type="button" className="review-hand-head" onClick={() => setOpen(isOpen ? null : idx)} aria-expanded={isOpen}>
              <span className="rh-no num">Stage {h.stageN}, hand {h.handNo}</span>
              <span className="rh-sum">{w} {h.winners.length === 1 && h.winners[0].seat === PLAYER_ID ? "win" : "wins"} {h.winners.reduce((t, x) => t + x.amount, 0).toLocaleString()}{h.winners[0]?.label ? ` with ${h.winners[0].label.toLowerCase()}` : ""}</span>
              <span className={`rh-res num ${delta > 0 ? "win" : delta < 0 ? "lose" : ""}`}>{delta > 0 ? "+" : ""}{delta.toLocaleString()}</span>
            </button>
            {isOpen && (
              <div className="review-body">
                <div className="review-cards num">
                  <span>Board <b>{h.board.length ? h.board.map(cardPretty).join(" ") : "none"}</b></span>
                  {h.seats.map((s) => <span key={s.id}>{s.name} <b>{s.hole.map(cardPretty).join(" ")}</b></span>)}
                </div>
                {h.actions.filter((a) => a.action !== "blind").map((a, i) => {
                  const header = a.street !== street ? (street = a.street, <div className="review-street" key={`s${i}`}>{a.street[0].toUpperCase() + a.street.slice(1)}</div>) : null;
                  return (
                    <div key={i}>
                      {header}
                      <div className="review-row">
                        <span className="rr-who">{names.get(a.seat) ?? a.seat}</span>
                        <span className={`rr-act ${a.action}`}>{ACTION_LABEL[a.action] ?? a.action}{a.amount ? ` ${a.amount.toLocaleString()}` : ""}</span>
                        {a.decision ? <Thought d={a.decision} /> : <span className="rr-thought"><em>{a.seat === PLAYER_ID ? "Your call." : ""}</em></span>}
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
