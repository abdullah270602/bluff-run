import Link from "next/link";
import { Mark } from "./Logo";

/** Where to find the person who built this. An empty href hides the link. */
export const AUTHOR = {
  name: "Abdullah Naseem",
  github: "https://github.com/abdullah270602",
  x: "https://x.com/abdullahn2706",
  linkedin: "",
  site: "",
};
export const REPO = "abdullah270602/bluff-run";

const ICONS = {
  github: <path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.4 6.8 9.7.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5.1 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 4-2.4 4.8-4.6 5.1.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.2 10.2 0 0 0 22 12.3C22 6.6 17.5 2 12 2Z" />,
  x: <path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L1.8 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />,
  linkedin: <path d="M6.5 8.5H3V21h3.5V8.5ZM4.8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM21 13.3c0-3.4-1.8-5.1-4.3-5.1-2 0-2.9 1.1-3.4 1.9V8.5H9.9V21h3.4v-6.2c0-1.6.3-3.2 2.3-3.2s2 1.9 2 3.3V21H21v-7.7Z" />,
  site: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.9 9h-3.4a15.6 15.6 0 0 0-1.6-6.2A8 8 0 0 1 19.9 11ZM12 4c1 1.2 2.1 3.6 2.4 7H9.6c.3-3.4 1.4-5.8 2.4-7ZM4.1 13h3.4c.1 2.4.7 4.5 1.6 6.2A8 8 0 0 1 4.1 13Zm3.4-2H4.1a8 8 0 0 1 5-6.2A15.6 15.6 0 0 0 7.5 11ZM12 20c-1-1.2-2.1-3.6-2.4-7h4.8c-.3 3.4-1.4 5.8-2.4 7Zm2.9-.8c.9-1.7 1.5-3.8 1.6-6.2h3.4a8 8 0 0 1-5 6.2Z" />,
} as const;
const LABELS = { github: "GitHub", x: "X", linkedin: "LinkedIn", site: "Website" } as const;

export function SiteFoot() {
  const links = (["github", "x", "linkedin", "site"] as const).filter((k) => AUTHOR[k]);
  return (
    <footer className="site-foot">
      <Link href="/" className="brand"><Mark size={18} color="var(--accent)" />Bluff Run</Link>
      <div className="built-by">
        <span>Built by {AUTHOR.name}</span>
        <span className="built-links">
          {links.map((k) => (
            <a key={k} href={AUTHOR[k]} target="_blank" rel="noopener noreferrer" aria-label={`${AUTHOR.name} on ${LABELS[k]}`} title={LABELS[k]}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{ICONS[k]}</svg>
            </a>
          ))}
        </span>
      </div>
    </footer>
  );
}
