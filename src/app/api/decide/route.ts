import { NextResponse } from "next/server";
import { claudeAvailable, claudeDecide } from "@/brains/claude";
import { houseDecide } from "@/brains/house";
import { jevAvailable, jevDecide } from "@/brains/jev";
import type { BrainId, Decision, PlayerView } from "@/brains/types";

export const runtime = "nodejs";

/** Which model-backed brains are live on this deployment. */
export async function GET() {
  return NextResponse.json({ jev: jevAvailable(), claude: claudeAvailable() });
}

export async function POST(req: Request) {
  const { brain, view } = (await req.json()) as { brain: BrainId; view: PlayerView };
  if (!view?.hero?.hole || view.hero.hole.length !== 2) return NextResponse.json({ error: "bad view" }, { status: 400 });
  let decision: Decision | null = null;
  try {
    if (brain === "jev" && jevAvailable()) decision = await jevDecide(view);
    else if (brain === "claude" && claudeAvailable()) decision = await claudeDecide(view);
  } catch (e) {
    console.warn(`[decide] ${brain} failed, house fallback:`, (e as Error).message);
  }
  decision ??= { choice: houseDecide(view), brain: "house", fallback: brain !== "house" };
  return NextResponse.json(decision);
}
