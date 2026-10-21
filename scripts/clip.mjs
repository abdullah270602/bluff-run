// Record the table for the README: the vote strip filling in, the carried-it line, chips flying and a showdown.
// Usage: BLUFF_MOCK=1 npx next build && BLUFF_MOCK=1 npx next start -p 3200, then node scripts/clip.mjs [baseUrl]
// Writes docs/bluff-run.gif. Each frame is diffed against the previous one (unchanged pixels go transparent) so the GIF stays small.
import { chromium } from "playwright";
import { PNG } from "pngjs";
import gifenc from "gifenc";
import { writeFileSync } from "node:fs";

const { GIFEncoder, quantize, applyPalette } = gifenc;

const base = process.argv[2] || "http://localhost:3200";
const FPS = 12, MIN_MS = 15_000, MAX_MS = 20_000, OUT = "docs/bluff-run.gif";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.75 }); // 960 x 600 bitmap
await page.goto(base + "/play?stage=4&council=A7F3", { waitUntil: "networkidle" });

// One round trip per frame: read the markers and press Check/Call or Next hand/Deal in the page itself.
const tick = () => page.evaluate(() => {
  const $ = (s) => document.querySelector(s);
  for (const b of document.querySelectorAll("button")) if (/^(Check|Call|Next hand|Deal)/.test(b.textContent || "")) { b.click(); break; }
  return {
    delib: !!$(".deliberation:not(.done)"),
    carried: /carried it/.test($(".deliberation")?.textContent || ""),
    chips: !!$(".chip-fly"),
    showdown: !!$(".seat-status.tone-win") && !!$(".seat-status.tone-plain:not(.empty)"),
    any: !!$(".deliberation"),
    over: !!$(".results"),
  };
});
const seen = { delib: false, carried: false, chips: false, showdown: false };
const frames = []; // { png, at }: recording starts at the first vote strip
let t0 = 0, last = -Infinity;
// Frames come from the compositor (page.screenshot is too slow for 12 fps); keep one every 1/FPS s.
const cdp = await page.context().newCDPSession(page);
cdp.on("Page.screencastFrame", ({ data, sessionId }) => {
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  if (!t0) return;
  const at = Date.now() - t0;
  if (at - last < 1000 / FPS - 8) return;
  last = at;
  frames.push({ png: Buffer.from(data, "base64"), at });
});
await cdp.send("Page.startScreencast", { format: "png", maxWidth: 960, maxHeight: 600 });
const giveUp = Date.now() + 150_000;
while (Date.now() < giveUp) {
  const start = Date.now();
  const s = await tick();
  if (!t0 && s.any) t0 = start;
  if (t0) {
    for (const k of Object.keys(seen)) seen[k] ||= s[k];
    if (s.over) { frames.splice(-2); break; } // the run ended: keep the table, not the results fade
    const ms = Date.now() - t0;
    if (ms >= MAX_MS || (ms >= MIN_MS && Object.values(seen).every(Boolean))) break;
  }
  await page.waitForTimeout(Math.max(0, 1000 / FPS - (Date.now() - start)));
}
await cdp.send("Page.stopScreencast").catch(() => {});
await browser.close();
if (!frames.length) { console.error("no vote strip appeared, nothing recorded"); process.exit(1); }

// One global palette from a spread of frames; the last index is reserved for "unchanged since the previous frame".
const decode = (f) => PNG.sync.read(f.png);
const stride = Math.max(1, Math.floor(frames.length / 8));
const sample = Buffer.concat(frames.filter((_, i) => i % stride === 0).map((f) => decode(f).data));
const palette = quantize(sample, 255);
const T = palette.length;
const gif = GIFEncoder();
let prev = null, width = 0, height = 0;
frames.forEach((f, i) => {
  if (process.env.CLIP_DUMP && i % FPS === 0) writeFileSync(`${process.env.CLIP_DUMP}/clip-${i}.png`, f.png); // one still per second, to eyeball a run
  const img = decode(f);
  width = img.width; height = img.height;
  const idx = applyPalette(img.data, palette);
  const delay = (frames[i + 1]?.at ?? f.at + 1000 / FPS) - f.at;
  if (!prev) { gif.writeFrame(idx, width, height, { palette: [...palette, [0, 0, 0]], delay, repeat: 0, dispose: 1 }); }
  else {
    const d = new Uint8Array(idx.length);
    for (let k = 0; k < idx.length; k++) d[k] = idx[k] === prev[k] ? T : idx[k];
    gif.writeFrame(d, width, height, { delay, transparent: true, transparentIndex: T, dispose: 1 });
  }
  prev = idx;
});
gif.finish();
const bytes = gif.bytes();
writeFileSync(OUT, bytes);
console.log({ frames: frames.length, seconds: +(frames.at(-1).at / 1000).toFixed(1), size: `${width}x${height}`, bytes: bytes.length, ...seen });
if (bytes.length > 6_000_000) console.warn("over 6 MB: lower FPS or deviceScaleFactor in scripts/clip.mjs");
