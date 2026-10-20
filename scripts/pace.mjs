// Times stage 1 with a passive script (check/call every turn). Run against a real-key server to measure pacing.
// Usage: node scripts/pace.mjs [baseUrl] [runs]
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3100";
const runs = Number(process.argv[3] || 1);
const browser = await chromium.launch();
for (let r = 0; r < runs; r++) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(base + "/play?council=random", { waitUntil: "networkidle" });
  const label = async () => (await page.locator(".stage-ind").getAttribute("aria-label").catch(() => "")) || "";
  const t0 = Date.now();
  let hands = 0, outcome = "timeout", lastProgress = Date.now(), lastState = "";
  while (Date.now() - t0 < 300_000) {
    const l = await label();
    const h = Number(l.match(/hand (\d+)/i)?.[1] || 0);
    if (h > hands) hands = h;
    if (/stage 2/i.test(l)) { outcome = "cleared"; break; }
    if (await page.locator(".results").count()) { outcome = "bust"; break; }
    const buttons = (await page.locator("button:visible").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim()).join(" | ");
    const state = `${l} :: ${buttons}`;
    if (state !== lastState) { lastState = state; lastProgress = Date.now(); }
    if (Date.now() - lastProgress > 25_000) { outcome = "stalled"; await page.screenshot({ path: `screenshots/pace-stall-${r}.png` }); console.log("stalled at", state); break; }
    const act = page.getByRole("button", { name: /^(Check|Call)/ });
    if (await act.count()) await act.first().click({ timeout: 800 }).catch(() => {});
    const next = page.getByRole("button", { name: /^(Next hand|Deal|Next stage|Continue)/ });
    if (await next.count()) await next.first().click({ timeout: 800 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  console.log({ run: r + 1, outcome, hands, seconds: Math.round((Date.now() - t0) / 1000), errors: errors.length });
  await page.close();
}
await browser.close();
