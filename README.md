# Bluff Run

**How many AI opponents can you beat?**

Bluff Run is a No-Limit Texas Hold'em survival gauntlet built around an escalating doubling ladder:

```text
1 → 2 → 4 → 8 → 16 → 32 → 64 → 100
```

Start heads-up against **Jev** with 2,000 chips each and 10/20 blinds that escalate every 8 hands. Clear the table and the field doubles. Lose your stack once, and the run ends.

## Architecture & Game Mechanics

- **The Doubling Ladder (`1 → 100`)**: Up to 8 opponents sit at your live table (9-handed max). From Stage 16 onward, overflow opponents compete across parallel shootout tables resolved by the house engine. Clear your table to face the other table winners in subsequent rounds until one player stands.
- **Pluggable AI Decision Brains (`src/brains/`)**:
  - **Jev (`src/brains/jev.ts`)**: Queries TypeSafe AI's System One choice model (`jev-latest`) and samples from returned action probabilities.
  - **Claude Haiku (`src/brains/claude.ts`)**: Uses structured JSON output (`claude-haiku-5-5`) to choose actions and emit table-talk reasoning.
  - **House (`src/brains/house.ts`)**: Chen preflop formula + Monte Carlo postflop equity engine parameterized by opponent persona (`aggression`, `bluff`, `patience`). Serves as both a distinct opponent archetype, background shootout resolver, and automatic fallback when API keys are omitted.
- **Shareable Run Records (`/r/[code]`)**: Every run encodes its telemetry (stage reached, stages cleared, AI opponents beaten, hands played, biggest pot, signature hand) into a compact URL with a dynamically generated OpenGraph card (`/r/[code]/opengraph-image`).

## Getting Started

```bash
npm install
cp .env.example .env.local # Optional: add TYPESAFE_AI_API_KEY and ANTHROPIC_API_KEY
npm run dev
```

Run the poker engine and tournament test suite:

```bash
npm test
```
