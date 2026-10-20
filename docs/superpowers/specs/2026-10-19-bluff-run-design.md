# Bluff Run - MVP design (2026-10-19)

## Intent
Browser poker challenge: beat one AI, then 2, 4, 8, 16, 32, 64, 100. Survive as many stages as possible, get a shareable run summary. The product must feel like a crafted game, not a generated dashboard.

## Decisions taken (brief + my calls)
- **Stack:** Next.js 16 (App Router) + TypeScript, vanilla CSS with design tokens, `motion` for card/chip choreography. No Tailwind, no UI kit. API keys stay server-side in one route (`/api/decide`).
- **Game:** No-limit Texas Hold'em, shootout format. Every table starts fresh: 2,000 chips each, blinds 10/20 rising every 8 hands. Player busts = run over. Player last standing = table cleared.
- **Scaling past 8 opponents (my call):** a table seats the player + up to 8. For stages of 16+, the rest of the field is split into other tables of up to 9. The player's table is live; other tables are resolved by the house engine in the background. Winners of other tables form the next round with the player, until no opponents remain. Stage 100 is three rounds. The UI shows this as a bracket ("round 1 of 3, 92 at other tables").
- **AI opponents, pluggable:** one `Brain` signature (`decide(view) -> action`). Brains: `jev` (TypeSafe AI decision model, choice question over fold / check-call / raise small / raise big / all-in, sampled from returned probabilities), `claude` (Claude Haiku 5.5, structured output; "lightweight" per brief), `house` (equity-based heuristic with personality; also the offline fallback and the engine for background tables). Roster per stage: stage 1 is Jev alone; later stages mix the available models. Missing keys degrade to `house` and the seat badge says so.
- **Run summary + share:** stage reached, opponents beaten, hands played, biggest pot, best hand. Encoded into a URL (`/r/<code>`) with an OG image, plus copy-to-clipboard text. Best run kept in localStorage.

## Visual identity
- Palette: felt greens (#06100D to #1F5244), bone (#F2EEE3) for cards and type, one accent "signal" lime (#D7FF3F) for the player's identity, CTAs and progress. Fold coral (#FF6B5A), call mint (#7BE3C0) only as action semantics.
- Type: Bricolage Grotesque throughout, tabular numerals for chips.
- Shapes: pills for interactive controls and chips, 14px for cards, 24px for panels.
- Signature element: **the Ladder** - the doubling sequence 1 2 4 8 16 32 64 100 as rising rungs. It is the hero on the landing page, the progress strip above the table, and the spine of the result card.
- Logo: four rounded squares doubling in size along a rising diagonal.
- Motion: one orchestrated load sequence on landing; at the table, motion only answers events (deal, bet, pot award, stage cleared).

## Non-goals (MVP)
Accounts, multiplayer, sound, other games, model comparison stats, mobile-first table (works down to tablet; phone gets a reduced table).
