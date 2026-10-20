import { STAGES } from "@/game/run";

/** The doubling sequence as rungs. `current` is the stage index in play, `cleared` how many are done. */
export function Ladder({ current = -1, cleared = 0, className = "" }: { current?: number; cleared?: number; className?: string }) {
  return (
    <ol className={`ladder ${className}`} aria-label="Stages">
      {STAGES.map((n, i) => (
        <li key={n} className={`rung num ${i < cleared ? "cleared" : i === current ? "current" : ""}`} aria-current={i === current ? "step" : undefined}>
          {n}
        </li>
      ))}
    </ol>
  );
}
