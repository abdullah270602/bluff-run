import { NextResponse } from "next/server";
import { configured, decide } from "@/brains/openrouter";
import { simulateTable, type Opponent } from "@/game/run";

export const runtime = "nodejs";

interface Job { total: number; done: number; hands: number; winners: Opponent[]; error?: string; started: number }
// ponytail: in-memory jobs, one server process. Move to a queue/store if this is deployed serverless.
const jobs = new Map<string, Job>();

/** Start playing the background tables. Each table runs sequentially, tables run in parallel. */
export async function POST(req: Request) {
  const { tables } = (await req.json()) as { tables: Opponent[][] };
  if (!Array.isArray(tables) || !tables.length) return NextResponse.json({ error: "no tables" }, { status: 400 });
  if (!configured()) return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 503 });
  const id = Math.random().toString(36).slice(2, 10);
  const job: Job = { total: tables.length, done: 0, hands: 0, winners: [], started: Date.now() };
  jobs.set(id, job);
  for (const [k, j] of jobs) if (Date.now() - j.started > 6 * 3600_000) jobs.delete(k);
  void Promise.all(
    tables.map((t) =>
      simulateTable(t, (model, view) => decide(model, view).then((d) => d.choice), () => { job.hands++; })
        .then((w) => { job.winners.push(w); job.done++; })
        .catch((e) => { job.error = (e as Error).message; job.done++; }),
    ),
  );
  return NextResponse.json({ id });
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const job = jobs.get(id);
  if (!job) return NextResponse.json({ error: "unknown job" }, { status: 404 });
  return NextResponse.json({ done: job.done >= job.total, total: job.total, tablesDone: job.done, hands: job.hands, winners: job.winners, error: job.error });
}
