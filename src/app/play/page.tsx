import type { Metadata } from "next";
import { Suspense } from "react";
import { Arena } from "@/components/Arena";

export const metadata: Metadata = { title: "Bluff Run, at the table" };

export default function PlayPage() {
  return (
    <div className="page-shell" style={{ paddingTop: 20 }}>
      <Suspense fallback={null}>
        <Arena />
      </Suspense>
    </div>
  );
}
