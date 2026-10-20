// Exercise /api/simulate: start a stage-16 style background table and poll until a winner comes back.
// Usage: node scripts/simulate-check.mjs [baseUrl]
const base = process.argv[2] || "http://localhost:3100";
const table = Array.from({ length: 8 }, (_, i) => ({ id: `jev-4-${i + 8}`, name: `Jev ${i + 1}`, model: "jev", persona: { aggression: 0.5, bluff: 0.1, patience: 0.5 } }));
const { id, error } = await (await fetch(base + "/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tables: [table] }) })).json();
if (!id) { console.error("start failed", error); process.exit(1); }
const t0 = Date.now();
for (;;) {
  const s = await (await fetch(`${base}/api/simulate?id=${id}`)).json();
  if (s.done) { console.log({ ms: Date.now() - t0, hands: s.hands, winner: s.winners[0]?.name, error: s.error }); process.exit(s.winners.length === 1 ? 0 : 1); }
  if (Date.now() - t0 > 120_000) { console.error("timeout", s); process.exit(1); }
  await new Promise((r) => setTimeout(r, 1000));
}
