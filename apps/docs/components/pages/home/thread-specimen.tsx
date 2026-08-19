"use client";

import { Base } from "@/components/pages/examples/base";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import Link from "next/link";

export function ThreadSpecimen() {
  return (
    <section aria-label="Thread" className="flex flex-col gap-3">
      <div className="h-[min(52rem,88svh)] overflow-hidden rounded-(--radius-document) border">
        <DocsRuntimeProvider devtools={false}>
          <Base />
        </DocsRuntimeProvider>
      </div>
      <div className="flex justify-end">
        <Link
          href="/examples"
          className="text-muted-foreground hover:text-foreground text-[13px] transition-colors"
        >
          Explore other examples
        </Link>
      </div>
    </section>
  );
}
