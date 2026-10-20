import type { Decision } from "@/brains/types";
import type { Card } from "@/engine/cards";
import type { HandState, Street } from "@/engine/hand";

export interface RecordedAction { seat: string; street: Street; action: string; amount?: number; decision?: Decision }
export interface HandRecord {
  handNo: number;
  stageN: number;
  roundNo: number;
  board: Card[];
  seats: { id: string; name: string; model: string; hole: Card[]; start: number; end: number }[];
  actions: RecordedAction[];
  winners: { seat: string; amount: number; label?: string }[];
}

/** Snapshot a finished hand with every model decision attached to the action it produced. */
export function recordHand(
  h: HandState,
  decisions: Record<number, Decision>,
  names: Map<string, string>,
  models: Map<string, string>,
  startStacks: Map<string, number>,
  stageN: number,
  roundNo: number,
): HandRecord {
  return {
    handNo: h.handNo,
    stageN,
    roundNo,
    board: [...h.board],
    seats: h.seats.map((s) => ({ id: s.id, name: names.get(s.id) ?? s.id, model: models.get(s.id) ?? "you", hole: [...s.hole], start: startStacks.get(s.id) ?? s.stack, end: s.stack })),
    actions: h.log
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.action !== "win")
      .map(({ e, i }) => ({ seat: e.seat, street: e.street, action: e.action, amount: e.amount, decision: decisions[i] })),
    winners: h.result?.winners ?? [],
  };
}
