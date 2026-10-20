import Link from "next/link";

/** Four rounded squares doubling along a rising diagonal: the ladder, compressed into a mark. */
export function Mark({ size = 26, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill={color} aria-hidden="true">
      <rect x="0" y="28" width="4" height="4" rx="1.1" />
      <rect x="5" y="22.5" width="6" height="6" rx="1.6" />
      <rect x="12" y="15" width="9" height="9" rx="2.3" />
      <rect x="19" y="4" width="13" height="13" rx="3.2" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="Bluff Run home">
      <Mark color="var(--signal)" />
      <span>Bluff Run</span>
    </Link>
  );
}
