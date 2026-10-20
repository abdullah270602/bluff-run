// Scripted play-through: checks/calls for a while and verifies hands keep advancing with no page errors.
// Usage: node scripts/e2e.mjs [baseUrl]   (run the server with BLUFF_MOCK=1 for a no-network check)
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(base + "/play", { waitUntil: "networkidle" });
const handNo = async () => Number((await page.locator(".stage-ind").getAttribute("aria-label").catch(() => ""))?.match(/hand (\d+)/i)?.[1] || 0);
const start = await handNo();
const deadline = Date.now() + 110_000;
let clicks = 0, shot = false, showdown = false;
while (Date.now() < deadline) {
  const act = page.getByRole("button", { name: /^(Check|Call)/ });
  if (await act.count()) { await act.first().click({ timeout: 800 }).catch(() => {}); clicks++; }
  const next = page.getByRole("button", { name: /^(Next hand|Deal)/ });
  if (await next.count()) await next.first().click({ timeout: 800 }).catch(() => {});
  if (!showdown && (await page.locator(".seat-status.tone-win").count()) && (await page.locator(".seat-status.tone-plain:not(.empty)").count())) { await page.waitForTimeout(500); await page.screenshot({ path: "screenshots/showdown.png" }); showdown = true; }
  if (await page.locator(".deliberation:not(.done)").count()) await page.screenshot({ path: "screenshots/deliberation.png" }).catch(() => {});
  if (await page.locator(".deliberation.done").count()) await page.screenshot({ path: "screenshots/deliberation-done.png" }).catch(() => {});
  if (await page.locator(".chip-fly").count()) await page.screenshot({ path: "screenshots/chips.png" }).catch(() => {});
  if (await page.locator(".turn-ring.sweep").count()) await page.screenshot({ path: "screenshots/sweep.png" }).catch(() => {});
  if (!shot && (await handNo()) >= 3) { await page.screenshot({ path: "screenshots/play-mid.png" }); shot = true; }
  if (await page.locator(".results").count()) break;
  await page.waitForTimeout(150);
}
const end = await handNo();
const results = await page.locator(".results").count();
if (results) { await page.locator(".review-hand-head").first().click().catch(() => {}); await page.waitForTimeout(300); }
await page.screenshot({ path: "screenshots/e2e-final.png" });
console.log({ startHand: start, endHand: end, clicks, runOver: results > 0, errors: errors.length });
if (errors.length) console.log(errors.slice(0, 5));
await browser.close();
if (errors.length || (end <= start && !results)) process.exit(1);
