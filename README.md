# Bluff Run

**How many Jevs can you beat?**

Heads-up no-limit Hold'em against a council of Jevs (TypeSafe AI, via OpenRouter) that votes on every move. Beat one and next hand there are two in the chair, then 4, 8, 16, 32, 64, 100. Lose your stack once and the run ends.

## The council

- Every stage is heads-up. The seat across from you is one chair acted by N Jevs. Each member gets the same question with its own brief, all votes go out in parallel (`/api/council`, streamed back as they land), and the seat does what the plurality says. The vote strip fills in live; a split vote shows who carried it.
- Members are seeded per council (`src/game/council.ts`): archetypes (Plain Jev, Rock, Station, Grinder, Hustler, Maniac, Clock), quirks from stage 4, tells from stage 5 (a long pause when the seat is strong, wide eyes before a raise, a blink before a fold), and tilt after a big loss.
- The deck is seeded too, so the same council plays the same cards. Everyone gets the same **daily council** (`/play`); `/play?council=random` or `/play?council=A7F3` sits at a specific one.
- What the council thought is hidden during the hand and shown after the run: every decision with its vote, and the reveal of each member you faced.
- Share: `/r/[code]` carries the run in the URL with an Open Graph card (ladder, Jevs outlasted, the vote that ended it). "Copy summary" gives a Wordle-style ladder; "Copy link" sends the same council to a friend.

Stacks start at 500 with 10/20 blinds rising every 6 hands.

## Run it

```bash
npm install
cp .env.example .env.local   # add OPENROUTER_API_KEY
npm run dev
```

Checks: `npm test` (engine, council determinism, share codec), then against `BLUFF_MOCK=1 npx next start -p 3100`: `node scripts/e2e.mjs` (scripted play-through), `node scripts/shots.mjs` (screenshots), `node scripts/council-shots.mjs` (vote strip and the reveal). `BLUFF_MOCK=1` votes by persona without network calls; with it, `?stage=N` jumps to a stage.

## Layout

- `src/engine/` hand evaluator, betting, side pots.
- `src/game/` run constants, council builder and tally, hand records, share codec.
- `src/brains/` Jev prompt and the OpenRouter System One call.
- `src/components/` the table window, bots, arena driver, results and review.
