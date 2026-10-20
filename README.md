# Bluff Run

**How many AI opponents can you beat?**

No-limit Texas Hold'em against a field that doubles every time you clear the table:

```text
1, 2, 4, 8, 16, 32, 64, 100
```

Start heads-up against Jev with 2,000 chips each and 10/20 blinds that rise every 8 hands. Take every chip and the field doubles. Lose your stack once and the run ends.

## How it works

- **Engine** (`src/engine/`): hand evaluator, betting rounds, side pots, blind schedule. `npm test` runs the self-check.
- **Opponents** (`src/brains/`): every seat is Jev (TypeSafe AI) reached through OpenRouter. It answers a choice question with a probability per action and the seat samples from them. A seat whose model does not answer checks or folds, like a player who timed out. Other chat models are defined in `src/brains/types.ts` and can be turned on with `BLUFF_MODELS=jev,haiku` if you ever want a mixed table.
- **Stages past 8** (`src/game/run.ts`): a table seats nine. The rest of the field splits into tables of up to nine that Jev plays on the server (`/api/simulate`) while you play yours. Winners come back to face you until no one is left. Stage 100 is three rounds.
- **Share** (`/r/[code]`): the run summary is encoded in the URL with a generated Open Graph image.

## Run it

```bash
npm install
cp .env.example .env.local   # add OPENROUTER_API_KEY
npm run dev
```

Checks: `npm test` (engine), `node scripts/shots.mjs` (screenshots) and `node scripts/e2e.mjs` (scripted play-through) against a running `npx next start -p 3100`. Set `BLUFF_MOCK=1` to run the table without network calls during development.
