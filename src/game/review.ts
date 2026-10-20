import type { Decision } from "@/brains/types";
import type { Card } from "@/engine/cards";
import type { HandState, Street } from "@/engine/hand";
import type { Member } from "./council";

export interface RecordedAction { seat: string; street: Street; action: string; amount?: number; decision?: Decision }
export interface HandRecord {
  handNo: number;
  stageN: number;
  board: Card[];
  seats: { id: string; name: string; hole: Card[]; start: number; end: number }[];
  actions: RecordedAction[];
  winners: { seat: string; amount: number; label?: string }[];
}

/** Snapshot a finished hand with every council decision attached to the action it produced. */
export function recordHand(h: HandState, decisions: Record<number, Decision>, names: Map<string, string>, startStacks: Map<string, number>, stageN: number): HandRecord {
  return {
    handNo: h.handNo,
    stageN,
    board: [...h.board],
    seats: h.seats.map((s) => ({ id: s.id, name: names.get(s.id) ?? s.id, hole: [...s.hole], start: startStacks.get(s.id) ?? s.stack, end: s.stack })),
    actions: h.log
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.action !== "win")
      .map(({ e, i }) => ({ seat: e.seat, street: e.street, action: e.action, amount: e.amount, decision: decisions[i] })),
    winners: h.result?.winners ?? [],
  };
}

export interface MemberStat { member: Member; votes: number; against: number; bestRead?: { handNo: number; note: string } }

/** How each council member voted across a stage, and its best minority call. */
export function memberStats(members: Member[], hands: HandRecord[], seatId: string, stageN: number): MemberStat[] {
  return members.map((m) => {
    let votes = 0, against = 0, bestRead: MemberStat["bestRead"];
    for (const h of hands) {
      if (h.stageN !== stageN) continue;
      const seatWon = h.winners.some((w) => w.seat === seatId);
      const seat = h.seats.find((s) => s.id === seatId);
      const lost = seat ? seat.end < seat.start : false;
      for (const a of h.actions) {
        const d = a.decision;
        if (!d?.votes) continue;
        const v = d.votes.find((x) => x.member === m.id);
        if (!v) continue;
        votes++;
        const carried = d.carriedBy?.includes(m.id);
        if (!carried) {
          against++;
          // a minority vote to fold when the seat went on to lose the pot, or to press when it won nothing
          if (!bestRead && lost && v.choice === "fold" && d.choice !== "fold") bestRead = { handNo: h.handNo, note: `wanted to fold on the ${a.street}; the seat ${d.choice === "check_call" ? "called" : "raised"} and lost` };
          if (!bestRead && !seatWon && !lost && v.choice !== "fold" && d.choice === "fold") bestRead = { handNo: h.handNo, note: `wanted to fight on the ${a.street}; the seat folded` };
        }
      }
    }
    return { member: m, votes, against, bestRead };
  });
}
