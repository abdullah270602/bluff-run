// Scripted play-through: calls/checks for a while and verifies hands keep advancing with no page errors.
// Usage: node scripts/e2e.mjs [baseUrl]
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:3100";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(base + "/play", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Fast" }).or(page.getByRole("button", { name: "Normal" })).first().click();

const handNo = async () => Number((await page.locator(".hud-blinds-label").textContent())?.replace(/\D/g, "") || 0);
const start = await handNo();
const deadline = Date.now() + 60_000;
let clicks = 0;
while (Date.now() < deadline) {
  const call = page.locator(".act-call");
  if (await call.count()) { await call.first().click({ timeout: 1000 }).catch(() => {}); clicks++; }
  const next = page.getByRole("button", { name: /Next hand/ });
  if (await next.count()) await next.first().click({ timeout: 1000 }).catch(() => {});
  const modal = page.locator(".arena-modal .btn-primary");
  if (await modal.count()) await modal.first().click({ timeout: 1000 }).catch(() => {});
  if (await page.locator(".summary-card").count()) break;
  await page.waitForTimeout(150);
}
const end = await handNo();
const summary = await page.locator(".summary-card").count();
console.log({ startHand: start, endHand: end, clicks, runOver: summary > 0, errors: errors.length });
if (errors.length) console.log(errors.slice(0, 5));
await page.screenshot({ path: "screenshots/e2e-final.png" });
await browser.close();
if (errors.length || (end <= start && !summary)) process.exit(1);
