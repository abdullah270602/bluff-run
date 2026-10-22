// A 35 second promo: the landing page with the council doubling in front of you, the Jev table, then a stage of play.
// Usage: BLUFF_MOCK=1 npx next start -p 3100, then FFMPEG=<path to ffmpeg> node scripts/promo.mjs [baseUrl]
// Frames come from the compositor over CDP and are encoded to H.264 at 30 fps, 1280x720, for X.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2] || "http://localhost:3100";
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const W = 1280, H = 720, TOTAL = 36_500, LENGTH = 35, OUT = "screenshots/promo.mp4";
const dir = "screenshots/promo-frames";
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const cdp = await page.context().newCDPSession(page);
const frames = []; // { file, at }
let t0 = 0, n = 0, pending = 0;
cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  if (!t0) return;
  const file = join(dir, `f${String(n++).padStart(5, "0")}.png`);
  writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, at: Date.now() - t0 });
});
const since = () => Date.now() - t0;

// 1. The landing page: the hero doubles from one Jev to a hundred, then down to the table of Jevs.
await page.goto(base + "/", { waitUntil: "networkidle" });
await cdp.send("Page.startScreencast", { format: "png", maxWidth: W, maxHeight: H, everyNthFrame: 1 });
await page.locator(".duel-rung.now", { hasText: "×1" }).waitFor({ timeout: 20_000 }); // start as the council resets to one
t0 = Date.now();
await page.waitForTimeout(11_300);
await page.locator(".jev-table-wrap").scrollIntoViewIfNeeded();
await page.waitForTimeout(1_900);
await page.locator(".jev-seat").nth(4).hover();
await page.waitForTimeout(1_700);

// 2. A stage of play against a council of eight, with human-sized pauses before each click.
await page.goto(base + "/play?stage=4&council=A7F3", { waitUntil: "networkidle" });
let nextAt = 0;
while (since() < TOTAL) {
  const act = page.getByRole("button", { name: /^(Check|Call)/ });
  const next = page.getByRole("button", { name: /^(Next hand|Deal)/ });
  if (await act.count()) {
    if (!nextAt) nextAt = Date.now() + 1_000;
    if (Date.now() >= nextAt) { await act.first().click({ timeout: 500 }).catch(() => {}); nextAt = 0; }
  } else if (await next.count()) {
    if (!nextAt) nextAt = Date.now() + 1_900;
    if (Date.now() >= nextAt) { await next.first().click({ timeout: 500 }).catch(() => {}); nextAt = 0; }
  } else nextAt = 0;
  if (await page.locator(".results").count()) break;
  await page.waitForTimeout(80);
}
await cdp.send("Page.stopScreencast").catch(() => {});
await browser.close();

// 3. Encode: each frame holds until the next one, resampled to a steady 30 fps.
const list = frames.map((f, i) => `file '${f.file.replace(/\\/g, "/").replace(/^screenshots\//, "")}'\nduration ${(((frames[i + 1]?.at ?? f.at + 40) - f.at) / 1000).toFixed(4)}`).join("\n") + `\nfile '${frames.at(-1).file.replace(/\\/g, "/").replace(/^screenshots\//, "")}'\n`;
writeFileSync("screenshots/promo-list.txt", list);
execFileSync(FFMPEG, [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "concat", "-safe", "0", "-i", "promo-list.txt",
  "-vf", `fps=30,scale=${W}:${H}:flags=lanczos,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st=${LENGTH - 0.6}:d=0.6`,
  "-t", String(LENGTH), "-c:v", "libx264", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", "promo.mp4",
], { cwd: "screenshots", stdio: "inherit" });
console.log({ frames: frames.length, seconds: (frames.at(-1).at / 1000).toFixed(1), out: OUT });
