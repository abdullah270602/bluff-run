import { NextResponse } from "next/server";
import { configured, decide } from "@/brains/openrouter";
import { MODELS, type PlayerView } from "@/brains/types";

export const runtime = "nodejs";

/** Whether OpenRouter is configured and which models seats use. Jev only unless BLUFF_MODELS lists more. */
export async function GET() {
  const active = (process.env.BLUFF_MODELS || "jev").split(",").map((s) => s.trim());
  return NextResponse.json({ configured: configured(), models: MODELS.filter((m) => active.includes(m.id)).map(({ id, label, short }) => ({ id, label, short })) });
}

export async function POST(req: Request) {
  const { model, view } = (await req.json()) as { model: string; view: PlayerView };
  if (!view?.hero?.hole || view.hero.hole.length !== 2) return NextResponse.json({ error: "bad view" }, { status: 400 });
  if (!configured()) return NextResponse.json({ error: "OPENROUTER_API_KEY is not set" }, { status: 503 });
  return NextResponse.json(await decide(model, view));
}
