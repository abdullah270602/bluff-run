import type { Persona } from "@/brains/types";

const HUE: Record<string, [string, string]> = {
  jev: ["#e5ff00", "#0b1310"],
  haiku: ["#5eead4", "#06211a"],
  nano: ["#f5f1e6", "#15201b"],
  flash: ["#7fb3ff", "#0a1a2e"],
  you: ["#f5f1e6", "#0b1310"],
};

/**
 * A seat's face: a disc in the model's colour with a monogram, and a ring whose arc length is the
 * seat's aggression. Same persona, same face, every time it sits down.
 */
export function Avatar({ model, name, persona }: { model: string; name: string; persona: Persona }) {
  const [bg, ink] = HUE[model] ?? HUE.jev;
  const arc = 2 * Math.PI * 52 * Math.min(1, persona.aggression);
  return (
    <div className="avatar" title={`${name}: ${persona.aggression > 0.62 ? "aggressive" : persona.aggression < 0.4 ? "cautious" : "balanced"}`}>
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true">
        <circle cx="60" cy="60" r="60" fill={bg} />
        <circle cx="60" cy="60" r="52" fill="none" stroke={ink} strokeOpacity="0.18" strokeWidth="4" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${arc} 999`} transform="rotate(-90 60 60)" />
        <text x="60" y="60" textAnchor="middle" dominantBaseline="central" fontFamily="inherit" fontSize="52" fontWeight="600" fill={ink} letterSpacing="-2">
          {name[0]}
        </text>
      </svg>
    </div>
  );
}
