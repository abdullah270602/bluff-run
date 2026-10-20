// Capture the council voting and the result reveal. Needs BLUFF_MOCK=1 on the server.
import { chromium } from "playwright";
const base = process.argv[2] || "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(base + "/play?stage=2&council=A7F3", { waitUntil: "networkidle" });
let live = false, done = false, results = false;
const t0 = Date.now();
while (Date.now() - t0 < 300_000) {
  if (!live && (await page.locator(".deliberation:not(.done)").count())) { await page.waitForTimeout(500); await page.screenshot({ path: "screenshots/deliberation.png" }); live = true; }
  if (!done && (await page.locator(".deliberation.done").count())) { await page.waitForTimeout(200); await page.screenshot({ path: "screenshots/deliberation-done.png" }); done = true; }
  const act = page.getByRole("button", { name: /^(Check|Call)/ });
  if (await act.count()) await act.first().click({ timeout: 800 }).catch(() => {});
  const next = page.getByRole("button", { name: /^(Next hand|Deal)/ });
  if (await next.count()) await next.first().click({ timeout: 800 }).catch(() => {});
  if (await page.locator(".results").count()) { await page.waitForTimeout(600); await page.screenshot({ path: "screenshots/results.png" }); results = true; break; }
  await page.waitForTimeout(150);
}
console.log({ live, done, results, errors: errors.length }, errors.slice(0, 3));
await browser.close();
