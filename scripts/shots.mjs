// Screenshot the main screens for a visual review. Usage: node scripts/shots.mjs [baseUrl]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] || "http://localhost:3100";
mkdirSync("screenshots", { recursive: true });
const browser = await chromium.launch();

async function shot(name, { width, height, url, before }) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: "dark" });
  await page.goto(base + url, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: name.includes("landing") });
  await page.close();
  console.log("saved", name);
}

await shot("landing-desktop", { width: 1440, height: 900, url: "/" });
await shot("landing-mobile", { width: 390, height: 844, url: "/" });
await shot("play-desktop", { width: 1440, height: 900, url: "/play", before: (p) => p.waitForTimeout(2500) });
await shot("play-laptop", { width: 1280, height: 720, url: "/play", before: (p) => p.waitForTimeout(2500) });
await shot("share-desktop", { width: 1440, height: 900, url: "/r/WzQsNCwyMSw0OCwzNjAwLCJGdWxsIGhvdXNlLCBLaW5ncyBmdWxsIG9mIFRlbnMiLDAsIjIwMjYtMTAtMTkiXQ" });
await browser.close();
