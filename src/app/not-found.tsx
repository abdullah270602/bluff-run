import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "@/components/Bot";
import { Mark } from "@/components/Logo";
import { SiteFoot } from "@/components/SiteFoot";

export const metadata: Metadata = { title: "No table here" };

export default function NotFound() {
  return (
    <div className="page-shell">
      <div className="intro-top">
        <Link href="/" className="brand"><Mark color="var(--accent)" />Bluff Run</Link>
      </div>
      <section className="lost">
        <div className="avatar"><Bot id="lost" variant={0} mood="lose" /></div>
        <h1>No table here.</h1>
        <p>The link is off, or the run it pointed at never happened.</p>
        <div className="lost-acts">
          <Link href="/play" className="pill pill-lime pill-lg">Sit at the table</Link>
          <Link href="/" className="pill">Home</Link>
        </div>
      </section>
      <SiteFoot />
    </div>
  );
}
