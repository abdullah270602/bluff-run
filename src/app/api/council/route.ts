import { configured, vote } from "@/brains/openrouter";
import type { PlayerView } from "@/brains/types";
import { memberBrief, type Member } from "@/game/council";

export const runtime = "nodejs";
/** Room for a slow upstream at x100: a stalled vote becomes a timed-out vote, not a killed function. */
export const maxDuration = 60;

const MAX_MEMBERS = 100;

/** Only the table itself may ask the council to vote; a script hitting the route would spend the key. */
function sameOrigin(req: Request) {
  const site = req.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  return process.env.NODE_ENV !== "production"; // dev tools and local scripts send no fetch metadata
}

const CONCURRENCY = 24; // all votes in flight together, up to this many at once

/** Whether the table can open. */
export async function GET() {
  return Response.json({ configured: configured(), mock: process.env.BLUFF_MOCK === "1" });
}

/**
 * The council votes. Streams one JSON line per member as each vote lands, so the table can show
 * the strip filling in. Members run with limited concurrency; a member that fails counts as a
 * timed-out vote.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { members, view, tilted } = (await req.json()) as { members: Member[]; view: PlayerView; tilted?: boolean };
  if (!Array.isArray(members) || !members.length || members.length > MAX_MEMBERS || !view?.hero?.hole) return Response.json({ error: "bad request" }, { status: 400 });
  if (!configured()) return Response.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 503 });
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const queue = [...members];
      const worker = async () => {
        for (let m = queue.shift(); m; m = queue.shift()) {
          const v = await vote(m.id, { ...view, brief: memberBrief(m, Boolean(tilted)) }, members.length > 1);
          controller.enqueue(encoder.encode(JSON.stringify(v) + "\n"));
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, members.length) }, worker));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
